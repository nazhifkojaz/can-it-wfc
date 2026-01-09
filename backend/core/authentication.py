"""
Custom authentication classes for cookie-based JWT authentication.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from django.conf import settings


class JWTCookieAuthentication(JWTAuthentication):
    """
    Custom JWT authentication class that reads tokens from httpOnly cookies
    instead of Authorization header.

    Falls back to header-based authentication for backward compatibility.
    """

    def authenticate(self, request):
        # First, try to get token from cookie
        cookie_name = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE', 'access_token')
        raw_token = request.COOKIES.get(cookie_name)

        if raw_token is None:
            # Fallback to Authorization header for backward compatibility
            header = self.get_header(request)
            if header is None:
                return None

            raw_token = self.get_raw_token(header)
            if raw_token is None:
                return None

        # Validate token and return user
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
