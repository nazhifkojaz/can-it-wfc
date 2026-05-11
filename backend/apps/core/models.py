from django.db import models
from django.core.cache import cache
from core.logging import get_logger

logger = get_logger(__name__)

EXCHANGE_RATES_CACHE_KEY = 'core:exchange_rates'
EXCHANGE_RATES_CACHE_TTL = 3600 * 6  # 6 hours


class ExchangeRate(models.Model):
    """
    Cached exchange rates relative to USD.
    Updated monthly via management command from frankfurter.app (ECB rates).
    """
    currency_code = models.CharField(
        max_length=3,
        unique=True,
        help_text="ISO 4217 currency code (e.g., IDR, SGD, EUR)",
    )
    rate_to_usd = models.DecimalField(
        max_digits=20,
        decimal_places=10,
        help_text="1 unit of this currency = X USD (e.g., 1 IDR = 0.000061 USD)",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['currency_code']
        verbose_name = 'Exchange Rate'
        verbose_name_plural = 'Exchange Rates'

    def __str__(self):
        return f"1 {self.currency_code} = {self.rate_to_usd} USD"

    @classmethod
    def get_rate(cls, currency_code: str) -> float | None:
        """Return cached rate for a currency, or None if not found."""
        all_rates = cls.get_all_rates()
        return all_rates.get(currency_code)

    @classmethod
    def get_all_rates(cls) -> dict[str, float]:
        """Return all cached exchange rates, using Django cache to avoid repeated DB queries."""
        cached = cache.get(EXCHANGE_RATES_CACHE_KEY)
        if cached is not None:
            return cached

        rates = {}
        for obj in cls.objects.all():
            rates[obj.currency_code] = float(obj.rate_to_usd)
        rates.setdefault('USD', 1.0)

        cache.set(EXCHANGE_RATES_CACHE_KEY, rates, EXCHANGE_RATES_CACHE_TTL)
        return rates

    @classmethod
    def invalidate_cache(cls):
        """Clear the cached exchange rates (called after rates are updated)."""
        cache.delete(EXCHANGE_RATES_CACHE_KEY)
        logger.info('Exchange rate cache invalidated')
