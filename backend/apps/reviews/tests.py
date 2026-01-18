"""
Visit and Review Tests
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.cafes.models import Cafe
from apps.reviews.models import Visit, Review

User = get_user_model()


@pytest.fixture
def api_client():
    """Create API client for tests"""
    return APIClient()


@pytest.fixture
def test_user(db):
    """Create a test user"""
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def test_cafe(db, test_user):
    """Create a test cafe"""
    return Cafe.objects.create(
        name='Test Cafe',
        address='123 Test St, Jakarta',
        latitude=Decimal('-6.2088'),
        longitude=Decimal('106.8456'),
        google_place_id='test_place_123',
        created_by=test_user
    )


@pytest.fixture
def authenticated_client(api_client, test_user):
    """Create authenticated API client"""
    api_client.force_authenticate(user=test_user)
    return api_client


@pytest.mark.django_db
class TestVisitCreation:
    """Test visit creation endpoint"""

    def test_create_visit_success(self, authenticated_client, test_cafe):
        """Test creating a visit with registered cafe"""
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'amount_spent': 12.5,
            'visit_time': 2,
            'check_in_latitude': -6.2088,
            'check_in_longitude': 106.8456,
            'include_review': False
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_201_CREATED
        assert 'visit' in response.data
        assert response.data['review'] is None
        assert Visit.objects.filter(cafe=test_cafe).exists()

    def test_create_visit_without_location(self, authenticated_client, test_cafe):
        """Test creating visit without check-in location"""
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'include_review': False
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_201_CREATED
        visit = Visit.objects.get(cafe=test_cafe)
        assert visit.check_in_latitude is None
        assert visit.check_in_longitude is None

    def test_create_visit_far_location_not_verified(self, authenticated_client, test_cafe, test_user):
        """Test creating visit from >1km away is allowed but not verified"""
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'check_in_latitude': -6.3,  # ~10km away
            'check_in_longitude': 106.9,
            'include_review': False
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        # Visit creation is allowed (location verification is optional)
        assert response.status_code == status.HTTP_201_CREATED

        # But verify the location check returns False
        visit = Visit.objects.get(user=test_user, cafe=test_cafe)
        assert visit.is_verified_location() is False

    def test_create_duplicate_visit_same_day(self, authenticated_client, test_cafe, test_user):
        """Test creating duplicate visit for same cafe+date fails"""
        # Create first visit
        Visit.objects.create(
            cafe=test_cafe,
            user=test_user,
            visit_date=date.today()
        )

        # Attempt duplicate
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'include_review': False
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'visit_date' in response.data

    def test_create_visit_unauthenticated(self, api_client, test_cafe):
        """Test unauthenticated user cannot create visit"""
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'include_review': False
        }
        response = api_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestCombinedVisitReview:
    """Test combined visit + review creation"""

    def test_create_visit_with_review(self, authenticated_client, test_cafe):
        """Test creating visit + review in one request"""
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'amount_spent': 15.0,
            'visit_time': 2,
            'check_in_latitude': -6.2088,
            'check_in_longitude': 106.8456,
            'include_review': True,
            'wfc_rating': 4,
            'wifi_quality': 5,
            'power_outlets_rating': 4,
            'seating_comfort': 4,
            'noise_level': 3,
            'comment': 'Great cafe for work!'
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_201_CREATED
        assert 'visit' in response.data
        assert 'review' in response.data
        assert response.data['review'] is not None

        # Verify in database (UPDATED: Review Refactor)
        assert Visit.objects.filter(cafe=test_cafe).exists()
        visit = Visit.objects.get(cafe=test_cafe)
        assert Review.objects.filter(cafe=test_cafe, user=visit.user).exists()

    def test_create_visit_without_review(self, authenticated_client, test_cafe):
        """Test creating visit only (no review)"""
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'check_in_latitude': -6.2088,
            'check_in_longitude': 106.8456,
            'include_review': False
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['review'] is None

    def test_create_review_missing_wfc_rating(self, authenticated_client, test_cafe):
        """Test creating review without required wfc_rating fails"""
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'include_review': True,
            'wifi_quality': 5,
            # Missing wfc_rating
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_review_invalid_rating(self, authenticated_client, test_cafe):
        """Test creating review with invalid rating value fails"""
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'include_review': True,
            'wfc_rating': 6,  # Invalid: should be 1-5
            'wifi_quality': 5,
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUnregisteredCafeAutoRegistration:
    """Test auto-registration of unregistered cafes from Google Places"""

    def test_create_visit_unregistered_cafe(self, authenticated_client):
        """Test creating visit for unregistered cafe auto-registers it"""
        data = {
            'google_place_id': 'ChIJ_new_place_id',
            'cafe_name': 'New Cafe Name',
            'cafe_address': '456 New St, Jakarta',
            'cafe_latitude': -6.2100,
            'cafe_longitude': 106.8500,
            'visit_date': str(date.today()),
            'include_review': False
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_201_CREATED

        # Verify cafe was created
        assert Cafe.objects.filter(google_place_id='ChIJ_new_place_id').exists()
        cafe = Cafe.objects.get(google_place_id='ChIJ_new_place_id')
        assert cafe.name == 'New Cafe Name'
        assert cafe.address == '456 New St, Jakarta'

        # Verify visit was created
        assert Visit.objects.filter(cafe=cafe).exists()


@pytest.mark.django_db
class TestVisitEditing:
    """Test visit editing functionality"""

    def test_update_visit_within_7_days(self, authenticated_client, test_cafe, test_user):
        """Test updating visit within 7-day window"""
        visit = Visit.objects.create(
            cafe=test_cafe,
            user=test_user,
            visit_date=date.today(),
            amount_spent=Decimal('10.00')
        )

        data = {
            'amount_spent': 15.0,
            'visit_time': 3
        }
        response = authenticated_client.patch(f'/api/visits/{visit.id}/', data)

        assert response.status_code == status.HTTP_200_OK
        visit.refresh_from_db()
        assert visit.amount_spent == Decimal('15.00')
        assert visit.visit_time == 3

    def test_update_visit_after_7_days(self, authenticated_client, test_cafe, test_user):
        """Test updating visit after 7 days should fail"""
        visit = Visit.objects.create(
            cafe=test_cafe,
            user=test_user,
            visit_date=date.today() - timedelta(days=8),
            amount_spent=Decimal('10.00')
        )

        data = {'amount_spent': 15.0}
        response = authenticated_client.patch(f'/api/visits/{visit.id}/', data)

        # Should fail (or return 403 depending on implementation)
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN]

    def test_update_other_users_visit(self, authenticated_client, test_cafe, db):
        """Test cannot update another user's visit"""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='pass123'
        )
        visit = Visit.objects.create(
            cafe=test_cafe,
            user=other_user,
            visit_date=date.today()
        )

        data = {'amount_spent': 15.0}
        response = authenticated_client.patch(f'/api/visits/{visit.id}/', data)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_visit(self, authenticated_client, test_cafe, test_user):
        """Test deleting a visit"""
        visit = Visit.objects.create(
            cafe=test_cafe,
            user=test_user,
            visit_date=date.today()
        )

        response = authenticated_client.delete(f'/api/visits/{visit.id}/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Visit.objects.filter(id=visit.id).exists()


@pytest.mark.django_db
class TestReviewModeration:
    """Test review moderation features"""

    def test_flag_review(self, authenticated_client, test_cafe, test_user, db):
        """Test flagging a review"""
        # Create visit and review
        _visit = Visit.objects.create(  # noqa: F841
            cafe=test_cafe,
            user=test_user,
            visit_date=date.today()
        )
        review = Review.objects.create(
            cafe=test_cafe,
            user=test_user,
            visit_time=2,  # Afternoon
            wfc_rating=5,
            wifi_quality=5,
            power_outlets_rating=5,
            seating_comfort=5,
            noise_level=5,
            space_availability=5,
            coffee_quality=5,
            menu_options=5,
            bathroom_quality=5
        )

        # Create another user to flag
        other_user = User.objects.create_user(
            username='flagger',
            password='pass123'
        )
        authenticated_client.force_authenticate(user=other_user)

        data = {
            'review_id': str(review.id),
            'reason': 'spam',
            'description': 'This review is spam'
        }
        response = authenticated_client.post('/api/reviews/flags/', data)

        assert response.status_code == status.HTTP_201_CREATED
        review.refresh_from_db()
        assert review.flag_count == 1

    def test_mark_review_helpful(self, authenticated_client, test_cafe, db):
        """Test marking a review as helpful"""
        # Create review author (different from authenticated user)
        review_author = User.objects.create_user(
            username='reviewer',
            email='reviewer@example.com',
            password='pass123'
        )

        _visit = Visit.objects.create(  # noqa: F841
            cafe=test_cafe,
            user=review_author,
            visit_date=date.today()
        )
        review = Review.objects.create(
            cafe=test_cafe,
            user=review_author,
            visit_time=2,  # Afternoon
            wfc_rating=5,
            wifi_quality=5,
            power_outlets_rating=5,
            seating_comfort=5,
            noise_level=5,
            space_availability=5,
            coffee_quality=5,
            menu_options=5,
            bathroom_quality=5
        )

        # Authenticated user (different from review author) marks it helpful
        response = authenticated_client.post(f'/api/reviews/{review.id}/mark_helpful/')

        assert response.status_code == status.HTTP_201_CREATED
        review.refresh_from_db()
        assert review.helpful_count == 1

        # Toggle off
        response = authenticated_client.post(f'/api/reviews/{review.id}/mark_helpful/')
        assert response.status_code == status.HTTP_200_OK
        review.refresh_from_db()
        assert review.helpful_count == 0


@pytest.mark.django_db
class TestCafeStatistics:
    """Test cafe statistics updates"""

    def test_cafe_stats_update_after_visit(self, authenticated_client, test_cafe, test_user):
        """Test cafe statistics are updated after visit creation"""
        initial_visits = test_cafe.total_visits

        Visit.objects.create(
            cafe=test_cafe,
            user=test_user,
            visit_date=date.today()
        )
        test_cafe.update_stats()
        test_cafe.refresh_from_db()

        assert test_cafe.total_visits == initial_visits + 1

    def test_cafe_stats_update_after_review(self, authenticated_client, test_cafe, test_user):
        """Test cafe statistics are updated after review creation"""
        _visit = Visit.objects.create(  # noqa: F841
            cafe=test_cafe,
            user=test_user,
            visit_date=date.today()
        )

        initial_reviews = test_cafe.total_reviews

        Review.objects.create(
            cafe=test_cafe,
            user=test_user,
            visit_time=2,  # Afternoon
            wfc_rating=4,
            wifi_quality=5,
            power_outlets_rating=4,
            seating_comfort=4,
            noise_level=3,
            space_availability=4,
            coffee_quality=4,
            menu_options=3,
            bathroom_quality=4
        )
        test_cafe.update_stats()
        test_cafe.refresh_from_db()

        assert test_cafe.total_reviews == initial_reviews + 1
        assert test_cafe.average_wfc_rating is not None
