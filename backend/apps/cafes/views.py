import math
from decimal import Decimal

from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, permissions, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from apps.core.constants import DEFAULT_LIST_NAME, MAX_ITEMS_PER_LIST, MAX_LISTS_PER_USER, MAX_NEARBY_CAFES
from core.exceptions import (
    CafeNotFound,
    DefaultListCannotBeDeleted,
    ListItemLimitReached,
    ListLimitReached,
    ListNotFound,
)
from core.logging import get_logger
from core.permissions import IsOwnerOrReadOnly

from .models import Cafe, CafeFlag, CafeList, CafeListItem
from .serializers import (
    CafeDetailSerializer,
    CafeFilterSerializer,
    CafeInsightsSerializer,
    CafeListCreateSerializer,
    CafeListDetailSerializer,
    CafeListItemCreateSerializer,
    CafeListItemNoteSerializer,
    CafeListMembershipSerializer,
    CafeListSerializer,
    CafeListUpdateSerializer,
    CafeSummarySerializer,
    CafeFlagCreateSerializer,
    CafeFlagSerializer,
    CafeCreateSerializer,
    CafeUpdateSerializer,
    NearbyQuerySerializer,
)
from .services import GooglePlacesService

from django.conf import settings

logger = get_logger(__name__)


def apply_cafe_filters(qs, filter_data):
    """Apply WFC filter conditions to a Cafe queryset."""
    if filter_data.get('hide_closed', True):
        qs = qs.filter(is_closed=False)
    if filter_data.get('min_wifi') is not None:
        qs = qs.filter(avg_wifi_rating__gte=filter_data['min_wifi'])
    if filter_data.get('max_noise') is not None:
        qs = qs.filter(avg_noise_level__lte=filter_data['max_noise'])
    if filter_data.get('min_power') is not None:
        qs = qs.filter(avg_power_rating__gte=filter_data['min_power'])
    if filter_data.get('min_seating') is not None:
        qs = qs.filter(avg_seating_comfort__gte=filter_data['min_seating'])
    if filter_data.get('min_wfc') is not None:
        qs = qs.filter(average_wfc_rating__gte=filter_data['min_wfc'])
    price = filter_data.get('price') or []
    if price:
        qs = qs.filter(price_range__in=price)
    if filter_data.get('verified'):
        qs = qs.filter(is_verified=True)
    min_reviews = filter_data.get('min_reviews', 0)
    if min_reviews and min_reviews > 0:
        qs = qs.filter(total_reviews__gte=min_reviews)
    return qs


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
        return CafeSummarySerializer


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
        queryset = Cafe.objects.all()
        if self.request.user.is_authenticated:
            queryset = queryset.annotate(
                my_lists_count=Count(
                    'list_entries',
                    filter=Q(list_entries__cafe_list__owner=self.request.user),
                    distinct=True,
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


class CafeInsightsView(APIView):
    """
    Retrieve computed insights for a cafe.

    GET /api/cafes/{id}/insights/

    Returns aggregated visit + review data (ratings, spend, time-of-day patterns,
    stickiness, google delta, etc.). Separate endpoint for snappy first paint
    on the cafe detail sheet.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            cafe = Cafe.objects.get(pk=pk)
        except Cafe.DoesNotExist:
            raise CafeNotFound()

        from apps.core.constants import INSIGHTS_CACHE_VERSION
        from apps.core.stats_utils import recompute_cafe_insights

        if (
            not cafe.insights_cache
            or cafe.insights_cache_version != INSIGHTS_CACHE_VERSION
        ):
            recompute_cafe_insights(cafe)
            cafe.refresh_from_db()

        serializer = CafeInsightsSerializer(cafe)
        return Response(serializer.data)


class NearbyCafesView(APIView):
    """
    Find cafes near a location.

    GET /api/cafes/nearby/?latitude={lat}&longitude={lng}&radius_km={radius}&limit={limit}
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [NearbyAnonThrottle, NearbyAuthThrottle]
    
    def get(self, request):
        # Validate query parameters
        serializer = NearbyQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        filter_serializer = CafeFilterSerializer(data=request.query_params)
        filter_serializer.is_valid(raise_exception=True)
        filter_data = filter_serializer.validated_data

        # Get parameters
        latitude = serializer.validated_data['latitude']
        longitude = serializer.validated_data['longitude']
        radius_km = serializer.validated_data.get('radius_km', 1)
        limit = serializer.validated_data.get('limit', 100)

        # Pre-filter with bounding box before Haversine calculation
        radius_float = float(radius_km)
        lat_delta = Decimal(str(radius_float / 111.0))
        lon_delta = Decimal(str(radius_float / (111.0 * math.cos(math.radians(float(latitude))))))

        candidates = Cafe.objects.filter(
            latitude__gte=latitude - lat_delta,
            latitude__lte=latitude + lat_delta,
            longitude__gte=longitude - lon_delta,
            longitude__lte=longitude + lon_delta,
        )
        candidates = apply_cafe_filters(candidates, filter_data)

        # Calculate exact Haversine distances on the pre-filtered set
        nearby_cafes = []
        for cafe in candidates:
            distance = cafe.distance_to(latitude, longitude)
            if distance <= radius_float:
                cafe.distance = distance
                nearby_cafes.append(cafe)

        # Sort by distance
        nearby_cafes.sort(key=lambda c: c.distance)
        nearby_cafes = nearby_cafes[:limit]

        # Serialize results
        serializer = CafeSummarySerializer(nearby_cafes, many=True, context={'request': request})

        return Response({
            'count': len(nearby_cafes),
            'results': serializer.data
        })


# ---------------------------------------------------------------------------
# CafeList / CafeListItem views  (mounted at /api/lists/)
# ---------------------------------------------------------------------------

class CafeListListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/lists/  — user's lists, ordered by -updated_at
    POST /api/lists/  — create a new named list
    """
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # lists are bounded at MAX_LISTS_PER_USER (50)

    def get_queryset(self):
        return CafeList.objects.filter(owner=self.request.user)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CafeListCreateSerializer
        return CafeListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        name = serializer.validated_data['name']
        owner = request.user

        if CafeList.objects.filter(owner=owner).count() >= MAX_LISTS_PER_USER:
            raise ListLimitReached()

        if CafeList.objects.filter(owner=owner, name=name).exists():
            raise ValidationError({'name': f'You already have a list named "{name}".'})

        cafe_list = CafeList.objects.create(owner=owner, **serializer.validated_data)
        return Response(CafeListSerializer(cafe_list).data, status=status.HTTP_201_CREATED)


class CafeListRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/lists/<id>/  — list metadata + items
    PATCH  /api/lists/<id>/  — rename or update description
    DELETE /api/lists/<id>/  — delete (blocked for default list)
    """
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        return CafeList.objects.filter(owner=self.request.user)

    def get_object(self):
        try:
            return self.get_queryset().get(pk=self.kwargs['pk'])
        except CafeList.DoesNotExist:
            raise ListNotFound()

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return CafeListUpdateSerializer
        return CafeListDetailSerializer

    def update(self, request, *args, **kwargs):
        cafe_list = self.get_object()
        serializer = self.get_serializer(cafe_list, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_name = serializer.validated_data.get('name')
        if new_name and new_name != cafe_list.name:
            if CafeList.objects.filter(owner=request.user, name=new_name).exists():
                raise ValidationError({'name': f'You already have a list named "{new_name}".'})

        serializer.save()
        return Response(CafeListSerializer(cafe_list).data)

    def destroy(self, request, *args, **kwargs):
        cafe_list = self.get_object()
        if cafe_list.is_default:
            raise DefaultListCannotBeDeleted()
        cafe_list.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CafeListItemCreateView(APIView):
    """POST /api/lists/<pk>/items/ — add a cafe to a list."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            cafe_list = CafeList.objects.get(pk=pk, owner=request.user)
        except CafeList.DoesNotExist:
            raise ListNotFound()

        serializer = CafeListItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cafe_id = serializer.validated_data['cafe_id']
        note = serializer.validated_data.get('note', '')

        try:
            cafe = Cafe.objects.get(pk=cafe_id)
        except Cafe.DoesNotExist:
            raise CafeNotFound()

        # Idempotent: if already in list, return the existing item
        item, created = CafeListItem.objects.get_or_create(
            cafe_list=cafe_list,
            cafe=cafe,
            defaults={'note': note},
        )

        if created and cafe_list.items.count() > MAX_ITEMS_PER_LIST:
            # Roll back if we just exceeded the limit
            item.delete()
            raise ListItemLimitReached()

        from .serializers import CafeListItemSerializer
        return Response(
            CafeListItemSerializer(item).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CafeListItemDetailView(APIView):
    """
    PATCH  /api/lists/<pk>/items/<cafe_id>/  — update note
    DELETE /api/lists/<pk>/items/<cafe_id>/  — remove cafe from list
    """

    permission_classes = [permissions.IsAuthenticated]

    def _get_item(self, request, pk, cafe_id):
        try:
            cafe_list = CafeList.objects.get(pk=pk, owner=request.user)
        except CafeList.DoesNotExist:
            raise ListNotFound()
        try:
            return CafeListItem.objects.get(cafe_list=cafe_list, cafe_id=cafe_id)
        except CafeListItem.DoesNotExist:
            raise NotFound(detail='Cafe not found in this list.')

    def patch(self, request, pk, cafe_id):
        item = self._get_item(request, pk, cafe_id)
        serializer = CafeListItemNoteSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        from .serializers import CafeListItemSerializer
        return Response(CafeListItemSerializer(item).data)

    def delete(self, request, pk, cafe_id):
        item = self._get_item(request, pk, cafe_id)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DefaultListItemView(APIView):
    """
    POST   /api/lists/default/items/           — add cafe to default list
    DELETE /api/lists/default/items/<cafe_id>/ — remove cafe from default list
    """

    permission_classes = [permissions.IsAuthenticated]

    def _get_default_list(self, user):
        # get_or_create guards against users who slipped through the signup signal
        cafe_list, _ = CafeList.objects.get_or_create(
            owner=user,
            is_default=True,
            defaults={'name': DEFAULT_LIST_NAME},
        )
        return cafe_list

    def post(self, request):
        cafe_id = request.data.get('cafe_id')
        if not cafe_id:
            raise ValidationError({'cafe_id': 'This field is required.'})

        try:
            cafe = Cafe.objects.get(pk=cafe_id)
        except Cafe.DoesNotExist:
            raise CafeNotFound()

        cafe_list = self._get_default_list(request.user)

        item, created = CafeListItem.objects.get_or_create(
            cafe_list=cafe_list,
            cafe=cafe,
        )

        if created and cafe_list.items.count() > MAX_ITEMS_PER_LIST:
            item.delete()
            raise ListItemLimitReached()

        from .serializers import CafeListItemSerializer
        return Response(
            CafeListItemSerializer(item).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request, cafe_id):
        cafe_list = self._get_default_list(request.user)
        try:
            item = CafeListItem.objects.get(cafe_list=cafe_list, cafe_id=cafe_id)
        except CafeListItem.DoesNotExist:
            raise NotFound(detail='Cafe not found in default list.')
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CafeMembershipView(APIView):
    """
    GET /api/cafes/<pk>/my-lists/
    Returns all user lists with an in_list boolean for the given cafe.
    Powers the save-to-list popover checkbox state in one round-trip.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        lists = CafeList.objects.filter(owner=request.user).annotate(
            in_list=Count('items', filter=Q(items__cafe_id=pk))
        )
        # Coerce Count to bool
        data = [
            {
                'id': lst.id,
                'name': lst.name,
                'is_default': lst.is_default,
                'in_list': lst.in_list > 0,
            }
            for lst in lists
        ]
        return Response(data)


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
        filter_data = self._parse_filters(request)
        google_places = self._fetch_google_places(params)
        registered_map, all_registered_ids = self._get_registered_cafes_map(google_places, filter_data)
        enriched = self._enrich_and_filter_results(google_places, registered_map, all_registered_ids, params, filter_data)
        sorted_results = self._sort_and_limit(enriched, params['limit'])
        return self._build_response(sorted_results)

    def _parse_filters(self, request):
        serializer = CafeFilterSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

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
            logger.warning(f"Google Places API error: {e}")
            return []

    def _get_registered_cafes_map(self, google_places, filter_data):
        """
        Look up which Google Places are registered in our database.

        Returns:
          registered_map: google_place_id -> cafe data for cafes that PASS filters
          all_registered_ids: set of all registered google_place_ids (regardless of filters)
                              used to prevent filtered-out registered cafes from appearing
                              as unregistered markers
        """
        google_place_ids = [
            p['google_place_id']
            for p in google_places
            if p.get('google_place_id')
        ]

        if not google_place_ids:
            return {}, set()

        base_qs = Cafe.objects.filter(google_place_id__in=google_place_ids)
        all_registered_ids = set(base_qs.values_list('google_place_id', flat=True))

        filtered_qs = apply_cafe_filters(base_qs, filter_data)
        filtered_qs = filtered_qs.values(
            'id', 'google_place_id', 'name', 'latitude', 'longitude',
            'average_wfc_rating', 'total_reviews', 'total_visits', 'unique_visitors',
            'average_ratings_cache', 'facility_stats_cache', 'is_verified'
        )

        return {cafe['google_place_id']: cafe for cafe in filtered_qs}, all_registered_ids

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

    def _enrich_and_filter_results(self, google_places, registered_map, all_registered_ids, params, filter_data):
        """Filter unregistered cafes and enrich all results with WFC/distance data."""
        allowed_keywords, allowed_types = self._get_filter_config()
        include_unregistered = filter_data.get('include_unregistered', True)
        enriched_results = []

        for place in google_places:
            place_id = place.get('google_place_id')

            if place_id and place_id in registered_map:
                # Registered cafe that passed filters - enrich with WFC data
                place = self._enrich_registered_place(place, registered_map[place_id])
            elif place_id and place_id in all_registered_ids:
                # Registered cafe that failed WFC filters - exclude entirely
                continue
            else:
                # Truly unregistered (Google Places only)
                if not include_unregistered:
                    continue
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


class CafeNearbyCountView(APIView):
    """
    Return the count of registered cafes matching WFC filters within a bounding box.
    Used by the filter panel live match-count indicator.

    GET /api/cafes/nearby/count/?latitude=...&longitude=...&radius_km=...&min_wifi=4&...
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [NearbyAnonThrottle, NearbyAuthThrottle]

    def get(self, request):
        location_serializer = NearbyQuerySerializer(data=request.query_params)
        location_serializer.is_valid(raise_exception=True)

        filter_serializer = CafeFilterSerializer(data=request.query_params)
        filter_serializer.is_valid(raise_exception=True)

        latitude = location_serializer.validated_data['latitude']
        longitude = location_serializer.validated_data['longitude']
        radius_km = float(location_serializer.validated_data.get('radius_km', 1))

        lat_delta = Decimal(str(radius_km / 111.0))
        lon_delta = Decimal(str(radius_km / (111.0 * math.cos(math.radians(float(latitude))))))

        candidates = Cafe.objects.filter(
            latitude__gte=latitude - lat_delta,
            latitude__lte=latitude + lat_delta,
            longitude__gte=longitude - lon_delta,
            longitude__lte=longitude + lon_delta,
        )
        candidates = apply_cafe_filters(candidates, filter_serializer.validated_data)

        return Response({'count': candidates.count()})


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

        # Batch-fetch all registered cafes for these results (avoids N+1)
        all_place_ids = [
            p.get('place_id') for p in autocomplete_results if p.get('place_id')
        ]
        registered_cafes = {
            c.google_place_id: c
            for c in Cafe.objects.filter(google_place_id__in=all_place_ids, is_closed=False)
        }

        # Process each result and check DB for registration status
        unified_results = []

        for place in autocomplete_results:
            place_id = place.get('place_id')
            place_types = place.get('types', [])

            # Determine if it's a cafe or general location
            is_cafe = any(t in place_types for t in ['cafe', 'restaurant', 'food', 'bakery'])
            result_type = 'cafe' if is_cafe else 'location'

            # Look up from batch-fetched map
            db_cafe = registered_cafes.get(place_id)

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


class CafeGoogleRatingRefreshView(APIView):
    """
    Refresh Google rating for a cafe.

    POST /api/cafes/{id}/refresh-google-rating/

    This endpoint is called by the frontend to refresh stale Google ratings
    in the background (stale-while-revalidate pattern). The serializer
    returns cached data immediately for fast response, then the frontend
    calls this endpoint to get fresh data.

    Returns updated google_rating, google_ratings_count, and google_rating_updated_at.
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [NearbyAnonThrottle, NearbyAuthThrottle]

    def post(self, request, pk=None):
        """Refresh Google rating from Google Places API."""
        try:
            cafe = Cafe.objects.get(pk=pk)
        except Cafe.DoesNotExist:
            return Response(
                {'error': 'Cafe not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if cafe has a Google Place ID
        if not cafe.google_place_id:
            return Response(
                {'error': 'This cafe does not have a Google Place ID'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Refresh from Google Places API
        try:
            from django.utils import timezone

            place_details = GooglePlacesService.get_place_details(cafe.google_place_id)

            if not place_details:
                return Response(
                    {'error': 'Failed to fetch data from Google Places API'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )

            # Update cafe with fresh data
            cafe.google_rating = place_details.get('rating')
            cafe.google_ratings_count = place_details.get('user_ratings_total')
            cafe.google_rating_updated_at = timezone.now()

            # Save only these fields (efficient update)
            cafe.save(update_fields=[
                'google_rating',
                'google_ratings_count',
                'google_rating_updated_at'
            ])

            logger.info(f"Refreshed Google rating for cafe {cafe.id}: {cafe.google_rating}")

            # Return updated rating data
            return Response({
                'google_rating': cafe.google_rating,
                'google_ratings_count': cafe.google_ratings_count,
                'google_rating_updated_at': cafe.google_rating_updated_at.isoformat() if cafe.google_rating_updated_at else None,
            })

        except Exception as e:
            logger.warning(f"Failed to refresh Google rating for cafe {cafe.id}: {e}")
            return Response(
                {'error': 'Failed to refresh Google rating'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
