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
        keyword: str = "coffee"
    ) -> List[Dict]:
        """
        Search for coffee shops near a location using Google Places API.

        Args:
            latitude: Center latitude
            longitude: Center longitude
            radius_meters: Search radius in meters (max 50000)
            keyword: Search keyword (default: "coffee")

        Returns:
            List of place dictionaries with standardized format
        """
        api_key = settings.GOOGLE_PLACES_API_KEY

        if not api_key:
            logger.warning("Google Places API key not configured")
            return []

        url = f"{GooglePlacesService.BASE_URL}/nearbysearch/json"
        params = {
            'location': f"{latitude},{longitude}",
            'radius': radius_meters,
            'type': 'cafe',
            'keyword': keyword,
            'key': api_key
        }

        try:
            response = requests.get(url, params=params, timeout=3)
            response.raise_for_status()
            data = response.json()

            if data.get('status') not in ['OK', 'ZERO_RESULTS']:
                logger.warning(f"Google Places API error: {data.get('status')} - continuing without Google results")
                return []

            # Transform Google Places format to our standard format
            places = []
            for place in data.get('results', []):
                places.append({
                    'google_place_id': place.get('place_id'),
                    'name': place.get('name'),
                    'address': place.get('vicinity'),
                    'latitude': str(place['geometry']['location']['lat']),
                    'longitude': str(place['geometry']['location']['lng']),
                    'rating': place.get('rating'),
                    'user_ratings_total': place.get('user_ratings_total', 0),
                    'price_level': place.get('price_level'),  # 0-4 scale
                    'is_open_now': place.get('opening_hours', {}).get('open_now') if place.get('opening_hours') else None,
                    'photo_reference': place.get('photos', [{}])[0].get('photo_reference') if place.get('photos') else None,
                })

            return places

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
