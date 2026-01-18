"""
Signal handlers for Review and Visit models.
Handles stats updates when visits/reviews are deleted.
"""
import logging
from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import Visit, Review

logger = logging.getLogger(__name__)


@receiver(post_delete, sender=Visit)
@transaction.atomic
def update_stats_after_visit_deletion(sender, instance, **kwargs):
    """
    Update cafe and user stats after a visit is deleted.
    This fires after the visit (and its cascaded review if any) is deleted.
    Uses @transaction.atomic to ensure both cafe and user stats are updated together.
    """
    try:
        # Update cafe stats (total_visits, unique_visitors, total_reviews, average_wfc_rating)
        instance.cafe.update_stats()

        # Update user stats (total_visits, total_reviews)
        instance.user.update_stats()
    except Exception as e:
        # Log error but don't raise to avoid blocking deletion
        logger.error(f"Error updating stats after visit deletion: {e}", exc_info=True)


@receiver(post_delete, sender=Review)
@transaction.atomic
def update_stats_after_review_deletion(sender, instance, **kwargs):
    """
    Update cafe and user stats after a review is deleted independently.
    This only fires when a review is deleted WITHOUT deleting the visit.
    Uses @transaction.atomic to ensure both cafe and user stats are updated together.
    """
    try:
        # Get the visit (if it still exists)
        # The visit might be deleted too (cascade), in which case this won't run
        if instance.visit_id:
            visit = instance.visit

            # Update cafe stats (total_reviews, average_wfc_rating)
            visit.cafe.update_stats()

            # Update user stats (total_reviews)
            visit.user.update_stats()
    except Exception as e:
        # Log error but don't raise to avoid blocking deletion
        logger.error(f"Error updating stats after review deletion: {e}", exc_info=True)
