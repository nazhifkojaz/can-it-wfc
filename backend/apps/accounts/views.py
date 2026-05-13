from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.conf import settings
from core.exceptions import (
    UserNotFound,
    SelfFollowNotAllowed,
    AlreadyFollowing,
    NotFollowing,
    FollowRequestAlreadySent,
    FollowRequestNotFound,
    OAuthTokenInvalid,
    OAuthTokenRequired,
    OAuthEmailNotProvided,
)


# Custom throttle classes for authentication endpoints
class AuthThrottle(AnonRateThrottle):
    scope = 'auth'


class PublicApiThrottle(AnonRateThrottle):
    scope = 'public_api'


from .serializers import (
    UserSerializer,
    UserDetailSerializer,
    UserUpdateSerializer,
    UserProfileSerializer,
    UserSettingsSerializer,
    UserActivityItemSerializer,
    FollowUserSerializer,
)
from .utils import get_user_by_username_or_id, is_own_profile
from .models import Follow
from core.logging import get_logger
from apps.reviews.models import Visit, Review
from apps.cafes.models import CafeList, CafeListItem, SavedCafeList
from apps.cafes.serializers import CafeListSerializer

logger = get_logger(__name__)

User = get_user_model()


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
    throttle_classes = [PublicApiThrottle]
    lookup_field = 'username'

    def get_object(self):
        """Get user by username or ID."""
        lookup_value = self.kwargs.get(self.lookup_field)

        if lookup_value and lookup_value.isdigit():
            try:
                return get_user_by_username_or_id(lookup_value)
            except User.DoesNotExist:
                pass

        return super().get_object()


class OAuthLoginView(APIView):
    """
    Generic OAuth login endpoint.

    POST /api/auth/oauth/{provider}/
    Body: { "access_token": "..." }

    Supported providers: google
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request, provider: str):
        from apps.accounts.services.oauth_service import authenticate_via_oauth, get_provider

        token = request.data.get('access_token')
        if not token:
            raise OAuthTokenRequired()

        # Validate provider name
        try:
            get_provider(provider)
        except ValueError:
            return Response(
                {'detail': f'Unsupported OAuth provider: {provider}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user, created = authenticate_via_oauth(provider, token)
        except (OAuthTokenInvalid, OAuthEmailNotProvided) as e:
            raise  # Re-raise our custom exceptions
        except Exception as e:
            logger.error(f'OAuth login failed for {provider}: {str(e)}', exc_info=True)
            raise OAuthTokenInvalid(detail='Authentication failed. Please try again.')

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        response = Response({
            'user': UserDetailSerializer(user).data,
            'message': 'Login successful',
            'created': created,
        }, status=status.HTTP_200_OK)

        # Set httpOnly cookies (24hr access, 30-day refresh)
        response.set_cookie(
            key='access_token',
            value=access_token,
            max_age=86400,       # 24 hours
            httponly=True,
            secure=not settings.DEBUG,
            samesite='None' if not settings.DEBUG else 'Lax',
            path='/',
        )
        response.set_cookie(
            key='refresh_token',
            value=refresh_token,
            max_age=2592000,     # 30 days
            httponly=True,
            secure=not settings.DEBUG,
            samesite='None' if not settings.DEBUG else 'Lax',
            path='/',
        )

        return response


class LogoutView(APIView):
    """
    Logout endpoint - clears authentication cookies.

    POST /api/auth/logout/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Blacklist the refresh token so it can't be used after logout
        refresh_token = request.COOKIES.get('refresh_token')
        if refresh_token:
            try:
                from rest_framework_simplejwt.tokens import RefreshToken
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass  # Token already expired/invalid

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
            samesite='None' if not settings.DEBUG else 'Lax',
            secure=not settings.DEBUG,
            httponly=True,
        )

        response.set_cookie(
            key='refresh_token',
            value='',
            max_age=0,  # Expire immediately
            expires='Thu, 01 Jan 1970 00:00:00 GMT',  # Past date
            path='/',
            samesite='None' if not settings.DEBUG else 'Lax',
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
    throttle_classes = [PublicApiThrottle]

    def get(self, request, username=None):
        """Fetch recent activity combining visits and reviews."""
        try:
            user = get_user_by_username_or_id(username)
        except User.DoesNotExist:
            raise UserNotFound()

        # Check privacy settings
        if not is_own_profile(request, user):
            from apps.accounts.utils import can_view_user_activity
            if not can_view_user_activity(request.user, user):
                return Response({
                    'message': 'This activity is private',
                    'activity': []
                })

        user_settings = user.settings

        # Get limit from query params (default 20, max 50)
        try:
            limit = min(int(request.query_params.get('limit', 20)), 50)
        except (ValueError, TypeError):
            limit = 20  # Default fallback for invalid input

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
                'date': visit.visit_date if user_settings.show_activity_dates else None,
                'created_at': visit.created_at,
                'wfc_rating': None,
                'comment': None,
                'visit_time': visit.visit_time,
                'amount_spent': visit.amount_spent,
                'currency': visit.currency,
                'visit_id': visit.id,
            })

        # Add reviews
        for review in reviews:
            activity.append({
                'id': review.id,
                'type': 'review',
                'cafe_id': review.cafe.id,
                'cafe_name': review.cafe.name,
                'cafe_google_place_id': review.cafe.google_place_id,
                'date': review.created_at.date() if user_settings.show_activity_dates else None,
                'created_at': review.created_at,
                'wfc_rating': review.wfc_rating,
                'comment': review.comment,
                'visit_time': None,
                'amount_spent': None,
                'currency': None,
                'visit_id': None,
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
    Follow a user or request to follow.
    Creates an active follow for public profiles,
    and a pending follow request for private profiles.

    POST /api/accounts/follow/{username}/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        """Follow a user by username."""
        try:
            target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise UserNotFound()

        if request.user == target_user:
            raise SelfFollowNotAllowed()

        existing = Follow.objects.filter(
            follower=request.user, followed=target_user
        ).first()

        if existing:
            if existing.status == 'active':
                raise AlreadyFollowing()
            elif existing.status == 'pending':
                raise FollowRequestAlreadySent()
            elif existing.status == 'rejected':
                # Retry after rejection — reset to pending
                is_private = target_user.settings.profile_visibility == 'private'
                if is_private:
                    existing.status = 'pending'
                    existing.save(update_fields=['status'])
                    return Response({
                        'message': f'Follow request sent to {username}',
                        'follow_status': 'pending',
                        'is_following': False
                    }, status=status.HTTP_201_CREATED)
                else:
                    existing.status = 'active'
                    existing.save(update_fields=['status'])
                    return Response({
                        'message': f'You are now following {username}',
                        'follow_status': 'active',
                        'is_following': True
                    }, status=status.HTTP_201_CREATED)

        # No existing follow — determine behavior based on target profile visibility
        is_private = target_user.settings.profile_visibility == 'private'

        if is_private:
            follow = Follow.objects.create(
                follower=request.user,
                followed=target_user,
                status='pending'
            )
            return Response({
                'message': f'Follow request sent to {username}',
                'follow_status': 'pending',
                'is_following': False
            }, status=status.HTTP_201_CREATED)
        else:
            Follow.objects.create(
                follower=request.user,
                followed=target_user,
                status='active'
            )
            return Response({
                'message': f'You are now following {username}',
                'follow_status': 'active',
                'is_following': True
            }, status=status.HTTP_201_CREATED)


class UnfollowUserView(APIView):
    """
    Unfollow a user or cancel a follow request.

    DELETE /api/accounts/unfollow/{username}/
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, username):
        """Unfollow a user by username."""
        try:
            target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise UserNotFound()

        try:
            follow = Follow.objects.get(follower=request.user, followed=target_user)
        except Follow.DoesNotExist:
            raise NotFollowing()

        follow.delete()

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
        follower_ids = self.request.user.get_follower_ids()
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
        following_ids = self.request.user.get_following_ids()
        return User.objects.filter(id__in=following_ids).order_by('-date_joined')


class FollowRequestsListView(generics.ListAPIView):
    """
    Get list of pending follow requests for the current user.

    GET /api/accounts/me/follow-requests/
    """
    serializer_class = FollowUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        """Return users who have requested to follow the current user."""
        request_user_ids = Follow.objects.filter(
            followed=self.request.user,
            status='pending'
        ).values_list('follower_id', flat=True)
        return User.objects.filter(id__in=request_user_ids).order_by('-date_joined')


class HandleFollowRequestView(APIView):
    """
    Accept or reject a follow request.

    POST /api/accounts/follow-requests/{user_id}/handle/
    Body: { "action": "accept" | "reject" }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, user_id):
        try:
            requester = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise UserNotFound()

        follow = Follow.objects.filter(
            follower=requester,
            followed=request.user,
            status='pending'
        ).first()

        if not follow:
            raise FollowRequestNotFound()

        action = request.data.get('action')

        if action == 'accept':
            follow.status = 'active'
            follow.save(update_fields=['status'])
            # Update counts explicitly since save only updates for new follows
            requester.update_follow_counts()
            request.user.update_follow_counts()
            return Response({
                'message': f'You have accepted {requester.username}\'s follow request',
                'follow_status': 'active'
            }, status=status.HTTP_200_OK)

        elif action == 'reject':
            follow.status = 'rejected'
            follow.save(update_fields=['status'])
            return Response({
                'message': f'You have rejected {requester.username}\'s follow request',
                'follow_status': 'rejected'
            }, status=status.HTTP_200_OK)

        else:
            return Response({
                'message': 'Invalid action. Use "accept" or "reject".'
            }, status=status.HTTP_400_BAD_REQUEST)


class UserFollowersListView(generics.ListAPIView):
    """
    Get list of users who follow a specific user (public).

    GET /api/accounts/{username}/followers/
    """
    serializer_class = FollowUserSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicApiThrottle]

    def get_queryset(self):
        """Return followers of specified user, respecting privacy settings."""
        username = self.kwargs.get('username')

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return User.objects.none()

        settings = user.settings
        own_profile = is_own_profile(self.request, user)

        if not settings.show_followers and not own_profile:
            return User.objects.none()

        follower_ids = user.get_follower_ids()
        return User.objects.filter(id__in=follower_ids).order_by('-date_joined')


class UserFollowingListView(generics.ListAPIView):
    """
    Get list of users a specific user follows (public).

    GET /api/accounts/{username}/following/
    """
    serializer_class = FollowUserSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PublicApiThrottle]

    def get_queryset(self):
        """Return users followed by specified user, respecting privacy settings."""
        username = self.kwargs.get('username')

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return User.objects.none()

        settings = user.settings
        own_profile = is_own_profile(self.request, user)

        if not settings.show_following and not own_profile:
            return User.objects.none()

        following_ids = user.get_following_ids()
        return User.objects.filter(id__in=following_ids).order_by('-date_joined')


class SavedListsView(APIView):
    """
    Get the current user's saved public lists.

    GET /api/auth/me/saved-lists/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            limit = min(int(request.query_params.get('limit', 20)), 50)
        except (ValueError, TypeError):
            limit = 20
        try:
            offset = int(request.query_params.get('offset', 0))
        except (ValueError, TypeError):
            offset = 0

        saved = (
            SavedCafeList.objects
            .filter(user=request.user, cafe_list__is_public=True)
            .select_related('cafe_list__owner')
            .order_by('-saved_at')
        )

        total_count = saved.count()
        page = saved[offset:offset + limit]

        cafe_lists = [s.cafe_list for s in page]
        for cafe_list in cafe_lists:
            cafe_list.preview_items = list(
                cafe_list.items.select_related('cafe').order_by('added_at')[:3]
            )

        serializer = CafeListSerializer(cafe_lists, many=True)

        return Response({
            'count': total_count,
            'next': None,
            'previous': None,
            'results': serializer.data,
        })