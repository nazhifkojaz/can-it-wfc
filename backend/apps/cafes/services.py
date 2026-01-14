import requests
from django.conf import settings
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)


class GooglePlacesService:
    """Service for interacting with Google Places API."""

    BASE_URL = "https://maps.googleapis.com/maps/api/place"

    @staticmethod
    def search_nearby_coffee_shops(
        latitude: float,
        longitude: float,
        radius_meters: int = 1000,
        keyword: str = ""
    ) -> List[Dict]:
        """
        Search for coffee shops near a location using Google Places API.
        Uses distance-based ranking and pagination to get all nearby cafes.

        Args:
            latitude: Center latitude
            longitude: Center longitude
            radius_meters: Search radius in meters (for filtering results)
            keyword: Search keyword (default: "cafe")

        Returns:
            List of place dictionaries with standardized format, sorted by distance
        """
        api_key = settings.GOOGLE_PLACES_API_KEY

        if not api_key:
            logger.warning("Google Places API key not configured")
            return []

        # Get configuration
        max_results = getattr(settings, 'GOOGLE_PLACES_MAX_RESULTS', 60)
        enable_pagination = getattr(settings, 'GOOGLE_PLACES_ENABLE_PAGINATION', True)
        timeout = getattr(settings, 'GOOGLE_PLACES_TIMEOUT', 30)

        url = f"{GooglePlacesService.BASE_URL}/nearbysearch/json"

        # Use rankby=distance for closest cafes first
        # Note: Cannot use 'radius' parameter with 'rankby=distance'
        params = {
            'location': f"{latitude},{longitude}",
            'rankby': 'distance',  # Sort by distance, not popularity
            'type': 'cafe',
            'keyword': keyword,
            'key': api_key
        }

        all_places = []
        page_count = 0
        next_page_token = None

        try:
            while True:
                # Add pagetoken if this is not the first request
                if next_page_token:
                    params['pagetoken'] = next_page_token

                response = requests.get(url, params=params, timeout=timeout)
                response.raise_for_status()
                data = response.json()

                if data.get('status') not in ['OK', 'ZERO_RESULTS']:
                    logger.warning(f"Google Places API error: {data.get('status')} - continuing without Google results")
                    break

                # Transform Google Places format to our standard format
                for place in data.get('results', []):
                    place_lat = place['geometry']['location']['lat']
                    place_lng = place['geometry']['location']['lng']

                    # Calculate distance from search center
                    from apps.cafes.models import Cafe
                    distance_km = Cafe.calculate_distance(
                        latitude, longitude,
                        float(place_lat), float(place_lng)
                    )

                    # Filter by radius (since we can't use radius param with rankby)
                    if distance_km * 1000 <= radius_meters:
                        all_places.append({
                            'google_place_id': place.get('place_id'),
                            'name': place.get('name'),
                            'address': place.get('vicinity'),
                            'latitude': str(place_lat),
                            'longitude': str(place_lng),
                            'rating': place.get('rating'),
                            'user_ratings_total': place.get('user_ratings_total', 0),
                            'price_level': place.get('price_level'),  # 0-4 scale
                            'is_open_now': place.get('opening_hours', {}).get('open_now') if place.get('opening_hours') else None,
                            'photo_reference': place.get('photos', [{}])[0].get('photo_reference') if place.get('photos') else None,
                            'distance_km': distance_km,  # Add distance for reference
                        })

                page_count += 1

                # Check if we should continue pagination
                next_page_token = data.get('next_page_token')

                if not enable_pagination:
                    break

                if not next_page_token:
                    break

                if len(all_places) >= max_results:
                    break

                # Google requires 2-second delay between pagination requests
                import time
                time.sleep(2)

            logger.info(f"Fetched {len(all_places)} cafes from Google Places (within {radius_meters}m, {page_count} pages)")

            # Limit to max_results
            return all_places[:max_results]

        except requests.RequestException as e:
            logger.warning(f"Google Places API request failed: {e} - continuing without Google results")
            return []

    @staticmethod
    def autocomplete_search(
        query: str,
        latitude: float,
        longitude: float,
        radius_meters: int = 10000,
        types: str = None
    ) -> List[Dict]:
        """
        Search using Autocomplete API for real-time search suggestions.
        Much cheaper than Text Search: $2.83/1k vs $32/1k.

        Args:
            query: Search query (cafe name, location, etc.)
            latitude: Center latitude for biasing results
            longitude: Center longitude for biasing results
            radius_meters: Search radius in meters
            types: Place types filter (e.g., 'cafe', 'establishment')

        Returns:
            List of place dictionaries with coordinates
        """
        api_key = settings.GOOGLE_PLACES_API_KEY

        if not api_key:
            logger.warning("Google Places API key not configured")
            return []

        url = f"{GooglePlacesService.BASE_URL}/autocomplete/json"

        params = {
            'input': query,
            'location': f"{latitude},{longitude}",
            'radius': radius_meters,
            'key': api_key
        }

        if types:
            params['types'] = types

        try:
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()

            if data.get('status') not in ['OK', 'ZERO_RESULTS']:
                logger.warning(f"Google Places autocomplete error: {data.get('status')}")
                return []

            places = []
            predictions = data.get('predictions', [])[:10]  # Limit to 10 predictions

            # For each prediction, get place details to retrieve coordinates
            # Place Details (Basic Data - geometry, name, address) is FREE!
            # Only request free fields to keep costs down
            for prediction in predictions:
                place_id = prediction.get('place_id')
                details = GooglePlacesService.get_place_details(
                    place_id,
                    fields='geometry,name,formatted_address,rating,photos'  # FREE fields
                )

                if details and details.get('geometry'):
                    place_lat = details['geometry']['location']['lat']
                    place_lng = details['geometry']['location']['lng']

                    # Calculate distance
                    from apps.cafes.models import Cafe
                    distance_km = Cafe.calculate_distance(
                        latitude, longitude,
                        float(place_lat), float(place_lng)
                    )

                    places.append({
                        'place_id': place_id,
                        'name': prediction.get('structured_formatting', {}).get('main_text', prediction.get('description')),
                        'vicinity': prediction.get('structured_formatting', {}).get('secondary_text', prediction.get('description')),
                        'geometry': details.get('geometry'),
                        'rating': details.get('rating'),
                        'user_ratings_total': details.get('user_ratings_total', 0),
                        'distance_km': distance_km,
                        'types': prediction.get('types', []),
                    })

            logger.info(f"Autocomplete search for '{query}' returned {len(places)} results")
            return places

        except requests.RequestException as e:
            logger.warning(f"Google Places autocomplete failed: {e}")
            return []

    @staticmethod
    def get_place_details(place_id: str, fields: str = None) -> Optional[Dict]:
        """
        Get detailed information about a specific place.

        Args:
            place_id: Google Place ID
            fields: Comma-separated list of fields to request
                   Default includes Basic Data (FREE) + some paid fields
                   For autocomplete, pass 'geometry,name,formatted_address,rating,photos'
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
            response = requests.get(url, params=params, timeout=3)
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
        cafe_data: dict,
        created_by
    ) -> tuple:
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
        from apps.cafes.models import Cafe
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
            # Google Places API data (ensures consistency across all creation paths)
            price_range=place_details.get('price_level') if place_details else None,
            google_rating=place_details.get('rating') if place_details else None,
            google_ratings_count=place_details.get('user_ratings_total') if place_details else None,
            google_rating_updated_at=timezone.now() if place_details else None,
            # Metadata
            created_by=created_by,
            is_verified=False
        )

        logger.info(f"Created new cafe: {cafe.name} (ID: {cafe.id}, Google Place ID: {google_place_id})")
        return cafe, True
