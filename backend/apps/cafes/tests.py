"""
Cafe Tests

Tests for cafe model validation, serializers, and API endpoints.
SEC-15: Input length validation tests.
"""
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status
from apps.cafes.serializers import (
    CafeCreateSerializer,
    CafeUpdateSerializer,
    CafeFlagCreateSerializer,
)
from apps.cafes.admin import CafeAdminForm, CafeFlagAdminForm

User = get_user_model()


# Constants for validation (SEC-15)
MAX_CAFE_ADDRESS_LENGTH = 500
MAX_FLAG_DESCRIPTION_LENGTH = 1000
MAX_FLAG_RESOLUTION_NOTES_LENGTH = 1000


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
def test_admin(db):
    """Create a test admin user"""
    admin = User.objects.create_user(
        username='adminuser',
        email='admin@example.com',
        password='adminpass123',
        is_staff=True
    )
    return admin


@pytest.fixture
def authenticated_client(api_client, test_user):
    """Create authenticated API client"""
    api_client.force_authenticate(user=test_user)
    return api_client


@pytest.mark.django_db
class TestCafeAddressValidation:
    """Test cafe address length validation (SEC-15)"""

    def test_address_within_limit_succeeds(self):
        """Test that address within 500 characters is accepted"""
        data = {
            'name': 'Valid Address Cafe',
            'address': 'A' * 499,  # Within limit
            'latitude': Decimal('-6.2088'),
            'longitude': Decimal('106.8456'),
            'google_place_id': 'valid_place_id'
        }

        serializer = CafeCreateSerializer(data=data)
        assert serializer.is_valid(), f"Serializer should be valid, errors: {serializer.errors}"

    def test_address_exactly_at_limit_succeeds(self):
        """Test that address exactly at 500 characters is accepted"""
        data = {
            'name': 'Limit Address Cafe',
            'address': 'A' * MAX_CAFE_ADDRESS_LENGTH,  # Exactly at limit
            'latitude': Decimal('-6.2088'),
            'longitude': Decimal('106.8456'),
            'google_place_id': 'limit_place_id'
        }

        serializer = CafeCreateSerializer(data=data)
        assert serializer.is_valid(), f"Serializer should be valid, errors: {serializer.errors}"

    def test_address_exceeds_limit_fails(self):
        """Test that address over 500 characters is rejected"""
        data = {
            'name': 'Invalid Address Cafe',
            'address': 'A' * (MAX_CAFE_ADDRESS_LENGTH + 1),  # Over limit
            'latitude': Decimal('-6.2088'),
            'longitude': Decimal('106.8456'),
            'google_place_id': 'invalid_place_id'
        }

        serializer = CafeCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert 'address' in serializer.errors
        assert 'cannot exceed' in str(serializer.errors['address']).lower()

    def test_update_address_exceeds_limit_fails(self):
        """Test that updating cafe with long address is rejected"""
        # Mock a cafe object (minimal, not saved to DB)
        class MockCafe:
            address = 'Original Address'

        mock_cafe = MockCafe()
        data = {
            'address': 'B' * (MAX_CAFE_ADDRESS_LENGTH + 1),  # Over limit
        }

        serializer = CafeUpdateSerializer(mock_cafe, data=data)
        assert not serializer.is_valid()
        assert 'address' in serializer.errors


@pytest.mark.django_db
class TestCafeFlagDescriptionValidation:
    """Test cafe flag description length validation (SEC-15)"""

    def test_description_within_limit_succeeds(self):
        """Test that description within 1000 characters is accepted"""
        data = {
            'cafe': 1,  # Mock cafe ID
            'reason': 'wrong_location',
            'description': 'A' * 999  # Within limit
        }

        serializer = CafeFlagCreateSerializer(
            data=data,
            context={'request': type('Request', (), {'user': type('User', (), {'id': 1})()})()}
        )
        # Note: May fail on cafe existence check, but should pass length validation
        is_valid = serializer.is_valid()
        errors = serializer.errors
        # If not valid, it should NOT be due to description length
        if not is_valid and 'description' in errors:
            assert 'cannot exceed' not in str(errors['description']).lower()

    def test_description_exactly_at_limit_succeeds(self):
        """Test that description exactly at 1000 characters is accepted"""
        data = {
            'cafe': 1,  # Mock cafe ID
            'reason': 'wrong_location',
            'description': 'A' * MAX_FLAG_DESCRIPTION_LENGTH  # Exactly at limit
        }

        serializer = CafeFlagCreateSerializer(
            data=data,
            context={'request': type('Request', (), {'user': type('User', (), {'id': 1})()})()}
        )
        # Note: May fail on cafe existence check, but should pass length validation
        is_valid = serializer.is_valid()
        errors = serializer.errors
        # If not valid, it should NOT be due to description length
        if not is_valid and 'description' in errors:
            assert 'cannot exceed' not in str(errors['description']).lower()

    def test_description_exceeds_limit_fails(self):
        """Test that description over 1000 characters is rejected"""
        data = {
            'cafe': 1,  # Mock cafe ID
            'reason': 'wrong_location',
            'description': 'A' * (MAX_FLAG_DESCRIPTION_LENGTH + 1)  # Over limit
        }

        serializer = CafeFlagCreateSerializer(
            data=data,
            context={'request': type('Request', (), {'user': type('User', (), {'id': 1})()})()}
        )
        assert not serializer.is_valid()
        assert 'description' in serializer.errors
        assert 'cannot exceed' in str(serializer.errors['description']).lower()

    def test_empty_description_succeeds(self):
        """Test that empty description is accepted (optional field)"""
        data = {
            'cafe': 1,  # Mock cafe ID
            'reason': 'wrong_location',
            'description': ''
        }

        serializer = CafeFlagCreateSerializer(
            data=data,
            context={'request': type('Request', (), {'user': type('User', (), {'id': 1})()})()}
        )
        # Note: May fail on cafe existence check, but description should be valid
        is_valid = serializer.is_valid()
        errors = serializer.errors
        # If not valid, it should NOT be due to description (it's optional)
        if not is_valid:
            assert 'description' not in errors


@pytest.mark.django_db
class TestCafeAdminFormValidation:
    """Test admin form validation for TextField length (SEC-15)"""

    def test_admin_address_exceeds_limit_fails(self, test_user):
        """Test that admin form rejects address over limit"""
        form = CafeAdminForm(data={
            'name': 'Admin Test Cafe',
            'address': 'A' * (MAX_CAFE_ADDRESS_LENGTH + 1),
            'latitude': '-6.2088',
            'longitude': '106.8456',
            'created_by': test_user.id
        })
        assert not form.is_valid()
        assert '__all__' in form.errors or 'address' in form.errors


@pytest.mark.django_db
class TestCafeFlagAdminFormValidation:
    """Test admin form validation for flag TextField length (SEC-15)"""

    def test_admin_description_exceeds_limit_fails(self, test_user):
        """Test that admin form rejects description over limit"""
        form = CafeFlagAdminForm(data={
            'cafe': 1,  # Mock cafe ID
            'user': test_user.id,
            'reason': 'wrong_location',
            'description': 'A' * (MAX_FLAG_DESCRIPTION_LENGTH + 1)
        })
        assert not form.is_valid()
        assert '__all__' in form.errors or 'description' in form.errors

    def test_admin_resolution_notes_exceeds_limit_fails(self, test_user):
        """Test that admin form rejects resolution notes over limit"""
        form = CafeFlagAdminForm(data={
            'cafe': 1,  # Mock cafe ID
            'user': test_user.id,
            'reason': 'wrong_location',
            'status': 'resolved',
            'resolution_notes': 'A' * (MAX_FLAG_RESOLUTION_NOTES_LENGTH + 1)
        })
        assert not form.is_valid()
        assert '__all__' in form.errors or 'resolution_notes' in form.errors


@pytest.mark.django_db
class TestCafeAPITextFieldValidation:
    """Integration tests for TextField validation via API (SEC-15)"""

    def test_create_cafe_with_long_address_returns_400(self, authenticated_client):
        """Test that API returns 400 for cafe with address exceeding limit"""
        data = {
            'name': 'Long Address Cafe',
            'address': 'A' * (MAX_CAFE_ADDRESS_LENGTH + 1),
            'latitude': '-6.2088',
            'longitude': '106.8456',
            'google_place_id': 'long_address_place'
        }

        response = authenticated_client.post('/api/cafes/', data)

        # The response should indicate validation error
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Error response has nested structure: error.details.address
        assert 'address' in response.data.get('error', {}).get('details', {})

    def test_create_flag_with_long_description_returns_400(self, authenticated_client, test_user):
        """Test that API returns 400 for flag with description exceeding limit"""
        # First create a simple cafe via direct model access
        from apps.cafes.models import Cafe
        from decimal import Decimal

        cafe = Cafe.objects.create(
            name='Test Cafe',
            address='123 Test St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id='test_place',
            created_by=test_user
        )

        data = {
            'cafe': cafe.id,
            'reason': 'wrong_location',
            'description': 'A' * (MAX_FLAG_DESCRIPTION_LENGTH + 1)
        }

        response = authenticated_client.post('/api/cafes/flags/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Error response has nested structure
        assert 'description' in response.data.get('error', {}).get('details', {})


@pytest.mark.django_db
class TestCafeGoogleRatingStaleWhileRevalidate:
    """Test Google rating stale-while-revalidate pattern (HP-08)"""

    def test_cafe_detail_serializer_returns_cached_rating(self, authenticated_client, test_user):
        """Test that cafe detail returns cached Google rating without API call"""
        from apps.cafes.models import Cafe
        from django.utils import timezone
        from datetime import timedelta

        # Create cafe with old Google rating (stale)
        cafe = Cafe.objects.create(
            name='Stale Rating Cafe',
            address='123 Stale St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id='stale_place_id',
            google_rating=4.5,
            google_ratings_count=100,
            google_rating_updated_at=timezone.now() - timedelta(hours=25),  # Stale
            created_by=test_user
        )

        response = authenticated_client.get(f'/api/cafes/{cafe.id}/')

        assert response.status_code == status.HTTP_200_OK
        # Should return cached data immediately (no API call)
        assert response.data['google_rating'] == 4.5
        assert response.data['google_ratings_count'] == 100
        # Should include google_rating_updated_at for frontend staleness detection
        assert 'google_rating_updated_at' in response.data

    def test_cafe_detail_serializer_returns_null_for_no_rating(self, authenticated_client, test_user):
        """Test that cafe detail returns None when no Google rating exists"""
        from apps.cafes.models import Cafe

        cafe = Cafe.objects.create(
            name='No Rating Cafe',
            address='123 No Rating St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id='no_rating_place_id',
            google_rating=None,
            google_ratings_count=None,
            google_rating_updated_at=None,
            created_by=test_user
        )

        response = authenticated_client.get(f'/api/cafes/{cafe.id}/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['google_rating'] is None
        assert response.data['google_ratings_count'] is None
        assert response.data['google_rating_updated_at'] is None

    def test_refresh_google_rating_endpoint_updates_cafe(self, authenticated_client, test_user, monkeypatch):
        """Test that refresh endpoint updates Google rating (HP-08)"""
        from apps.cafes.models import Cafe
        from django.utils import timezone
        from datetime import timedelta

        cafe = Cafe.objects.create(
            name='Refresh Test Cafe',
            address='123 Refresh St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id='refresh_test_place',
            google_rating=4.0,
            google_ratings_count=50,
            google_rating_updated_at=timezone.now() - timedelta(hours=25),
            created_by=test_user
        )

        # Mock GooglePlacesService.get_place_details to return fresh data
        def mock_get_place_details(place_id):
            return {
                'rating': 4.8,
                'user_ratings_total': 150,
                'name': 'Updated Cafe Name'
            }

        monkeypatch.setattr(
            'apps.cafes.services.GooglePlacesService.get_place_details',
            mock_get_place_details
        )

        response = authenticated_client.post(f'/api/cafes/{cafe.id}/refresh-google-rating/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['google_rating'] == 4.8
        assert response.data['google_ratings_count'] == 150
        assert response.data['google_rating_updated_at'] is not None

        # Verify database was updated
        cafe.refresh_from_db()
        assert cafe.google_rating == 4.8
        assert cafe.google_ratings_count == 150

    def test_refresh_endpoint_returns_404_for_nonexistent_cafe(self, authenticated_client):
        """Test that refresh endpoint returns 404 for non-existent cafe"""
        response = authenticated_client.post('/api/cafes/99999/refresh-google-rating/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_refresh_endpoint_returns_400_for_cafe_without_google_place_id(self, authenticated_client, test_user):
        """Test that refresh endpoint returns 400 for cafe without Google Place ID"""
        from apps.cafes.models import Cafe

        cafe = Cafe.objects.create(
            name='No Google Place ID Cafe',
            address='123 No Google St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id=None,  # No Google Place ID
            created_by=test_user
        )

        response = authenticated_client.post(f'/api/cafes/{cafe.id}/refresh-google-rating/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

    def test_refresh_endpoint_handles_google_api_failure(self, authenticated_client, test_user, monkeypatch):
        """Test that refresh endpoint handles Google API failure gracefully"""
        from apps.cafes.models import Cafe

        cafe = Cafe.objects.create(
            name='API Failure Cafe',
            address='123 API Failure St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id='api_failure_place',
            google_rating=4.0,
            google_ratings_count=50,
            created_by=test_user
        )

        # Mock GooglePlacesService.get_place_details to return None (API failure)
        def mock_get_place_details(place_id):
            return None

        monkeypatch.setattr(
            'apps.cafes.services.GooglePlacesService.get_place_details',
            mock_get_place_details
        )

        response = authenticated_client.post(f'/api/cafes/{cafe.id}/refresh-google-rating/')

        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert 'error' in response.data
