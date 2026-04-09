from django.urls import path
from .views import (
    OAuthLoginView,
    TwitterCallbackView,
    LegacyUserMigrationView,
    UserDetailView,
    UserPublicProfileView,
    LogoutView,
    UserActivityView,
    UserSettingsUpdateView,
    FollowUserView,
    UnfollowUserView,
    MyFollowersListView,
    MyFollowingListView,
    UserFollowersListView,
    UserFollowingListView,
)

urlpatterns = [
    # OAuth Authentication
    path('oauth/<str:provider>/', OAuthLoginView.as_view(), name='oauth-login'),

    # Twitter OAuth Callback
    path('twitter/callback/', TwitterCallbackView.as_view(), name='twitter-callback'),

    # Legacy User Migration
    path('migration/status/', LegacyUserMigrationView.as_view(), name='migration-status'),
    path('migration/link/', LegacyUserMigrationView.as_view(), name='migration-link'),

    # Session Management
    path('me/', UserDetailView.as_view(), name='user-detail'),
    path('me/settings/', UserSettingsUpdateView.as_view(), name='user-settings'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # Follow Management
    path('follow/<str:username>/', FollowUserView.as_view(), name='follow-user'),
    path('unfollow/<str:username>/', UnfollowUserView.as_view(), name='unfollow-user'),

    # Followers/Following Lists
    path('me/followers/', MyFollowersListView.as_view(), name='my-followers'),
    path('me/following/', MyFollowingListView.as_view(), name='my-following'),
    path('users/<str:username>/followers/', UserFollowersListView.as_view(), name='user-followers'),
    path('users/<str:username>/following/', UserFollowingListView.as_view(), name='user-following'),

    # Public profiles and activity
    path('users/<str:username>/profile/', UserPublicProfileView.as_view(), name='user-public-profile'),
    path('users/<str:username>/activity/', UserActivityView.as_view(), name='user-activity'),
]