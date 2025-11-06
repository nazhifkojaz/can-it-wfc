#!/usr/bin/env python
"""
Script to safely delete a test user and all related data.
This handles foreign key constraints by deleting in the correct order.

Usage:
    python delete_test_user.py <email_or_username>

Example:
    python delete_test_user.py test@gmail.com
    python delete_test_user.py testuser123
"""

import sys
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

User = get_user_model()


def delete_user(identifier):
    """Delete a user and all related data safely."""

    # Find user by email or username
    try:
        if '@' in identifier:
            user = User.objects.get(email=identifier)
        else:
            user = User.objects.get(username=identifier)
    except User.DoesNotExist:
        print(f"❌ User not found: {identifier}")
        return False

    print(f"\n🔍 Found user:")
    print(f"   ID: {user.id}")
    print(f"   Username: {user.username}")
    print(f"   Email: {user.email}")
    print(f"   Date joined: {user.date_joined}")

    # Count related objects
    from apps.reviews.models import Visit, Review
    from apps.cafes.models import Cafe, Favorite

    visits_count = Visit.objects.filter(user=user).count()
    reviews_count = Review.objects.filter(visit__user=user).count()
    cafes_count = Cafe.objects.filter(created_by=user).count()
    favorites_count = Favorite.objects.filter(user=user).count()
    tokens_count = OutstandingToken.objects.filter(user=user).count()

    print(f"\n📊 Related data:")
    print(f"   Visits: {visits_count}")
    print(f"   Reviews: {reviews_count}")
    print(f"   Cafes created: {cafes_count}")
    print(f"   Favorites: {favorites_count}")
    print(f"   JWT tokens: {tokens_count}")

    # Ask for confirmation
    confirm = input(f"\n⚠️  Delete user '{user.username}' and all related data? (yes/no): ")

    if confirm.lower() != 'yes':
        print("❌ Deletion cancelled")
        return False

    print("\n🗑️  Deleting...")

    # Delete in correct order to avoid foreign key constraints

    # 1. Delete blacklisted tokens
    blacklisted_count = BlacklistedToken.objects.filter(token__user=user).count()
    if blacklisted_count > 0:
        BlacklistedToken.objects.filter(token__user=user).delete()
        print(f"   ✓ Deleted {blacklisted_count} blacklisted tokens")

    # 2. Delete outstanding tokens
    if tokens_count > 0:
        OutstandingToken.objects.filter(user=user).delete()
        print(f"   ✓ Deleted {tokens_count} outstanding tokens")

    # 3. Delete reviews (CASCADE will handle this, but being explicit)
    if reviews_count > 0:
        Review.objects.filter(visit__user=user).delete()
        print(f"   ✓ Deleted {reviews_count} reviews")

    # 4. Delete visits
    if visits_count > 0:
        Visit.objects.filter(user=user).delete()
        print(f"   ✓ Deleted {visits_count} visits")

    # 5. Delete favorites
    if favorites_count > 0:
        Favorite.objects.filter(user=user).delete()
        print(f"   ✓ Deleted {favorites_count} favorites")

    # 6. Update cafes created by user (set created_by to null instead of deleting cafes)
    if cafes_count > 0:
        Cafe.objects.filter(created_by=user).update(created_by=None)
        print(f"   ✓ Unlinked {cafes_count} cafes (set created_by to null)")

    # 7. Finally, delete the user
    user_email = user.email
    user.delete()
    print(f"   ✓ Deleted user '{user_email}'")

    print(f"\n✅ User and all related data deleted successfully!")
    return True


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python delete_test_user.py <email_or_username>")
        print("Example: python delete_test_user.py test@gmail.com")
        sys.exit(1)

    identifier = sys.argv[1]
    delete_user(identifier)
