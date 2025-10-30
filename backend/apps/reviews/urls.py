from django.urls import path
from .views import (
    VisitListCreateView,
    VisitDetailView,
    CombinedVisitReviewCreateView,
    ReviewListView,
    ReviewCreateView,
    ReviewDetailView,
    MyReviewsView,
    CafeReviewsView,
    ReviewFlagCreateView,
    MarkReviewHelpfulView
)

urlpatterns = [
    # Visits
    path('visits/', VisitListCreateView.as_view(), name='visit-list-create'),
    path('visits/<int:pk>/', VisitDetailView.as_view(), name='visit-detail'),
    path('visits/create-with-review/', CombinedVisitReviewCreateView.as_view(), name='visit-create-with-review'),

    # Reviews
    path('reviews/', ReviewListView.as_view(), name='review-list'),
    path('reviews/create/', ReviewCreateView.as_view(), name='review-create'),
    path('reviews/me/', MyReviewsView.as_view(), name='my-reviews'),
    path('reviews/<int:pk>/', ReviewDetailView.as_view(), name='review-detail'),
    path('reviews/<int:pk>/mark_helpful/', MarkReviewHelpfulView.as_view(), name='review-mark-helpful'),

    # Cafe reviews
    path('cafes/<uuid:cafe_id>/reviews/', CafeReviewsView.as_view(), name='cafe-reviews'),

    # Review flags
    path('reviews/flags/', ReviewFlagCreateView.as_view(), name='review-flag-create'),
]