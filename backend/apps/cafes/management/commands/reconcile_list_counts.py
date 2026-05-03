"""
Safety-net command to fix item_count drift on CafeList rows.

Run this if you suspect the denormalized count has diverged from reality
(e.g. after a bulk import, manual DB edit, or missed signal).

Usage:
    python manage.py reconcile_list_counts
    python manage.py reconcile_list_counts --dry-run
"""

from django.core.management.base import BaseCommand
from django.db.models import Count

from apps.cafes.models import CafeList


class Command(BaseCommand):
    help = 'Reconcile denormalized item_count on all CafeList rows'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report discrepancies without writing changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN — no changes will be written'))

        lists = CafeList.objects.annotate(real_count=Count('items'))
        drifted = [lst for lst in lists if lst.item_count != lst.real_count]

        if not drifted:
            self.stdout.write(self.style.SUCCESS('All item_count values are correct.'))
            return

        self.stdout.write(f'Found {len(drifted)} list(s) with incorrect item_count:')

        for lst in drifted:
            self.stdout.write(
                f'  List {lst.id} "{lst.name}" (owner={lst.owner_id}): '
                f'stored={lst.item_count}, real={lst.real_count}'
            )
            if not dry_run:
                CafeList.objects.filter(pk=lst.pk).update(item_count=lst.real_count)

        if not dry_run:
            self.stdout.write(self.style.SUCCESS(f'Fixed {len(drifted)} list(s).'))
        else:
            self.stdout.write(self.style.WARNING(f'Would fix {len(drifted)} list(s). Re-run without --dry-run to apply.'))
