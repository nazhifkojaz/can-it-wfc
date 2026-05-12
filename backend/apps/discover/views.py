from datetime import timedelta

from django.core.cache import cache
from django.db.models import Count, F, Prefetch, Q
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.cafes.models import Cafe, CafeList, CafeListItem
from apps.reviews.models import Review
from .serializers import (
    DiscoverReviewSerializer,
    DiscoverFeaturedListSerializer,
    DiscoverTrendingCafeSerializer,
    DiscoverTrendingListSerializer,
)


class DiscoverPagination(LimitOffsetPagination):
    default_limit = 20
    max_limit = 50


class RecentReviewsView(generics.ListAPIView):
    serializer_class = DiscoverReviewSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = DiscoverPagination

    def get_queryset(self):
        return (
            Review.objects
            .filter(is_hidden=False, user__is_active=True)
            .select_related('user', 'cafe')
            .order_by('-created_at')
        )


class FeaturedListsView(generics.ListAPIView):
    serializer_class = DiscoverFeaturedListSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get(self, request, *args, **kwargs):
        limit = min(int(request.query_params.get('limit', 6)), 20)
        cache_key = f'discover:featured:limit={limit}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        queryset = (
            CafeList.objects
            .filter(is_featured=True, is_public=True, owner__is_active=True)
            .select_related('owner')
            .prefetch_related(
                Prefetch(
                    'items',
                    queryset=CafeListItem.objects.select_related('cafe').order_by('added_at')[:3],
                    to_attr='preview_items',
                )
            )
            .order_by('-featured_at')[:limit]
        )

        serializer = self.get_serializer(queryset, many=True)
        data = {'lists': serializer.data}
        cache.set(cache_key, data, 300)
        return Response(data)


class TrendingCafesView(APIView):
    permission_classes = [permissions.AllowAny]

    # review_weight=3, visit_weight=1 — reviews are higher-effort signals.
    # Tune after 2-4 weeks of live data if the top-5 list doesn't "look right".
    REVIEW_WEIGHT = 3
    VISIT_WEIGHT = 1
    MIN_SCORE = 3  # at least one review OR three visits in the window

    def get(self, request):
        days = min(int(request.query_params.get('days', 7)), 30)
        limit = min(int(request.query_params.get('limit', 5)), 10)

        cache_key = f'discover:trending:days={days}:limit={limit}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        now = timezone.now()
        window_dt = now - timedelta(days=days)
        window_dt_date = (now - timedelta(days=days)).date()

        cafes = (
            Cafe.objects
            .filter(is_closed=False)
            .annotate(
                recent_review_count=Count(
                    'reviews',
                    filter=Q(
                        reviews__created_at__gte=window_dt,
                        reviews__is_hidden=False,
                        reviews__user__is_active=True,
                    ),
                    distinct=True,
                ),
                recent_visit_count=Count(
                    'visits',
                    filter=Q(visits__visit_date__gte=window_dt_date),
                    distinct=True,
                ),
            )
            .annotate(
                score=F('recent_review_count') * self.REVIEW_WEIGHT
                     + F('recent_visit_count') * self.VISIT_WEIGHT,
            )
            .filter(score__gte=self.MIN_SCORE)
            .order_by('-score', '-average_wfc_rating')[:limit]
        )

        serializer = DiscoverTrendingCafeSerializer(cafes, many=True)
        data = {
            'window_days': days,
            'generated_at': now.isoformat(),
            'cafes': serializer.data,
        }
        cache.set(cache_key, data, 900)
        return Response(data)


class TrendingListsView(APIView):
    permission_classes = [permissions.AllowAny]
    MIN_SAVES = 3  # three distinct users must have saved within the window

    def get(self, request):
        days = min(int(request.query_params.get('days', 30)), 90)
        limit = min(int(request.query_params.get('limit', 6)), 20)

        cache_key = f'discover:trending-lists:days={days}:limit={limit}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        now = timezone.now()
        window = now - timedelta(days=days)

        lists = (
            CafeList.objects
            .filter(
                is_public=True,
                is_featured=False,
                list_type='custom',
                item_count__gt=0,
                owner__is_active=True,
            )
            .annotate(
                recent_save_count=Count(
                    'saves',
                    filter=Q(saves__saved_at__gte=window),
                    distinct=True,
                )
            )
            .filter(recent_save_count__gte=self.MIN_SAVES)
            .select_related('owner')
            .prefetch_related(
                Prefetch(
                    'items',
                    queryset=CafeListItem.objects.select_related('cafe').order_by('added_at')[:3],
                    to_attr='preview_items',
                )
            )
            .order_by('-recent_save_count', '-save_count')[:limit]
        )

        serializer = DiscoverTrendingListSerializer(lists, many=True)
        data = {'lists': serializer.data}
        cache.set(cache_key, data, 900)
        return Response(data)
