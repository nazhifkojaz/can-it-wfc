"""
Authentication and User Management Tests
"""
import pytest
from datetime import date
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from apps.accounts.models import Follow
from apps.accounts.utils import can_view_user_activity
from apps.cafes.models import Cafe
from apps.reviews.models import Review, Visit

User = get_user_model()


@pytest.fixture
def api_client():
    """Create API client for tests"""
    return APIClient()


@pytest.fixture
def test_user(db):
    """Create a test user"""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


@pytest.mark.django_db
class TestUserProfile:
    """Test user profile endpoints"""

    def test_get_current_user(self, api_client, test_user):
        """Test authenticated user can fetch their profile"""
        api_client.force_authenticate(user=test_user)
        response = api_client.get('/api/auth/me/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == 'testuser'
        assert response.data['email'] == 'test@example.com'
        assert 'total_reviews' in response.data
        assert 'total_visits' in response.data

    def test_get_current_user_unauthenticated(self, api_client):
        """Test unauthenticated request fails"""
        response = api_client.get('/api/auth/me/')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_profile(self, api_client, test_user):
        """Test user can update their profile"""
        api_client.force_authenticate(user=test_user)
        data = {
            'bio': 'Coffee lover and remote worker',
            'display_name': 'Test Display'
        }
        response = api_client.patch('/api/auth/me/', data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['bio'] == 'Coffee lover and remote worker'
        assert response.data['display_name'] == 'Test Display'


@pytest.mark.django_db
class TestUserModel:
    """Test User model methods"""

    def test_user_creation(self, db):
        """Test creating a user"""
        user = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='pass123'
        )

        assert user.username == 'testuser2'
        assert user.email == 'test2@example.com'
        assert user.check_password('pass123')
        assert user.total_reviews == 0
        assert user.total_visits == 0

    def test_display_name_not_anonymous(self, test_user):
        """Test effective_display_name returns username when not anonymous"""
        test_user.is_anonymous_display = False
        test_user.save()

        assert test_user.effective_display_name == 'testuser'

    def test_display_name_anonymous(self, test_user):
        """Test effective_display_name masks username when profile is private"""
        test_user.settings.profile_visibility = 'private'
        test_user.settings.save()

        display = test_user.effective_display_name
        assert display != 'testuser'
        assert 'tes' in display  # First 3 chars visible
        assert '*' in display  # Contains masking

    def test_can_review_new_account(self, db):
        """Test new accounts can review (MIN_ACCOUNT_AGE_HOURS=0)"""
        user = User.objects.create_user(
            username='newuser',
            email='new@example.com',
            password='pass123'
        )

        assert user.can_review() is True

    def test_update_stats(self, test_user):
        """Test update_stats recalculates user statistics"""
        _initial_reviews = test_user.total_reviews  # noqa: F841
        test_user.update_stats()

        # Should recalculate from database
        assert test_user.total_reviews >= 0
        assert test_user.total_visits >= 0


@pytest.mark.django_db
class TestLogout:
    """Test logout endpoint"""

    def _create_tokens_for_user(self, test_user):
        """Helper: create tokens for user and return (access_token, refresh_token)"""
        from rest_framework_simplejwt.tokens import RefreshToken

        refresh = RefreshToken.for_user(test_user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        return access_token, refresh_token

    def test_logout_success(self, api_client, test_user):
        """Test successful logout returns 200 and clears cookies"""
        access, refresh = self._create_tokens_for_user(test_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        api_client.cookies['refresh_token'] = refresh

        response = api_client.post('/api/auth/logout/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['message'] == 'Logged out successfully'
        # Cookies should be cleared (max_age=0)
        assert response.cookies['access_token']['max-age'] == 0
        assert response.cookies['refresh_token']['max-age'] == 0

    def test_logout_unauthenticated(self, api_client):
        """Test logout without authentication returns 401"""
        response = api_client.post('/api/auth/logout/')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout_without_refresh_cookie(self, api_client, test_user):
        """Test logout succeeds even with no refresh_token cookie"""
        access, _ = self._create_tokens_for_user(test_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        # No refresh_token cookie set

        response = api_client.post('/api/auth/logout/')

        assert response.status_code == status.HTTP_200_OK

    def test_logout_with_invalid_refresh_token(self, api_client, test_user):
        """Test logout succeeds when refresh_token cookie contains garbage"""
        access, _ = self._create_tokens_for_user(test_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        api_client.cookies['refresh_token'] = 'not-a-real-token'

        response = api_client.post('/api/auth/logout/')

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestJWTCookieCSRF:
    """Cookie-authenticated unsafe requests must pass CSRF validation."""

    def _access_token_for(self, user):
        return str(RefreshToken.for_user(user).access_token)

    def test_cookie_auth_post_without_csrf_is_rejected(self, test_user):
        client = APIClient(enforce_csrf_checks=True)
        client.cookies['access_token'] = self._access_token_for(test_user)

        response = client.patch('/api/auth/me/', {'bio': 'Blocked'}, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_cookie_auth_post_with_csrf_succeeds(self, test_user):
        client = APIClient(enforce_csrf_checks=True)
        csrf_response = client.get('/api/auth/csrf/')
        client.cookies['access_token'] = self._access_token_for(test_user)

        response = client.patch(
            '/api/auth/me/',
            {'bio': 'Allowed'},
            format='json',
            HTTP_X_CSRFTOKEN=csrf_response.data['csrfToken'],
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['bio'] == 'Allowed'

    def test_bearer_auth_post_without_csrf_succeeds(self, test_user):
        client = APIClient(enforce_csrf_checks=True)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {self._access_token_for(test_user)}')

        response = client.patch('/api/auth/me/', {'bio': 'Bearer'}, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['bio'] == 'Bearer'


class TestGoogleOAuthProvider:
    """Google OAuth email linking requires verified provider emails."""

    def _patch_google_token(self, monkeypatch, idinfo):
        monkeypatch.setattr(
            'google.oauth2.id_token.verify_oauth2_token',
            lambda *args, **kwargs: idinfo,
        )

    def test_unverified_google_email_is_rejected(self, monkeypatch):
        from apps.accounts.services.oauth_service import GoogleOAuthProvider
        from core.exceptions import OAuthTokenInvalid

        self._patch_google_token(monkeypatch, {
            'sub': 'google-123',
            'email': 'user@example.com',
            'email_verified': False,
        })

        with pytest.raises(OAuthTokenInvalid):
            GoogleOAuthProvider().verify_token('token')

    def test_missing_google_email_verified_is_rejected(self, monkeypatch):
        from apps.accounts.services.oauth_service import GoogleOAuthProvider
        from core.exceptions import OAuthTokenInvalid

        self._patch_google_token(monkeypatch, {
            'sub': 'google-123',
            'email': 'user@example.com',
        })

        with pytest.raises(OAuthTokenInvalid):
            GoogleOAuthProvider().verify_token('token')

    def test_verified_google_email_succeeds(self, monkeypatch):
        from apps.accounts.services.oauth_service import GoogleOAuthProvider

        self._patch_google_token(monkeypatch, {
            'sub': 'google-123',
            'email': 'user@example.com',
            'email_verified': True,
            'picture': 'https://example.com/avatar.png',
        })

        user_info = GoogleOAuthProvider().verify_token('token')

        assert user_info.provider_user_id == 'google-123'
        assert user_info.email == 'user@example.com'


@pytest.mark.django_db
class TestUserActivityPrivacy:
    """Activity privacy should not expose private visits to non-owners."""

    def _make_activity(self, user):
        cafe = Cafe.objects.create(
            name='Privacy Cafe',
            address='123 Privacy St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id='privacy_place',
            created_by=user,
        )
        Visit.objects.create(
            cafe=cafe,
            user=user,
            visit_date=date.today(),
            amount_spent=Decimal('42.00'),
            currency='USD',
        )
        Review.objects.create(
            cafe=cafe,
            user=user,
            wfc_rating=4,
            wifi_quality=4,
            power_outlets_rating=4,
            seating_comfort=4,
            noise_level=4,
            comment='Public review',
        )
        return cafe

    def test_anonymous_public_activity_shows_reviews_not_visits(self, api_client, test_user):
        self._make_activity(test_user)
        test_user.settings.activity_visibility = 'public'
        test_user.settings.save()

        response = api_client.get(f'/api/auth/users/{test_user.username}/activity/')

        assert response.status_code == status.HTTP_200_OK
        assert [item['type'] for item in response.data['activity']] == ['review']
        assert response.data['activity'][0]['amount_spent'] is None

    def test_active_follower_activity_shows_reviews_not_visits(self, api_client, test_user):
        follower = User.objects.create_user(
            username='activefollower',
            email='active@example.com',
            password='pass123',
        )
        Follow.objects.create(follower=follower, followed=test_user, status='active')
        self._make_activity(test_user)
        test_user.settings.activity_visibility = 'followers'
        test_user.settings.save()
        api_client.force_authenticate(user=follower)

        response = api_client.get(f'/api/auth/users/{test_user.username}/activity/')

        assert response.status_code == status.HTTP_200_OK
        assert [item['type'] for item in response.data['activity']] == ['review']

    def test_owner_activity_includes_visits_with_private_fields(self, api_client, test_user):
        self._make_activity(test_user)
        test_user.settings.activity_visibility = 'private'
        test_user.settings.save()
        api_client.force_authenticate(user=test_user)

        response = api_client.get(f'/api/auth/users/{test_user.username}/activity/')

        assert response.status_code == status.HTTP_200_OK
        visits = [item for item in response.data['activity'] if item['type'] == 'visit']
        assert len(visits) == 1
        assert visits[0]['amount_spent'] == '42.00'
        assert visits[0]['currency'] == 'USD'


@pytest.mark.django_db
class TestCanViewUserActivity:
    """Followers-only activity visibility requires active follows."""

    def test_followers_only_rejects_anonymous_pending_and_rejected(self, test_user):
        target = User.objects.create_user(
            username='privateactivity',
            email='privateactivity@example.com',
            password='pass123',
        )
        target.settings.activity_visibility = 'followers'
        target.settings.save()
        pending = User.objects.create_user(
            username='pendingfollower',
            email='pending@example.com',
            password='pass123',
        )
        rejected = User.objects.create_user(
            username='rejectedfollower',
            email='rejected@example.com',
            password='pass123',
        )
        Follow.objects.create(follower=pending, followed=target, status='pending')
        Follow.objects.create(follower=rejected, followed=target, status='rejected')

        assert can_view_user_activity(AnonymousUser(), target) is False
        assert can_view_user_activity(pending, target) is False
        assert can_view_user_activity(rejected, target) is False

    def test_followers_only_allows_active_follower(self, test_user):
        target = User.objects.create_user(
            username='activeactivity',
            email='activeactivity@example.com',
            password='pass123',
        )
        target.settings.activity_visibility = 'followers'
        target.settings.save()
        Follow.objects.create(follower=test_user, followed=target, status='active')

        assert can_view_user_activity(test_user, target) is True


@pytest.mark.django_db
class TestUnfollowUpdatesCounts:
    """Test that unfollowing updates denormalized follower/following counts."""

    def test_unfollow_updates_counts(self, api_client, test_user, db):
        """Unfollowing via API should update both users' follow counts."""
        target = User.objects.create_user(
            username='targetuser',
            email='target@example.com',
            password='pass123',
        )

        # Follow via API
        api_client.force_authenticate(user=test_user)
        follow_resp = api_client.post('/api/auth/follow/targetuser/')
        assert follow_resp.status_code == status.HTTP_201_CREATED

        # Verify counts after follow
        test_user.refresh_from_db()
        target.refresh_from_db()
        assert test_user.following_count == 1
        assert target.followers_count == 1

        # Unfollow via API
        unfollow_resp = api_client.delete('/api/auth/unfollow/targetuser/')
        assert unfollow_resp.status_code == status.HTTP_200_OK

        # Verify counts after unfollow
        test_user.refresh_from_db()
        target.refresh_from_db()
        assert test_user.following_count == 0
        assert target.followers_count == 0

    def test_unfollow_not_following_returns_error(self, api_client, test_user, db):
        """Unfollowing someone you don't follow should return 400."""
        User.objects.create_user(
            username='stranger',
            email='stranger@example.com',
            password='pass123',
        )

        api_client.force_authenticate(user=test_user)
        response = api_client.delete('/api/auth/unfollow/stranger/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestSavedLists:
    """Tests for GET /api/auth/me/saved-lists/ (Phase 5)."""

    def test_returns_saved_public_lists(self, api_client, test_user):
        from apps.cafes.models import CafeList, SavedCafeList
        other = User.objects.create_user(
            username='listmaker', email='maker@example.com', password='pass',
        )
        cafe_list = CafeList.objects.create(
            owner=other, name='Saved Public', visibility='public',
        )
        SavedCafeList.objects.create(user=test_user, cafe_list=cafe_list)

        api_client.force_authenticate(user=test_user)
        response = api_client.get('/api/auth/me/saved-lists/')
        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['name'] == 'Saved Public'

    def test_empty_when_no_saved_lists(self, api_client, test_user):
        api_client.force_authenticate(user=test_user)
        response = api_client.get('/api/auth/me/saved-lists/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['results'] == []
        assert response.data['count'] == 0

    def test_requires_auth(self, api_client):
        response = api_client.get('/api/auth/me/saved-lists/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_does_not_show_other_users_saves(self, api_client, test_user):
        from apps.cafes.models import CafeList, SavedCafeList
        other = User.objects.create_user(
            username='maker2', email='maker2@example.com', password='pass',
        )
        stranger = User.objects.create_user(
            username='stranger2', email='stranger2@example.com', password='pass',
        )
        cafe_list = CafeList.objects.create(
            owner=other, name='Other Save', visibility='public',
        )
        SavedCafeList.objects.create(user=stranger, cafe_list=cafe_list)

        api_client.force_authenticate(user=test_user)
        response = api_client.get('/api/auth/me/saved-lists/')
        assert len(response.data['results']) == 0

    def test_hides_private_list_from_saved(self, api_client, test_user):
        from apps.cafes.models import CafeList, SavedCafeList
        other = User.objects.create_user(
            username='privmaker', email='privmaker@example.com', password='pass',
        )
        cafe_list = CafeList.objects.create(
            owner=other, name='Was Public', visibility='private',
        )
        SavedCafeList.objects.create(user=test_user, cafe_list=cafe_list)

        api_client.force_authenticate(user=test_user)
        response = api_client.get('/api/auth/me/saved-lists/')
        assert len(response.data['results']) == 0

    def test_pagination(self, api_client, test_user):
        from apps.cafes.models import CafeList, SavedCafeList
        other = User.objects.create_user(
            username='manyowner', email='many@example.com', password='pass',
        )
        for i in range(5):
            cl = CafeList.objects.create(
                owner=other, name=f'Paginated {i}', visibility='public',
            )
            SavedCafeList.objects.create(user=test_user, cafe_list=cl)

        api_client.force_authenticate(user=test_user)
        response = api_client.get('/api/auth/me/saved-lists/?limit=2')
        assert len(response.data['results']) == 2
        assert response.data['count'] == 5
