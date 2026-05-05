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

INSIGHTS_CACHE_VERSION = 5

INSIGHTS_SAMPLE_THRESHOLDS = {
    'COST_VISITS': 3,
    'TIME_OF_DAY_RECORDS': 5,
    'RATING_BY_TIME_PER_BUCKET': 3,
    'RATING_BY_TIME_MIN_BUCKETS': 2,
    'GOOGLE_DELTA_MIN': 0.5,
    'RATING_DISTRIBUTION_MIN_REVIEWS': 10,
    'DAY_OF_WEEK_MIN_VISITS': 10,
    'DAY_OF_WEEK_DETAILED_MIN_VISITS': 20,
    'DAY_OF_WEEK_DETAILED_MIN_ACTIVE_DAYS': 4,
    'PRICE_CLUSTER_MIN_CAFES': 5,
}

INSIGHTS_STICKINESS_THRESHOLDS = {
    'MIN_UNIQUE_VISITORS': 10,
    'MIN_TOTAL_VISITS': 15,
    'ACTIVE_REGULARS_MIN_VISITS': 3,
    'ACTIVE_REGULARS_RECENCY_DAYS': 60,
    'NEWCOMER_RECENT_DAYS': 30,
    'CADENCE_MIN_INTERVALS': 5,
    'CADENCE_RECENT_DAYS': 90,
    'CADENCE_MAX_FOR_DISPLAY': 21,
    'BELOVED_MIN_REGULARS': 3,
    'BELOVED_MIN_RATIO': 2.5,
    'HAS_REGULARS_MIN_REGULARS': 1,
    'HAS_REGULARS_MIN_RATIO': 2.0,
    'DISCOVERY_NEWCOMER_SHARE': 0.7,
    'DISCOVERY_MIN_TOTAL_VISITS': 10,
    'STEADY_MIX_MIN_RATIO': 1.3,
}
