"""
Expand fake data on cafe 31 to exercise the v2 insights features:
  - stickiness (`beloved` label, with cadence)
  - rating_distribution (`polarized`, consistency='polarizing')
  - day_of_week (`weekday_heavy` with `by_day` 7-bar view)

Idempotent: uses update_or_create. Run via:
    .venv/bin/python manage.py shell < scripts/seed_cafe_31_insights_v2.py

Cleanup is documented in FAKE_DATA_CAFE_31.md.
"""
from datetime import date, timedelta
from decimal import Decimal

from apps.cafes.models import Cafe
from apps.reviews.models import Visit, Review
from apps.core.stats_utils import update_cafe_stats

TODAY = date(2026, 5, 5)
CAFE_ID = 31

# (user_id, days_ago, time_bucket, amount, currency)
VISITS = [
    # Active regular: user 17 (already has 2 visits)
    (17,  8, 1, Decimal('6.50'), 'USD'),
    (17, 12, 2, Decimal('6.00'), 'USD'),
    (17, 25, 3, Decimal('7.00'), 'USD'),
    (17, 60, 1, Decimal('6.50'), 'USD'),
    # Active regular: user 13
    (13,  5, 2, Decimal('7.00'), 'USD'),
    (13, 35, 1, Decimal('5.50'), 'USD'),
    (13, 50, 2, Decimal('6.00'), 'USD'),
    (13, 65, 1, Decimal('5.50'), 'USD'),
    # Active regular: user 14
    (14,  4, 1, Decimal('6.00'), 'USD'),
    (14, 27, 2, Decimal('7.00'), 'USD'),
    (14, 42, 1, Decimal('6.50'), 'USD'),
    (14, 57, 3, Decimal('7.00'), 'USD'),
    # Active regular: user 15
    (15,  1, 1, Decimal('7.50'), 'USD'),
    (15, 22, 2, Decimal('6.00'), 'USD'),
    (15, 40, 1, Decimal('6.50'), 'USD'),
    (15, 70, 2, Decimal('6.00'), 'USD'),
    # Casual repeat visitors
    (11, 54, 1, Decimal('6.50'), 'USD'),
    (12, 55, 2, Decimal('7.00'), 'USD'),
    (16, 40, 1, Decimal('7.50'), 'USD'),
    # New unique single-visit users
    (2,  11, 1, Decimal('5.50'), 'USD'),
    (3,  14, 2, Decimal('7.50'), 'USD'),
    (4,  18, 1, Decimal('6.00'), 'USD'),
    (5,  21, 3, Decimal('8.00'), 'USD'),
    (6,  28, 2, Decimal('7.00'), 'USD'),
]

# (user_id, wifi, power, noise, seat, time) — wfc_rating auto-computed
REVIEWS = [
    (11, 1, 1, 1, 1, 1),  # 1★
    (2,  2, 2, 2, 2, 1),  # 2★
    (3,  1, 1, 1, 1, 2),  # 1★
    (4,  5, 5, 5, 5, 1),  # 5★
    (5,  3, 3, 3, 3, 3),  # 3★
]

cafe = Cafe.objects.get(id=CAFE_ID)
print(f'Seeding insights data on cafe {cafe.id}: {cafe.name}')
print(f'Before: visits={cafe.total_visits} reviews={cafe.total_reviews}')

added_visits = updated_visits = 0
for uid, days_ago, time_bucket, amount, currency in VISITS:
    visit_date = TODAY - timedelta(days=days_ago)
    _, created = Visit.objects.update_or_create(
        cafe=cafe,
        user_id=uid,
        visit_date=visit_date,
        defaults={
            'visit_time': time_bucket,
            'amount_spent': amount,
            'currency': currency,
        },
    )
    if created:
        added_visits += 1
    else:
        updated_visits += 1

added_reviews = updated_reviews = 0
for uid, wifi, power, noise, seat, time_bucket in REVIEWS:
    _, created = Review.objects.update_or_create(
        cafe=cafe,
        user_id=uid,
        defaults={
            'wifi_quality': wifi,
            'power_outlets_rating': power,
            'noise_level': noise,
            'seating_comfort': seat,
            'visit_time': time_bucket,
        },
    )
    if created:
        added_reviews += 1
    else:
        updated_reviews += 1

print(f'Visits:  +{added_visits} added, {updated_visits} updated')
print(f'Reviews: +{added_reviews} added, {updated_reviews} updated')

print('Recomputing stats + insights...')
update_cafe_stats(cafe)
cafe.refresh_from_db()

print(f'After: visits={cafe.total_visits} unique={cafe.unique_visitors} reviews={cafe.total_reviews}')
print()
print('Insights cache keys:', sorted(cafe.insights_cache.keys()))
print()
import json
print(json.dumps(cafe.insights_cache, indent=2, default=str))
