from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.accounts.models import LinkedProvider
from core.exceptions import OAuthTokenInvalid, OAuthEmailNotProvided

User = get_user_model()


@dataclass
class OAuthUserInfo:
    """Normalized user data returned by any OAuth provider."""
    provider_user_id: str
    email: str
    display_name: str = ""
    avatar_url: Optional[str] = None


class OAuthProviderBase(ABC):
    """Base class for OAuth providers."""

    @abstractmethod
    def verify_token(self, token: str) -> OAuthUserInfo:
        """Verify the OAuth token and return normalized user data."""
        ...

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return provider identifier: 'google', etc."""
        ...


class GoogleOAuthProvider(OAuthProviderBase):
    """Verifies Google ID tokens using google-auth library."""

    def verify_token(self, token: str) -> OAuthUserInfo:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        try:
            idinfo = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                settings.SOCIALACCOUNT_PROVIDERS['google']['APP']['client_id'],
            )
        except ValueError as e:
            raise OAuthTokenInvalid(detail=f"Google token verification failed: {str(e)}")

        email = idinfo.get('email')
        if not email:
            raise OAuthEmailNotProvided(provider='Google')

        return OAuthUserInfo(
            provider_user_id=idinfo.get('sub'),
            email=email,
            avatar_url=idinfo.get('picture', ''),
        )

    def get_provider_name(self) -> str:
        return 'google'


# Registry of available providers
PROVIDERS: dict[str, OAuthProviderBase] = {
    'google': GoogleOAuthProvider(),
}


def get_provider(name: str) -> OAuthProviderBase:
    """Get an OAuth provider by name. Raises ValueError if not found."""
    if name not in PROVIDERS:
        raise ValueError(f"Unknown OAuth provider: {name}")
    return PROVIDERS[name]


def authenticate_via_oauth(provider_name: str, token: str) -> tuple:
    """
    Authenticate a user via OAuth. Returns (user, created) tuple.

    Logic:
    1. Verify token with the provider
    2. Check if a LinkedProvider exists for this provider+provider_user_id
    3. If yes -> return that user
    4. If no -> check if a user with that email exists
    5. If yes -> link provider to existing user (account linking)
    6. If no -> create new user with auto-generated username
    """
    provider = get_provider(provider_name)
    user_info = provider.verify_token(token)

    # Step 1: Check if this provider account is already linked
    existing_link = LinkedProvider.objects.filter(
        provider=provider_name,
        provider_user_id=user_info.provider_user_id,
    ).select_related('user').first()

    if existing_link:
        # Update last_used_at and avatar
        existing_link.last_used_at = timezone.now()
        if user_info.avatar_url:
            existing_link.avatar_url = user_info.avatar_url
            existing_link.user.avatar_url = user_info.avatar_url
            existing_link.user.save(update_fields=['avatar_url'])
        existing_link.save()
        return existing_link.user, False

    # Step 2: Check if user with this email exists (account linking)
    existing_user = User.objects.filter(email=user_info.email).first()

    if existing_user:
        # Link provider to existing user
        LinkedProvider.objects.create(
            user=existing_user,
            provider=provider_name,
            provider_user_id=user_info.provider_user_id,
            email=user_info.email,
            display_name=user_info.display_name,
            avatar_url=user_info.avatar_url,
        )
        if user_info.avatar_url:
            existing_user.avatar_url = user_info.avatar_url
            existing_user.save(update_fields=['avatar_url'])
        return existing_user, False

    # Step 3: Create new user
    base_username = user_info.display_name or user_info.email.split('@')[0]
    username = base_username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}{counter}"
        counter += 1

    user = User.objects.create(
        email=user_info.email,
        username=username,
        avatar_url=user_info.avatar_url or '',
        is_active=True,
    )

    LinkedProvider.objects.create(
        user=user,
        provider=provider_name,
        provider_user_id=user_info.provider_user_id,
        email=user_info.email,
        display_name=user_info.display_name,
        avatar_url=user_info.avatar_url,
    )

    return user, True
