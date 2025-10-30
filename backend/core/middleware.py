"""
Security headers middleware for Can-It-WFC
"""


class SecurityHeadersMiddleware:
    """
    Add security headers to all responses.

    This middleware adds various security-related HTTP headers to protect
    against common web vulnerabilities like clickjacking, XSS, and MIME sniffing.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Prevent clickjacking attacks
        response['X-Frame-Options'] = 'DENY'

        # Prevent MIME type sniffing
        response['X-Content-Type-Options'] = 'nosniff'

        # Enable XSS protection in older browsers
        response['X-XSS-Protection'] = '1; mode=block'

        # Referrer policy - only send origin when cross-origin
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Permissions policy - restrict browser features
        response['Permissions-Policy'] = 'geolocation=(self), microphone=(), camera=()'

        return response
