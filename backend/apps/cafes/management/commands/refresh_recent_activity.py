"""
Management command to refresh recent_activity in insights_cache for all cafes.
Run nightly via cron or Celery beat to decay visits_last_30d counts.

Usage:
    python manage.py refresh_recent_activity
    python manage.py refresh_recent_activity --batch-size 200
"""

from django.core.management.base import BaseCommand
from apps.cafes.models import Cafe
from apps.core.stats_utils import refresh_cafe_insights


class Command(BaseCommand):
    help = 'Refresh recent_activity in insights_cache for all cafes (nightly cron)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--batch-size',
            type=int,
            default=200,
            help='Number of cafes to process in each batch (default: 200)'
        )

    def handle(self, *args, **options):
        batch_size = options['batch_size']

        all_cafes = Cafe.objects.filter(
            insights_cache__isnull=False
        )
        total_cafes = all_cafes.count()

        if total_cafes == 0:
            self.stdout.write(self.style.WARNING('No cafes with insights cache found'))
            return

        self.stdout.write(
            self.style.SUCCESS(f'Found {total_cafes} cafes to refresh')
        )

        processed = 0
        errors = 0

        for i in range(0, total_cafes, batch_size):
            batch = all_cafes[i:i + batch_size]

            for cafe in batch:
                try:
                    refresh_cafe_insights(cafe)
                    processed += 1
                except Exception as e:
                    errors += 1
                    self.stdout.write(
                        self.style.ERROR(f'  Error refreshing cafe {cafe.id}: {e}')
                    )

            self.stdout.write(
                f'Processed {min(i + batch_size, total_cafes)}/{total_cafes}...'
            )

        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS(f'Refreshed: {processed} cafes'))

        if errors > 0:
            self.stdout.write(self.style.ERROR(f'Errors: {errors}'))
        self.stdout.write('=' * 60)
