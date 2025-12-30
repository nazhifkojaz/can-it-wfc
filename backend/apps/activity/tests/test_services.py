"""
Tests for ActivityService.

PRIVACY NOTE:
Visit activity tests have been removed because visit activities are no longer
created (privacy fix - visits are now private).
"""
import pytest
from django.contrib.auth import get_user_model
from apps.cafes.models import Cafe
from apps.reviews.models import Visit, Review
from apps.accounts.models import Follow
from apps.activity.models import Activity, ActivityType
from apps.activity.services import ActivityService

User = get_user_model()


@pytest.fixture
def users(db):
    """Create test users."""
    alice = User.objects.create_user(
        username='alice',
        email='alice@example.com',
        password='testpass123'
    )
    bob = User.objects.create_user(
        username='bob',
        email='bob@example.com',
        password='testpass123'
    )
    charlie = User.objects.create_user(
        username='charlie',
        email='charlie@example.com',
        password='testpass123'
    )
    return {'alice': alice, 'bob': bob, 'charlie': charlie}


@pytest.fixture
def cafe(db):
    """Create a test cafe."""
    return Cafe.objects.create(
        name='Coffee Lab',
        google_place_id='test123',
        latitude=1.0,
        longitude=1.0,
        address='123 Test St'
    )


@pytest.fixture
def follows(users):
    """Create follow relationships."""
    # Bob follows Alice
    follow1 = Follow.objects.create(
        follower=users['bob'],
        followed=users['alice']
    )
    # Charlie follows Alice
    follow2 = Follow.objects.create(
        follower=users['charlie'],
        followed=users['alice']
    )
    return {'follow1': follow1, 'follow2': follow2}


@pytest.mark.django_db
def test_create_review_activity(users, cafe, follows):
    """Test review activity creation."""
    alice = users['alice']

    # Create visit first (required for review)
    visit = Visit.objects.create(
        user=alice,
        cafe=cafe
    )

    # Create review with all required fields
    review = Review.objects.create(
        visit=visit,
        user=alice,
        cafe=cafe,
        wifi_quality=5,
        noise_level=2,
        seating_comfort=4,
        space_availability=4,
        coffee_quality=5,
        menu_options=4,
        wfc_rating=5,
        comment='Great wifi!'
    )

    # Should create 3 activities
    activities = Activity.objects.filter(activity_type=ActivityType.REVIEW)
    assert activities.count() == 3

    # Check Alice's own activity
    alice_activity = activities.get(recipient=alice)
    assert alice_activity.actor == alice
    assert alice_activity.data['wfc_rating'] == 5.0
    assert alice_activity.data['comment'] == 'Great wifi!'


@pytest.mark.django_db
def test_create_follow_activity(users, follows):
    """Test follow activity creation."""
    bob = users['bob']

    # Dave follows Bob
    dave = User.objects.create_user(username='dave', email='dave@example.com')
    Follow.objects.create(follower=dave, followed=bob)

    # Should create follow activities
    # Note: Follow signals create activities automatically
    follow_activities = Activity.objects.filter(activity_type=ActivityType.FOLLOW)

    # Should have activities from setUp follow relationships + new one
    assert follow_activities.count() > 0


@pytest.mark.django_db
def test_get_user_feed(users, cafe, follows):
    """Test getting user's feed."""
    alice = users['alice']
    bob = users['bob']

    # Create some activities
    visit = Visit.objects.create(user=alice, cafe=cafe)
    review = Review.objects.create(
        visit=visit,
        user=alice,
        cafe=cafe,
        wifi_quality=5,
        noise_level=3,
        seating_comfort=4,
        space_availability=4,
        coffee_quality=5,
        menu_options=4,
        wfc_rating=5
    )

    # Get Bob's feed (should see Alice's activities)
    feed = ActivityService.get_user_feed(bob, limit=10)

    # Bob should see Alice's review (from following Alice)
    # Plus follow activities from setUp
    # Note: Visits no longer appear in social feed (privacy fix)
    assert len(feed) >= 1

    # All activities should have Bob as recipient
    for activity in feed:
        assert activity.recipient == bob
