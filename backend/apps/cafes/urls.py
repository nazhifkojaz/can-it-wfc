from django.urls import path
from .views import (
    CafeListCreateView,
    CafeDetailView,
    NearbyCafesView,
    MergedNearbyCafesView,
    CafeSearchView,
    FavoriteListCreateView,
    FavoriteDetailView,
    CafeFlagCreateView,
    CafeFlagListView
)

urlpatterns = [
    # Cafes
    path('', CafeListCreateView.as_view(), name='cafe-list-create'),
    path('search/', CafeSearchView.as_view(), name='cafe-search'),
    path('<int:pk>/', CafeDetailView.as_view(), name='cafe-detail'),
    path('nearby/', NearbyCafesView.as_view(), name='cafe-nearby'),
    path('nearby/all/', MergedNearbyCafesView.as_view(), name='cafe-nearby-all'),

    # Favorites
    path('favorites/', FavoriteListCreateView.as_view(), name='favorite-list-create'),
    path('favorites/<int:pk>/', FavoriteDetailView.as_view(), name='favorite-detail'),

    # Flags (reports)
    path('flags/', CafeFlagCreateView.as_view(), name='cafe-flag-create'),
    path('flags/my/', CafeFlagListView.as_view(), name='cafe-flag-list'),
]