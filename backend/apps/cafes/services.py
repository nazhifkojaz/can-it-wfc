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
        keyword: str = "cafe"
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
        timeout = getattr(settings, 'GOOGLE_PLACES_TIMEOUT', 10)

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
    def get_place_details(place_id: str) -> Optional[Dict]:
        """Get detailed information about a specific place."""
        api_key = settings.GOOGLE_PLACES_API_KEY

        if not api_key:
            return None

        url = f"{GooglePlacesService.BASE_URL}/details/json"
        params = {
            'place_id': place_id,
            'fields': 'name,formatted_address,geometry,rating,price_level,opening_hours,formatted_phone_number,website',
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
