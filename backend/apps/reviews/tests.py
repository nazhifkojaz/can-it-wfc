"""
Visit and Review Tests
"""
import pytest
from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import override_settings
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

    def test_create_visit_without_location_rejected(self, authenticated_client, test_cafe):
        """Test creating visit without check-in location is rejected"""
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'include_review': False
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'non_field_errors' in response.data['error']['details']

    def test_create_visit_far_location_rejected(self, authenticated_client, test_cafe):
        """Test creating visit from >1km away is rejected"""
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'check_in_latitude': -6.3,  # ~10km away
            'check_in_longitude': 106.9,
            'include_review': False
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'check_in_latitude' in response.data['error']['details']

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
            'check_in_latitude': -6.2088,
            'check_in_longitude': 106.8456,
            'include_review': False
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'visit_date' in response.data['error']['details']

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

    def test_create_review_auto_computes_wfc_rating(self, authenticated_client, test_cafe, test_user):
        """Test creating review without wfc_rating auto-computes it from sub-criteria"""
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'check_in_latitude': -6.2088,
            'check_in_longitude': 106.8456,
            'include_review': True,
            'wifi_quality': 5,
            # Missing wfc_rating — should be auto-computed
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['review'] is not None
        # wifi=5, noise=3(default), seating=3(default), no power → avg=11/3≈3.67 → round=4
        review = Review.objects.get(user=test_user, cafe=test_cafe)
        assert review.wfc_rating == 4

    def test_create_review_auto_computes_wfc_rating_with_power(self, authenticated_client, test_cafe, test_user):
        """Test auto-computation includes power_outlets_rating when provided"""
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today() + timedelta(days=1)),
            'check_in_latitude': -6.2088,
            'check_in_longitude': 106.8456,
            'include_review': True,
            'wifi_quality': 5,
            'power_outlets_rating': 5,
            'seating_comfort': 4,
            'noise_level': 3,
            # Missing wfc_rating — should be auto-computed
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_201_CREATED
        review = Review.objects.get(user=test_user, cafe=test_cafe)
        # (5+5+4+3)/4 = 4.25 → round=4
        assert review.wfc_rating == 4

    def test_create_review_invalid_rating(self, authenticated_client, test_cafe):
        """Test creating review with invalid rating value fails"""
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'check_in_latitude': -6.2088,
            'check_in_longitude': 106.8456,
            'include_review': True,
            'wfc_rating': 6,  # Invalid: should be 1-5
            'wifi_quality': 5,
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @override_settings(MIN_ACCOUNT_AGE_HOURS=24)
    def test_combined_review_rejects_new_account(self, authenticated_client, test_cafe):
        """Combined visit+review must enforce account-age review limits."""
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'check_in_latitude': -6.2088,
            'check_in_longitude': 106.8456,
            'include_review': True,
            'wfc_rating': 4,
            'wifi_quality': 4,
            'seating_comfort': 4,
            'noise_level': 4,
        }

        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert Review.objects.filter(cafe=test_cafe).count() == 0
        assert Visit.objects.filter(cafe=test_cafe).count() == 0

    @override_settings(MAX_REVIEWS_PER_DAY=1)
    def test_combined_review_rejects_daily_review_limit(self, authenticated_client, test_cafe, test_user):
        """Combined visit+review must enforce the same daily spam limit as reviews."""
        reviewed_cafe = Cafe.objects.create(
            name='Already Reviewed Cafe',
            address='456 Limit St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id='already_reviewed_place',
            created_by=test_user,
        )
        Review.objects.create(
            cafe=reviewed_cafe,
            user=test_user,
            wfc_rating=4,
            wifi_quality=4,
            power_outlets_rating=4,
            seating_comfort=4,
            noise_level=4,
        )
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'check_in_latitude': -6.2088,
            'check_in_longitude': 106.8456,
            'include_review': True,
            'wfc_rating': 4,
            'wifi_quality': 4,
            'seating_comfort': 4,
            'noise_level': 4,
        }

        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert not Review.objects.filter(cafe=test_cafe, user=test_user).exists()
        assert not Visit.objects.filter(cafe=test_cafe, user=test_user).exists()

    def test_combined_review_rejects_duplicate_review(self, authenticated_client, test_cafe, test_user):
        """Combined visit+review must not turn duplicate reviews into visits."""
        Review.objects.create(
            cafe=test_cafe,
            user=test_user,
            wfc_rating=4,
            wifi_quality=4,
            power_outlets_rating=4,
            seating_comfort=4,
            noise_level=4,
        )
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'check_in_latitude': -6.2088,
            'check_in_longitude': 106.8456,
            'include_review': True,
            'wfc_rating': 4,
            'wifi_quality': 4,
            'seating_comfort': 4,
            'noise_level': 4,
        }

        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert Review.objects.filter(cafe=test_cafe, user=test_user).count() == 1
        assert not Visit.objects.filter(cafe=test_cafe, user=test_user).exists()

    def test_combined_visit_far_location_rejected(self, authenticated_client, test_cafe):
        """Test combined visit+review from >1km away is rejected"""
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'check_in_latitude': -6.3,  # ~10km away
            'check_in_longitude': 106.9,
            'include_review': True,
            'wfc_rating': 4,
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'check_in_latitude' in response.data['error']['details']

    def test_combined_visit_missing_location_rejected(self, authenticated_client, test_cafe):
        """Test combined visit+review without check-in location is rejected"""
        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'include_review': True,
            'wfc_rating': 4,
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'non_field_errors' in response.data['error']['details']


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
        )
        test_cafe.update_stats()
        test_cafe.refresh_from_db()

        assert test_cafe.total_reviews == initial_reviews + 1
        assert test_cafe.average_wfc_rating is not None


@pytest.mark.django_db
class TestTransactionRollbackHandling:
    """Test transaction handling for cafe creation."""

    def test_visit_creation_with_existing_cafe_succeeds(self, authenticated_client, test_cafe, test_user):
        """Test that creating a visit with existing cafe works correctly"""
        initial_cafe_count = Cafe.objects.count()

        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'check_in_latitude': -6.2088,
            'check_in_longitude': 106.8456,
            'include_review': False
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_201_CREATED
        # Cafe count should not change (using existing cafe)
        assert Cafe.objects.count() == initial_cafe_count
        assert Visit.objects.filter(cafe=test_cafe, user=test_user).exists()

    def test_visit_creation_with_new_cafe_succeeds(self, authenticated_client, test_user, monkeypatch):
        """Test that creating a visit with new cafe (from Google) works correctly"""
        from apps.cafes.services import GooglePlacesService
        initial_cafe_count = Cafe.objects.count()

        # Mock GooglePlacesService.get_place_details
        def mock_get_place_details(place_id):
            return {
                'rating': 4.5,
                'user_ratings_total': 100,
                'price_level': 2
            }

        monkeypatch.setattr(
            GooglePlacesService,
            'get_place_details',
            mock_get_place_details
        )

        data = {
            'google_place_id': 'ChIJ_new_test_place',
            'cafe_name': 'New Test Cafe',
            'cafe_address': '789 New St, Jakarta',
            'cafe_latitude': -6.2200,
            'cafe_longitude': 106.8600,
            'visit_date': str(date.today()),
            'include_review': False
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_201_CREATED
        # New cafe should be created
        assert Cafe.objects.count() == initial_cafe_count + 1
        # Visit should be created
        assert Visit.objects.filter(cafe__google_place_id='ChIJ_new_test_place', user=test_user).exists()

    def test_cafe_not_created_when_field_validation_fails(self, authenticated_client, test_user, monkeypatch):
        """Test that cafe is NOT created when required fields are missing at the serializer level"""
        from apps.cafes.services import GooglePlacesService
        from apps.cafes.models import Cafe

        initial_cafe_count = Cafe.objects.count()

        # Mock GooglePlacesService.get_place_details
        def mock_get_place_details(place_id):
            return {
                'rating': 4.5,
                'user_ratings_total': 100,
                'price_level': 2
            }

        monkeypatch.setattr(
            GooglePlacesService,
            'get_place_details',
            mock_get_place_details
        )

        # Missing visit_date — DRF field-level validation rejects this
        # before create() (where cafe creation happens) is ever called
        data = {
            'google_place_id': 'ChIJ_invalid_visit_test',
            'cafe_name': 'Invalid Visit Cafe',
            'cafe_address': '999 Invalid St, Jakarta',
            'cafe_latitude': -6.2300,
            'cafe_longitude': 106.8700,
            # Missing visit_date - field validation fails before create()
            'include_review': False
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Cafe should NOT be created — field validation runs before create()
        assert not Cafe.objects.filter(google_place_id='ChIJ_invalid_visit_test').exists()
        assert Cafe.objects.count() == initial_cafe_count

    def test_review_creation_rolled_back_on_failure(self, authenticated_client, test_cafe, test_user, monkeypatch):
        """Test that review is rolled back if stats update raises an unhandled error"""
        # Create a visit first
        visit = Visit.objects.create(
            cafe=test_cafe,
            user=test_user,
            visit_date=date.today()
        )

        # Mock update_stats to raise an exception (simulating failure)
        def mock_update_stats_failure(*args, **kwargs):
            raise Exception("Stats update failed")

        monkeypatch.setattr(Cafe, 'update_stats', mock_update_stats_failure)

        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today() + timedelta(days=1)),  # Different date
            'check_in_latitude': -6.2088,
            'check_in_longitude': 106.8456,
            'include_review': True,
            'wfc_rating': 4,
            'wifi_quality': 5,
            'seating_comfort': 4,
            'noise_level': 3,
        }

        # update_stats is not wrapped in try/except, so the bare Exception
        # propagates through the test client as an unhandled server error
        with pytest.raises(Exception, match="Stats update failed"):
            authenticated_client.post('/api/visits/create-with-review/', data)

        # The transaction.atomic() should roll back — review should not exist
        assert not Review.objects.filter(user=test_user, cafe=test_cafe).exists()

    def test_transaction_with_both_visit_and_review(self, authenticated_client, test_cafe, test_user):
        """Test that both visit and review are created successfully in one transaction"""
        initial_visit_count = Visit.objects.filter(cafe=test_cafe).count()
        initial_review_count = Review.objects.filter(cafe=test_cafe).count()

        data = {
            'cafe_id': test_cafe.id,
            'visit_date': str(date.today()),
            'amount_spent': 25.0,
            'visit_time': 2,
            'check_in_latitude': -6.2088,
            'check_in_longitude': 106.8456,
            'include_review': True,
            'wfc_rating': 5,
            'wifi_quality': 5,
            'power_outlets_rating': 5,
            'seating_comfort': 5,
            'noise_level': 5,
            'comment': 'Excellent place!'
        }
        response = authenticated_client.post('/api/visits/create-with-review/', data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['review'] is not None

        # Verify both visit and review were created
        assert Visit.objects.filter(cafe=test_cafe).count() == initial_visit_count + 1
        assert Review.objects.filter(cafe=test_cafe).count() == initial_review_count + 1


@pytest.mark.django_db
class TestCheckSpamDailyLimit:
    """Test Review.check_spam() enforces the exact MAX_REVIEWS_PER_DAY limit."""

    def _make_cafes(self, user, count):
        """Create N distinct cafes for testing."""
        cafes = []
        for i in range(count):
            cafes.append(Cafe.objects.create(
                name=f'Cafe {i}',
                address=f'{i} Test St',
                latitude=Decimal('-6.2088'),
                longitude=Decimal('106.8456'),
                google_place_id=f'place_{i}',
                created_by=user,
            ))
        return cafes

    def _make_reviews(self, user, cafes, count):
        """Create `count` reviews (one per cafe) and return them."""
        reviews = []
        for i in range(count):
            reviews.append(Review.objects.create(
                cafe=cafes[i],
                user=user,
                wfc_rating=4,
                wifi_quality=4,
                power_outlets_rating=4,
                seating_comfort=4,
                noise_level=4,
            ))
        return reviews

    @override_settings(MAX_REVIEWS_PER_DAY=3)
    def test_spam_detected_at_exact_limit(self, test_user):
        """After MAX reviews exist, the next check_spam should flag as spam."""
        cafes = self._make_cafes(test_user, 4)
        self._make_reviews(test_user, cafes, 3)  # exactly MAX_REVIEWS_PER_DAY

        # 4th review should be flagged — count (3) >= limit (3)
        review = Review(user=test_user, cafe=cafes[3], wfc_rating=4)
        is_spam, reason = review.check_spam()

        assert is_spam is True
        assert reason == "Too many reviews in one day"

    @override_settings(MAX_REVIEWS_PER_DAY=3)
    def test_not_spam_below_limit(self, test_user):
        """Below the limit, check_spam should return OK."""
        cafes = self._make_cafes(test_user, 3)
        self._make_reviews(test_user, cafes, 2)  # one below limit

        review = Review(user=test_user, cafe=cafes[2], wfc_rating=4)
        is_spam, reason = review.check_spam()

        assert is_spam is False
        assert reason == "OK"


@pytest.mark.django_db
class TestCafeReviewsURL:
    """Test that CafeReviewsView URL accepts integer cafe IDs."""

    def test_cafe_reviews_accepts_integer_id(self, api_client, test_cafe, test_user):
        """
        GET /api/cafes/{int}/reviews/ should return 200, not 404.
        The URL converter must be <int:cafe_id>, not <uuid:cafe_id>,
        since Cafe uses an integer primary key.
        """
        # Create a review so there's data to return
        Review.objects.create(
            cafe=test_cafe,
            user=test_user,
            wfc_rating=4,
            wifi_quality=4,
            power_outlets_rating=4,
            seating_comfort=4,
            noise_level=4,
        )

        response = api_client.get(f'/api/cafes/{test_cafe.id}/reviews/')

        assert response.status_code == status.HTTP_200_OK

    def test_cafe_reviews_returns_reviews_for_correct_cafe(self, api_client, test_user):
        """
        CafeReviewsView should only return reviews for the requested cafe.
        """
        # Create two cafes with reviews
        cafe_a = Cafe.objects.create(
            name='Cafe A', address='1 A St',
            latitude=Decimal('-6.2'), longitude=Decimal('106.8'),
            google_place_id='place_a', created_by=test_user,
        )
        cafe_b = Cafe.objects.create(
            name='Cafe B', address='2 B St',
            latitude=Decimal('-6.2'), longitude=Decimal('106.8'),
            google_place_id='place_b', created_by=test_user,
        )
        Review.objects.create(
            cafe=cafe_a, user=test_user, wfc_rating=5,
            wifi_quality=5, power_outlets_rating=5,
            seating_comfort=5, noise_level=5,
        )
        Review.objects.create(
            cafe=cafe_b, user=test_user, wfc_rating=3,
            wifi_quality=3, power_outlets_rating=3,
            seating_comfort=3, noise_level=3,
        )

        response = api_client.get(f'/api/cafes/{cafe_a.id}/reviews/')

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results'] if 'results' in response.data else response.data
        assert len(results) == 1
        assert results[0]['cafe']['id'] == cafe_a.id


@pytest.mark.django_db
class TestUserReviewsView:
    """Test GET /api/reviews/users/{username}/reviews/ endpoint."""

    def test_returns_user_reviews(self, api_client, test_user, test_cafe):
        api_client.force_authenticate(user=test_user)
        Review.objects.create(
            cafe=test_cafe, user=test_user, wfc_rating=4,
            wifi_quality=4, power_outlets_rating=4,
            seating_comfort=4, noise_level=4, comment='Great spot',
        )

        response = api_client.get(f'/api/reviews/users/{test_user.username}/reviews/')

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['cafe']['id'] == test_cafe.id
        assert results[0]['wfc_rating'] == 4

    def test_returns_empty_for_nonexistent_username(self, api_client):
        response = api_client.get('/api/reviews/users/nonexistentuser/reviews/')

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_excludes_hidden_reviews(self, api_client, test_user, test_cafe):
        from apps.cafes.models import Cafe
        api_client.force_authenticate(user=test_user)
        other_cafe = Cafe.objects.create(
            name='Other Cafe', address='Other Addr',
            latitude=Decimal('-6.21'), longitude=Decimal('106.81'),
        )
        Review.objects.create(
            cafe=test_cafe, user=test_user, wfc_rating=5,
            wifi_quality=5, power_outlets_rating=5,
            seating_comfort=5, noise_level=5,
        )
        Review.objects.create(
            cafe=other_cafe, user=test_user, wfc_rating=1,
            wifi_quality=1, power_outlets_rating=1,
            seating_comfort=1, noise_level=1,
            is_hidden=True,
        )

        response = api_client.get(f'/api/reviews/users/{test_user.username}/reviews/')

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['wfc_rating'] == 5

    def test_returns_empty_for_private_profile(self, api_client, test_user, db):
        from apps.accounts.models import UserSettings
        settings = UserSettings.objects.get(user=test_user)
        settings.activity_visibility = 'private'
        settings.save()

        other_user = User.objects.create_user(
            username='otheruser', email='other@example.com', password='pass123'
        )
        cafe = Cafe.objects.create(
            name='Cafe', address='Addr',
            latitude=Decimal('-6.2'), longitude=Decimal('106.8'),
            google_place_id='place_x', created_by=test_user,
        )
        Review.objects.create(
            cafe=cafe, user=test_user, wfc_rating=4,
            wifi_quality=4, power_outlets_rating=4,
            seating_comfort=4, noise_level=4,
        )

        api_client.force_authenticate(user=other_user)
        response = api_client.get(f'/api/reviews/users/{test_user.username}/reviews/')

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 0

    def test_returns_own_reviews_even_for_private_profile(self, api_client, test_user, test_cafe):
        from apps.accounts.models import UserSettings
        settings = UserSettings.objects.get(user=test_user)
        settings.activity_visibility = 'private'
        settings.save()

        api_client.force_authenticate(user=test_user)
        Review.objects.create(
            cafe=test_cafe, user=test_user, wfc_rating=4,
            wifi_quality=4, power_outlets_rating=4,
            seating_comfort=4, noise_level=4,
        )

        response = api_client.get(f'/api/reviews/users/{test_user.username}/reviews/')

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_unauthenticated_can_view_public_reviews(self, api_client, test_user, test_cafe):
        Review.objects.create(
            cafe=test_cafe, user=test_user, wfc_rating=4,
            wifi_quality=4, power_outlets_rating=4,
            seating_comfort=4, noise_level=4,
        )

        response = api_client.get(f'/api/reviews/users/{test_user.username}/reviews/')

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
