"""
User serializer tests - display_name, username cooldown, avatar URL validation.
"""
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework import serializers
from apps.accounts.serializers import UserProfileSerializer, UserUpdateSerializer

User = get_user_model()


class MockAnonymousRequest:
    class Anonymous:
        is_authenticated = False

    user = Anonymous()


@pytest.mark.django_db
class TestUserUpdateSerializer:
    """Test UserUpdateSerializer - display_name, username cooldown, avatar URL validation."""

    def test_display_name_is_editable(self):
        """
        Test display_name can be updated anytime (no cooldown).
        """
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        class MockRequest:
            def __init__(self, user):
                self.user = user

        # Update display_name
        serializer = UserUpdateSerializer(
            instance=user,
            data={'display_name': 'Coffee Lover'},
            partial=True,
            context={'request': MockRequest(user)}
        )

        assert serializer.is_valid(), serializer.errors
        serializer.save()
        user.refresh_from_db()
        assert user.display_name == 'Coffee Lover'

    def test_display_name_falls_back_to_username_when_empty(self):
        """
        Test effective_display_name returns username when display_name is not set.
        """
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        # display_name is None
        assert user.display_name is None
        # effective_display_name should return username
        assert user.effective_display_name == 'testuser'

    def test_display_name_is_used_when_set(self):
        """
        Test effective_display_name returns display_name when set.
        """
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            display_name='Display Name'
        )

        # effective_display_name should return custom display_name
        assert user.effective_display_name == 'Display Name'

    def test_display_name_with_anonymous_mode(self):
        """
        Test that display_name is also masked when anonymous mode is on.
        """
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            display_name='John Doe Smith',
        )
        user.settings.profile_visibility = 'private'
        user.settings.save()

        # Should mask the display_name (3 chars + 11 asterisks for "John Doe Smith")
        assert user.effective_display_name == 'Joh***********'

    def test_username_change_allowed_with_cooldown(self):
        """
        Test username change is allowed but has 30-day cooldown.
        """
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        class MockRequest:
            def __init__(self, user):
                self.user = user

        # First username change should work
        serializer = UserUpdateSerializer(
            instance=user,
            data={'username': 'newusername'},
            partial=True,
            context={'request': MockRequest(user)}
        )

        assert serializer.is_valid(), serializer.errors
        serializer.save()
        user.refresh_from_db()
        assert user.username == 'newusername'
        assert user.username_changed_at is not None

    def test_username_change_rejected_during_cooldown(self):
        """
        Test username change is rejected during 30-day cooldown period.
        """
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            username_changed_at=timezone.now() - timedelta(days=15)  # 15 days ago
        )

        class MockRequest:
            def __init__(self, user):
                self.user = user

        serializer = UserUpdateSerializer(
            instance=user,
            data={'username': 'anothername'},
            partial=True,
            context={'request': MockRequest(user)}
        )

        assert not serializer.is_valid()
        assert 'username' in serializer.errors
        assert '15 days remaining' in str(serializer.errors['username'])

    def test_username_change_allowed_after_cooldown(self):
        """
        Test username change is allowed after 30-day cooldown.
        """
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            username_changed_at=timezone.now() - timedelta(days=31)  # 31 days ago
        )

        class MockRequest:
            def __init__(self, user):
                self.user = user

        serializer = UserUpdateSerializer(
            instance=user,
            data={'username': 'anothername'},
            partial=True,
            context={'request': MockRequest(user)}
        )

        assert serializer.is_valid(), serializer.errors

    def test_username_change_rejected_if_duplicate(self):
        """
        Test username change is rejected if username already exists.
        """
        user1 = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        user2 = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )

        class MockRequest:
            def __init__(self, user):
                self.user = user2

        # Try to change to existing username
        serializer = UserUpdateSerializer(
            instance=user2,
            data={'username': 'testuser'},
            partial=True,
            context={'request': MockRequest(user2)}
        )

        assert not serializer.is_valid()
        assert 'username' in serializer.errors
        assert 'already taken' in str(serializer.errors['username'])

    def test_username_no_change_does_not_trigger_cooldown(self):
        """
        Test that setting username to same value doesn't trigger cooldown check.
        """
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        class MockRequest:
            def __init__(self, user):
                self.user = user

        serializer = UserUpdateSerializer(
            instance=user,
            data={'username': 'testuser'},  # Same username
            partial=True,
            context={'request': MockRequest(user)}
        )

        assert serializer.is_valid(), serializer.errors
        serializer.save()
        user.refresh_from_db()
        # username_changed_at should still be None
        assert user.username_changed_at is None

    # ===== Avatar URL validation tests =====

    def test_avatar_url_allows_cloudinary(self):
        """Test avatar_url accepts Cloudinary URLs"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        valid_cloudinary_url = 'https://res.cloudinary.com/demo/image/upload/v123/avatar.jpg'

        class MockRequest:
            def __init__(self, user):
                self.user = user

        serializer = UserUpdateSerializer(
            instance=user,
            data={'avatar_url': valid_cloudinary_url},
            partial=True,
            context={'request': MockRequest(user)}
        )

        assert serializer.is_valid(), serializer.errors
        serializer.save()
        user.refresh_from_db()
        assert user.avatar_url == valid_cloudinary_url

    def test_avatar_url_allows_google(self):
        """Test avatar_url accepts Google-hosted URLs"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        valid_google_url = 'https://lh3.googleusercontent.com/a-/abc123'

        class MockRequest:
            def __init__(self, user):
                self.user = user

        serializer = UserUpdateSerializer(
            instance=user,
            data={'avatar_url': valid_google_url},
            partial=True,
            context={'request': MockRequest(user)}
        )

        assert serializer.is_valid(), serializer.errors
        serializer.save()
        user.refresh_from_db()
        assert user.avatar_url == valid_google_url

    def test_avatar_url_rejects_disallowed_domain(self):
        """Test avatar_url rejects URLs from non-whitelisted domains"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        # Evil.com - not in whitelist
        evil_url = 'https://evil.com/avatar.jpg'

        class MockRequest:
            def __init__(self, user):
                self.user = user

        serializer = UserUpdateSerializer(
            instance=user,
            data={'avatar_url': evil_url},
            partial=True,
            context={'request': MockRequest(user)}
        )

        assert not serializer.is_valid()
        assert 'avatar_url' in serializer.errors

    def test_avatar_url_allows_null(self):
        """Test avatar_url can be set to null/empty to remove avatar"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            avatar_url='https://example.com/old.jpg'
        )

        class MockRequest:
            def __init__(self, user):
                self.user = user

        # Clear avatar
        serializer = UserUpdateSerializer(
            instance=user,
            data={'avatar_url': None},
            partial=True,
            context={'request': MockRequest(user)}
        )

        assert serializer.is_valid(), serializer.errors
        serializer.save()
        user.refresh_from_db()
        assert user.avatar_url is None

    def test_avatar_url_allows_empty_string(self):
        """Test avatar_url can be set to empty string to remove avatar"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            avatar_url='https://example.com/old.jpg'
        )

        class MockRequest:
            def __init__(self, user):
                self.user = user

        # Clear avatar with empty string
        serializer = UserUpdateSerializer(
            instance=user,
            data={'avatar_url': ''},
            partial=True,
            context={'request': MockRequest(user)}
        )

        assert serializer.is_valid(), serializer.errors
        serializer.save()
        user.refresh_from_db()
        # Empty string should be converted to None
        assert user.avatar_url is None

    def test_can_update_multiple_fields_at_once(self):
        """
        Test that display_name, bio, and avatar_url can be updated together.
        """
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

        data = {
            'display_name': 'Coffee Enthusiast',
            'bio': 'Love trying new cafes',
            'avatar_url': 'https://res.cloudinary.com/demo/avatar.jpg'
        }

        class MockRequest:
            def __init__(self, user):
                self.user = user

        serializer = UserUpdateSerializer(
            instance=user,
            data=data,
            partial=True,
            context={'request': MockRequest(user)}
        )

        assert serializer.is_valid(), serializer.errors
        serializer.save()
        user.refresh_from_db()
        assert user.display_name == 'Coffee Enthusiast'
        assert user.bio == 'Love trying new cafes'
        assert user.avatar_url == 'https://res.cloudinary.com/demo/avatar.jpg'


@pytest.mark.django_db
class TestUserProfileSerializer:
    """Test public profile privacy behavior."""

    def test_private_profile_limited_payload_masks_display_name(self):
        user = User.objects.create_user(
            username='privateuser',
            email='private@example.com',
            password='testpass123',
            display_name='Jane Doe',
        )
        user.settings.profile_visibility = 'private'
        user.settings.save()

        serializer = UserProfileSerializer(
            user,
            context={'request': MockAnonymousRequest()},
        )

        assert serializer.data['display_name'] == user.effective_display_name
        assert serializer.data['display_name'] != 'Jane Doe'
        assert serializer.data['profile_visibility'] == 'private'
