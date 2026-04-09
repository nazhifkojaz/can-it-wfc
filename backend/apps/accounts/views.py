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
    OAuthTokenInvalid,
    OAuthTokenRequired,
    OAuthEmailNotProvided,
    OAuthEmailMismatch,
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
from .models import Follow
from core.logging import get_logger

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

        # Try to get by ID first (if it's a number)
        if lookup_value and lookup_value.isdigit():
            try:
                return User.objects.get(id=int(lookup_value))
            except User.DoesNotExist:
                pass

        # Otherwise, get by username
        return super().get_object()


class OAuthLoginView(APIView):
    """
    Generic OAuth login endpoint.

    POST /api/auth/oauth/{provider}/
    Body: { "access_token": "..." }

    Supported providers: google, twitter
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


class LegacyUserMigrationView(APIView):
    """
    Check and handle legacy user migration to OAuth.

    GET  /api/auth/migration/status/  — Check if user needs migration
    POST /api/auth/migration/link/    — Link an OAuth provider to legacy account
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Check if current user needs to link an OAuth provider."""
        from apps.accounts.models import LinkedProvider

        has_linked = LinkedProvider.objects.filter(user=request.user).exists()
        needs_migration = not has_linked and not request.user.oauth_only

        return Response({
            'needs_migration': needs_migration,
            'has_linked_providers': has_linked,
            'linked_providers': list(
                LinkedProvider.objects.filter(user=request.user)
                .values_list('provider', flat=True)
            ),
        })

    def post(self, request):
        """Link an OAuth provider to the current legacy account."""
        from apps.accounts.services.oauth_service import get_provider
        from apps.accounts.models import LinkedProvider

        provider_name = request.data.get('provider')
        token = request.data.get('access_token')

        if not provider_name or not token:
            raise OAuthTokenRequired()

        # Verify token with provider
        try:
            provider = get_provider(provider_name)
            user_info = provider.verify_token(token)
        except (ValueError, OAuthTokenInvalid, OAuthEmailNotProvided):
            raise

        # Security: OAuth email must match the user's account email
        if user_info.email.lower() != request.user.email.lower():
            raise OAuthEmailMismatch(
                detail=(
                    f"Your {provider_name.capitalize()} account email "
                    f"({user_info.email}) doesn't match your account email "
                    f"({request.user.email}). Please use the matching account."
                )
            )

        # Create the link
        LinkedProvider.objects.get_or_create(
            user=request.user,
            provider=provider_name,
            provider_user_id=user_info.provider_user_id,
            defaults={
                'email': user_info.email,
                'display_name': user_info.display_name,
                'avatar_url': user_info.avatar_url,
            },
        )

        # Update avatar if provider has one
        if user_info.avatar_url and not request.user.avatar_url:
            request.user.avatar_url = user_info.avatar_url
            request.user.save(update_fields=['avatar_url'])

        return Response({
            'message': f'{provider_name.capitalize()} account linked successfully',
            'provider': provider_name,
        })


class TwitterCallbackView(APIView):
    """
    Exchange Twitter OAuth authorization code for access token.

    POST /api/auth/twitter/callback/
    Body: { "code": "...", "code_verifier": "..." }

    This endpoint proxies the token exchange to avoid exposing
    the client secret to the browser.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        import requests as http_requests

        code = request.data.get('code')
        code_verifier = request.data.get('code_verifier')

        if not code or not code_verifier:
            raise OAuthTokenRequired()

        # Exchange code for access token
        try:
            response = http_requests.post(
                'https://twitter.com/i/oauth2/token',
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                data={
                    'code': code,
                    'grant_type': 'authorization_code',
                    'client_id': settings.TWITTER_OAUTH_CLIENT_ID,
                    'client_secret': settings.TWITTER_OAUTH_CLIENT_SECRET,
                    'redirect_uri': request.data.get(
                        'redirect_uri',
                        f"{'https' if not settings.DEBUG else 'http'}://"
                        f"{request.get_host()}/auth/twitter/callback"
                    ),
                    'code_verifier': code_verifier,
                },
                timeout=10,
            )
            response.raise_for_status()
        except http_requests.RequestException as e:
            logger.error(f'Twitter token exchange failed: {str(e)}')
            raise OAuthTokenInvalid(detail='Twitter authentication failed.')

        access_token = response.json().get('access_token')
        if not access_token:
            raise OAuthTokenInvalid(detail='No access token received from Twitter.')

        # Use the generic OAuth flow to authenticate
        from apps.accounts.services.oauth_service import authenticate_via_oauth
        user, created = authenticate_via_oauth('twitter', access_token)

        # Generate JWT tokens and set cookies (same as OAuthLoginView)
        refresh = RefreshToken.for_user(user)
        response = Response({
            'user': UserDetailSerializer(user).data,
            'message': 'Login successful',
            'created': created,
        }, status=status.HTTP_200_OK)

        response.set_cookie(
            key='access_token', value=str(refresh.access_token),
            max_age=86400, httponly=True,
            secure=not settings.DEBUG,
            samesite='None' if not settings.DEBUG else 'Lax',
            path='/',
        )
        response.set_cookie(
            key='refresh_token', value=str(refresh),
            max_age=2592000, httponly=True,
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
        is_own_profile = (
            request.user.is_authenticated and
            request.user.id == user.id
        )

        if not is_own_profile:
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

        # Try to delete follow relationship using model delete()
        # (QuerySet.delete() skips the custom Follow.delete() which updates counts)
        try:
            follow = Follow.objects.get(
                follower=request.user,
                followed=target_user
            )
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
    throttle_classes = [PublicApiThrottle]

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
    throttle_classes = [PublicApiThrottle]

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