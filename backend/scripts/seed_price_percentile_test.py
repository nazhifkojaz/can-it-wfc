"""
Seed fake cafes and visits to exercise the price-percentile insight.

Creates 8 cafes in the same H3 cell (Jakarta) with different spend medians,
then recomputes insights and price clusters so percentile labels appear.

Idempotent: uses update_or_create for cafes and visits.
Run via:
    uv run python manage.py shell < scripts/seed_price_percentile_test.py
"""
from decimal import Decimal
from datetime import date, timedelta

from django.contrib.auth import get_user_model
from apps.cafes.models import Cafe
from apps.reviews.models import Visit
from apps.core.stats_utils import update_cafe_stats
from apps.cafes.management.commands.recompute_price_clusters import Command as RecomputeCmd

User = get_user_model()

TODAY = date(2026, 5, 5)
BASE_LAT = Decimal('-6.2088')
BASE_LNG = Decimal('106.8456')

# (cafe_name_suffix, spend_amounts_usd)
# 8 cafes with deliberately spread medians
CAFE_SPENDS = [
    ('Cheap A',   [3.00, 3.50, 4.00]),
    ('Cheap B',   [3.50, 3.50, 4.50]),
    ('Low-Mid A', [5.00, 5.50, 6.00]),
    ('Low-Mid B', [5.50, 6.00, 6.50]),
    ('Mid A',     [7.00, 7.50, 8.00]),
    ('Mid B',     [8.00, 8.50, 9.00]),
    ('High A',    [11.00, 12.00, 13.00]),
    ('High B',    [15.00, 16.00, 17.00]),
]

# Pick an existing user as created_by (or create a dummy one)
seed_user, _ = User.objects.get_or_create(
    username='seed_bot',
    defaults={'email': 'seed@localhost', 'password': 'notused'},
)

print(f'Seeding {len(CAFE_SPENDS)} cafes in H3 cell for {BASE_LAT},{BASE_LNG}')

cafes = []
for suffix, amounts in CAFE_SPENDS:
    name = f'Test Percentile {suffix}'
    cafe, created = Cafe.objects.update_or_create(
        name=name,
        defaults={
            'address': f'{name} Address, Jakarta',
            'latitude': BASE_LAT,
            'longitude': BASE_LNG,
            'google_place_id': f'seed_percentile_{suffix.lower().replace(" ", "_")}',
            'created_by': seed_user,
        },
    )
    cafes.append((cafe, amounts, created))
    action = 'Created' if created else 'Updated'
    print(f'  {action}: {cafe.name} (id={cafe.id})')

# Seed visits for each cafe
for cafe, amounts, _ in cafes:
    for i, amount in enumerate(amounts):
        visit_date = TODAY - timedelta(days=i * 7)
        Visit.objects.update_or_create(
            cafe=cafe,
            user=seed_user,
            visit_date=visit_date,
            defaults={
                'visit_time': 1,
                'amount_spent': Decimal(str(amount)),
                'currency': 'USD',
            },
        )
    print(f'  Seeded {len(amounts)} visits for {cafe.name}')

# Recompute stats + insights for all cafes
print('\nRecomputing cafe stats + insights...')
for cafe, _, _ in cafes:
    update_cafe_stats(cafe)
    print(f'  {cafe.name}: spend={cafe.insights_cache.get("spend")}')

# Recompute price clusters
print('\nRecomputing price clusters...')
cmd = RecomputeCmd()
cmd.handle(dry_run=False)

# Recompute insights again so percentile gets picked up
print('\nRecomputing insights to pick up new clusters...')
for cafe, _, _ in cafes:
    update_cafe_stats(cafe)
    spend = cafe.insights_cache.get('spend')
    percentile = spend.get('percentile') if spend else None
    print(f'  {cafe.name}: median=${spend["primary"]["median"]} USD → percentile={percentile}')

print('\nDone. Open any of these cafes in the frontend to see the price percentile label.')
