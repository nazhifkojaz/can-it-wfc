from django.urls import path
from .views import (
    CafeListCreateView,
    CafeDetailView,
    NearbyCafesView,
    FavoriteListCreateView,
    FavoriteDetailView
)

urlpatterns = [
    # Cafes
    path('', CafeListCreateView.as_view(), name='cafe-list-create'),
    path('<uuid:pk>/', CafeDetailView.as_view(), name='cafe-detail'),
    path('nearby/', NearbyCafesView.as_view(), name='cafe-nearby'),
    
    # Favorites
    path('favorites/', FavoriteListCreateView.as_view(), name='favorite-list-create'),
    path('favorites/<int:pk>/', FavoriteDetailView.as_view(), name='favorite-detail'),
]