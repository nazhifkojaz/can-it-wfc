"""
Tests for Activity model.
"""
import pytest
from django.contrib.auth import get_user_model
from apps.cafes.models import Cafe
from apps.reviews.models import Visit
from apps.activity.models import Activity, ActivityType

User = get_user_model()


@pytest.fixture
def user(db):
    """Create a test user."""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def cafe(db):
    """Create a test cafe."""
    return Cafe.objects.create(
        name='Test Cafe',
        google_place_id='test123',
        latitude=0.0,
        longitude=0.0,
        address='123 Test St'
    )


@pytest.mark.django_db
def test_create_activity(user, cafe):
    """Test creating an activity."""
    activity = Activity.objects.create(
        recipient=user,
        actor=user,
        activity_type=ActivityType.VISIT,
        data={'cafe_name': 'Test Cafe', 'cafe_id': cafe.id}
    )

    assert activity.recipient == user
    assert activity.actor == user
    assert activity.activity_type == ActivityType.VISIT
    assert activity.data['cafe_name'] == 'Test Cafe'
    assert activity.is_deleted is False


@pytest.mark.django_db
def test_activity_str(user):
    """Test activity string representation."""
    activity = Activity.objects.create(
        recipient=user,
        actor=user,
        activity_type=ActivityType.VISIT,
        data={}
    )

    expected = f"testuser -> visit (seen by testuser)"
    assert str(activity) == expected


@pytest.mark.django_db
def test_soft_delete(user):
    """Test soft deleting an activity."""
    activity = Activity.objects.create(
        recipient=user,
        actor=user,
        activity_type=ActivityType.VISIT,
        data={}
    )

    # Soft delete
    activity.is_deleted = True
    activity.save()

    # Should still exist but marked as deleted
    assert Activity.objects.filter(id=activity.id).exists()
    assert activity.is_deleted is True


@pytest.mark.django_db
def test_ordering(user):
    """Test default ordering by created_at descending."""
    activity1 = Activity.objects.create(
        recipient=user,
        actor=user,
        activity_type=ActivityType.VISIT,
        data={}
    )

    activity2 = Activity.objects.create(
        recipient=user,
        actor=user,
        activity_type=ActivityType.VISIT,
        data={}
    )

    activities = list(Activity.objects.all())

    # Newest first
    assert activities[0].id == activity2.id
    assert activities[1].id == activity1.id
