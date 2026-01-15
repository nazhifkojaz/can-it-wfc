from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests
from core.exceptions import (
    UserNotFound,
    SelfFollowNotAllowed,
    AlreadyFollowing,
    NotFollowing,
    GoogleAuthError,
    GoogleAuthTokenRequired,
    GoogleEmailNotProvided,
)


# Custom throttle classes for authentication endpoints
class AuthThrottle(AnonRateThrottle):
    scope = 'auth'


class RegistrationThrottle(AnonRateThrottle):
    scope = 'registration'


from .serializers import (
    UserSerializer,
    UserDetailSerializer,
    UserRegistrationSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    UserProfileSerializer,
    UserSettingsSerializer,
    UserActivityItemSerializer,
    FollowUserSerializer,
)
from .models import UserSettings, Follow

User = get_user_model()


class UserRegistrationView(generics.CreateAPIView):
    """
    Register a new user.

    POST /api/auth/register/
    """
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [RegistrationThrottle]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'user': UserSerializer(user).data,
            'message': 'User registered successfully. Please login to get your token.'
        }, status=status.HTTP_201_CREATED)


class UserDetailView(generics.RetrieveUpdateAPIView):
    """
    Get or update current user profile.
    
    GET /api/auth/me/
    PUT /api/auth/me/
    PATCH /api/auth/me/
    """
    serializer_class = UserDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserDetailSerializer


class UserPublicProfileView(generics.RetrieveAPIView):
    """
    Get public profile of any user by username or ID.

    GET /api/users/{username}/profile/
    GET /api/users/{id}/profile/
    """
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'username'

    def get_object(self):
        """Get user by username or ID."""
        lookup_value = self.kwargs.get(self.lookup_field)

        # Try to get by ID first (if it's a number)
        if lookup_value and lookup_value.isdigit():
            try:
                return User.objects.get(id=int(lookup_value))
            except User.DoesNotExist:
                pass

        # Otherwise, get by username
        return super().get_object()


class ChangePasswordView(APIView):
    """
    Change user password.

    POST /api/auth/change-password/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Password changed successfully.'
            }, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GoogleLoginView(APIView):
    """
    Google OAuth2 login endpoint using ID token from @react-oauth/google.

    POST /api/auth/google/

    Body:
    {
        "access_token": "google_id_token_jwt_here"
    }

    Returns JWT tokens and user data.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        token = request.data.get('access_token')

        if not token:
            raise GoogleAuthTokenRequired()

        try:
            # Verify the Google ID token
            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                settings.SOCIALACCOUNT_PROVIDERS['google']['APP']['client_id']
            )

            # Get user info from token
            email = idinfo.get('email')
            given_name = idinfo.get('given_name', '')
            family_name = idinfo.get('family_name', '')
            picture = idinfo.get('picture', '')

            if not email:
                raise GoogleEmailNotProvided()

            # Get or create user
            user = User.objects.filter(email=email).first()

            if not user:
                # Generate unique username from email
                base_username = email.split('@')[0]
                username = base_username
                counter = 1

                # Ensure username is unique
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1

                # Create new user
                user = User.objects.create(
                    email=email,
                    username=username,
                    is_active=True,
                )
                created = True
            else:
                created = False

            # Update avatar if provided by Google (always update to get latest)
            if picture:
                user.avatar_url = picture
                user.save()

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            # Create response without tokens in body (security improvement)
            response = Response({
                'user': UserDetailSerializer(user).data,
                'message': 'Login successful',
                'created': created,
            }, status=status.HTTP_200_OK)

            # Set tokens as httpOnly cookies (XSS protection)
            response.set_cookie(
                key='access_token',
                value=access_token,
                max_age=3600,  # 1 hour
                httponly=True,  # Prevent JavaScript access
                secure=not settings.DEBUG,  # HTTPS only in production
                samesite='Lax',  # CSRF protection
                path='/',
            )

            response.set_cookie(
                key='refresh_token',
                value=refresh_token,
                max_age=604800,  # 7 days
                httponly=True,
                secure=not settings.DEBUG,
                samesite='Lax',
                path='/',
            )

            return response

        except ValueError as e:
            # Invalid token
            raise GoogleAuthError(detail=f'Invalid Google token: {str(e)}')
        except Exception as e:
            raise GoogleAuthError(detail=f'Google login failed: {str(e)}')


class LogoutView(APIView):
    """
    Logout endpoint - clears authentication cookies.

    POST /api/auth/logout/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        response = Response({
            'message': 'Logged out successfully'
        }, status=status.HTTP_200_OK)

        # Clear both authentication cookies by setting them with max_age=0
        # This explicitly expires the cookies
        response.set_cookie(
            key='access_token',
            value='',
            max_age=0,  # Expire immediately
            expires='Thu, 01 Jan 1970 00:00:00 GMT',  # Past date
            path='/',
            samesite='Lax',
            secure=not settings.DEBUG,
            httponly=True,
        )

        response.set_cookie(
            key='refresh_token',
            value='',
            max_age=0,  # Expire immediately
            expires='Thu, 01 Jan 1970 00:00:00 GMT',  # Past date
            path='/',
            samesite='Lax',
            secure=not settings.DEBUG,
            httponly=True,
        )

        return response


class UserActivityView(APIView):
    """
    Get recent activity (visits and reviews) for a user.

    GET /api/users/{username}/activity/
    GET /api/users/{id}/activity/
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, username=None):
        """Fetch recent activity combining visits and reviews."""
        from apps.reviews.models import Visit, Review

        # Get user by username or ID
        if username and username.isdigit():
            try:
                user = User.objects.get(id=int(username))
            except User.DoesNotExist:
                raise UserNotFound()
        else:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                raise UserNotFound()

        # Check privacy settings
        settings = user.settings

        is_own_profile = (
            request.user.is_authenticated and
            request.user.id == user.id
        )

        # If profile is private and not own profile, return empty
        if settings.profile_visibility == 'private' and not is_own_profile:
            return Response({
                'message': 'This profile is private',
                'activity': []
            })

        # Get limit from query params (default 20, max 50)
        limit = min(int(request.query_params.get('limit', 20)), 50)

        # Fetch visits and reviews
        visits = Visit.objects.filter(user=user).select_related('cafe').order_by('-created_at')[:limit]
        reviews = Review.objects.filter(user=user).select_related('cafe').order_by('-created_at')[:limit]

        # Combine and transform into unified format
        activity = []

        # Add visits
        for visit in visits:
            activity.append({
                'id': visit.id,
                'type': 'visit',
                'cafe_id': visit.cafe.id,
                'cafe_name': visit.cafe.name,
                'cafe_google_place_id': visit.cafe.google_place_id,
                'date': visit.visit_date if settings.show_activity_dates else None,
                'created_at': visit.created_at,
                'wfc_rating': None,
                'comment': None,
                'visit_time': visit.visit_time,
                'amount_spent': visit.amount_spent,
                'currency': visit.currency,
            })

        # Add reviews
        for review in reviews:
            activity.append({
                'id': review.id,
                'type': 'review',
                'cafe_id': review.cafe.id,
                'cafe_name': review.cafe.name,
                'cafe_google_place_id': review.cafe.google_place_id,
                'date': review.created_at.date() if settings.show_activity_dates else None,
                'created_at': review.created_at,
                'wfc_rating': review.wfc_rating,
                'comment': review.comment,
                'visit_time': None,
                'amount_spent': None,
                'currency': None,
            })

        # Sort by created_at descending
        activity.sort(key=lambda x: x['created_at'], reverse=True)

        # Limit to requested amount
        activity = activity[:limit]

        # Serialize
        serializer = UserActivityItemSerializer(activity, many=True)

        return Response({
            'user_id': user.id,
            'username': user.username,
            'activity': serializer.data
        })


class UserSettingsUpdateView(generics.RetrieveUpdateAPIView):
    """
    Get or update current user's settings.

    GET /api/users/me/settings/
    PUT /api/users/me/settings/
    PATCH /api/users/me/settings/
    """
    serializer_class = UserSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        """Get settings for current user."""
        return self.request.user.settings


class FollowUserView(APIView):
    """
    Follow a user.

    POST /api/accounts/follow/{username}/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        """Follow a user by username."""
        # Get target user
        try:
            target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise UserNotFound()

        # Prevent self-following
        if request.user == target_user:
            raise SelfFollowNotAllowed()

        # Check if already following
        if Follow.objects.filter(follower=request.user, followed=target_user).exists():
            raise AlreadyFollowing()

        # Create follow relationship
        Follow.objects.create(follower=request.user, followed=target_user)

        return Response({
            'message': f'You are now following {username}',
            'is_following': True
        }, status=status.HTTP_201_CREATED)


class UnfollowUserView(APIView):
    """
    Unfollow a user.

    DELETE /api/accounts/unfollow/{username}/
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, username):
        """Unfollow a user by username."""
        # Get target user
        try:
            target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise UserNotFound()

        # Try to delete follow relationship
        deleted_count, _ = Follow.objects.filter(
            follower=request.user,
            followed=target_user
        ).delete()

        if deleted_count == 0:
            raise NotFollowing()

        return Response({
            'message': f'You have unfollowed {username}',
            'is_following': False
        }, status=status.HTTP_200_OK)


class MyFollowersListView(generics.ListAPIView):
    """
    Get list of users who follow me.

    GET /api/accounts/me/followers/
    """
    serializer_class = FollowUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return users who follow the current user."""
        follower_ids = Follow.objects.filter(
            followed=self.request.user
        ).values_list('follower_id', flat=True)

        return User.objects.filter(id__in=follower_ids).order_by('-date_joined')


class MyFollowingListView(generics.ListAPIView):
    """
    Get list of users I follow.

    GET /api/accounts/me/following/
    """
    serializer_class = FollowUserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return users the current user follows."""
        following_ids = Follow.objects.filter(
            follower=self.request.user
        ).values_list('followed_id', flat=True)

        return User.objects.filter(id__in=following_ids).order_by('-date_joined')


class UserFollowersListView(generics.ListAPIView):
    """
    Get list of users who follow a specific user (public).

    GET /api/accounts/{username}/followers/
    """
    serializer_class = FollowUserSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        """Return followers of specified user, respecting privacy settings."""
        username = self.kwargs.get('username')

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return User.objects.none()

        # Check privacy settings
        settings = user.settings

        is_own_profile = (
            self.request.user.is_authenticated and
            self.request.user.id == user.id
        )

        # If show_followers is False and not own profile, return empty
        if not settings.show_followers and not is_own_profile:
            return User.objects.none()

        follower_ids = Follow.objects.filter(
            followed=user
        ).values_list('follower_id', flat=True)

        return User.objects.filter(id__in=follower_ids).order_by('-date_joined')


class UserFollowingListView(generics.ListAPIView):
    """
    Get list of users a specific user follows (public).

    GET /api/accounts/{username}/following/
    """
    serializer_class = FollowUserSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        """Return users followed by specified user, respecting privacy settings."""
        username = self.kwargs.get('username')

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return User.objects.none()

        # Check privacy settings
        settings = user.settings

        is_own_profile = (
            self.request.user.is_authenticated and
            self.request.user.id == user.id
        )

        # If show_following is False and not own profile, return empty
        if not settings.show_following and not is_own_profile:
            return User.objects.none()

        following_ids = Follow.objects.filter(
            follower=user
        ).values_list('followed_id', flat=True)

        return User.objects.filter(id__in=following_ids).order_by('-date_joined')


class ActivityFeedView(APIView):
    """
    Get enhanced activity feed for current user.
    Includes:
    - User's own visits/reviews
    - Visits/reviews from users they follow
    - New followers
    - Following's follow activity

    GET /api/accounts/me/feed/?limit=50
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Fetch activity feed using Activity table.

        NEW IMPLEMENTATION: Uses ActivityService for optimized query performance.
        Reduces from 7+ queries to 1 query with proper indexing.
        """
        from apps.activity.services import ActivityService
        from apps.activity.serializers import ActivitySerializer

        user = request.user
        limit = min(int(request.query_params.get('limit', 50)), 100)

        # Use ActivityService - single optimized query
        activities = ActivityService.get_user_feed(user, limit=limit)

        # Serialize activities (ActivitySerializer handles backward compatibility)
        serializer = ActivitySerializer(activities, many=True)

        return Response({
            'activities': serializer.data,
            'count': len(serializer.data)
        })