import pytest


@pytest.fixture(autouse=False)
def disable_throttle(settings):
    """Set very high throttle rates so tests never hit limits."""
    settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
        'anon': '10000/hour',
        'user': '10000/hour',
        'reviews': '10000/hour',
        'bulk': '10000/hour',
        'auth': '10000/min',
        'registration': '10000/hour',
        'nearby_anon': '10000/min',
        'nearby_auth': '10000/min',
        'public_api': '10000/min',
    }
