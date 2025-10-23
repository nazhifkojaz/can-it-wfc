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
from .services import GooglePlacesService


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
        radius_km = serializer.validated_data.get('radius_km', 1)
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


class MergedNearbyCafesView(APIView):
    """
    Get nearby cafes from both database and Google Places.
    Shows all coffee shops in the area (registered + unregistered).

    GET /api/cafes/nearby/all/?latitude={lat}&longitude={lng}&radius_km={radius}
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Validate query parameters
        serializer = NearbyQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        latitude = serializer.validated_data['latitude']
        longitude = serializer.validated_data['longitude']
        radius_km = float(serializer.validated_data.get('radius_km', 1))
        limit = serializer.validated_data.get('limit', 100)

        # 1. Get registered cafes from database
        db_cafes = Cafe.nearby(
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            limit=limit
        )

        # Serialize database cafes
        db_cafes_data = CafeListSerializer(
            db_cafes,
            many=True,
            context={'request': request}
        ).data

        # Mark as registered and format distance
        for cafe in db_cafes_data:
            cafe['is_registered'] = True
            cafe['source'] = 'database'
            # Format distance to match frontend expectations (string with " km")
            if cafe.get('distance') is not None:
                cafe['distance'] = f"{float(cafe['distance']):.2f} km"

        # 2. Get coffee shops from Google Places (non-blocking)
        google_places = []
        try:
            google_places = GooglePlacesService.search_nearby_coffee_shops(
                latitude=latitude,
                longitude=longitude,
                radius_meters=int(radius_km * 1000)
            )
        except Exception as e:
            # Log the error but continue with database results only
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Google Places API error (non-blocking): {e}")

        # 3. Filter out Google Places that already exist in database
        db_google_ids = {cafe.google_place_id for cafe in db_cafes if cafe.google_place_id}

        # Pre-compute db cafe locations for distance checking (only if needed)
        db_cafe_locations = [(db_cafe.latitude, db_cafe.longitude) for db_cafe in db_cafes] if db_cafes else []

        unregistered_places = []
        for place in google_places:
            # Skip if already in database by google_place_id
            if place['google_place_id'] in db_google_ids:
                continue

            # Skip if too close to existing cafe (only if we have database cafes)
            is_duplicate = False
            if db_cafe_locations:
                place_lat = float(place['latitude'])
                place_lng = float(place['longitude'])

                for db_lat, db_lng in db_cafe_locations:
                    distance = Cafe.calculate_distance(
                        place_lat,
                        place_lng,
                        db_lat,
                        db_lng
                    )
                    if distance < 0.05:  # Within 50 meters
                        is_duplicate = True
                        break

            if not is_duplicate:
                # Calculate distance to user location
                distance_km = Cafe.calculate_distance(
                    float(place['latitude']),
                    float(place['longitude']),
                    latitude,
                    longitude
                )

                # Format to match our Cafe interface
                unregistered_places.append({
                    'id': f"google_{place['google_place_id']}",  # Temporary ID
                    'name': place['name'],
                    'address': place['address'],
                    'latitude': place['latitude'],
                    'longitude': place['longitude'],
                    'google_place_id': place['google_place_id'],
                    'price_range': place.get('price_level'),
                    'distance': f"{distance_km:.2f} km",
                    'total_visits': 0,
                    'unique_visitors': 0,
                    'total_reviews': 0,
                    'average_wfc_rating': None,
                    'is_closed': False,
                    'is_verified': False,
                    'created_at': None,
                    'updated_at': None,
                    'is_registered': False,  # KEY: Not in our database yet
                    'source': 'google_places',
                    'google_rating': place.get('rating'),
                    'google_ratings_count': place.get('user_ratings_total', 0),
                    'is_open_now': place.get('is_open_now'),
                })

        # 4. Combine and return
        all_cafes = db_cafes_data + unregistered_places

        return Response({
            'count': len(all_cafes),
            'registered_count': len(db_cafes_data),
            'unregistered_count': len(unregistered_places),
            'results': all_cafes
        })