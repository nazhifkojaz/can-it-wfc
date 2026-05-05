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

# Timeout for Google Places autocomplete API requests (seconds)
GOOGLE_AUTOCOMPLETE_TIMEOUT_SECONDS = 5

# Timeout for Google Places details API requests (seconds)
GOOGLE_PLACE_DETAILS_TIMEOUT_SECONDS = 3


# ============================================================
# MODERATION
# ============================================================

# Number of flags required to auto-hide a review
REVIEW_AUTO_HIDE_FLAG_THRESHOLD = 3


# ============================================================
# VISIT TIME CHOICES (shared by Visit and Review models)
# Keep in sync with frontend/src/config/constants.ts VISIT_TIME_LABELS
# ============================================================

VISIT_TIME_CHOICES = [
    (1, 'Morning (6AM - 12PM)'),
    (2, 'Afternoon (12PM - 6PM)'),
    (3, 'Evening (6PM - 12AM)'),
]


# ============================================================
# LISTS / COLLECTIONS
# Keep in sync with frontend/src/config/constants.ts list limits
# ============================================================

MAX_LISTS_PER_USER = 50
MAX_ITEMS_PER_LIST = 500
DEFAULT_LIST_NAME = "Favorites"


# ============================================================
# CAFE INSIGHTS
# ============================================================

INSIGHTS_CACHE_VERSION = 2

INSIGHTS_SAMPLE_THRESHOLDS = {
    'BEST_FOR_REVIEWS': 5,
    'COST_VISITS': 3,
    'TIME_OF_DAY_RECORDS': 5,
    'RATING_BY_TIME_PER_BUCKET': 3,
    'RATING_BY_TIME_MIN_BUCKETS': 2,
    'STICKINESS_UNIQUE_VISITORS': 5,
    'GOOGLE_DELTA_MIN': 0.5,
}

INSIGHTS_STICKINESS_THRESHOLDS = {
    'MANY_REGULARS': 3.0,
    'MIX_MIN': 1.5,
}

INSIGHTS_BEST_FOR_RULES = {
    'video_calls': {'min_wifi': 4.0, 'max_noise': 2.5},
    'long_sessions': {'min_power': 4.0, 'min_seating': 4.0},
    'focus_work': {'max_noise': 2.0, 'min_seating': 3.5},
    'quick_stops': {'max_price': 2, 'min_wifi': 3.5},
}
