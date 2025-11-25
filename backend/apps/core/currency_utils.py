"""
Currency detection utility based on geographic location.
Maps latitude/longitude to country and default currency.
No external API needed - completely free!
"""

from decimal import Decimal


# Currency choices for the Visit model
CURRENCY_CHOICES = [
    ('USD', 'US Dollar ($)'),
    ('IDR', 'Indonesian Rupiah (Rp)'),
    ('SGD', 'Singapore Dollar (S$)'),
    ('MYR', 'Malaysian Ringgit (RM)'),
    ('THB', 'Thai Baht (฿)'),
    ('PHP', 'Philippine Peso (₱)'),
    ('VND', 'Vietnamese Dong (₫)'),
    ('JPY', 'Japanese Yen (¥)'),
    ('CNY', 'Chinese Yuan (¥)'),
    ('KRW', 'Korean Won (₩)'),
    ('INR', 'Indian Rupee (₹)'),
    ('AUD', 'Australian Dollar (A$)'),
    ('EUR', 'Euro (€)'),
    ('GBP', 'British Pound (£)'),
]

# Currency symbols for display
CURRENCY_SYMBOLS = {
    'USD': '$',
    'IDR': 'Rp',
    'SGD': 'S$',
    'MYR': 'RM',
    'THB': '฿',
    'PHP': '₱',
    'VND': '₫',
    'JPY': '¥',
    'CNY': '¥',
    'KRW': '₩',
    'INR': '₹',
    'AUD': 'A$',
    'EUR': '€',
    'GBP': '£',
}


def detect_currency_from_coordinates(latitude: float, longitude: float) -> str:
    """
    Detect currency based on latitude and longitude.
    Uses simple bounding box approach for major regions.

    Args:
        latitude: Latitude coordinate
        longitude: Longitude coordinate

    Returns:
        3-letter currency code (e.g., 'USD', 'IDR')
    """
    lat = float(latitude)
    lon = float(longitude)

    # Southeast Asia
    if -11 <= lat <= 6 and 95 <= lon <= 141:
        # Indonesia (approximate bounding box)
        if -11 <= lat <= 6 and 95 <= lon <= 141:
            if lat <= -6 or (lat >= -6 and lat <= 6 and lon >= 95 and lon <= 120):
                return 'IDR'

        # Singapore
        if 1.1 <= lat <= 1.5 and 103.6 <= lon <= 104.1:
            return 'SGD'

        # Malaysia
        if 0.8 <= lat <= 7.4 and 99.6 <= lon <= 119.3:
            return 'MYR'

        # Thailand
        if 5.6 <= lat <= 20.5 and 97.3 <= lon <= 105.6:
            return 'THB'

        # Philippines
        if 4.6 <= lat <= 21.1 and 116.9 <= lon <= 126.6:
            return 'PHP'

        # Vietnam
        if 8.5 <= lat <= 23.4 and 102.1 <= lon <= 109.5:
            return 'VND'

    # Japan
    if 24 <= lat <= 46 and 123 <= lon <= 146:
        return 'JPY'

    # South Korea
    if 33 <= lat <= 43 and 124 <= lon <= 132:
        return 'KRW'

    # China
    if 18 <= lat <= 54 and 73 <= lon <= 135:
        return 'CNY'

    # India
    if 6 <= lat <= 37 and 68 <= lon <= 97:
        return 'INR'

    # Australia
    if -44 <= lat <= -10 and 113 <= lon <= 154:
        return 'AUD'

    # Europe (approximate)
    if 36 <= lat <= 71 and -10 <= lon <= 40:
        # UK
        if 49.9 <= lat <= 60.9 and -8.2 <= lon <= 1.8:
            return 'GBP'
        return 'EUR'

    # United States
    if 24 <= lat <= 50 and -125 <= lon <= -66:
        return 'USD'

    # Default to USD for anywhere else
    return 'USD'


def format_currency(amount: Decimal, currency: str) -> str:
    """
    Format amount with currency symbol.

    Args:
        amount: Decimal amount
        currency: 3-letter currency code

    Returns:
        Formatted string (e.g., "$25.00", "Rp 50,000")
    """
    symbol = CURRENCY_SYMBOLS.get(currency, currency)

    # Format based on currency (some currencies don't use decimals)
    if currency in ['IDR', 'VND', 'JPY', 'KRW']:
        # Currencies without decimal places
        return f"{symbol} {int(amount):,}"
    else:
        # Currencies with decimal places
        return f"{symbol}{amount:,.2f}"
