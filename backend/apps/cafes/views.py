from rest_framework import generics, status, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from .models import Cafe, Favorite, CafeFlag
from .serializers import (
    CafeListSerializer,
    CafeDetailSerializer,
    CafeCreateSerializer,
    CafeUpdateSerializer,
    NearbyQuerySerializer,
    FavoriteSerializer,
    CafeFlagCreateSerializer,
    CafeFlagSerializer
)
from core.permissions import IsOwnerOrReadOnly
from django.conf import settings
from .services import GooglePlacesService


class NearbySearchThrottle(UserRateThrottle):
    """
    Rate limit for Google Places nearby search.
    30 requests per minute per user to prevent API cost explosion.
    """
    rate = '30/min'


class NearbySearchAnonThrottle(AnonRateThrottle):
    """
    Rate limit for anonymous users on Google Places search.
    10 requests per minute for anonymous users.
    """
    rate = '10/min'


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
        limit = serializer.validated_data.get('limit', 100)
        
        # Find nearby cafes (using optimized method)
        cafes = Cafe.nearby_optimized(
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

    Rate limits:
    - Authenticated: 30 requests/min
    - Anonymous: 10 requests/min
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [NearbySearchThrottle, NearbySearchAnonThrottle]

    def get(self, request):
        # Validate query parameters
        serializer = NearbyQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        latitude = serializer.validated_data['latitude']
        longitude = serializer.validated_data['longitude']
        radius_km = float(serializer.validated_data.get('radius_km', 1))
        limit = serializer.validated_data.get('limit', 200)

        # Get user's actual location for distance calculation (if provided)
        user_latitude = serializer.validated_data.get('user_latitude')
        user_longitude = serializer.validated_data.get('user_longitude')

        # Use user location for distance if available, otherwise use search center
        distance_ref_lat = float(user_latitude) if user_latitude else float(latitude)
        distance_ref_lng = float(user_longitude) if user_longitude else float(longitude)

        # 1. Get registered cafes from database (using optimized method)
        db_cafes = Cafe.nearby_optimized(
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

        # Mark as registered and recalculate distance to user (if user location provided)
        for i, cafe in enumerate(db_cafes_data):
            cafe['is_registered'] = True
            cafe['source'] = 'database'

            # Recalculate distance to user location (if different from search center)
            if user_latitude and user_longitude:
                db_cafe_obj = db_cafes[i]
                distance_to_user = Cafe.calculate_distance(
                    float(db_cafe_obj.latitude),
                    float(db_cafe_obj.longitude),
                    distance_ref_lat,
                    distance_ref_lng
                )
                cafe['distance'] = f"{distance_to_user:.2f} km"
            elif cafe.get('distance') is not None:
                # Format existing distance (from search center)
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
        # Optimization: Create a spatial index using bounding boxes to quickly filter candidates
        db_cafe_locations = [(float(db_cafe.latitude), float(db_cafe.longitude)) for db_cafe in db_cafes] if db_cafes else []

        # Helper function to get cafes within bounding box (quick pre-filter)
        def get_cafes_in_bounding_box(center_lat, center_lng, threshold_km=0.001):
            """
            Get cafes within a bounding box around a point.
            This is a fast pre-filter before expensive distance calculations.
            """
            if not db_cafe_locations:
                return []

            # Calculate bounding box (1 degree lat ≈ 111 km, lon varies by latitude)
            from math import cos, radians
            lat_delta = threshold_km / 111.0
            lng_delta = threshold_km / (111.0 * abs(cos(radians(center_lat))))

            min_lat = center_lat - lat_delta
            max_lat = center_lat + lat_delta
            min_lng = center_lng - lng_delta
            max_lng = center_lng + lng_delta

            # Filter cafes within bounding box
            candidates = []
            for lat, lng in db_cafe_locations:
                if min_lat <= lat <= max_lat and min_lng <= lng <= max_lng:
                    candidates.append((lat, lng))
            return candidates

        unregistered_places = []
        ALLOWED_KEYWORDS = getattr(settings, 'GOOGLE_PLACES_ALLOWED_KEYWORDS', [
            'coffee',
            'coffee shop',
            'roastery',
            'roaster',
            'kopi',
            'koffie'
        ])
        ALLOWED_TYPES = getattr(settings, 'GOOGLE_PLACES_ALLOWED_TYPES', {
            'cafe',
            'coffee_shop',
            'bakery',
            'restaurant',
            'food'
        })

        for place in google_places:
            # Skip if already in database by google_place_id
            if place['google_place_id'] in db_google_ids:
                continue

            # Filter by name keywords
            name_lower = (place.get('name') or '').lower()
            if ALLOWED_KEYWORDS and not any(keyword in name_lower for keyword in ALLOWED_KEYWORDS):
                continue

            # Filter by place types
            place_types = set(place.get('types') or [])
            if ALLOWED_TYPES and place_types and place_types.isdisjoint(ALLOWED_TYPES):
                continue

            # Skip if too close to existing cafe (only if we have database cafes)
            # Optimization: Use bounding box to pre-filter candidates before distance check
            is_duplicate = False
            if db_cafe_locations:
                place_lat = float(place['latitude'])
                place_lng = float(place['longitude'])

                # Get only cafes within bounding box (fast pre-filter)
                nearby_candidates = get_cafes_in_bounding_box(place_lat, place_lng, threshold_km=0.001)

                # Now only check distance for cafes within bounding box
                for db_lat, db_lng in nearby_candidates:
                    distance = Cafe.calculate_distance(
                        place_lat,
                        place_lng,
                        db_lat,
                        db_lng
                    )
                    if distance < 0.001:  # Within 10 meters
                        is_duplicate = True
                        break

            if not is_duplicate:
                # Calculate distance to user location (or search center if user location not provided)
                distance_km = Cafe.calculate_distance(
                    float(place['latitude']),
                    float(place['longitude']),
                    distance_ref_lat,
                    distance_ref_lng
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


class CafeSearchView(APIView):
    """
    Search cafes by name/address in DB first, then Google Places.

    GET /api/cafes/search/?q=starbucks&lat=3.14&lon=101.68&use_google=auto

    Query params:
    - q: search query (min 3 chars, required)
    - lat: user latitude (optional, for distance calculation)
    - lon: user longitude (optional, for distance calculation)
    - use_google: 'true' | 'false' | 'auto' (default: 'auto')
        - 'auto': use Google if DB results < 3 (alpha: relaxed mode)
        - 'true': always use Google
        - 'false': never use Google
    - limit: max results per source (default: 10)

    Response:
    {
        "db_results": [...],      // Cafes from database
        "google_results": [...],   // Cafes from Google Places
        "query": "starbucks",
        "used_google_api": true,
        "total_results": 8
    }
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [NearbySearchThrottle, NearbySearchAnonThrottle]

    def get(self, request):
        from django.db import models
        from django.core.cache import cache
        from django.conf import settings
        from .serializers import CafeSearchQuerySerializer

        # Validate query parameters
        query_serializer = CafeSearchQuerySerializer(data=request.query_params)
        if not query_serializer.is_valid():
            return Response({
                'db_results': [],
                'google_results': [],
                'errors': query_serializer.errors,
                'used_google_api': False,
                'total_results': 0
            }, status=status.HTTP_400_BAD_REQUEST)

        # Extract validated data
        validated_params = query_serializer.validated_data
        query = validated_params['q'].strip()
        latitude = validated_params.get('lat')
        longitude = validated_params.get('lon')
        use_google = validated_params['use_google']
        limit = validated_params['limit']

        # Get Google search mode from settings (for future scaling)
        google_search_mode = getattr(settings, 'GOOGLE_SEARCH_MODE', 'relaxed')

        # 1. Search database first (FREE)
        db_query = Cafe.objects.filter(is_closed=False)

        # Search in name and address
        db_query = db_query.filter(
            models.Q(name__icontains=query) |
            models.Q(address__icontains=query)
        )

        # Add distance sorting if location provided
        if latitude is not None and longitude is not None:
            # First filter by search query, then get nearby
            # Convert Decimal to float for distance calculations
            nearby_cafes = Cafe.nearby_optimized(
                latitude=float(latitude),
                longitude=float(longitude),
                radius_km=50,  # Large radius for search
                limit=500  # Get more candidates for filtering
            )

            # Filter the nearby results by search query
            db_results = [
                cafe for cafe in nearby_cafes
                if query.lower() in cafe.name.lower() or query.lower() in (cafe.address or '').lower()
            ][:limit]
        else:
            # No location - just filter by query
            db_results = list(db_query.order_by('-average_wfc_rating')[:limit])

        # Serialize database results
        db_data = CafeListSerializer(
            db_results,
            many=True,
            context={'request': request}
        ).data

        # Mark as registered cafes
        for cafe in db_data:
            cafe['source'] = 'database'
            cafe['is_registered'] = True
            cafe['result_type'] = 'cafe'

        # 2. Decide if we need Google Places (based on mode)
        if google_search_mode == 'relaxed':
            # Alpha: Auto-trigger if DB < 3 results
            should_use_google = use_google == 'true' or (use_google == 'auto' and len(db_data) < 3)
        elif google_search_mode == 'balanced':
            # Pre-launch: Auto-trigger if DB < 2 results
            should_use_google = use_google == 'true' or (use_google == 'auto' and len(db_data) < 2)
        elif google_search_mode == 'conservative':
            # Post-launch: Require explicit user opt-in
            should_use_google = use_google == 'true'
        else:  # disabled
            should_use_google = False

        google_data = []
        location_data = []
        if should_use_google and latitude and longitude:
            # Check cache first (10 min TTL)
            cache_key = f'search_v2:{query}:{latitude}:{longitude}'  # v2 to invalidate old cache
            cached = cache.get(cache_key)

            if cached:
                google_data = cached.get('cafes', [])
                location_data = cached.get('locations', [])
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"Search cache hit for '{query}'")
            else:
                try:
                    # Use Autocomplete API - Much cheaper than Text Search!
                    # Autocomplete: $2.83/1k vs Text Search: $32/1k = 91% cost savings
                    autocomplete_results = GooglePlacesService.autocomplete_search(
                        query=query,
                        latitude=float(latitude),
                        longitude=float(longitude),
                        radius_meters=10000  # 10km radius
                    )

                    # Filter out already registered cafes
                    db_google_ids = {c.google_place_id for c in db_results if c.google_place_id}

                    # Separate cafes from other locations based on types
                    for place in autocomplete_results:
                        place_id = place.get('place_id')
                        place_types = place.get('types', [])

                        # Check if already registered
                        if place_id in db_google_ids:
                            continue

                        # Determine if it's a cafe or general location
                        is_cafe = any(t in place_types for t in ['cafe', 'restaurant', 'food', 'bakery'])

                        place_data = {
                            'google_place_id': place_id,
                            'name': place.get('name'),
                            'address': place.get('vicinity'),
                            'latitude': str(place['geometry']['location']['lat']),
                            'longitude': str(place['geometry']['location']['lng']),
                            'rating': place.get('rating'),
                            'distance': f"{place.get('distance_km', 0):.2f} km",
                            'source': 'google',
                            'is_registered': False,
                        }

                        if is_cafe:
                            place_data['result_type'] = 'cafe'
                            google_data.append(place_data)
                        else:
                            place_data['result_type'] = 'location'
                            location_data.append(place_data)

                    # Cache for 10 minutes
                    cache.set(cache_key, {
                        'cafes': google_data,
                        'locations': location_data
                    }, 600)

                    import logging
                    logger = logging.getLogger(__name__)
                    logger.info(f"Autocomplete search for '{query}' returned {len(google_data)} cafes, {len(location_data)} locations")

                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Google Places autocomplete error: {e}")

        return Response({
            'db_results': db_data,
            'google_results': google_data[:limit],
            'location_results': location_data[:limit],
            'query': query,
            'used_google_api': should_use_google and (len(google_data) > 0 or len(location_data) > 0),
            'total_results': len(db_data) + len(google_data[:limit]) + len(location_data[:limit])
        })


class CafeFlagCreateView(generics.CreateAPIView):
    """
    Create a cafe flag (report).
    Requires authentication.

    POST /api/cafes/flags/
    {
        "cafe": 1,
        "reason": "not_cafe",
        "description": "This is actually a restaurant, not a cafe"
    }
    """
    queryset = CafeFlag.objects.all()
    serializer_class = CafeFlagCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return Response({
            'message': 'Flag submitted successfully. Our team will review it shortly.',
            'flag': CafeFlagSerializer(serializer.instance).data
        }, status=status.HTTP_201_CREATED)


class CafeFlagListView(generics.ListAPIView):
    """
    List user's cafe flags.
    Requires authentication.

    GET /api/cafes/flags/
    """
    serializer_class = CafeFlagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return only current user's flags."""
        return CafeFlag.objects.filter(
            user=self.request.user
        ).select_related('cafe', 'user')
