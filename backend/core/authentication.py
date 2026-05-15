"""
Custom authentication classes for cookie-based JWT authentication.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework.authentication import CSRFCheck
from rest_framework import exceptions
from django.conf import settings


SAFE_METHODS = ('GET', 'HEAD', 'OPTIONS', 'TRACE')


class JWTCookieAuthentication(JWTAuthentication):
    """
    Custom JWT authentication class that reads tokens from httpOnly cookies
    instead of Authorization header.

    Falls back to header-based authentication for backward compatibility.
    """

    def authenticate(self, request):
        cookie_name = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE', 'access_token')
        raw_token = request.COOKIES.get(cookie_name)
        token_from_cookie = raw_token is not None

        if raw_token is None:
            header = self.get_header(request)
            if header is None:
                return None

            raw_token = self.get_raw_token(header)
            if raw_token is None:
                return None

        try:
            validated_token = self.get_validated_token(raw_token)
            if token_from_cookie and request.method not in SAFE_METHODS:
                self.enforce_csrf(request)
            return self.get_user(validated_token), validated_token
        except (InvalidToken, AuthenticationFailed):
            return None

    def enforce_csrf(self, request):
        def dummy_get_response(request):
            return None

        check = CSRFCheck(dummy_get_response)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied(f'CSRF Failed: {reason}')
