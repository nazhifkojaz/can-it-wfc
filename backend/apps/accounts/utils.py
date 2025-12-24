"""
Utility functions for the accounts app.
"""
from .models import User, Follow


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
