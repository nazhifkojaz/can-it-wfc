from rest_framework import generics, status, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from .models import Cafe, Favorite
from .serializers import (
    CafeListSerializer,
    CafeDetailSerializer,
    CafeCreateSerializer,
    CafeUpdateSerializer,
    NearbyQuerySerializer,
    FavoriteSerializer
)
from core.permissions import IsOwnerOrReadOnly


class CafeListCreateView(generics.ListCreateAPIView):
    """
    List all cafes or create a new cafe.
    
    GET /api/cafes/
    POST /api/cafes/
    """
    queryset = Cafe.objects.filter(is_closed=False)
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['price_range', 'is_verified']
    search_fields = ['name', 'address']
    ordering_fields = ['average_wfc_rating', 'total_reviews', 'created_at']
    ordering = ['-average_wfc_rating']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CafeCreateSerializer
        return CafeListSerializer


class CafeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a cafe.
    
    GET /api/cafes/{id}/
    PUT /api/cafes/{id}/
    PATCH /api/cafes/{id}/
    DELETE /api/cafes/{id}/
    """
    queryset = Cafe.objects.all()
    permission_classes = [IsOwnerOrReadOnly]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return CafeUpdateSerializer
        return CafeDetailSerializer
    
    def perform_destroy(self, instance):
        """Soft delete: mark as closed instead of deleting."""
        instance.is_closed = True
        instance.save()


class NearbyCafesView(APIView):
    """
    Find cafes near a location.
    
    GET /api/cafes/nearby/?latitude={lat}&longitude={lng}&radius_km={radius}&limit={limit}
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        # Validate query parameters
        serializer = NearbyQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        
        # Get parameters
        latitude = serializer.validated_data['latitude']
        longitude = serializer.validated_data['longitude']
        radius_km = serializer.validated_data.get('radius_km', 5)
        limit = serializer.validated_data.get('limit', 50)
        
        # Find nearby cafes
        cafes = Cafe.nearby(
            latitude=latitude,
            longitude=longitude,
            radius_km=float(radius_km),
            limit=limit
        )
        
        # Serialize results
        serializer = CafeListSerializer(cafes, many=True, context={'request': request})
        
        return Response({
            'count': len(cafes),
            'results': serializer.data
        })


class FavoriteListCreateView(generics.ListCreateAPIView):
    """
    List user's favorite cafes or add a favorite.
    
    GET /api/cafes/favorites/
    POST /api/cafes/favorites/
    """
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        cafe_id = request.data.get('cafe_id')
        
        if not cafe_id:
            return Response(
                {'error': 'cafe_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            cafe = Cafe.objects.get(id=cafe_id)
        except Cafe.DoesNotExist:
            return Response(
                {'error': 'Cafe not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if already favorited
        if Favorite.objects.filter(user=request.user, cafe=cafe).exists():
            return Response(
                {'error': 'Cafe already in favorites'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create favorite
        favorite = Favorite.objects.create(user=request.user, cafe=cafe)
        serializer = self.get_serializer(favorite)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FavoriteDetailView(generics.DestroyAPIView):
    """
    Remove a cafe from favorites.
    
    DELETE /api/cafes/favorites/{id}/
    """
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user)