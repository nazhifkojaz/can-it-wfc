from django.urls import path
from .views import (
    UserRegistrationView,
    UserDetailView,
    UserPublicProfileView,
    ChangePasswordView
)

urlpatterns = [
    # Authentication
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('me/', UserDetailView.as_view(), name='user-detail'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    
    # Public profiles
    path('users/<int:pk>/', UserPublicProfileView.as_view(), name='user-public-profile'),
]