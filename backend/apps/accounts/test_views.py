"""
User view tests - privacy settings and OAuth endpoints.

Tests mock the external OAuth service.
"""
import pytest
from unittest.mock import patch
from rest_framework import status


@pytest.mark.django_db
class TestOAuthLoginView:
    """Test generic OAuth login endpoint."""

    def test_oauth_login_with_google_provider_success(self, api_client, disable_throttle, django_user_model):
        """Test successful Google OAuth login returns tokens in cookies."""
        user = django_user_model.objects.create_user(
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

    def test_oauth_login_returns_created_flag_from_service(self, api_client, disable_throttle, django_user_model):
        """Test OAuth login response preserves the service-created flag."""
        new_user = django_user_model.objects.create_user(
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
