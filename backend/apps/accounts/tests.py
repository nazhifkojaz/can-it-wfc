"""
Authentication and User Management Tests
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

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


@pytest.mark.django_db
class TestUserRegistration:
    """Test user registration endpoint"""

    def test_register_user_success(self, api_client):
        """Test successful user registration"""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'SecurePass123!@#',
            'password2': 'SecurePass123!@#'
        }
        response = api_client.post('/api/auth/register/', data)

        assert response.status_code == status.HTTP_201_CREATED
        assert 'user' in response.data
        assert 'message' in response.data
        assert response.data['user']['username'] == 'newuser'
        assert User.objects.filter(username='newuser').exists()

    def test_register_duplicate_username(self, api_client, test_user):
        """Test registration with existing username fails"""
        data = {
            'username': 'testuser',  # Already exists
            'email': 'another@example.com',
            'password': 'pass123'
        }
        response = api_client.post('/api/auth/register/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'username' in str(response.data).lower()

    def test_register_duplicate_email(self, api_client, test_user):
        """Test registration with existing email fails"""
        data = {
            'username': 'newuser',
            'email': 'test@example.com',  # Already exists
            'password': 'pass123'
        }
        response = api_client.post('/api/auth/register/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_weak_password(self, api_client):
        """Test registration with weak password fails"""
        data = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': '123'  # Too short
        }
        response = api_client.post('/api/auth/register/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_register_missing_fields(self, api_client):
        """Test registration with missing required fields fails"""
        data = {'username': 'newuser'}
        response = api_client.post('/api/auth/register/', data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUserLogin:
    """Test user login endpoint"""

    def test_login_success(self, api_client, test_user):
        """Test successful login returns tokens"""
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = api_client.post('/api/auth/login/', data)

        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert len(response.data['access']) > 0
        assert len(response.data['refresh']) > 0

    def test_login_invalid_password(self, api_client, test_user):
        """Test login with wrong password fails"""
        data = {
            'username': 'testuser',
            'password': 'wrongpass'
        }
        response = api_client.post('/api/auth/login/', data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_nonexistent_user(self, api_client):
        """Test login with non-existent user fails"""
        data = {
            'username': 'nonexistent',
            'password': 'pass123'
        }
        response = api_client.post('/api/auth/login/', data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_missing_credentials(self, api_client):
        """Test login without credentials fails"""
        response = api_client.post('/api/auth/login/', {})

        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUserProfile:
    """Test user profile endpoints"""

    def test_get_current_user(self, api_client, test_user):
        """Test authenticated user can fetch their profile"""
        api_client.force_authenticate(user=test_user)
        response = api_client.get('/api/auth/me/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == 'testuser'
        assert response.data['email'] == 'test@example.com'
        assert 'total_reviews' in response.data
        assert 'total_visits' in response.data

    def test_get_current_user_unauthenticated(self, api_client):
        """Test unauthenticated request fails"""
        response = api_client.get('/api/auth/me/')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_update_profile(self, api_client, test_user):
        """Test user can update their profile"""
        api_client.force_authenticate(user=test_user)
        data = {
            'bio': 'Coffee lover and remote worker',
            'is_anonymous_display': True
        }
        response = api_client.patch('/api/auth/me/', data)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['bio'] == 'Coffee lover and remote worker'
        assert response.data['is_anonymous_display'] is True

        # Verify in database
        test_user.refresh_from_db()
        assert test_user.bio == 'Coffee lover and remote worker'
        assert test_user.is_anonymous_display is True


@pytest.mark.django_db
class TestTokenRefresh:
    """Test token refresh functionality"""

    def test_refresh_token(self, api_client, test_user):
        """Test refreshing access token with refresh token"""
        # Login to get tokens
        login_data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        login_response = api_client.post('/api/auth/login/', login_data)
        refresh_token = login_response.data['refresh']

        # Refresh the token
        refresh_data = {'refresh': refresh_token}
        response = api_client.post('/api/auth/refresh/', refresh_data)

        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert len(response.data['access']) > 0

    def test_refresh_invalid_token(self, api_client):
        """Test refreshing with invalid token fails"""
        data = {'refresh': 'invalid-token-string'}
        response = api_client.post('/api/auth/refresh/', data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestUserModel:
    """Test User model methods"""

    def test_user_creation(self, db):
        """Test creating a user"""
        user = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='pass123'
        )

        assert user.username == 'testuser2'
        assert user.email == 'test2@example.com'
        assert user.check_password('pass123')
        assert user.total_reviews == 0
        assert user.total_visits == 0

    def test_display_name_not_anonymous(self, test_user):
        """Test display_name returns username when not anonymous"""
        test_user.is_anonymous_display = False
        test_user.save()

        assert test_user.display_name == 'testuser'

    def test_display_name_anonymous(self, test_user):
        """Test display_name masks username when anonymous"""
        test_user.is_anonymous_display = True
        test_user.save()

        display = test_user.display_name
        assert display != 'testuser'
        assert 'tes' in display  # First 3 chars visible
        assert '*' in display  # Contains masking

    def test_can_review_new_account(self, db):
        """Test new accounts can review (MIN_ACCOUNT_AGE_HOURS=0)"""
        user = User.objects.create_user(
            username='newuser',
            email='new@example.com',
            password='pass123'
        )

        assert user.can_review() is True

    def test_update_stats(self, test_user):
        """Test update_stats recalculates user statistics"""
        initial_reviews = test_user.total_reviews
        test_user.update_stats()

        # Should recalculate from database
        assert test_user.total_reviews >= 0
        assert test_user.total_visits >= 0
