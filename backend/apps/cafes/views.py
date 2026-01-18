from rest_framework import generics, status, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Prefetch
from core.exceptions import CafeNotFound, AlreadyFavorited
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
from apps.core.constants import MAX_NEARBY_CAFES
from django.conf import settings
from .services import GooglePlacesService


# Custom throttle classes for expensive Google Places API endpoints
class NearbyAnonThrottle(AnonRateThrottle):
    scope = 'nearby_anon'


class NearbyAuthThrottle(UserRateThrottle):
    scope = 'nearby_auth'


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
    permission_classes = [IsOwnerOrReadOnly]

    def get_queryset(self):
        """
        Get queryset with prefetched favorites for authenticated users.

        This eliminates the N+1 query problem in get_is_favorited().
        """
        queryset = Cafe.objects.all()

        # Prefetch user's favorites to avoid N+1 query in serializer
        if self.request.user.is_authenticated:
            queryset = queryset.prefetch_related(
                Prefetch(
                    'favorited_by',
                    queryset=Favorite.objects.filter(user=self.request.user),
                    to_attr='_user_favorites'
                )
            )
        return queryset

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
        
        # Find nearby cafes from DB only (Haversine calculation)
        # Note: With PlacesAPI-first architecture, consider using /api/cafes/nearby/all/ instead
        all_cafes = Cafe.objects.filter(is_closed=False)

        # Calculate distances and filter by radius
        nearby_cafes = []
        for cafe in all_cafes:
            distance = cafe.distance_to(latitude, longitude)
            if distance <= float(radius_km):
                cafe.distance = distance
                nearby_cafes.append(cafe)

        # Sort by distance
        nearby_cafes.sort(key=lambda c: c.distance)
        nearby_cafes = nearby_cafes[:limit]

        # Serialize results
        serializer = CafeListSerializer(nearby_cafes, many=True, context={'request': request})

        return Response({
            'count': len(nearby_cafes),
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
            raise ValidationError({'cafe_id': 'This field is required'})

        try:
            cafe = Cafe.objects.get(id=cafe_id)
        except Cafe.DoesNotExist:
            raise CafeNotFound()

        # Check if already favorited
        if Favorite.objects.filter(user=request.user, cafe=cafe).exists():
            raise AlreadyFavorited()

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
    - Authenticated: 20 requests/min
    - Anonymous: 5 requests/min
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [NearbyAnonThrottle, NearbyAuthThrottle]

    def get(self, request):
        """Main endpoint handler - orchestrates the nearby cafes search."""
        params = self._validate_and_extract_params(request)
        google_places = self._fetch_google_places(params)
        registered_map = self._get_registered_cafes_map(google_places)
        enriched = self._enrich_and_filter_results(google_places, registered_map, params)
        sorted_results = self._sort_and_limit(enriched, params['limit'])
        return self._build_response(sorted_results)

    def _validate_and_extract_params(self, request):
        """Validate query parameters and extract search configuration."""
        serializer = NearbyQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        latitude = serializer.validated_data['latitude']
        longitude = serializer.validated_data['longitude']
        user_latitude = serializer.validated_data.get('user_latitude')
        user_longitude = serializer.validated_data.get('user_longitude')

        return {
            'latitude': latitude,
            'longitude': longitude,
            'radius_km': float(serializer.validated_data.get('radius_km', 1)),
            'limit': serializer.validated_data.get('limit', MAX_NEARBY_CAFES),
            # Use user location for distance if available, otherwise use search center
            'distance_ref_lat': float(user_latitude) if user_latitude else float(latitude),
            'distance_ref_lng': float(user_longitude) if user_longitude else float(longitude),
        }

    def _fetch_google_places(self, params):
        """Fetch coffee shops from Google Places API."""
        try:
            return GooglePlacesService.search_nearby_coffee_shops(
                latitude=params['latitude'],
                longitude=params['longitude'],
                radius_meters=int(params['radius_km'] * 1000)
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Google Places API error: {e}")
            return []

    def _get_registered_cafes_map(self, google_places):
        """
        Look up which Google Places are registered in our database.

        Returns a dict mapping google_place_id -> cafe data for O(1) enrichment.
        """
        google_place_ids = [
            p['google_place_id']
            for p in google_places
            if p.get('google_place_id')
        ]

        if not google_place_ids:
            return {}

        db_cafes = Cafe.objects.filter(
            google_place_id__in=google_place_ids,
            is_closed=False
        ).select_related('created_by').values(
            'id', 'google_place_id', 'name', 'latitude', 'longitude',
            'average_wfc_rating', 'total_reviews', 'total_visits', 'unique_visitors',
            'average_ratings_cache', 'facility_stats_cache', 'is_verified'
        )

        return {cafe['google_place_id']: cafe for cafe in db_cafes}

    def _get_filter_config(self):
        """Get keyword and type filters for unregistered cafes."""
        allowed_keywords = getattr(settings, 'GOOGLE_PLACES_ALLOWED_KEYWORDS', [
            'coffee', 'coffee shop', 'roastery', 'roaster', 'kopi', 'koffie'
        ])
        allowed_types = getattr(settings, 'GOOGLE_PLACES_ALLOWED_TYPES', {
            'cafe', 'coffee_shop', 'bakery', 'restaurant', 'food'
        })
        return allowed_keywords, allowed_types

    def _enrich_registered_place(self, place, wfc_data):
        """Enrich a registered cafe with WFC data."""
        place.update({
            'is_registered': True,
            'source': 'database',
            'id': wfc_data['id'],
            'average_wfc_rating': float(wfc_data['average_wfc_rating']) if wfc_data['average_wfc_rating'] else None,
            'total_reviews': wfc_data['total_reviews'],
            'unique_visitors': wfc_data['unique_visitors'],
            'total_visits': wfc_data['total_visits'],
            'is_verified': wfc_data['is_verified'],
            'average_ratings': wfc_data['average_ratings_cache'],
            'facility_stats': wfc_data['facility_stats_cache'],
        })
        return place

    def _should_include_unregistered(self, place, allowed_keywords, allowed_types):
        """Check if an unregistered place passes keyword/type filters."""
        name_lower = (place.get('name') or '').lower()
        if allowed_keywords and not any(kw in name_lower for kw in allowed_keywords):
            return False

        place_types = set(place.get('types') or [])
        if allowed_types and place_types and place_types.isdisjoint(allowed_types):
            return False

        return True

    def _enrich_unregistered_place(self, place):
        """Add default values for an unregistered cafe."""
        place.update({
            'is_registered': False,
            'source': 'google_places',
            'id': f"google_{place['google_place_id']}",
            'average_wfc_rating': None,
            'total_reviews': 0,
            'unique_visitors': 0,
            'total_visits': 0,
            'is_verified': False,
            'average_ratings': None,
            'facility_stats': None,
        })
        return place

    def _enrich_and_filter_results(self, google_places, registered_map, params):
        """Filter unregistered cafes and enrich all results with WFC/distance data."""
        allowed_keywords, allowed_types = self._get_filter_config()
        enriched_results = []

        for place in google_places:
            place_id = place.get('google_place_id')

            if place_id and place_id in registered_map:
                # Registered cafe - enrich with WFC data
                place = self._enrich_registered_place(place, registered_map[place_id])
            else:
                # Unregistered cafe - apply filters
                if not self._should_include_unregistered(place, allowed_keywords, allowed_types):
                    continue
                place = self._enrich_unregistered_place(place)

            # Calculate distance and add Google rating fields
            place['distance'] = round(Cafe.calculate_distance(
                float(place['latitude']),
                float(place['longitude']),
                params['distance_ref_lat'],
                params['distance_ref_lng']
            ), 2)
            place['google_rating'] = place.get('rating')
            place['google_ratings_count'] = place.get('user_ratings_total', 0)

            enriched_results.append(place)

        return enriched_results

    def _sort_and_limit(self, results, limit):
        """Sort by registration status (registered first) then by distance."""
        results.sort(key=lambda x: (not x['is_registered'], x['distance']))
        return results[:limit]

    def _build_response(self, results):
        """Format the final API response."""
        registered_count = sum(1 for p in results if p['is_registered'])
        return Response({
            'count': len(results),
            'registered_count': registered_count,
            'unregistered_count': len(results) - registered_count,
            'results': results
        })


class CafeSearchView(APIView):
    """
    Search cafes using Google Places Autocomplete API.
    Checks each result against DB to mark registration status.

    GET /api/cafes/search/?q=starbucks&lat=3.14&lon=101.68

    Query params:
    - q: search query (min 3 chars, required)
    - lat: user latitude (required for distance calculation)
    - lon: user longitude (required for distance calculation)
    - limit: max results (default: 10)

    Response:
    {
        "results": [
            {
                "google_place_id": "...",
                "is_registered": true,
                "db_cafe_id": 10,
                "name": "Cafe Name",
                "address": "Address",
                "latitude": "3.14",
                "longitude": "101.68",
                "distance": 1.23,
                "rating": 4.5,
                "result_type": "cafe" | "location"
            }
        ],
        "query": "starbucks",
        "total_results": 8
    }
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [NearbyAnonThrottle, NearbyAuthThrottle]

    def get(self, request):
        from django.core.cache import cache
        from .serializers import CafeSearchQuerySerializer
        import logging

        logger = logging.getLogger(__name__)

        # Validate query parameters
        query_serializer = CafeSearchQuerySerializer(data=request.query_params)
        if not query_serializer.is_valid():
            return Response({
                'results': [],
                'errors': query_serializer.errors,
                'total_results': 0
            }, status=status.HTTP_400_BAD_REQUEST)

        # Extract validated data
        validated_params = query_serializer.validated_data
        query = validated_params['q'].strip()
        latitude = validated_params.get('lat')
        longitude = validated_params.get('lon')
        limit = validated_params['limit']

        # Require location for search
        if not latitude or not longitude:
            return Response({
                'results': [],
                'error': 'Location (lat/lon) is required for search',
                'total_results': 0
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check cache first (10 min TTL)
        cache_key = f'search_v3:{query}:{latitude}:{longitude}'
        cached = cache.get(cache_key)

        if cached:
            logger.info(f"Search cache hit for '{query}'")
            return Response({
                'results': cached[:limit],
                'query': query,
                'total_results': len(cached[:limit])
            })

        # Fetch from Google Autocomplete API
        try:
            autocomplete_results = GooglePlacesService.autocomplete_search(
                query=query,
                latitude=float(latitude),
                longitude=float(longitude),
                radius_meters=10000  # 10km radius
            )
        except Exception as e:
            logger.warning(f"Google Places autocomplete error: {e}")
            return Response({
                'results': [],
                'error': 'Search service temporarily unavailable',
                'total_results': 0
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Process each result and check DB for registration status
        unified_results = []

        for place in autocomplete_results:
            place_id = place.get('place_id')
            place_types = place.get('types', [])

            # Determine if it's a cafe or general location
            is_cafe = any(t in place_types for t in ['cafe', 'restaurant', 'food', 'bakery'])
            result_type = 'cafe' if is_cafe else 'location'

            # Check if this place is registered in our DB
            db_cafe = Cafe.objects.filter(
                google_place_id=place_id,
                is_closed=False
            ).first()

            # Build result object
            result = {
                'google_place_id': place_id,
                'is_registered': db_cafe is not None,
                'name': place.get('name'),
                'address': place.get('vicinity'),
                'latitude': str(place['geometry']['location']['lat']),
                'longitude': str(place['geometry']['location']['lng']),
                'distance': round(place.get('distance_km', 0), 2),
                'rating': place.get('rating'),
                'result_type': result_type,
                'source': 'google',
            }

            # Add DB data if registered
            if db_cafe:
                result['db_cafe_id'] = db_cafe.id
                result['average_wfc_rating'] = float(db_cafe.average_wfc_rating) if db_cafe.average_wfc_rating else None
                result['total_reviews'] = db_cafe.total_reviews
                result['total_visits'] = db_cafe.total_visits

            unified_results.append(result)

        # Cache for 10 minutes
        cache.set(cache_key, unified_results, 600)

        logger.info(f"Autocomplete search for '{query}' returned {len(unified_results)} results")

        return Response({
            'results': unified_results[:limit],
            'query': query,
            'total_results': len(unified_results[:limit])
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
