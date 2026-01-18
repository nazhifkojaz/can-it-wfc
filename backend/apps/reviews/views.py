from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError, Throttled
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from core.exceptions import (
    ReviewNotFound,
    SelfHelpfulNotAllowed,
    InvalidCafeIds,
    TooManyCafeIds,
)
from .models import Visit, Review, ReviewHelpful
from .serializers import (
    VisitSerializer,
    ReviewListSerializer,
    ReviewDetailSerializer,
    ReviewCreateSerializer,
    ReviewUpdateSerializer,
    ReviewFlagSerializer,
    CombinedVisitReviewSerializer
)
from core.permissions import IsOwnerOrReadOnly
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator


class VisitListCreateView(generics.ListCreateAPIView):
    """
    List user's visits or create a new visit.

    GET /api/visits/
    GET /api/visits/?cafe={id}&visit_date={YYYY-MM-DD}  # Filter by cafe and/or date
    POST /api/visits/
    """
    serializer_class = VisitSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['cafe', 'visit_date']  # Added visit_date for duplicate checking
    ordering_fields = ['visit_date', 'created_at']
    ordering = ['-visit_date']

    def get_queryset(self):
        """
        Get user's visits.

        UPDATED: Removed select_related('review') - reviews are now independent of visits.
        """
        return Visit.objects.filter(user=self.request.user).select_related('cafe')


class VisitDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a visit.

    GET /api/visits/{id}/
    PATCH /api/visits/{id}/
    DELETE /api/visits/{id}/
    """
    serializer_class = VisitSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Visit.objects.filter(user=self.request.user)


class CombinedVisitReviewCreateView(generics.CreateAPIView):
    """
    Create a visit with optional review in one request.

    POST /api/visits/create-with-review/

    Body:
    {
        "cafe_id": 123,
        "visit_date": "2025-10-30",
        "amount_spent": 12.50,
        "visit_time": 2,
        "include_review": true,
        "wfc_rating": 5,
        "wifi_quality": 5,
        "power_outlets_rating": 4,
        "seating_comfort": 5,
        "noise_level": 3,
        "comment": "Great cafe for WFC!"
    }

    Returns:
    {
        "visit": { ... visit object ... },
        "review": { ... review object ... } or null,
        "message": "Visit and review created successfully!"
    }
    """
    serializer_class = CombinedVisitReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        visit_serializer = VisitSerializer(result['visit'], context={'request': request})
        review_serializer = ReviewDetailSerializer(result['review'], context={'request': request}) if result['review'] else None

        return Response({
            'visit': visit_serializer.data,
            'review': review_serializer.data if review_serializer else None,
            'message': 'Visit and review created successfully!' if result['review'] else 'Visit created successfully!'
        }, status=status.HTTP_201_CREATED)


class ReviewListView(generics.ListAPIView):
    """
    List all reviews (public).

    GET /api/reviews/
    """
    serializer_class = ReviewListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['cafe', 'user', 'wfc_rating', 'visit_time']
    ordering_fields = ['wfc_rating', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """
        Optimize query with select_related and prefetch_related to avoid N+1 queries.

        UPDATED: Removed select_related('visit') - reviews are now independent of visits.
        """
        from django.db.models import Prefetch
        from .models import ReviewHelpful, ReviewFlag

        queryset = Review.objects.filter(is_hidden=False).select_related(
            'user',
            'cafe'
        )

        # Prefetch user-specific helpful/flag data if user is authenticated
        request = self.request
        if request and request.user.is_authenticated:
            queryset = queryset.prefetch_related(
                Prefetch(
                    'helpful_marks',
                    queryset=ReviewHelpful.objects.filter(user=request.user),
                    to_attr='user_helpful'
                ),
                Prefetch(
                    'flags',
                    queryset=ReviewFlag.objects.filter(flagged_by=request.user),
                    to_attr='user_flags'
                )
            )

        return queryset


@method_decorator(ratelimit(key='user', rate='10/h', method='POST'), name='post')
class ReviewCreateView(generics.CreateAPIView):
    """
    Create a new review (rate limited: 10/hour).
    
    POST /api/reviews/
    """
    serializer_class = ReviewCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        # Check rate limit
        was_limited = getattr(request, 'limited', False)
        if was_limited:
            raise Throttled(detail='You can only post 10 reviews per hour.')

        return super().create(request, *args, **kwargs)


class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a review.

    GET /api/reviews/{id}/
    PUT /api/reviews/{id}/
    PATCH /api/reviews/{id}/
    DELETE /api/reviews/{id}/

    Rules:
    - UPDATE: Only allowed within 7 days of visit date
    - DELETE: Allowed at any time (no time restrictions)
    """
    queryset = Review.objects.filter(is_hidden=False)
    permission_classes = [IsOwnerOrReadOnly]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ReviewUpdateSerializer
        return ReviewDetailSerializer

    @transaction.atomic
    def perform_update(self, serializer):
        """
        Update review and refresh cafe stats.

        UPDATED: No time restrictions - users can edit their review anytime.
        Uses @transaction.atomic to ensure review update and stats update succeed together.
        """
        review = serializer.save()
        review.cafe.update_stats()

    @transaction.atomic
    def perform_destroy(self, instance):
        """
        Delete review (hard delete).
        Allowed at any time (no time restrictions).
        Stats are updated automatically via signals.
        Activities are soft-deleted to maintain user feed integrity.
        Uses @transaction.atomic to ensure all-or-nothing deletion.
        """
        from apps.activity.services import ActivityService

        # Soft-delete related activities first
        ActivityService.soft_delete_activities(Review, instance.id)

        # Then hard-delete review (triggers signal → update_stats)
        instance.delete()


class MyReviewsView(generics.ListAPIView):
    """
    List current user's reviews.
    
    GET /api/reviews/me/
    """
    serializer_class = ReviewDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Review.objects.filter(user=self.request.user)


class CafeReviewsView(generics.ListAPIView):
    """
    List all reviews for a specific cafe.
    
    GET /api/cafes/{cafe_id}/reviews/
    """
    serializer_class = ReviewListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['wfc_rating', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Optimize query with select_related and prefetch_related to avoid N+1 queries.

        UPDATED: Removed select_related('visit') - reviews are now independent of visits.
        """
        from django.db.models import Prefetch
        from .models import ReviewHelpful, ReviewFlag

        cafe_id = self.kwargs.get('cafe_id')
        queryset = Review.objects.filter(
            cafe_id=cafe_id,
            is_hidden=False
        ).select_related(
            'user',
            'cafe'
        )

        # Prefetch user-specific helpful/flag data if user is authenticated
        request = self.request
        if request and request.user.is_authenticated:
            queryset = queryset.prefetch_related(
                Prefetch(
                    'helpful_marks',
                    queryset=ReviewHelpful.objects.filter(user=request.user),
                    to_attr='user_helpful'
                ),
                Prefetch(
                    'flags',
                    queryset=ReviewFlag.objects.filter(flagged_by=request.user),
                    to_attr='user_flags'
                )
            )

        return queryset


class ReviewFlagCreateView(generics.CreateAPIView):
    """
    Flag a review as inappropriate.

    POST /api/reviews/flags/
    """
    serializer_class = ReviewFlagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            'message': 'Review flagged successfully. It will be reviewed by moderators.',
            'flag': serializer.data
        }, status=status.HTTP_201_CREATED)


class UserCafeReviewView(APIView):
    """
    Check if user has a review for a specific cafe.

    GET /api/reviews/for-cafe/?cafe={cafe_id}

    Returns:
    - 200: Review object if exists
    - 404: No review found

    NEW: Added for review refactor - check existing reviews before creating.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cafe_id = request.query_params.get('cafe')

        if not cafe_id:
            raise ValidationError({'cafe': 'This parameter is required'})

        try:
            review = Review.objects.get(
                user=request.user,
                cafe_id=cafe_id,
                is_hidden=False
            )
            from .serializers import ReviewDetailSerializer
            serializer = ReviewDetailSerializer(review, context={'request': request})
            return Response(serializer.data)
        except Review.DoesNotExist:
            raise ReviewNotFound(detail='No review found for this cafe')


class BulkUserCafeReviewsView(APIView):
    """
    Get reviews for multiple cafes in a single request.

    POST /api/reviews/bulk/

    Request body:
    {
        "cafe_ids": [1, 5, 13, 24, ...]
    }

    Returns:
    {
        "1": { review object },
        "5": { review object },
        "13": null,  # No review for this cafe
        "24": { review object },
        ...
    }

    NEW: Added to prevent 429 errors from N parallel requests.
    Instead of making N requests for N cafes, make 1 bulk request.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = 'bulk'

    def post(self, request):
        cafe_ids = request.data.get('cafe_ids', [])

        # Validation
        if not cafe_ids:
            raise ValidationError({'cafe_ids': 'This field is required'})

        if not isinstance(cafe_ids, list):
            raise ValidationError({'cafe_ids': 'Must be an array'})

        if len(cafe_ids) > 100:
            raise TooManyCafeIds()

        # Convert to integers and validate
        try:
            cafe_ids = [int(id) for id in cafe_ids]
        except (ValueError, TypeError):
            raise InvalidCafeIds(detail='All cafe_ids must be valid integers')

        # Fetch all reviews for these cafes
        reviews = Review.objects.filter(
            user=request.user,
            cafe_id__in=cafe_ids,
            is_hidden=False
        ).select_related('cafe', 'user')

        # Serialize reviews
        serializer = ReviewDetailSerializer(
            reviews,
            many=True,
            context={'request': request}
        )

        # Create a map: cafe_id -> review object (or null if no review)
        review_map = {review['cafe']['id']: review for review in serializer.data}

        # Fill in nulls for cafes without reviews
        result = {}
        for cafe_id in cafe_ids:
            result[str(cafe_id)] = review_map.get(cafe_id, None)

        return Response(result)


class MarkReviewHelpfulView(APIView):
    """
    Mark or unmark a review as helpful.
    Toggle functionality - if already marked helpful, it will unmark it.

    POST /api/reviews/{review_id}/mark_helpful/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            review = Review.objects.get(pk=pk, is_hidden=False)
        except Review.DoesNotExist:
            raise ReviewNotFound()

        # Can't mark own review as helpful
        if review.user == request.user:
            raise SelfHelpfulNotAllowed()

        # Check if already marked helpful
        existing = ReviewHelpful.objects.filter(
            review=review,
            user=request.user
        ).first()

        if existing:
            # Unmark as helpful
            existing.delete()
            return Response({
                'message': 'Review unmarked as helpful',
                'is_helpful': False,
                'helpful_count': review.helpful_count
            }, status=status.HTTP_200_OK)
        else:
            # Mark as helpful
            ReviewHelpful.objects.create(
                review=review,
                user=request.user
            )
            # Refresh review to get updated count
            review.refresh_from_db()
            return Response({
                'message': 'Review marked as helpful',
                'is_helpful': True,
                'helpful_count': review.helpful_count
            }, status=status.HTTP_201_CREATED)