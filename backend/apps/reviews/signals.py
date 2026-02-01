"""
Signal handlers for Review and Visit models.
Handles stats updates when visits/reviews are deleted.
"""
from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver
from core.logging import get_logger
from .models import Visit, Review

logger = get_logger(__name__)


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
    Update cafe and user stats after a review is deleted.

    After the Review model refactor, Review has direct foreign keys to cafe and user
    (no longer depends on visit). This handler updates denormalized stats on both
    cafe and user when a review is deleted.

    Uses @transaction.atomic to ensure both cafe and user stats are updated together.
    """
    try:
        # Update cafe stats (total_reviews, average_wfc_rating)
        instance.cafe.update_stats()

        # Update user stats (total_reviews)
        instance.user.update_stats()
    except Exception as e:
        # Log error but don't raise to avoid blocking deletion
        logger.error(f"Error updating stats after review deletion: {e}", exc_info=True)
