from django.urls import path
from .views import RecentReviewsView, FeaturedListsView, TrendingCafesView, TrendingListsView

urlpatterns = [
    path('recent-reviews/', RecentReviewsView.as_view(), name='discover-recent-reviews'),
    path('featured-lists/', FeaturedListsView.as_view(), name='discover-featured-lists'),
    path('trending/', TrendingCafesView.as_view(), name='discover-trending'),
    path('trending-lists/', TrendingListsView.as_view(), name='discover-trending-lists'),
]
