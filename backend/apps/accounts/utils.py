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
        return Follow.objects.filter(follower=request.user, followed=user, status='active').exists()
    return False
