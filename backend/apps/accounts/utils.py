"""
Utility functions for the accounts app.
"""
from .models import User, Follow


def get_user_by_username_or_id(value: str) -> User:
    if value.isdigit():
        try:
            return User.objects.get(id=int(value))
        except User.DoesNotExist:
            pass
    return User.objects.get(username=value)


def is_own_profile(request, user) -> bool:
    return (
        request and
        hasattr(request, 'user') and
        request.user.is_authenticated and
        request.user.id == user.id
    )


def check_is_following(request, user) -> bool:
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        return Follow.objects.filter(follower=request.user, followed=user).exists()
    return False


def can_view_user_activity(viewer: User, target_user: User) -> bool:
    """
    Check if viewer can see target_user's activity based on privacy settings.

    Args:
        viewer: The user trying to view activity
        target_user: The user whose activity is being viewed

    Returns:
        True if viewer can see activity, False otherwise
    """
    # Own activity is always visible
    if viewer == target_user:
        return True

    # Get target user's settings (auto-created via signals)
    settings = target_user.settings

    # Public activity is visible to all
    if settings.activity_visibility == 'public':
        return True

    # Private activity is only visible to self
    if settings.activity_visibility == 'private':
        return False

    # Followers-only: check if viewer follows target
    if settings.activity_visibility == 'followers':
        return Follow.objects.filter(
            follower=viewer,
            followed=target_user
        ).exists()

    return False
