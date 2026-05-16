"""
Tests for OAuth models, service layer — provider verification, account linking,
and new user creation.
"""
import pytest
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from apps.accounts.models import LinkedProvider
from apps.accounts.services.oauth_service import (
    authenticate_via_oauth,
    get_provider,
    PROVIDERS,
    OAuthUserInfo,
)
from core.exceptions import OAuthTokenInvalid, OAuthEmailNotProvided

User = get_user_model()


# -- Model tests --


@pytest.mark.django_db
class TestLinkedProviderModel:
    """Test LinkedProvider model constraints and behavior."""

    _user_counter = 0

    def _create_user(self, **overrides):
        self._user_counter += 1
        defaults = {
            'username': f'testuser{self._user_counter}',
            'email': f'test{self._user_counter}@example.com',
            'password': 'pass',
        }
        defaults.update(overrides)
        return User.objects.create_user(**defaults)

    def _create_link(self, **overrides):
        user = overrides.pop('user', None) or self._create_user()
        defaults = {
            'user': user,
            'provider': 'google',
            'provider_user_id': 'sub123',
            'email': user.email,
        }
        defaults.update(overrides)
        return LinkedProvider.objects.create(**defaults)

    def test_create_linked_provider(self):
        user = self._create_user(email='linked@example.com')
        link = self._create_link(user=user, email='linked@example.com')
        assert link.provider == 'google'
        assert link.provider_user_id == 'sub123'
        assert link.email == 'linked@example.com'
        assert link.linked_at is not None
        assert link.last_used_at is not None

    def test_str_representation(self):
        user = self._create_user(username='linkuser')
        link = self._create_link(user=user)
        assert str(link) == "linkuser → google"

    def test_unique_constraint_provider_and_provider_user_id(self):
        self._create_link(provider='google', provider_user_id='sub123')
        with pytest.raises(IntegrityError):
            self._create_link(provider='google', provider_user_id='sub123')

    def test_same_provider_different_ids_allowed(self):
        link1 = self._create_link(provider='google', provider_user_id='id1')
        link2 = self._create_link(provider='google', provider_user_id='id2')
        assert link1.pk != link2.pk

    def test_cascade_delete_user_removes_links(self):
        link = self._create_link()
        user_id = link.user.pk
        link.user.delete()
        assert not LinkedProvider.objects.filter(user_id=user_id).exists()


# -- Provider registry tests --


class TestProviderRegistry:
    def test_get_provider_google(self):
        provider = get_provider('google')
        assert provider.get_provider_name() == 'google'

    def test_get_provider_unknown_raises(self):
        with pytest.raises(ValueError, match="Unknown OAuth provider"):
            get_provider('github')


# -- authenticate_via_oauth tests --


@pytest.mark.django_db
class TestAuthenticateViaOAuth:
    """Test the main OAuth authentication orchestrator."""

    def _mock_user_info(self, **overrides):
        defaults = {
            'provider_user_id': 'prov123',
            'email': 'user@example.com',
            'display_name': 'testuser',
            'avatar_url': 'https://example.com/avatar.jpg',
        }
        return OAuthUserInfo(**{**defaults, **overrides})

    @patch.object(PROVIDERS['google'], 'verify_token')
    def test_existing_link_returns_user(self, mock_verify):
        """If provider+provider_user_id already linked, return that user."""
        user = User.objects.create_user(
            username='existing', email='user@example.com', password='pass'
        )
        LinkedProvider.objects.create(
            user=user,
            provider='google',
            provider_user_id='prov123',
            email='user@example.com',
        )
        mock_verify.return_value = self._mock_user_info()

        result_user, created = authenticate_via_oauth('google', 'token')

        assert created is False
        assert result_user.pk == user.pk
        mock_verify.assert_called_once_with('token')

    @patch.object(PROVIDERS['google'], 'verify_token')
    def test_existing_link_updates_avatar(self, mock_verify):
        """If linked user exists, update avatar from provider."""
        user = User.objects.create_user(
            username='existing', email='user@example.com', password='pass',
            avatar_url='',
        )
        LinkedProvider.objects.create(
            user=user,
            provider='google',
            provider_user_id='prov123',
            email='user@example.com',
        )
        mock_verify.return_value = self._mock_user_info(
            avatar_url='https://new.avatar/pic.jpg'
        )

        result_user, _ = authenticate_via_oauth('google', 'token')

        result_user.refresh_from_db()
        assert result_user.avatar_url == 'https://new.avatar/pic.jpg'

    @patch.object(PROVIDERS['google'], 'verify_token')
    def test_matching_email_links_to_existing_user(self, mock_verify):
        """If no link exists but email matches, link provider to existing user."""
        user = User.objects.create_user(
            username='existing', email='user@example.com', password='pass'
        )
        mock_verify.return_value = self._mock_user_info()

        result_user, created = authenticate_via_oauth('google', 'token')

        assert created is False
        assert result_user.pk == user.pk
        assert LinkedProvider.objects.filter(
            user=user, provider='google', provider_user_id='prov123'
        ).exists()

    @patch.object(PROVIDERS['google'], 'verify_token')
    def test_matching_email_updates_avatar(self, mock_verify):
        """Account linking also sets avatar if user has none."""
        user = User.objects.create_user(
            username='existing', email='user@example.com', password='pass',
            avatar_url='',
        )
        mock_verify.return_value = self._mock_user_info(
            avatar_url='https://google.com/photo.jpg'
        )

        result_user, _ = authenticate_via_oauth('google', 'token')

        result_user.refresh_from_db()
        assert result_user.avatar_url == 'https://google.com/photo.jpg'

    @patch.object(PROVIDERS['google'], 'verify_token')
    def test_new_user_created_via_oauth(self, mock_verify):
        """No existing link or email → create new user."""
        mock_verify.return_value = self._mock_user_info(
            display_name='googlehandle'
        )

        result_user, created = authenticate_via_oauth('google', 'token')

        assert created is True
        assert result_user.username == 'googlehandle'
        assert result_user.email == 'user@example.com'
        assert result_user.is_active is True
        assert LinkedProvider.objects.filter(
            user=result_user, provider='google'
        ).exists()

    @patch.object(PROVIDERS['google'], 'verify_token')
    def test_new_user_username_deduplicated(self, mock_verify):
        """Username collision gets a numeric suffix."""
        User.objects.create_user(
            username='testuser', email='other@example.com', password='pass'
        )
        mock_verify.return_value = self._mock_user_info(display_name='testuser')

        result_user, created = authenticate_via_oauth('google', 'token')

        assert created is True
        assert result_user.username == 'testuser1'

    @patch.object(PROVIDERS['google'], 'verify_token')
    def test_new_user_falls_back_to_email_prefix(self, mock_verify):
        """If no display_name, username comes from email prefix."""
        mock_verify.return_value = self._mock_user_info(display_name='')

        result_user, created = authenticate_via_oauth('google', 'token')

        assert created is True
        assert result_user.username == 'user'  # "user" from user@example.com

    @patch.object(PROVIDERS['google'], 'verify_token')
    def test_multiple_username_collisions(self, mock_verify):
        """Multiple collisions increment suffix correctly."""
        User.objects.create_user(username='test', email='a@a.com', password='p')
        User.objects.create_user(username='test1', email='b@b.com', password='p')
        User.objects.create_user(username='test2', email='c@c.com', password='p')
        mock_verify.return_value = self._mock_user_info(display_name='test')

        result_user, _ = authenticate_via_oauth('google', 'token')

        assert result_user.username == 'test3'

    def test_invalid_provider_raises(self):
        with pytest.raises(ValueError, match="Unknown OAuth provider"):
            authenticate_via_oauth('facebook', 'token')

    @patch.object(PROVIDERS['google'], 'verify_token')
    def test_token_verification_failure_propagates(self, mock_verify):
        """OAuth exceptions from verify_token are not swallowed."""
        mock_verify.side_effect = OAuthTokenInvalid(detail="bad token")

        with pytest.raises(OAuthTokenInvalid, match="bad token"):
            authenticate_via_oauth('google', 'token')

    @patch.object(PROVIDERS['google'], 'verify_token')
    def test_email_not_provided_propagates(self, mock_verify):
        """OAuthEmailNotProvided from verify_token is not swallowed."""
        mock_verify.side_effect = OAuthEmailNotProvided(provider='Google')

        with pytest.raises(OAuthEmailNotProvided):
            authenticate_via_oauth('google', 'token')
