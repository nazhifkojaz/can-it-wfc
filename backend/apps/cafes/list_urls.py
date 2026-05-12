from django.urls import path

from .views import (
    CafeListListCreateView,
    CafeListRetrieveUpdateDestroyView,
    CafeListItemCreateView,
    CafeListItemDetailView,
    SaveCafeListView,
    SpecialListItemView,
)

urlpatterns = [
    # Lists CRUD
    path('', CafeListListCreateView.as_view(), name='list-list-create'),
    path('<int:pk>/', CafeListRetrieveUpdateDestroyView.as_view(), name='list-detail'),
    path('<int:pk>/save/', SaveCafeListView.as_view(), name='list-save'),

    # Items within a specific list
    path('<int:pk>/items/', CafeListItemCreateView.as_view(), name='list-item-create'),
    path('<int:pk>/items/<int:cafe_id>/', CafeListItemDetailView.as_view(), name='list-item-detail'),

    # Special-list convenience endpoints (bookmark-button flow)
    path('to-go/items/', SpecialListItemView.as_view(list_type='to-go'), name='to-go-list-item-create'),
    path('to-go/items/<int:cafe_id>/', SpecialListItemView.as_view(list_type='to-go'), name='to-go-list-item-delete'),
    path('favorites/items/', SpecialListItemView.as_view(list_type='favorites'), name='favorites-list-item-create'),
    path('favorites/items/<int:cafe_id>/', SpecialListItemView.as_view(list_type='favorites'), name='favorites-list-item-delete'),
]
