"""
Global constants for the Can-It-WFC application.
Centralizes magic numbers for better maintainability and configurability.
"""

# ============================================================
# GEOLOCATION & DISTANCE
# ============================================================

# Earth's radius in kilometers (used in Haversine distance formula)
EARTH_RADIUS_KM = 6371

# Maximum distance in kilometers a user can be from a cafe to check in
MAX_CHECKIN_DISTANCE_KM = 1.0


# ============================================================
# CAFE SEARCH & DISCOVERY
# ============================================================

# Maximum number of cafes to return in nearby search results
MAX_NEARBY_CAFES = 200

# Maximum number of autocomplete suggestions to show
MAX_AUTOCOMPLETE_PREDICTIONS = 10


# ============================================================
# GOOGLE PLACES API
# ============================================================

# Hours after which Google ratings are considered stale and need refreshing
GOOGLE_RATING_FRESHNESS_HOURS = 24

# Required delay between Google Places API pagination requests (seconds)
# Google API requires 2-second delay between paginated requests
GOOGLE_PAGINATION_DELAY_SECONDS = 2

# Timeout for Google Places autocomplete API requests (seconds)
GOOGLE_AUTOCOMPLETE_TIMEOUT_SECONDS = 5

# Timeout for Google Places details API requests (seconds)
GOOGLE_PLACE_DETAILS_TIMEOUT_SECONDS = 3


# ============================================================
# MODERATION
# ============================================================

# Number of flags required to auto-hide a review
REVIEW_AUTO_HIDE_FLAG_THRESHOLD = 3
