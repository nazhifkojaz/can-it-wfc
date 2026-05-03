from django.urls import path

from .views import (
    CafeListCreateView,
    CafeDetailView,
    NearbyCafesView,
    MergedNearbyCafesView,
    CafeSearchView,
    CafeMembershipView,
    CafeFlagCreateView,
    CafeFlagListView,
    CafeGoogleRatingRefreshView,
)

urlpatterns = [
    # Cafes
    path('', CafeListCreateView.as_view(), name='cafe-list-create'),
    path('search/', CafeSearchView.as_view(), name='cafe-search'),
    path('<int:pk>/', CafeDetailView.as_view(), name='cafe-detail'),
    path('<int:pk>/refresh-google-rating/', CafeGoogleRatingRefreshView.as_view(), name='cafe-refresh-google-rating'),
    path('<int:pk>/my-lists/', CafeMembershipView.as_view(), name='cafe-my-lists'),
    path('nearby/', NearbyCafesView.as_view(), name='cafe-nearby'),
    path('nearby/all/', MergedNearbyCafesView.as_view(), name='cafe-nearby-all'),

    # Flags (reports)
    path('flags/', CafeFlagCreateView.as_view(), name='cafe-flag-create'),
    path('flags/my/', CafeFlagListView.as_view(), name='cafe-flag-list'),
]