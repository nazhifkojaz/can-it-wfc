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

        # Content Security Policy (CSP)
        # Restricts which resources can be loaded to prevent XSS attacks
        csp_directives = [
            "default-src 'self'",
            # Scripts: self + Google OAuth + Google Maps
            "script-src 'self' https://accounts.google.com https://maps.googleapis.com",
            # Styles: self + inline (for CSS-in-JS) + Google Fonts
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            # Images: self + data URIs + blob + any HTTPS (for avatars, map tiles, Cloudinary)
            "img-src 'self' data: blob: https: http:",
            # Fonts: self + data URIs + Google Fonts
            "font-src 'self' data: https://fonts.gstatic.com",
            # Connect: self + Google APIs + Cloudinary
            "connect-src 'self' https://maps.googleapis.com https://places.googleapis.com "
            "https://api.cloudinary.com https://res.cloudinary.com",
            # Frames: Google OAuth popup
            "frame-src https://accounts.google.com",
            # Base URI restriction
            "base-uri 'self'",
            # Form submission restriction
            "form-action 'self'",
            # Block object/embed/applet
            "object-src 'none'",
        ]
        response['Content-Security-Policy'] = '; '.join(csp_directives)

        return response
