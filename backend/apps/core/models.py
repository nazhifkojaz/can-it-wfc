from django.db import models


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
        try:
            return float(cls.objects.get(currency_code=currency_code).rate_to_usd)
        except cls.DoesNotExist:
            return None

    @classmethod
    def get_all_rates(cls) -> dict[str, float]:
        """Return all cached exchange rates as {currency_code: rate_to_usd}."""
        rates = {}
        for obj in cls.objects.all():
            rates[obj.currency_code] = float(obj.rate_to_usd)
        # Always include USD as baseline
        rates.setdefault('USD', 1.0)
        return rates
