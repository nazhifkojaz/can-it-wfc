"""
Management command to backfill PostGIS location field from latitude/longitude.
Run this after adding the location field to populate existing cafes.
"""
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from apps.cafes.models import Cafe


class Command(BaseCommand):
    help = 'Backfill PostGIS location field from existing latitude/longitude data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without actually updating',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        # Get all cafes that need location populated
        cafes_without_location = Cafe.objects.filter(location__isnull=True)
        total_count = cafes_without_location.count()

        if total_count == 0:
            self.stdout.write(self.style.SUCCESS('All cafes already have location data!'))
            return

        self.stdout.write(f'Found {total_count} cafes without location data')

        # Backfill locations
        updated_count = 0
        error_count = 0

        for cafe in cafes_without_location:
            try:
                if cafe.latitude is not None and cafe.longitude is not None:
                    if not dry_run:
                        cafe.location = Point(
                            float(cafe.longitude),
                            float(cafe.latitude),
                            srid=4326
                        )
                        cafe.save(update_fields=['location'])

                    updated_count += 1

                    if updated_count % 100 == 0:
                        self.stdout.write(f'Processed {updated_count}/{total_count} cafes...')
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Skipping {cafe.name} (ID: {cafe.id}) - missing lat/lon'
                        )
                    )
                    error_count += 1

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Error processing {cafe.name} (ID: {cafe.id}): {str(e)}'
                    )
                )
                error_count += 1

        # Summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=' * 60))
        if dry_run:
            self.stdout.write(self.style.WARNING(f'DRY RUN: Would update {updated_count} cafes'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Successfully updated {updated_count} cafes'))

        if error_count > 0:
            self.stdout.write(self.style.WARNING(f'Skipped {error_count} cafes due to errors'))

        self.stdout.write(self.style.SUCCESS('=' * 60))
