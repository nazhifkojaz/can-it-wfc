import requests
from dataclasses import dataclass, field
from decimal import Decimal
from django.conf import settings
from typing import Any
from core.logging import get_logger
from apps.core.constants import (
    GOOGLE_AUTOCOMPLETE_TIMEOUT_SECONDS,
    GOOGLE_PLACE_DETAILS_TIMEOUT_SECONDS,
    MAX_AUTOCOMPLETE_PREDICTIONS
)
from apps.core.geo_utils import bounding_box_deltas
from apps.cafes.models import Cafe
from apps.cafes.place_classification import (
    PLACE_CATEGORY_CAFE,
    SUPPORTED_PLACE_CATEGORIES,
)

logger = get_logger(__name__)


GOOGLE_PROVIDER = 'google'


@dataclass
class ProviderPlace:
    """Normalized place result from any provider (Google, OSM, Amap, etc).

    Providers map their native response into this shape so consumers
    (views, serializers, classification) can reason about places without
    knowing provider-specific field names.
    """
    provider: str
    provider_place_id: str
    name: str
    address: str
    latitude: Decimal
    longitude: Decimal
    provider_types: list[str] = field(default_factory=list)
    rating: Decimal | None = None
    ratings_count: int | None = None
    price_level: int | None = None
    is_open_now: bool | None = None
    photo_reference: str | None = None
    distance_km: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        """Convert to a dict matching the legacy Google-shaped format.

        Views still consume dicts during enrichment — this bridge
        keeps them working while letting callers receive ProviderPlace
        from the service layer.
        """
        return {
            'google_place_id': self.provider_place_id,
            'provider': self.provider,
            'provider_place_id': self.provider_place_id,
            'name': self.name,
            'address': self.address,
            'latitude': str(self.latitude),
            'longitude': str(self.longitude),
            'rating': float(self.rating) if self.rating is not None else None,
            'user_ratings_total': self.ratings_count,
            'price_level': self.price_level,
            'types': self.provider_types,
            'is_open_now': self.is_open_now,
            'photo_reference': self.photo_reference,
            'distance_km': self.distance_km,
        }

    @classmethod
    def from_google_nearby(cls, place: dict[str, Any]) -> 'ProviderPlace':
        """Build a ProviderPlace from a raw Google Nearby Search result dict."""
        return cls(
            provider=GOOGLE_PROVIDER,
            provider_place_id=place.get('place_id', ''),
            name=place.get('name', ''),
            address=place.get('vicinity', ''),
            latitude=Decimal(str(place['geometry']['location']['lat'])),
            longitude=Decimal(str(place['geometry']['location']['lng'])),
            provider_types=place.get('types', []),
            rating=Decimal(str(place['rating'])) if place.get('rating') else None,
            ratings_count=place.get('user_ratings_total') or 0,
            price_level=place.get('price_level'),
            is_open_now=(
                place.get('opening_hours', {}).get('open_now')
                if place.get('opening_hours') else None
            ),
            photo_reference=(
                place.get('photos', [{}])[0].get('photo_reference')
                if place.get('photos') else None
            ),
            distance_km=0.0,
        )


def get_cafes_in_bounding_box(latitude, longitude, radius_km, filter_data=None):
    lat_delta, lon_delta = bounding_box_deltas(float(radius_km), latitude)
    candidates = Cafe.objects.filter(
        latitude__gte=latitude - lat_delta,
        latitude__lte=latitude + lat_delta,
        longitude__gte=longitude - lon_delta,
        longitude__lte=longitude + lon_delta,
    )
    if filter_data:
        from .views import apply_cafe_filters
        candidates = apply_cafe_filters(candidates, filter_data)
    return candidates


class GooglePlacesService:
    """Service for interacting with Google Places API."""

    BASE_URL = "https://maps.googleapis.com/maps/api/place"

    @staticmethod
    def search_nearby_coffee_shops(
        latitude: float,
        longitude: float,
        radius_meters: int = 1000,
        keyword: str = "",
        additional_categories: list[str] | None = None,
        include_cafe: bool = True,
    ) -> list[dict[str, Any]]:
        """
        Search for places near a location using Google Places API.

        Returns legacy dicts for view compatibility.  Prefer
        ``search_nearby_places()`` for new code that wants typed
        ``ProviderPlace`` objects.
        """
        places = GooglePlacesService.search_nearby_places(
            latitude, longitude, radius_meters,
            keyword=keyword,
            additional_categories=additional_categories,
            include_cafe=include_cafe,
        )
        return [p.to_dict() for p in places]

    @staticmethod
    def search_nearby_places(
        latitude: float,
        longitude: float,
        radius_meters: int = 1000,
        keyword: str = "",
        additional_categories: list[str] | None = None,
        include_cafe: bool = True,
    ) -> list[ProviderPlace]:
        """
        Search for places near a location. Returns normalized ProviderPlace objects.

        Args:
            latitude: Center latitude
            longitude: Center longitude
            radius_meters: Search radius in meters
            keyword: Search keyword
            additional_categories: Extra place categories (e.g. ["library", "coworking_space"])
            include_cafe: Whether to include the default cafe provider query

        Returns:
            Deduplicated list of ProviderPlace objects sorted by distance.
        """
        if not settings.GOOGLE_PLACES_API_KEY:
            return []

        seen: set[str] = set()
        all_places: list[ProviderPlace] = []

        def _collect(places: list[ProviderPlace]):
            for p in places:
                if p.provider_place_id and p.provider_place_id not in seen:
                    seen.add(p.provider_place_id)
                    all_places.append(p)

        if include_cafe:
            _collect(GooglePlacesService._nearby_search(
                latitude, longitude, radius_meters,
                type_filter='cafe', keyword=keyword,
            ))

        for cat in (additional_categories or []):
            if cat == 'library':
                _collect(GooglePlacesService._nearby_search(
                    latitude, longitude, radius_meters,
                    type_filter='library',
                ))
            elif cat == 'coworking_space':
                _collect(GooglePlacesService._nearby_search(
                    latitude, longitude, radius_meters,
                    keyword='coworking',
                ))

        all_places.sort(key=lambda p: p.distance_km)
        max_results = getattr(settings, 'GOOGLE_PLACES_MAX_RESULTS', 20)
        return all_places[:max_results]

    @staticmethod
    def _nearby_search(
        latitude: float,
        longitude: float,
        radius_meters: int = 1000,
        type_filter: str | None = None,
        keyword: str = "",
    ) -> list[ProviderPlace]:
        """Single Google Places Nearby Search call returning ProviderPlace list."""
        api_key = settings.GOOGLE_PLACES_API_KEY
        timeout = getattr(settings, 'GOOGLE_PLACES_TIMEOUT', 30)
        max_results = getattr(settings, 'GOOGLE_PLACES_MAX_RESULTS', 20)

        url = f"{GooglePlacesService.BASE_URL}/nearbysearch/json"
        params: dict[str, Any] = {
            'location': f"{latitude},{longitude}",
            'rankby': 'distance',
            'key': api_key,
        }
        if type_filter:
            params['type'] = type_filter
        if keyword:
            params['keyword'] = keyword

        try:
            response = requests.get(url, params=params, timeout=timeout)
            response.raise_for_status()
            data = response.json()

            if data.get('status') not in ['OK', 'ZERO_RESULTS']:
                logger.warning(
                    f"Google Places API error: {data.get('status')} "
                    f"(type={type_filter}, keyword={keyword})"
                )
                return []

            results: list[ProviderPlace] = []
            for place in data.get('results', []):
                pp = ProviderPlace.from_google_nearby(place)
                pp.distance_km = Cafe.calculate_distance(
                    latitude, longitude,
                    float(pp.latitude), float(pp.longitude),
                )
                if pp.distance_km * 1000 <= radius_meters:
                    results.append(pp)

            logger.info(
                f"Google Nearby Search: {len(results)} results "
                f"(type={type_filter}, keyword={keyword}, radius={radius_meters}m)"
            )
            return results[:max_results]

        except requests.RequestException as e:
            logger.warning(
                f"Google Places API request failed: {e} "
                f"(type={type_filter}, keyword={keyword})"
            )
            return []

    @staticmethod
    def autocomplete_search(
        query: str,
        latitude: float,
        longitude: float,
        radius_meters: int = 10000,
        types: str | None = None
    ) -> list[dict[str, Any]]:
        """
        Search using Autocomplete API for real-time search suggestions.

        Returns legacy dicts for view compatibility. Prefer
        ``autocomplete_places()`` for typed ProviderPlace objects.
        """
        places = GooglePlacesService.autocomplete_places(
            query, latitude, longitude, radius_meters, types,
        )
        return [
            {
                'place_id': p.provider_place_id,
                'name': p.name,
                'vicinity': p.address,
                'geometry': {
                    'location': {'lat': float(p.latitude), 'lng': float(p.longitude)},
                },
                'rating': float(p.rating) if p.rating else None,
                'user_ratings_total': p.ratings_count,
                'distance_km': p.distance_km,
                'types': p.provider_types,
                'provider': p.provider,
                'provider_place_id': p.provider_place_id,
            }
            for p in places
        ]

    @staticmethod
    def autocomplete_places(
        query: str,
        latitude: float,
        longitude: float,
        radius_meters: int = 10000,
        types: str | None = None,
    ) -> list[ProviderPlace]:
        """Autocomplete search returning normalized ProviderPlace objects."""
        api_key = settings.GOOGLE_PLACES_API_KEY

        if not api_key:
            logger.warning("Google Places API key not configured")
            return []

        url = f"{GooglePlacesService.BASE_URL}/autocomplete/json"

        params: dict[str, Any] = {
            'input': query,
            'location': f"{latitude},{longitude}",
            'radius': radius_meters,
            'key': api_key,
        }
        if types:
            params['types'] = types

        try:
            response = requests.get(url, params=params, timeout=GOOGLE_AUTOCOMPLETE_TIMEOUT_SECONDS)
            response.raise_for_status()
            data = response.json()

            if data.get('status') not in ['OK', 'ZERO_RESULTS']:
                logger.warning(f"Google Places autocomplete error: {data.get('status')}")
                return []

            places: list[ProviderPlace] = []
            predictions = data.get('predictions', [])[:MAX_AUTOCOMPLETE_PREDICTIONS]

            for prediction in predictions:
                place_id = prediction.get('place_id')
                details = GooglePlacesService.get_place_details(
                    place_id,
                    fields='geometry,name,formatted_address,rating,user_ratings_total,types,photos',
                )

                if not details or not details.get('geometry'):
                    continue

                pp = ProviderPlace(
                    provider=GOOGLE_PROVIDER,
                    provider_place_id=place_id or '',
                    name=(
                        prediction.get('structured_formatting', {}).get('main_text')
                        or prediction.get('description', '')
                    ),
                    address=(
                        details.get('formatted_address')
                        or prediction.get('structured_formatting', {}).get('secondary_text')
                        or prediction.get('description', '')
                    ),
                    latitude=Decimal(str(details['geometry']['location']['lat'])),
                    longitude=Decimal(str(details['geometry']['location']['lng'])),
                    provider_types=details.get('types') or prediction.get('types', []),
                    rating=(
                        Decimal(str(details['rating']))
                        if details.get('rating') else None
                    ),
                    ratings_count=details.get('user_ratings_total') or 0,
                    distance_km=Cafe.calculate_distance(
                        latitude, longitude,
                        float(details['geometry']['location']['lat']),
                        float(details['geometry']['location']['lng']),
                    ),
                )
                places.append(pp)

            logger.info(f"Autocomplete search for '{query}' returned {len(places)} results")
            return places

        except requests.RequestException as e:
            logger.warning(f"Google Places autocomplete failed: {e}")
            return []

    @staticmethod
    def get_place_details(place_id: str, fields: str | None = None) -> dict[str, Any] | None:
        """
        Get detailed information about a specific place.

        Args:
            place_id: Google Place ID
            fields: Comma-separated list of fields to request
                   Default includes Basic Data (FREE) + some paid fields
                   For autocomplete, pass only the fields needed by search result display/classification.
        """
        api_key = settings.GOOGLE_PLACES_API_KEY

        if not api_key:
            return None

        url = f"{GooglePlacesService.BASE_URL}/details/json"

        # Default fields if not specified
        if not fields:
            fields = 'name,formatted_address,geometry,rating,user_ratings_total,price_level,opening_hours,formatted_phone_number,website'

        params = {
            'place_id': place_id,
            'fields': fields,
            'key': api_key
        }

        try:
            response = requests.get(url, params=params, timeout=GOOGLE_PLACE_DETAILS_TIMEOUT_SECONDS)
            response.raise_for_status()
            data = response.json()

            if data.get('status') == 'OK':
                return data.get('result')
            return None

        except requests.RequestException as e:
            logger.warning(f"Google Places details request failed: {e}")
            return None


class CafeService:
    """Service class for cafe-related business logic."""

    @staticmethod
    def get_or_create_from_google(
        google_place_id: str,
        cafe_data: dict[str, Any],
        created_by
    ) -> tuple[Cafe, bool]:
        """
        Get existing cafe or create new one with complete Google Places data.

        This method ensures all cafes created from Google Places have consistent
        data including Google ratings, price level, and other metadata.

        Args:
            google_place_id: Google Place ID
            cafe_data: Dict with required keys: name, address, latitude, longitude
            created_by: User who is creating the cafe

        Returns:
            Tuple of (cafe, created) where created is True if cafe was newly created

        Raises:
            ValueError: If required fields are missing from cafe_data
        """
        from django.utils import timezone

        # Check if cafe already exists
        existing_cafe = Cafe.objects.filter(google_place_id=google_place_id).first()
        if existing_cafe:
            logger.info(f"Cafe with Google Place ID {google_place_id} already exists")
            return existing_cafe, False

        # Validate required fields
        required_fields = ['name', 'address', 'latitude', 'longitude']
        missing_fields = [f for f in required_fields if f not in cafe_data]
        if missing_fields:
            raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")

        place_category = cafe_data.get('place_category') or PLACE_CATEGORY_CAFE
        if place_category not in SUPPORTED_PLACE_CATEGORIES:
            raise ValueError(f"Invalid place_category: {place_category}")

        # Fetch additional details from Google Places API
        logger.info(f"Fetching Google Place details for {google_place_id}")
        place_details = GooglePlacesService.get_place_details(google_place_id)

        # Create new cafe with complete data
        cafe = Cafe.objects.create(
            name=cafe_data['name'],
            address=cafe_data['address'],
            latitude=cafe_data['latitude'],
            longitude=cafe_data['longitude'],
            google_place_id=google_place_id,
            place_category=place_category,
            # Google Places API data (ensures consistency across all creation paths)
            price_range=place_details.get('price_level') if place_details and 1 <= (place_details.get('price_level') or 0) <= 4 else None,
            google_rating=place_details.get('rating') if place_details else None,
            google_ratings_count=place_details.get('user_ratings_total') if place_details else None,
            google_rating_updated_at=timezone.now() if place_details else None,
            # Metadata
            created_by=created_by,
            is_verified=False
        )

        logger.info(f"Created new cafe: {cafe.name} (ID: {cafe.id}, Google Place ID: {google_place_id})")
        return cafe, True
