"""
Management command to recompute price clusters for all cafes.

Usage:
    python manage.py recompute_price_clusters
    python manage.py recompute_price_clusters --dry-run
"""

from bisect import bisect_left
from collections import defaultdict
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.cafes.models import Cafe, PriceCluster
from apps.core.constants import INSIGHTS_SAMPLE_THRESHOLDS


class Command(BaseCommand):
    help = 'Recompute price clusters per H3 cell and currency'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate the operation without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        # Gather all cafes that have spend data in their insights cache
        cafes = Cafe.objects.filter(
            h3_cell_r7__isnull=False,
            insights_cache__isnull=False,
        )

        # Group by (h3_cell, currency)
        groups = defaultdict(list)
        for cafe in cafes.iterator(chunk_size=200):
            spend = cafe.insights_cache.get('spend')
            if not spend:
                continue
            primary = spend.get('primary')
            if not primary:
                continue
            currency = primary.get('currency')
            median = primary.get('median')
            n = primary.get('n', 0)
            if not currency or median is None:
                continue
            if n < INSIGHTS_SAMPLE_THRESHOLDS['COST_VISITS']:
                continue
            groups[(cafe.h3_cell_r7, currency)].append(
                (cafe.id, float(median))
            )

        total_clusters = len(groups)
        self.stdout.write(
            self.style.SUCCESS(f'Found {total_clusters} (h3_cell, currency) groups to process')
        )

        created_count = 0
        updated_count = 0
        skipped_count = 0
        errors = 0

        for (h3_cell, currency), cafe_data in groups.items():
            try:
                if len(cafe_data) < 5:
                    skipped_count += 1
                    continue

                medians = sorted(m for _, m in cafe_data)
                median_of_medians = Decimal(str(medians[len(medians) // 2]))
                cafe_count = len(cafe_data)

                if dry_run:
                    self.stdout.write(
                        f'  Would update {h3_cell}/{currency} ({cafe_count} cafes)'
                    )
                    continue

                with transaction.atomic():
                    obj, created = PriceCluster.objects.update_or_create(
                        h3_cell=h3_cell,
                        currency=currency,
                        defaults={
                            'median_of_medians': median_of_medians,
                            'cafe_medians': medians,
                            'cafe_count': cafe_count,
                        },
                    )
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

            except Exception as e:
                errors += 1
                self.stdout.write(
                    self.style.ERROR(f'  Error processing {h3_cell}/{currency}: {e}')
                )

        self.stdout.write('\n' + '=' * 60)
        if dry_run:
            self.stdout.write(self.style.SUCCESS('DRY RUN COMPLETE'))
        else:
            self.stdout.write(self.style.SUCCESS('RECOMPUTE COMPLETE'))
            self.stdout.write(self.style.SUCCESS(f'Created: {created_count} clusters'))
            self.stdout.write(self.style.SUCCESS(f'Updated: {updated_count} clusters'))
            self.stdout.write(self.style.SUCCESS(f'Skipped (< 5 cafes): {skipped_count} clusters'))

        if errors > 0:
            self.stdout.write(self.style.ERROR(f'Errors: {errors} clusters'))
        else:
            self.stdout.write(self.style.SUCCESS('No errors encountered'))
        self.stdout.write('=' * 60)
