"""
Management command to backfill historical activities.

Usage:
    python manage.py backfill_activities --days=30 --batch-size=100
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from apps.reviews.models import Visit, Review
from apps.accounts.models import Follow
from apps.activity.services import ActivityService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Backfill historical activities into Activity table'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of days to backfill (default: 30)'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Batch size for processing (default: 100)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be backfilled without actually doing it'
        )

    def handle(self, *args, **options):
        days = options['days']
        batch_size = options['batch_size']
        dry_run = options['dry_run']

        cutoff_date = timezone.now() - timedelta(days=days)

        if dry_run:
            self.stdout.write(self.style.WARNING(f"DRY RUN MODE - No changes will be made"))

        self.stdout.write(f"Backfilling activities from last {days} days...")
        self.stdout.write(f"Cutoff date: {cutoff_date}")
        self.stdout.write(f"Batch size: {batch_size}")
        self.stdout.write("")

        # Backfill visits
        self._backfill_visits(cutoff_date, batch_size, dry_run)

        # Backfill reviews
        self._backfill_reviews(cutoff_date, batch_size, dry_run)

        # Backfill follows
        self._backfill_follows(cutoff_date, batch_size, dry_run)

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY RUN COMPLETE - No changes were made"))
        else:
            self.stdout.write(self.style.SUCCESS("\n✅ Backfill complete!"))

    def _backfill_visits(self, cutoff_date, batch_size, dry_run):
        """
        Backfill visit activities - DEPRECATED (privacy fix).

        Visit activities have been removed from the social feed for privacy/safety.
        This method now skips visit backfilling with a notice.
        """
        visits = Visit.objects.filter(
            created_at__gte=cutoff_date
        ).select_related('user', 'cafe').order_by('created_at')

        total_visits = visits.count()

        self.stdout.write(f"Found {total_visits} visits...")
        self.stdout.write(
            self.style.WARNING(
                "⚠️  Skipping visit activities (deprecated for privacy)\n"
                "   Visits are now private and do not appear in social feeds.\n"
                "   Only reviews and follows are backfilled."
            )
        )
        self.stdout.write("")

    def _backfill_reviews(self, cutoff_date, batch_size, dry_run):
        """Backfill review activities."""
        reviews = Review.objects.filter(
            created_at__gte=cutoff_date
        ).select_related('user', 'cafe').order_by('created_at')

        total_reviews = reviews.count()

        self.stdout.write(f"\nProcessing {total_reviews} reviews...")

        if dry_run:
            self.stdout.write(self.style.WARNING(f"  Would process {total_reviews} reviews"))
            return

        processed = 0
        failed = 0

        for i in range(0, total_reviews, batch_size):
            batch = reviews[i:i + batch_size]

            for review in batch:
                try:
                    with transaction.atomic():
                        count = ActivityService.create_review_activity(review)
                        processed += 1
                        if processed % 50 == 0:
                            self.stdout.write(f"  Processed {processed}/{total_reviews} reviews...")
                except Exception as e:
                    failed += 1
                    logger.error(f"Failed to backfill review {review.id}: {e}")
                    self.stdout.write(
                        self.style.ERROR(f"  Failed to backfill review {review.id}: {e}")
                    )

        self.stdout.write(
            self.style.SUCCESS(f"✅ Reviews: {processed} processed, {failed} failed")
        )

    def _backfill_follows(self, cutoff_date, batch_size, dry_run):
        """Backfill follow activities."""
        follows = Follow.objects.filter(
            created_at__gte=cutoff_date
        ).select_related('follower', 'followed').order_by('created_at')

        total_follows = follows.count()

        self.stdout.write(f"\nProcessing {total_follows} follows...")

        if dry_run:
            self.stdout.write(self.style.WARNING(f"  Would process {total_follows} follows"))
            return

        processed = 0
        failed = 0

        for i in range(0, total_follows, batch_size):
            batch = follows[i:i + batch_size]

            for follow in batch:
                try:
                    with transaction.atomic():
                        count = ActivityService.create_follow_activity(follow)
                        processed += 1
                        if processed % 50 == 0:
                            self.stdout.write(f"  Processed {processed}/{total_follows} follows...")
                except Exception as e:
                    failed += 1
                    logger.error(f"Failed to backfill follow {follow.id}: {e}")
                    self.stdout.write(
                        self.style.ERROR(f"  Failed to backfill follow {follow.id}: {e}")
                    )

        self.stdout.write(
            self.style.SUCCESS(f"✅ Follows: {processed} processed, {failed} failed")
        )
