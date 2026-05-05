"""
Management command to update exchange rates from frankfurter.app (ECB data)
with a fallback to the fawazahmed0/currency-api for non-ECB currencies.
Run monthly via cron:
    0 2 1 * * cd /path/to/backend && uv run python manage.py update_exchange_rates
"""
import requests
from decimal import Decimal
from django.core.management.base import BaseCommand
from apps.core.models import ExchangeRate
from apps.core.currency_utils import CURRENCY_SYMBOLS


FRANKFURTER_BASE_URL = "https://api.frankfurter.app"
FALLBACK_CURRENCY_API = (
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json"
)


class Command(BaseCommand):
    help = "Update cached exchange rates from frankfurter.app (ECB) with fallback. Run monthly."

    def _fetch_frankfurter_rates(self):
        """Fetch rates from frankfurter.app (ECB data)."""
        try:
            response = requests.get(
                f"{FRANKFURTER_BASE_URL}/latest",
                params={"from": "USD"},
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            rates = data.get("rates", {})
            date = data.get("date", "unknown")
            return rates, date
        except requests.RequestException as e:
            self.stderr.write(self.style.ERROR(f"Failed to fetch Frankfurter rates: {e}"))
            return None, None

    def _fetch_fallback_rates(self):
        """Fetch rates from the free CDN-based currency API (no key required)."""
        try:
            response = requests.get(FALLBACK_CURRENCY_API, timeout=30)
            response.raise_for_status()
            data = response.json()
            rates = data.get("usd", {})
            return rates
        except requests.RequestException as e:
            self.stderr.write(self.style.WARNING(f"Failed to fetch fallback rates: {e}"))
            return None

    def handle(self, *args, **options):
        self.stdout.write("Fetching latest rates from frankfurter.app...")
        frankfurter_rates, date = self._fetch_frankfurter_rates()

        # If Frankfurter fails entirely, try fallback for everything
        fallback_rates = None
        if frankfurter_rates is None:
            self.stdout.write("Frankfurter failed; trying fallback API...")
            fallback_rates = self._fetch_fallback_rates()
            if fallback_rates is None:
                self.stderr.write(self.style.ERROR("All rate sources failed."))
                return
        elif date:
            self.stdout.write(f"Frankfurter rates as of {date}.")

        updated_count = 0
        created_count = 0

        for currency_code in CURRENCY_SYMBOLS.keys():
            if currency_code == "USD":
                rate = Decimal("1.0")
            elif frankfurter_rates and currency_code.upper() in frankfurter_rates:
                usd_to_currency = Decimal(str(frankfurter_rates[currency_code.upper()]))
                if usd_to_currency == 0:
                    self.stderr.write(
                        self.style.WARNING(f"Skipping {currency_code}: rate is 0")
                    )
                    continue
                rate = Decimal("1.0") / usd_to_currency
            else:
                # Try fallback API for non-ECB currencies (e.g. VND)
                if fallback_rates is None and frankfurter_rates is not None:
                    self.stdout.write(
                        f"Fetching fallback for non-ECB currencies..."
                    )
                    fallback_rates = self._fetch_fallback_rates()

                if fallback_rates and currency_code.lower() in fallback_rates:
                    usd_to_currency = Decimal(str(fallback_rates[currency_code.lower()]))
                    if usd_to_currency == 0:
                        self.stderr.write(
                            self.style.WARNING(
                                f"Skipping {currency_code}: fallback rate is 0"
                            )
                        )
                        continue
                    rate = Decimal("1.0") / usd_to_currency
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  {currency_code}: using fallback rate"
                        )
                    )
                else:
                    self.stderr.write(
                        self.style.WARNING(f"No rate available for {currency_code}")
                    )
                    continue

            obj, created = ExchangeRate.objects.update_or_create(
                currency_code=currency_code,
                defaults={"rate_to_usd": rate},
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done! {created_count} created, {updated_count} updated."
            )
        )
