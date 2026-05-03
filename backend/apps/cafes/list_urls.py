from django.urls import path

from .views import (
    CafeListListCreateView,
    CafeListRetrieveUpdateDestroyView,
    CafeListItemCreateView,
    CafeListItemDetailView,
    DefaultListItemView,
)

urlpatterns = [
    # Lists CRUD
    path('', CafeListListCreateView.as_view(), name='list-list-create'),
    path('<int:pk>/', CafeListRetrieveUpdateDestroyView.as_view(), name='list-detail'),

    # Items within a specific list
    path('<int:pk>/items/', CafeListItemCreateView.as_view(), name='list-item-create'),
    path('<int:pk>/items/<int:cafe_id>/', CafeListItemDetailView.as_view(), name='list-item-detail'),

    # Default-list convenience endpoints (heart-button flow)
    path('default/items/', DefaultListItemView.as_view(), name='default-list-item-create'),
    path('default/items/<int:cafe_id>/', DefaultListItemView.as_view(), name='default-list-item-delete'),
]
