from django.urls import path
from .views import (
    UserRegistrationView,
    UserDetailView,
    UserPublicProfileView,
    ChangePasswordView,
    GoogleLoginView,
    UserActivityView,
    UserSettingsUpdateView,
    FollowUserView,
    UnfollowUserView,
    MyFollowersListView,
    MyFollowingListView,
    UserFollowersListView,
    UserFollowingListView,
    ActivityFeedView
)

urlpatterns = [
    # Authentication
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('me/', UserDetailView.as_view(), name='user-detail'),
    path('me/settings/', UserSettingsUpdateView.as_view(), name='user-settings'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),

    # Social Authentication
    path('google/', GoogleLoginView.as_view(), name='google-login'),

    # Follow Management
    path('follow/<str:username>/', FollowUserView.as_view(), name='follow-user'),
    path('unfollow/<str:username>/', UnfollowUserView.as_view(), name='unfollow-user'),

    # Followers/Following Lists
    path('me/followers/', MyFollowersListView.as_view(), name='my-followers'),
    path('me/following/', MyFollowingListView.as_view(), name='my-following'),
    path('users/<str:username>/followers/', UserFollowersListView.as_view(), name='user-followers'),
    path('users/<str:username>/following/', UserFollowingListView.as_view(), name='user-following'),

    # Enhanced Activity Feed
    path('me/feed/', ActivityFeedView.as_view(), name='activity-feed'),

    # Public profiles and activity
    path('users/<str:username>/profile/', UserPublicProfileView.as_view(), name='user-public-profile'),
    path('users/<str:username>/activity/', UserActivityView.as_view(), name='user-activity'),
]