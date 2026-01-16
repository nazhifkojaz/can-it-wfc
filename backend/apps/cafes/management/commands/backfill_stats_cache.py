"""
Management command to backfill cached stats for all cafes.

This command updates average_ratings_cache and facility_stats_cache
for all existing cafes by calling update_stats() on each cafe.

Usage:
    python manage.py backfill_stats_cache
    python manage.py backfill_stats_cache --batch-size 50
"""

from django.core.management.base import BaseCommand
from apps.cafes.models import Cafe


class Command(BaseCommand):
    help = 'Backfill cached stats (average_ratings_cache and facility_stats_cache) for all cafes'

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

        # Get all cafes
        all_cafes = Cafe.objects.all()
        total_cafes = all_cafes.count()

        if total_cafes == 0:
            self.stdout.write(self.style.WARNING('No cafes found in database'))
            return

        self.stdout.write(
            self.style.SUCCESS(f'Found {total_cafes} cafes to process')
        )

        # Process in batches
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
                        # Update stats - this will populate cache fields
                        cafe.update_stats()
                        processed += 1
                    else:
                        # In dry-run, just count
                        processed += 1

                    # Show progress every 10 cafes
                    if processed % 10 == 0:
                        self.stdout.write(
                            self.style.SUCCESS(f'  ✓ Processed {processed}/{total_cafes} cafes')
                        )

                except Exception as e:
                    errors += 1
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ Error processing cafe {cafe.id} ({cafe.name}): {e}')
                    )

        # Final summary
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

        # Show example of what was cached
        if not dry_run and processed > 0:
            sample_cafe = Cafe.objects.filter(
                average_ratings_cache__isnull=False
            ).first()

            if sample_cafe:
                self.stdout.write('\nExample cached data:')
                self.stdout.write(f'  Cafe: {sample_cafe.name}')
                self.stdout.write(f'  Total reviews: {sample_cafe.total_reviews}')
                if sample_cafe.average_ratings_cache:
                    self.stdout.write(f'  Average ratings cached: {sample_cafe.average_ratings_cache}')
                if sample_cafe.facility_stats_cache:
                    self.stdout.write(f'  Facility stats cached: Yes')
