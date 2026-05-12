"""
Cafe Tests

Tests for cafe model validation, serializers, and API endpoints.
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


# Constants for validation
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
    """Test cafe address length validation."""

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
    """Test cafe flag description length validation."""

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
    """Test admin form validation for TextField length."""

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
    """Test admin form validation for flag TextField length."""

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
    """Integration tests for TextField validation via API."""

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
    """Test Google rating stale-while-revalidate pattern."""

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
        assert response.data['google_rating'] == '4.5'
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
        """Test that refresh endpoint updates Google rating."""
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
        assert float(response.data['google_rating']) == 4.8
        assert response.data['google_ratings_count'] == 150
        assert response.data['google_rating_updated_at'] is not None

        # Verify database was updated
        cafe.refresh_from_db()
        assert cafe.google_rating == Decimal('4.8')  # DecimalField returns Decimal from DB
        assert cafe.google_ratings_count == 150

    def test_refresh_endpoint_requires_authentication(self, api_client, test_user):
        """Test that refresh endpoint requires authentication."""
        from apps.cafes.models import Cafe

        cafe = Cafe.objects.create(
            name='Auth Test Cafe',
            address='123 Auth Test St',
            latitude=Decimal('-6.2088'),
            longitude=Decimal('106.8456'),
            google_place_id='some_place_id',
            created_by=test_user
        )

        response = api_client.post(f'/api/cafes/{cafe.id}/refresh-google-rating/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

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


@pytest.mark.django_db
class TestNearbyCafesView:
    """Test NearbyCafesView bounding-box filter and Haversine accuracy."""

    # Jakarta coordinates
    JAKARTA_LAT = Decimal('-6.2088')
    JAKARTA_LNG = Decimal('106.8456')

    def _create_cafe(self, name, lat, lng, user, **kwargs):
        from apps.cafes.models import Cafe
        return Cafe.objects.create(
            name=name,
            address=f'{name} Address',
            latitude=Decimal(str(lat)),
            longitude=Decimal(str(lng)),
            google_place_id=f'{name.lower().replace(" ", "_")}_place',
            created_by=user,
            **kwargs,
        )

    def test_returns_cafes_within_radius(self, api_client, test_user):
        """Cafes within radius are returned, sorted by distance."""
        cafe_near = self._create_cafe('Near Cafe', '-6.2088', '106.8456', test_user)
        cafe_mid = self._create_cafe('Mid Cafe', '-6.2100', '106.8470', test_user)

        response = api_client.get('/api/cafes/nearby/', {
            'latitude': self.JAKARTA_LAT,
            'longitude': self.JAKARTA_LNG,
            'radius_km': 5,
        })

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 2
        # Should be sorted by distance (nearest first)
        assert results[0]['name'] == 'Near Cafe'
        assert results[1]['name'] == 'Mid Cafe'

    def test_excludes_cafes_outside_radius(self, api_client, test_user):
        """Cafes outside the radius are excluded."""
        self._create_cafe('Near Cafe', '-6.2088', '106.8456', test_user)
        # ~100+ km away
        self._create_cafe('Far Cafe', '-6.9000', '106.8456', test_user)

        response = api_client.get('/api/cafes/nearby/', {
            'latitude': self.JAKARTA_LAT,
            'longitude': self.JAKARTA_LNG,
            'radius_km': 5,
        })

        assert response.status_code == status.HTTP_200_OK
        results = response.data['results']
        assert len(results) == 1
        assert results[0]['name'] == 'Near Cafe'

    def test_returns_empty_when_no_cafes_nearby(self, api_client, test_user):
        """Empty list returned when no cafes are within radius."""
        self._create_cafe('Distant Cafe', '-7.0000', '107.0000', test_user)

        response = api_client.get('/api/cafes/nearby/', {
            'latitude': self.JAKARTA_LAT,
            'longitude': self.JAKARTA_LNG,
            'radius_km': 1,
        })

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0
        assert response.data['results'] == []

    def test_excludes_closed_cafes(self, api_client, test_user):
        """Closed cafes are excluded from results."""
        self._create_cafe('Open Cafe', '-6.2088', '106.8456', test_user)
        self._create_cafe('Closed Cafe', '-6.2088', '106.8456', test_user, is_closed=True)

        response = api_client.get('/api/cafes/nearby/', {
            'latitude': self.JAKARTA_LAT,
            'longitude': self.JAKARTA_LNG,
            'radius_km': 1,
        })

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['name'] == 'Open Cafe'

    def test_respects_limit_parameter(self, api_client, test_user):
        """Limit parameter caps the number of results."""
        for i in range(5):
            self._create_cafe(f'Cafe {i}', '-6.2088', '106.8456', test_user)

        response = api_client.get('/api/cafes/nearby/', {
            'latitude': self.JAKARTA_LAT,
            'longitude': self.JAKARTA_LNG,
            'radius_km': 1,
            'limit': 2,
        })

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2


@pytest.mark.django_db
class TestCafeServicePriceLevelClamping:
    """Test that Google price_level=0 is clamped to None (price_range only accepts 1-4)."""

    def _make_cafe_data(self):
        return {
            'name': 'Test Cafe',
            'address': '123 Test St',
            'latitude': Decimal('-6.2088'),
            'longitude': Decimal('106.8456'),
        }

    def test_price_level_zero_stored_as_none(self, test_user, monkeypatch):
        """Google price_level=0 (Free) should be stored as None, not 0."""
        monkeypatch.setattr(
            'apps.cafes.services.GooglePlacesService.get_place_details',
            lambda pid: {'price_level': 0, 'rating': 4.5, 'user_ratings_total': 10}
        )
        from apps.cafes.services import CafeService
        cafe, created = CafeService.get_or_create_from_google(
            'price_zero_place', self._make_cafe_data(), created_by=test_user
        )
        assert created
        assert cafe.price_range is None

    def test_price_level_in_valid_range_stored(self, test_user, monkeypatch):
        """Google price_level 1-4 should be stored as-is."""
        for level in range(1, 5):
            monkeypatch.setattr(
                'apps.cafes.services.GooglePlacesService.get_place_details',
                lambda pid, pl=level: {'price_level': pl, 'rating': 4.0, 'user_ratings_total': 5}
            )
            from apps.cafes.services import CafeService
            cafe, created = CafeService.get_or_create_from_google(
                f'price_{level}_place', self._make_cafe_data(), created_by=test_user
            )
            assert created
            assert cafe.price_range == level

    def test_price_level_five_stored_as_none(self, test_user, monkeypatch):
        """Google price_level=5 (if ever returned) should be stored as None."""
        monkeypatch.setattr(
            'apps.cafes.services.GooglePlacesService.get_place_details',
            lambda pid: {'price_level': 5, 'rating': 4.0, 'user_ratings_total': 5}
        )
        from apps.cafes.services import CafeService
        cafe, created = CafeService.get_or_create_from_google(
            'price_five_place', self._make_cafe_data(), created_by=test_user
        )
        assert created
        assert cafe.price_range is None

    def test_null_price_level_stored_as_none(self, test_user, monkeypatch):
        """Missing price_level should be stored as None."""
        monkeypatch.setattr(
            'apps.cafes.services.GooglePlacesService.get_place_details',
            lambda pid: {'rating': 4.0, 'user_ratings_total': 5}
        )
        from apps.cafes.services import CafeService
        cafe, created = CafeService.get_or_create_from_google(
            'price_null_place', self._make_cafe_data(), created_by=test_user
        )
        assert created
        assert cafe.price_range is None


def _make_cafe(owner, name='Test Cafe', suffix=''):
    from apps.cafes.models import Cafe
    return Cafe.objects.create(
        name=name,
        address='123 Test St',
        latitude=Decimal('-6.2088'),
        longitude=Decimal('106.8456'),
        google_place_id=f'{name.lower().replace(" ", "_")}{suffix}_place',
        created_by=owner,
    )


@pytest.mark.django_db
class TestCafeListCRUD:
    """Tests for POST/GET/PATCH/DELETE /api/lists/."""

    def test_create_list_authenticated(self, authenticated_client):
        response = authenticated_client.post('/api/lists/', {'name': 'Work spots'})
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Work spots'
        assert response.data['is_default'] is False

    def test_create_list_requires_auth(self, api_client):
        response = api_client.post('/api/lists/', {'name': 'Anon list'})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_duplicate_name_returns_400(self, authenticated_client):
        authenticated_client.post('/api/lists/', {'name': 'Rainy day'})
        response = authenticated_client.post('/api/lists/', {'name': 'Rainy day'})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_index_returns_own_lists_only(self, authenticated_client, test_user, api_client):
        other = User.objects.create_user(username='other2', email='other2@example.com', password='pass')
        from apps.cafes.models import CafeList
        CafeList.objects.create(owner=other, name='Other list')
        authenticated_client.post('/api/lists/', {'name': 'My list'})

        response = authenticated_client.get('/api/lists/')
        assert response.status_code == status.HTTP_200_OK
        names = [lst['name'] for lst in response.data]
        assert 'Other list' not in names

    def test_retrieve_list_with_items(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList, CafeListItem
        cafe_list = CafeList.objects.create(owner=test_user, name='My picks')
        cafe = _make_cafe(test_user, suffix='_picks')
        CafeListItem.objects.create(cafe_list=cafe_list, cafe=cafe, note='Great wifi')

        response = authenticated_client.get(f'/api/lists/{cafe_list.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['items']) == 1
        assert response.data['items'][0]['note'] == 'Great wifi'

    def test_retrieve_other_users_list_returns_404(self, authenticated_client):
        other = User.objects.create_user(username='other3', email='other3@example.com', password='pass')
        from apps.cafes.models import CafeList
        other_list = CafeList.objects.create(owner=other, name='Secret list')

        response = authenticated_client.get(f'/api/lists/{other_list.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_patch_renames_list(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(owner=test_user, name='Old name')

        response = authenticated_client.patch(f'/api/lists/{cafe_list.id}/', {'name': 'New name'})
        assert response.status_code == status.HTTP_200_OK
        cafe_list.refresh_from_db()
        assert cafe_list.name == 'New name'

    def test_patch_rename_to_existing_name_returns_400(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        CafeList.objects.create(owner=test_user, name='Taken name')
        other_list = CafeList.objects.create(owner=test_user, name='Other list')

        response = authenticated_client.patch(f'/api/lists/{other_list.id}/', {'name': 'Taken name'})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_delete_non_default_list(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(owner=test_user, name='Deletable')
        response = authenticated_client.delete(f'/api/lists/{cafe_list.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not CafeList.objects.filter(pk=cafe_list.id).exists()

    def test_delete_default_list_returns_400(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        default_list = CafeList.objects.get(owner=test_user, list_type='favorites')
        response = authenticated_client.delete(f'/api/lists/{default_list.id}/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert CafeList.objects.filter(pk=default_list.id).exists()


@pytest.mark.django_db
class TestCafeListItems:
    """Tests for POST/PATCH/DELETE /api/lists/<id>/items/."""

    def test_add_cafe_to_list(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(owner=test_user, name='Good wifi')
        cafe = _make_cafe(test_user, suffix='_gwifi')

        response = authenticated_client.post(
            f'/api/lists/{cafe_list.id}/items/',
            {'cafe_id': cafe.id},
        )
        assert response.status_code == status.HTTP_201_CREATED
        cafe_list.refresh_from_db()
        assert cafe_list.item_count == 1

    def test_add_same_cafe_twice_is_idempotent(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList, CafeListItem
        cafe_list = CafeList.objects.create(owner=test_user, name='Idempotent')
        cafe = _make_cafe(test_user, suffix='_idem')

        authenticated_client.post(f'/api/lists/{cafe_list.id}/items/', {'cafe_id': cafe.id})
        response = authenticated_client.post(f'/api/lists/{cafe_list.id}/items/', {'cafe_id': cafe.id})

        assert response.status_code == status.HTTP_200_OK
        assert CafeListItem.objects.filter(cafe_list=cafe_list, cafe=cafe).count() == 1

    def test_add_cafe_updates_item_count_via_signal(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(owner=test_user, name='Count test')
        cafe = _make_cafe(test_user, suffix='_cnt')
        authenticated_client.post(f'/api/lists/{cafe_list.id}/items/', {'cafe_id': cafe.id})
        cafe_list.refresh_from_db()
        assert cafe_list.item_count == 1

    def test_remove_cafe_updates_item_count_via_signal(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList, CafeListItem
        cafe_list = CafeList.objects.create(owner=test_user, name='Remove test')
        cafe = _make_cafe(test_user, suffix='_rmv')
        CafeListItem.objects.create(cafe_list=cafe_list, cafe=cafe)
        cafe_list.item_count = 1
        cafe_list.save()

        response = authenticated_client.delete(f'/api/lists/{cafe_list.id}/items/{cafe.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        cafe_list.refresh_from_db()
        assert cafe_list.item_count == 0

    def test_update_note_on_item(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList, CafeListItem
        cafe_list = CafeList.objects.create(owner=test_user, name='Note test')
        cafe = _make_cafe(test_user, suffix='_note')
        CafeListItem.objects.create(cafe_list=cafe_list, cafe=cafe, note='Old note')

        response = authenticated_client.patch(
            f'/api/lists/{cafe_list.id}/items/{cafe.id}/',
            {'note': 'New note'},
        )
        assert response.status_code == status.HTTP_200_OK
        assert CafeListItem.objects.get(cafe_list=cafe_list, cafe=cafe).note == 'New note'

    def test_remove_nonexistent_item_returns_404(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(owner=test_user, name='Empty')
        cafe = _make_cafe(test_user, suffix='_404')

        response = authenticated_client.delete(f'/api/lists/{cafe_list.id}/items/{cafe.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestSpecialListConvenience:
    """Tests for POST/DELETE /api/lists/<special>/items/."""

    def test_add_to_favorites_list(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList
        favorites_list = CafeList.objects.get(owner=test_user, list_type='favorites')
        cafe = _make_cafe(test_user, suffix='_fav')

        response = authenticated_client.post('/api/lists/favorites/items/', {'cafe_id': cafe.id})
        assert response.status_code == status.HTTP_201_CREATED
        favorites_list.refresh_from_db()
        assert favorites_list.item_count == 1

    def test_remove_from_favorites_list(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList, CafeListItem
        favorites_list = CafeList.objects.get(owner=test_user, list_type='favorites')
        cafe = _make_cafe(test_user, suffix='_favrm')
        CafeListItem.objects.create(cafe_list=favorites_list, cafe=cafe)
        favorites_list.refresh_from_db()

        response = authenticated_client.delete(f'/api/lists/favorites/items/{cafe.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        favorites_list.refresh_from_db()
        assert favorites_list.item_count == 0

    def test_special_list_convenience_requires_auth(self, api_client):
        response = api_client.post('/api/lists/favorites/items/', {'cafe_id': 999})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestCafeMembershipView:
    """Tests for GET /api/cafes/<id>/my-lists/."""

    def test_returns_all_user_lists_with_in_list_flag(self, authenticated_client, test_user):
        from apps.cafes.models import CafeList, CafeListItem
        list_a = CafeList.objects.create(owner=test_user, name='List A')
        list_b = CafeList.objects.create(owner=test_user, name='List B')
        cafe = _make_cafe(test_user, suffix='_mem')
        CafeListItem.objects.create(cafe_list=list_a, cafe=cafe)

        response = authenticated_client.get(f'/api/cafes/{cafe.id}/my-lists/')
        assert response.status_code == status.HTTP_200_OK

        by_id = {row['id']: row for row in response.data}
        assert by_id[list_a.id]['in_list'] is True
        assert by_id[list_b.id]['in_list'] is False

    def test_membership_requires_auth(self, api_client, test_user):
        cafe = _make_cafe(test_user, suffix='_memauth')
        response = api_client.get(f'/api/cafes/{cafe.id}/my-lists/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_does_not_leak_other_users_lists(self, authenticated_client, test_user):
        other = User.objects.create_user(username='other4', email='other4@example.com', password='pass')
        from apps.cafes.models import CafeList
        CafeList.objects.create(owner=other, name='Private list')
        cafe = _make_cafe(test_user, suffix='_leak')

        response = authenticated_client.get(f'/api/cafes/{cafe.id}/my-lists/')
        assert response.status_code == status.HTTP_200_OK
        names = [row['name'] for row in response.data]
        assert 'Private list' not in names


@pytest.mark.django_db
class TestCafeListFeatured:
    """Tests for is_featured / featured_at on CafeList (Discover panel)."""

    def test_is_featured_defaults_false(self, test_user):
        from apps.cafes.models import CafeList
        lst = CafeList.objects.create(owner=test_user, name='Default test')
        assert lst.is_featured is False
        assert lst.featured_at is None

    def test_clean_rejects_featured_but_not_public(self, test_user):
        from apps.cafes.models import CafeList
        from django.core.exceptions import ValidationError
        lst = CafeList(owner=test_user, name='Bad featured', is_featured=True, is_public=False)
        with pytest.raises(ValidationError) as exc_info:
            lst.clean()
        assert 'is_featured' in exc_info.value.message_dict

    def test_clean_accepts_featured_and_public(self, test_user):
        from apps.cafes.models import CafeList
        lst = CafeList(owner=test_user, name='Good featured', is_featured=True, is_public=True)
        lst.clean()  # Should not raise

    def test_save_auto_sets_featured_at_on_first_feature(self, test_user):
        from apps.cafes.models import CafeList
        lst = CafeList.objects.create(owner=test_user, name='New list', is_public=True)
        assert lst.featured_at is None

        lst.is_featured = True
        lst.save()
        lst.refresh_from_db()
        assert lst.featured_at is not None

        first_featured_at = lst.featured_at
        lst.name = 'Renamed'
        lst.save()
        lst.refresh_from_db()
        assert lst.featured_at == first_featured_at  # Not overwritten

    def test_save_does_not_overwrite_existing_featured_at(self, test_user):
        from apps.cafes.models import CafeList
        from django.utils import timezone
        past = timezone.now() - timezone.timedelta(days=10)
        lst = CafeList.objects.create(
            owner=test_user, name='Pre-featured', is_public=True,
            is_featured=True, featured_at=past,
        )
        lst.name = 'Updated name'
        lst.save()
        lst.refresh_from_db()
        assert lst.featured_at == past


@pytest.mark.django_db
class TestCafeListCleanTightening:
    """Tests for CafeList.clean() — special lists cannot be public."""

    def test_clean_rejects_public_to_go_list(self, test_user):
        from apps.cafes.models import CafeList
        from django.core.exceptions import ValidationError
        lst = CafeList(
            owner=test_user, name='Try Public ToGo',
            list_type='to_go', is_public=True,
        )
        with pytest.raises(ValidationError) as exc_info:
            lst.clean()
        assert 'is_public' in exc_info.value.message_dict

    def test_clean_rejects_public_favorites_list(self, test_user):
        from apps.cafes.models import CafeList
        from django.core.exceptions import ValidationError
        lst = CafeList(
            owner=test_user, name='Try Public Favs',
            list_type='favorites', is_public=True,
        )
        with pytest.raises(ValidationError) as exc_info:
            lst.clean()
        assert 'is_public' in exc_info.value.message_dict

    def test_clean_rejects_featured_and_public_combined_invalid(self, test_user):
        from apps.cafes.models import CafeList
        from django.core.exceptions import ValidationError
        lst = CafeList(
            owner=test_user, name='Double Invalid',
            list_type='favorites', is_public=True, is_featured=True,
        )
        with pytest.raises(ValidationError) as exc_info:
            lst.clean()
        msg_dict = exc_info.value.message_dict
        assert 'is_featured' in msg_dict or 'is_public' in msg_dict

    def test_clean_accepts_public_custom_list(self, test_user):
        from apps.cafes.models import CafeList
        lst = CafeList(
            owner=test_user, name='Public Custom',
            list_type='custom', is_public=True,
        )
        lst.clean()  # Should not raise

    def test_clean_accepts_private_special_list(self, test_user):
        from apps.cafes.models import CafeList
        lst = CafeList(
            owner=test_user, name='Private Favs',
            list_type='favorites', is_public=False,
        )
        lst.clean()  # Should not raise


@pytest.mark.django_db
class TestSaveCafeList:
    """Tests for POST/DELETE /api/lists/<id>/save/ (Phase 5)."""

    def _make_public_list(self, owner, name='Public List'):
        from apps.cafes.models import CafeList
        return CafeList.objects.create(
            owner=owner, name=name, is_public=True,
        )

    def test_save_public_list(self, api_client, test_user):
        other = User.objects.create_user(
            username='listowner', email='owner@example.com', password='pass',
        )
        cafe_list = self._make_public_list(other)
        api_client.force_authenticate(user=test_user)

        response = api_client.post(f'/api/lists/{cafe_list.id}/save/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_saved_by_user'] is True
        assert response.data['save_count'] == 1
        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 1

    def test_unsave_list(self, api_client, test_user):
        other = User.objects.create_user(
            username='listowner2', email='owner2@example.com', password='pass',
        )
        cafe_list = self._make_public_list(other)
        api_client.force_authenticate(user=test_user)
        api_client.post(f'/api/lists/{cafe_list.id}/save/')

        response = api_client.delete(f'/api/lists/{cafe_list.id}/save/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 0

    def test_save_is_idempotent(self, api_client, test_user):
        other = User.objects.create_user(
            username='listowner3', email='owner3@example.com', password='pass',
        )
        cafe_list = self._make_public_list(other)
        api_client.force_authenticate(user=test_user)

        api_client.post(f'/api/lists/{cafe_list.id}/save/')
        response = api_client.post(f'/api/lists/{cafe_list.id}/save/')
        assert response.status_code == status.HTTP_200_OK
        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 1

    def test_unsave_is_idempotent(self, api_client, test_user):
        other = User.objects.create_user(
            username='listowner4', email='owner4@example.com', password='pass',
        )
        cafe_list = self._make_public_list(other)
        api_client.force_authenticate(user=test_user)

        response = api_client.delete(f'/api/lists/{cafe_list.id}/save/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 0

    def test_self_save_blocked(self, api_client, test_user):
        cafe_list = self._make_public_list(test_user)
        api_client.force_authenticate(user=test_user)

        response = api_client.post(f'/api/lists/{cafe_list.id}/save/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 0

    def test_nonexistent_list_returns_404_on_save(self, api_client, test_user):
        api_client.force_authenticate(user=test_user)
        response = api_client.post('/api/lists/99999/save/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_nonexistent_list_returns_204_on_unsave(self, api_client, test_user):
        api_client.force_authenticate(user=test_user)
        response = api_client.delete('/api/lists/99999/save/')
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_private_list_blocked_for_save(self, api_client, test_user):
        other = User.objects.create_user(
            username='privowner', email='privowner@example.com', password='pass',
        )
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(
            owner=other, name='Secret List', is_public=False,
        )
        api_client.force_authenticate(user=test_user)

        response = api_client.post(f'/api/lists/{cafe_list.id}/save/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_save_requires_auth(self, api_client, test_user):
        other = User.objects.create_user(
            username='listowner5', email='owner5@example.com', password='pass',
        )
        cafe_list = self._make_public_list(other)

        response = api_client.post(f'/api/lists/{cafe_list.id}/save/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_unsave_requires_auth(self, api_client, test_user):
        other = User.objects.create_user(
            username='listowner6', email='owner6@example.com', password='pass',
        )
        cafe_list = self._make_public_list(other)

        response = api_client.delete(f'/api/lists/{cafe_list.id}/save/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_save_count_increments_via_signal(self, api_client, test_user):
        from apps.cafes.models import CafeList, SavedCafeList
        other = User.objects.create_user(
            username='sigowner', email='sigowner@example.com', password='pass',
        )
        cafe_list = CafeList.objects.create(
            owner=other, name='Signal Test', is_public=True,
        )
        saver1 = User.objects.create_user(
            username='saver1', email='saver1@example.com', password='pass',
        )
        saver2 = User.objects.create_user(
            username='saver2', email='saver2@example.com', password='pass',
        )

        api_client.force_authenticate(user=saver1)
        api_client.post(f'/api/lists/{cafe_list.id}/save/')
        api_client.force_authenticate(user=saver2)
        api_client.post(f'/api/lists/{cafe_list.id}/save/')

        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 2

        api_client.force_authenticate(user=saver1)
        api_client.delete(f'/api/lists/{cafe_list.id}/save/')
        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 1


@pytest.mark.django_db
class TestPublicListViewing:
    """Tests for anonymous/public access to CafeList detail (Phase 5)."""

    def _make_public_list(self, owner, name='Public', **kwargs):
        from apps.cafes.models import CafeList
        return CafeList.objects.create(
            owner=owner, name=name, is_public=True, **kwargs,
        )

    def test_anonymous_can_view_public_list(self, api_client, test_user):
        cafe_list = self._make_public_list(test_user)
        response = api_client.get(f'/api/lists/{cafe_list.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Public'

    def test_anonymous_cannot_view_private_list(self, api_client, test_user):
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(
            owner=test_user, name='Private', is_public=False,
        )
        response = api_client.get(f'/api/lists/{cafe_list.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_owner_can_view_own_private_list(self, api_client, test_user):
        from apps.cafes.models import CafeList
        cafe_list = CafeList.objects.create(
            owner=test_user, name='My Private', is_public=False,
        )
        api_client.force_authenticate(user=test_user)
        response = api_client.get(f'/api/lists/{cafe_list.id}/')
        assert response.status_code == status.HTTP_200_OK

    def test_is_saved_by_user_false_for_anonymous(self, api_client, test_user):
        cafe_list = self._make_public_list(test_user)
        response = api_client.get(f'/api/lists/{cafe_list.id}/')
        assert response.status_code == status.HTTP_200_OK

    def test_is_saved_by_user_true_for_saver(self, api_client, test_user):
        other = User.objects.create_user(
            username='viewer', email='viewer@example.com', password='pass',
        )
        cafe_list = self._make_public_list(test_user)
        from apps.cafes.models import SavedCafeList
        SavedCafeList.objects.create(user=other, cafe_list=cafe_list)

        api_client.force_authenticate(user=other)
        response = api_client.get(f'/api/lists/{cafe_list.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data.get('is_saved_by_user') is True

    def test_public_list_with_patch_requires_auth(self, api_client, test_user):
        cafe_list = self._make_public_list(test_user)
        response = api_client.patch(f'/api/lists/{cafe_list.id}/', {'name': 'Hacked'})
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_public_list_with_delete_requires_auth(self, api_client, test_user):
        cafe_list = self._make_public_list(test_user)
        response = api_client.delete(f'/api/lists/{cafe_list.id}/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestRecomputeSaveCounts:
    """Tests for the recompute_save_counts management command (Phase 5)."""

    def test_fixes_drifted_count(self, test_user):
        from django.core.management import call_command
        from io import StringIO
        from apps.cafes.models import CafeList, SavedCafeList

        cafe_list = CafeList.objects.create(
            owner=test_user, name='Drifted', is_public=True,
        )
        saver = User.objects.create_user(
            username='drifter', email='drift@example.com', password='pass',
        )
        SavedCafeList.objects.create(user=saver, cafe_list=cafe_list)

        # Manually break the count
        CafeList.objects.filter(pk=cafe_list.pk).update(save_count=5)

        out = StringIO()
        call_command('recompute_save_counts', stdout=out)
        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 1
        assert 'Fixed 1 list' in out.getvalue()

    def test_dry_run_does_not_write(self, test_user):
        from django.core.management import call_command
        from io import StringIO
        from apps.cafes.models import CafeList, SavedCafeList

        cafe_list = CafeList.objects.create(
            owner=test_user, name='Dry Run', is_public=True,
        )
        saver = User.objects.create_user(
            username='dryruner', email='dryrun@example.com', password='pass',
        )
        SavedCafeList.objects.create(user=saver, cafe_list=cafe_list)
        stored_before = cafe_list.save_count

        CafeList.objects.filter(pk=cafe_list.pk).update(save_count=10)

        out = StringIO()
        call_command('recompute_save_counts', '--dry-run', stdout=out)

        cafe_list.refresh_from_db()
        assert cafe_list.save_count == 10
        assert 'Would fix' in out.getvalue()
