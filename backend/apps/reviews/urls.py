from django.urls import path
from .views import (
    VisitListCreateView,
    VisitDetailView,
    CombinedVisitReviewCreateView,
    ReviewListView,
    ReviewCreateView,
    ReviewDetailView,
    MyReviewsView,
    UserReviewsView,
    CafeReviewsView,
    ReviewFlagCreateView,
    UserCafeReviewView,
    BulkUserCafeReviewsView,
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
    path('reviews/for-cafe/', UserCafeReviewView.as_view(), name='user-cafe-review'),
    path('reviews/bulk/', BulkUserCafeReviewsView.as_view(), name='bulk-user-cafe-reviews'),
    path('reviews/users/<str:username>/reviews/', UserReviewsView.as_view(), name='user-reviews'),
    path('reviews/<int:pk>/', ReviewDetailView.as_view(), name='review-detail'),
    path('reviews/<int:pk>/mark_helpful/', MarkReviewHelpfulView.as_view(), name='review-mark-helpful'),

    # Cafe reviews
    path('cafes/<int:cafe_id>/reviews/', CafeReviewsView.as_view(), name='cafe-reviews'),

    # Review flags
    path('reviews/flags/', ReviewFlagCreateView.as_view(), name='review-flag-create'),
]