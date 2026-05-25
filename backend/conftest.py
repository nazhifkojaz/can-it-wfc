from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    """Create an API client for endpoint tests."""
    return APIClient()


@pytest.fixture
def make_user(db):
    """Create users with unique defaults and optional overrides."""
    counter = {'value': 0}

    def _make_user(username=None, email=None, password='testpass123', **attrs):
        counter['value'] += 1
        username = username or f'testuser{counter["value"]}'
        email = email or f'{username}@example.com'
        return User.objects.create_user(
            username=username,
            email=email,
            password=password,
            **attrs,
        )

    return _make_user


@pytest.fixture
def test_user(make_user):
    """Create the default test user used by most tests."""
    return make_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
    )


@pytest.fixture
def test_admin(make_user):
    """Create a default staff user."""
    return make_user(
        username='adminuser',
        email='admin@example.com',
        password='adminpass123',
        is_staff=True,
    )


@pytest.fixture
def authenticated_client(api_client, test_user):
    """Create an API client authenticated as the default test user."""
    api_client.force_authenticate(user=test_user)
    return api_client


@pytest.fixture
def make_cafe(db, make_user):
    """Create cafes with Jakarta defaults and unique Google place IDs."""
    counter = {'value': 0}

    def _make_cafe(
        owner=None,
        name='Coffee Lab',
        suffix='',
        address='Jl. Senopati, Jakarta Selatan',
        latitude=Decimal('-6.2088'),
        longitude=Decimal('106.8456'),
        google_place_id=None,
        **attrs,
    ):
        counter['value'] += 1
        created_by = attrs.pop('created_by', owner)
        if created_by is None:
            created_by = make_user(username=f'cafeowner{counter["value"]}')
        if suffix:
            name = f'{name}{suffix}'
        cafe_data = {
            'name': name,
            'address': address,
            'latitude': latitude,
            'longitude': longitude,
            'google_place_id': google_place_id or f'test_place_{counter["value"]}{suffix}',
            'created_by': created_by,
        }
        cafe_data.update(attrs)
        from apps.cafes.models import Cafe

        return Cafe.objects.create(**cafe_data)

    return _make_cafe


@pytest.fixture
def test_cafe(make_cafe, test_user):
    """Create the default cafe shared by endpoint and serializer tests."""
    return make_cafe(
        owner=test_user,
        name='Coffee Lab',
        address='Jl. Senopati, Jakarta Selatan',
        google_place_id='place_1',
    )


@pytest.fixture
def make_visit(db, make_user, make_cafe):
    """Create visits with sensible defaults."""
    def _make_visit(user=None, cafe=None, visit_date=None, **attrs):
        user = user or make_user()
        cafe = cafe or make_cafe(owner=user)
        visit_data = {
            'user': user,
            'cafe': cafe,
            'visit_date': visit_date or date.today(),
        }
        visit_data.update(attrs)
        from apps.reviews.models import Visit

        return Visit.objects.create(**visit_data)

    return _make_visit


@pytest.fixture
def make_review(db, make_user, make_cafe):
    """Create reviews with default WFC rating fields."""
    def _make_review(user=None, cafe=None, wfc_rating=4, comment='Great place', **attrs):
        created_at = attrs.pop('created_at', None)
        user = user or make_user()
        cafe = cafe or make_cafe(owner=user)
        review_data = {
            'user': user,
            'cafe': cafe,
            'wifi_quality': 4,
            'noise_level': 3,
            'seating_comfort': 4,
            'wfc_rating': wfc_rating,
            'comment': comment,
        }
        review_data.update(attrs)
        from apps.reviews.models import Review

        review = Review.objects.create(**review_data)
        if created_at is not None:
            Review.objects.filter(pk=review.pk).update(created_at=created_at)
            review.refresh_from_db()
        return review

    return _make_review


@pytest.fixture(autouse=False)
def disable_throttle(settings):
    """Set very high throttle rates so tests never hit limits."""
    settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
        'anon': '10000/hour',
        'user': '10000/hour',
        'reviews': '10000/hour',
        'bulk': '10000/hour',
        'auth': '10000/min',
        'registration': '10000/hour',
        'nearby_anon': '10000/min',
        'nearby_auth': '10000/min',
        'public_api': '10000/min',
    }
