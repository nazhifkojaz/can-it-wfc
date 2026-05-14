"""
Custom API exceptions for common error scenarios.
Provides consistent error codes and messages across the application.
"""
from rest_framework.exceptions import APIException
from rest_framework import status


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


class ListNotFound(APIException):
    """Raised when a cafe list doesn't exist or belongs to another user."""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'List not found'
    default_code = 'list_not_found'


class DefaultListCannotBeDeleted(APIException):
    """Raised when trying to delete the user's default list."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'The default list cannot be deleted'
    default_code = 'default_list_cannot_be_deleted'


class ListLimitReached(APIException):
    """Raised when a user hits the per-user list cap."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'You have reached the maximum number of lists'
    default_code = 'list_limit_reached'


class ListItemLimitReached(APIException):
    """Raised when a list hits the per-list item cap."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'This list has reached the maximum number of items'
    default_code = 'list_item_limit_reached'


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


class OAuthTokenInvalid(APIException):
    """Raised when OAuth token verification fails."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'OAuth token verification failed'
    default_code = 'oauth_token_invalid'


class OAuthTokenRequired(APIException):
    """Raised when OAuth access token is missing from request."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'OAuth access token is required'
    default_code = 'oauth_token_required'


class OAuthEmailNotProvided(APIException):
    """Raised when OAuth provider doesn't return an email."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Email not provided by OAuth provider'
    default_code = 'oauth_email_not_provided'

    def __init__(self, provider: str = 'OAuth provider', **kwargs):
        detail = f'Email not provided by {provider}. Please ensure email sharing is enabled.'
        super().__init__(detail=detail, **kwargs)


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


class FollowRequestAlreadySent(APIException):
    """Raised when a follow request was already sent."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Follow request already sent'
    default_code = 'follow_request_already_sent'


class FollowRequestNotFound(APIException):
    """Raised when a follow request doesn't exist."""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Follow request not found'
    default_code = 'follow_request_not_found'
