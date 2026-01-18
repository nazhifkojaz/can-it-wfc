"""
Custom API exceptions for common error scenarios.
Provides consistent error codes and messages across the application.
"""
from rest_framework.exceptions import APIException
from rest_framework import status


# =============================================================================
# CAFE EXCEPTIONS
# =============================================================================

class CafeNotFound(APIException):
    """Raised when a cafe doesn't exist."""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Cafe not found'
    default_code = 'cafe_not_found'


class AlreadyFavorited(APIException):
    """Raised when trying to favorite an already-favorited cafe."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Cafe already in favorites'
    default_code = 'already_favorited'


class NotFavorited(APIException):
    """Raised when trying to unfavorite a cafe that isn't favorited."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Cafe is not in favorites'
    default_code = 'not_favorited'


# =============================================================================
# USER/ACCOUNT EXCEPTIONS
# =============================================================================

class UserNotFound(APIException):
    """Raised when a user doesn't exist."""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'User not found'
    default_code = 'user_not_found'


class SelfFollowNotAllowed(APIException):
    """Raised when trying to follow yourself."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'You cannot follow yourself'
    default_code = 'self_follow_not_allowed'


class AlreadyFollowing(APIException):
    """Raised when trying to follow an already-followed user."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'You are already following this user'
    default_code = 'already_following'


class NotFollowing(APIException):
    """Raised when trying to unfollow a user you're not following."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'You are not following this user'
    default_code = 'not_following'


class GoogleAuthError(APIException):
    """Raised when Google authentication fails."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Google authentication failed'
    default_code = 'google_auth_error'


class GoogleAuthTokenRequired(APIException):
    """Raised when Google access token is missing."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Google access token is required'
    default_code = 'google_token_required'


class GoogleEmailNotProvided(APIException):
    """Raised when Google doesn't provide email."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Email not provided by Google'
    default_code = 'google_email_not_provided'


# =============================================================================
# REVIEW EXCEPTIONS
# =============================================================================

class ReviewNotFound(APIException):
    """Raised when a review doesn't exist."""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Review not found'
    default_code = 'review_not_found'


class SelfHelpfulNotAllowed(APIException):
    """Raised when trying to mark own review as helpful."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'You cannot mark your own review as helpful'
    default_code = 'self_helpful_not_allowed'


class InvalidCafeIds(APIException):
    """Raised when cafe IDs are invalid."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid cafe IDs provided'
    default_code = 'invalid_cafe_ids'


class TooManyCafeIds(APIException):
    """Raised when too many cafe IDs are requested."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Maximum 100 cafe IDs per request'
    default_code = 'too_many_cafe_ids'
