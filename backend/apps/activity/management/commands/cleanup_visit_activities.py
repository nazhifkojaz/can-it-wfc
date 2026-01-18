"""
Management command to soft-delete all visit activities.

Usage:
    python manage.py cleanup_visit_activities --dry-run
    python manage.py cleanup_visit_activities
    python manage.py cleanup_visit_activities --hard-delete
"""

from django.core.management.base import BaseCommand
from apps.activity.models import Activity, ActivityType


class Command(BaseCommand):
    help = 'Soft delete all visit activities for privacy (visits are now private)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )
        parser.add_argument(
            '--hard-delete',
            action='store_true',
            help='Permanently delete instead of soft delete (WARNING: cannot be undone)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        hard_delete = options['hard_delete']

        # Find all visit activities that aren't already deleted
        visit_activities = Activity.objects.filter(
            activity_type=ActivityType.VISIT,
            is_deleted=False
        )

        count = visit_activities.count()

        if dry_run:
            self.stdout.write(
                self.style.WARNING('🔍 DRY RUN MODE - No changes will be made')
            )
            self.stdout.write('')
            self.stdout.write(f'Would affect {count} visit activities:')

            # Show sample activities
            sample_activities = visit_activities[:5]
            for activity in sample_activities:
                self.stdout.write(
                    f'  - Activity #{activity.id}: '
                    f'{activity.actor.username} visited {activity.data.get("cafe_name", "unknown")}'
                )

            if count > 5:
                self.stdout.write(f'  ... and {count - 5} more')

            self.stdout.write('')
            self.stdout.write(
                self.style.SUCCESS(
                    f'Run without --dry-run to {"permanently delete" if hard_delete else "soft delete"} these activities'
                )
            )
            return

        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('✅ No visit activities to clean up')
            )
            return

        # Show what we're about to do
        self.stdout.write('')
        self.stdout.write(
            self.style.WARNING(
                f'⚠️  This will {"PERMANENTLY DELETE" if hard_delete else "soft delete"} '
                f'{count} visit activities'
            )
        )
        self.stdout.write('')

        if hard_delete:
            self.stdout.write(
                self.style.ERROR(
                    '🚨 WARNING: Hard delete cannot be undone!'
                )
            )
            self.stdout.write('')

        # Confirm
        confirm = input('Are you sure you want to continue? (yes/no): ')
        if confirm.lower() != 'yes':
            self.stdout.write(
                self.style.WARNING('❌ Cancelled by user')
            )
            return

        self.stdout.write('')
        self.stdout.write('Processing...')

        if hard_delete:
            # Hard delete (permanent)
            deleted_count, _ = visit_activities.delete()
            self.stdout.write('')
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Permanently deleted {deleted_count} visit activities'
                )
            )
        else:
            # Soft delete (reversible)
            updated = visit_activities.update(is_deleted=True)
            self.stdout.write('')
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Soft deleted {updated} visit activities'
                )
            )
            self.stdout.write('')
            self.stdout.write(
                self.style.WARNING(
                    'Note: Activities are marked as deleted but still in database.'
                )
            )
            self.stdout.write(
                'To restore them (if needed):'
            )
            self.stdout.write(
                '  Activity.objects.filter(activity_type="visit", is_deleted=True).update(is_deleted=False)'
            )

        self.stdout.write('')
        self.stdout.write(
            self.style.SUCCESS('✅ Privacy fix complete!')
        )
        self.stdout.write('')
        self.stdout.write('Visit activities are now private - only reviews and follows appear in feeds.')
