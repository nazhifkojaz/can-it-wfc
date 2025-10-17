from rest_framework import generics, permissions, filters, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Visit, Review, ReviewFlag
from .serializers import (
    VisitSerializer,
    ReviewListSerializer,
    ReviewDetailSerializer,
    ReviewCreateSerializer,
    ReviewUpdateSerializer,
    ReviewFlagSerializer
)
from core.permissions import IsOwnerOrReadOnly
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator


class VisitListCreateView(generics.ListCreateAPIView):
    """
    List user's visits or create a new visit.
    
    GET /api/visits/
    POST /api/visits/
    """
    serializer_class = VisitSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['cafe']
    ordering_fields = ['visit_date', 'created_at']
    ordering = ['-visit_date']
    
    def get_queryset(self):
        return Visit.objects.filter(user=self.request.user)


class VisitDetailView(generics.RetrieveDestroyAPIView):
    """
    Retrieve or delete a visit.
    
    GET /api/visits/{id}/
    DELETE /api/visits/{id}/
    """
    serializer_class = VisitSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Visit.objects.filter(user=self.request.user)


class ReviewListView(generics.ListAPIView):
    """
    List all reviews (public).
    
    GET /api/reviews/
    """
    queryset = Review.objects.filter(is_hidden=False)
    serializer_class = ReviewListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['cafe', 'user', 'wfc_rating', 'visit_time']
    ordering_fields = ['wfc_rating', 'created_at']
    ordering = ['-created_at']


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
            return Response(
                {'error': 'Rate limit exceeded. You can only post 10 reviews per hour.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        return super().create(request, *args, **kwargs)


class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a review.
    
    GET /api/reviews/{id}/
    PUT /api/reviews/{id}/
    PATCH /api/reviews/{id}/
    DELETE /api/reviews/{id}/
    """
    queryset = Review.objects.filter(is_hidden=False)
    permission_classes = [IsOwnerOrReadOnly]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ReviewUpdateSerializer
        return ReviewDetailSerializer
    
    def perform_update(self, serializer):
        """Update review and refresh cafe stats."""
        review = serializer.save()
        review.cafe.update_stats()


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
        cafe_id = self.kwargs.get('cafe_id')
        return Review.objects.filter(
            cafe_id=cafe_id,
            is_hidden=False
        )


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
        flag = serializer.save()
        
        return Response({
            'message': 'Review flagged successfully. It will be reviewed by moderators.',
            'flag': serializer.data
        }, status=status.HTTP_201_CREATED)