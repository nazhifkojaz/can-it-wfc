"""
Management command to backfill insights_cache for all cafes.

Usage:
    python manage.py backfill_cafe_insights
    python manage.py backfill_cafe_insights --batch-size 50
    python manage.py backfill_cafe_insights --dry-run
"""

from django.core.management.base import BaseCommand
from apps.cafes.models import Cafe
from apps.core.stats_utils import recompute_cafe_insights


class Command(BaseCommand):
    help = 'Backfill insights_cache for all cafes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of cafes to process in each batch (default: 100)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulate the operation without making changes'
        )

    def handle(self, *args, **options):
        batch_size = options['batch_size']
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        all_cafes = Cafe.objects.all()
        total_cafes = all_cafes.count()

        if total_cafes == 0:
            self.stdout.write(self.style.WARNING('No cafes found in database'))
            return

        self.stdout.write(
            self.style.SUCCESS(f'Found {total_cafes} cafes to process')
        )

        processed = 0
        errors = 0

        for i in range(0, total_cafes, batch_size):
            batch = all_cafes[i:i + batch_size]

            self.stdout.write(
                f'Processing batch {i // batch_size + 1} '
                f'(cafes {i + 1}-{min(i + batch_size, total_cafes)} of {total_cafes})...'
            )

            for cafe in batch:
                try:
                    if not dry_run:
                        recompute_cafe_insights(cafe)
                    processed += 1

                    if processed % 10 == 0:
                        self.stdout.write(
                            self.style.SUCCESS(f'  \u2713 Processed {processed}/{total_cafes} cafes')
                        )

                except Exception as e:
                    errors += 1
                    self.stdout.write(
                        self.style.ERROR(f'  \u2717 Error processing cafe {cafe.id} ({cafe.name}): {e}')
                    )

        self.stdout.write('\n' + '=' * 60)
        if dry_run:
            self.stdout.write(self.style.SUCCESS(f'DRY RUN COMPLETE'))
            self.stdout.write(self.style.SUCCESS(f'Would process: {processed} cafes'))
        else:
            self.stdout.write(self.style.SUCCESS(f'BACKFILL COMPLETE'))
            self.stdout.write(self.style.SUCCESS(f'Successfully processed: {processed} cafes'))

        if errors > 0:
            self.stdout.write(self.style.ERROR(f'Errors: {errors} cafes'))
        else:
            self.stdout.write(self.style.SUCCESS('No errors encountered'))

        self.stdout.write('=' * 60)
