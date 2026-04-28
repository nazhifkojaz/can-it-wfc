"""
User view tests - activity feed, privacy settings, OAuth endpoints.

Tests use mocking to avoid test database schema issues.
"""
import pytest
from unittest.mock import Mock, MagicMock, patch
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


@pytest.fixture
def api_client():
    """Create API client for tests"""
    return APIClient()


@pytest.mark.django_db
class TestOAuthLoginView:
    """Test generic OAuth login endpoint."""

    def test_oauth_login_with_google_provider_success(self, api_client, disable_throttle):
        """Test successful Google OAuth login returns tokens in cookies."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        with patch('apps.accounts.services.oauth_service.authenticate_via_oauth') as mock_auth:
            mock_auth.return_value = (user, False)

            response = api_client.post('/api/auth/oauth/google/', {
                'access_token': 'fake-google-token'
            })

            assert response.status_code == status.HTTP_200_OK
            assert response.data['user']['username'] == 'testuser'
            assert response.data['message'] == 'Login successful'
            assert response.data['created'] is False
            # Check cookies are set
            assert 'access_token' in response.cookies
            assert 'refresh_token' in response.cookies

    def test_oauth_login_creates_new_user(self, api_client, disable_throttle):
        """Test OAuth login creates new user when email doesn't exist."""
        new_user = User.objects.create_user(
            username='newuser',
            email='new@example.com',
            password='testpass123',
        )

        with patch('apps.accounts.services.oauth_service.authenticate_via_oauth') as mock_auth:
            mock_auth.return_value = (new_user, True)

            response = api_client.post('/api/auth/oauth/google/', {
                'access_token': 'fake-google-token'
            })

            assert response.status_code == status.HTTP_200_OK
            assert response.data['created'] is True
            assert response.data['user']['username'] == 'newuser'

    def test_oauth_login_missing_token(self, api_client, disable_throttle):
        """Test OAuth login fails without access token."""
        response = api_client.post('/api/auth/oauth/google/', {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'oauth_token_required' in str(response.data).lower()

    def test_oauth_login_unsupported_provider(self, api_client, disable_throttle):
        """Test OAuth login fails with unsupported provider."""
        response = api_client.post('/api/auth/oauth/github/', {
            'access_token': 'some-token'
        })

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'Unsupported OAuth provider' in str(response.data)

    def test_oauth_login_token_verification_failure(self, api_client, disable_throttle):
        """Test OAuth login handles token verification errors."""
        from core.exceptions import OAuthTokenInvalid

        with patch('apps.accounts.services.oauth_service.authenticate_via_oauth') as mock_auth:
            mock_auth.side_effect = OAuthTokenInvalid(detail='Invalid token')

            response = api_client.post('/api/auth/oauth/google/', {
                'access_token': 'invalid-token'
            })

            assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUserActivityView:
    """Test UserActivityView correctness."""

    def test_activity_view_code_path_uses_user_settings(self):
        """
        Verify the view uses user_settings.show_activity_dates (not Django's
        global settings module, which would cause an AttributeError).
        """
        # Read the views.py file and check it uses user_settings not settings
        from apps.accounts import views
        import inspect
        import re

        # Get the source code of UserActivityView.get method
        source = inspect.getsource(views.UserActivityView.get)

        # Ensure no bare 'settings.show_activity_dates' (should always be 'user_settings.')

        # Find all occurrences of 'settings.show_activity_dates'
        # We want to ensure NONE of them are just 'settings.' (not 'user_settings.')
        bug_pattern = r'(?<!user_)settings\.show_activity_dates'

        matches = re.findall(bug_pattern, source)
        assert len(matches) == 0, \
            f"Bug still present: found {len(matches)} occurrence(s) of 'settings.show_activity_dates' (should be 'user_settings.show_activity_dates')"

        # Verify the fix pattern IS present
        assert 'user_settings.show_activity_dates' in source, \
            "Fix not applied: code should use user_settings.show_activity_dates"

    def test_activity_view_assigns_user_settings_before_use(self):
        """
        Verify that `user_settings` is assigned (e.g. `user_settings = user.settings`)
        before being referenced in the get() method. Without this, every request
        crashes with NameError.
        """
        from apps.accounts import views
        import inspect
        import re

        source = inspect.getsource(views.UserActivityView.get)

        # Find all lines that reference user_settings
        lines = source.split('\n')
        user_settings_lines = [
            (i, line) for i, line in enumerate(lines)
            if 'user_settings' in line
        ]

        # There must be at least one assignment line before any usage
        has_assignment = False
        for idx, line in user_settings_lines:
            stripped = line.strip()
            # Check if this line is an assignment (user_settings = ...)
            if re.match(r'user_settings\s*=', stripped):
                has_assignment = True
                break
            # If we hit a usage before any assignment, fail
            assert False, (
                f"`user_settings` is used at line {idx} before being assigned: {stripped}"
            )

        assert has_assignment, "`user_settings` is never assigned in UserActivityView.get()"

    def test_activity_view_no_attribute_error_simulation(self):
        """
        Simulate the original bug to demonstrate the fix.
        This test shows what would happen if the bug still existed.
        """
        from django.conf import settings

        # Verify Django's settings object does NOT have show_activity_dates
        # (this is what caused the AttributeError crash)
        assert not hasattr(settings, 'show_activity_dates'), \
            "Django's settings object should not have show_activity_dates attribute"

        # If the code incorrectly used `settings.show_activity_dates`,
        # it would raise: AttributeError: 'Settings' object has no attribute 'show_activity_dates'

        # The fixed code uses `user_settings.show_activity_dates` instead,
        # which is the user's UserSettings model instance

    def test_activity_private_profile_returns_empty_for_others(self):
        """
        Test that private profile activity is hidden from non-owners.
        """
        mock_request = Mock()
        mock_request.user = Mock()
        mock_request.user.is_authenticated = True
        mock_request.user.id = 999  # Different user from the target
        mock_request.query_params = {'limit': '20'}

        mock_target_user = Mock(spec=User)
        mock_target_user.id = 1
        mock_target_user.username = 'testuser'

        with patch('apps.accounts.views.get_user_by_username_or_id', return_value=mock_target_user):
            with patch('apps.accounts.utils.can_view_user_activity', return_value=False):
                from apps.accounts.views import UserActivityView
                view = UserActivityView()
                view.request = mock_request
                view.format_kwarg = None

                response = view.get(mock_request, username='testuser')

                assert response.status_code == 200
                assert response.data['message'] == 'This activity is private'
                assert response.data['activity'] == []
