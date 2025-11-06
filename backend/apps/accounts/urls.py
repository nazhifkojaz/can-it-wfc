from django.urls import path
from .views import (
    UserRegistrationView,
    UserDetailView,
    UserPublicProfileView,
    ChangePasswordView,
    GoogleLoginView
)

urlpatterns = [
    # Authentication
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('me/', UserDetailView.as_view(), name='user-detail'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),

    # Social Authentication
    path('google/', GoogleLoginView.as_view(), name='google-login'),

    # Public profiles
    path('users/<str:username>/', UserPublicProfileView.as_view(), name='user-public-profile'),
]