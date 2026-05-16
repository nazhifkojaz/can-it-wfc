from django.urls import path
from .views import (
    OAuthLoginView,
    CsrfTokenView,
    UserDetailView,
    UserPublicProfileView,
    LogoutView,
    UserSettingsUpdateView,
    FollowUserView,
    UnfollowUserView,
    MyFollowersListView,
    MyFollowingListView,
    UserFollowersListView,
    UserFollowingListView,
    FollowRequestsListView,
    HandleFollowRequestView,
    SavedListsView,
    UserPublicListsView,
)

urlpatterns = [
    # OAuth Authentication
    path('csrf/', CsrfTokenView.as_view(), name='csrf-token'),
    path('oauth/<str:provider>/', OAuthLoginView.as_view(), name='oauth-login'),

    # Session Management
    path('me/', UserDetailView.as_view(), name='user-detail'),
    path('me/settings/', UserSettingsUpdateView.as_view(), name='user-settings'),
    path('me/saved-lists/', SavedListsView.as_view(), name='saved-lists'),
    path('logout/', LogoutView.as_view(), name='logout'),

    # Follow Management
    path('follow/<str:username>/', FollowUserView.as_view(), name='follow-user'),
    path('unfollow/<str:username>/', UnfollowUserView.as_view(), name='unfollow-user'),

    # Follow Requests
    path('me/follow-requests/', FollowRequestsListView.as_view(), name='follow-requests'),
    path('follow-requests/<int:user_id>/handle/', HandleFollowRequestView.as_view(), name='handle-follow-request'),

    # Followers/Following Lists
    path('me/followers/', MyFollowersListView.as_view(), name='my-followers'),
    path('me/following/', MyFollowingListView.as_view(), name='my-following'),
    path('users/<str:username>/followers/', UserFollowersListView.as_view(), name='user-followers'),
    path('users/<str:username>/following/', UserFollowingListView.as_view(), name='user-following'),

    # Public profiles
    path('users/<str:username>/profile/', UserPublicProfileView.as_view(), name='user-public-profile'),
    path('users/<str:username>/lists/', UserPublicListsView.as_view(), name='user-public-lists'),
]
