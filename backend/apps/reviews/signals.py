"""
Signal handlers for Review and Visit models.
Handles stats updates when visits/reviews are deleted.

Design note: These handlers intentionally swallow exceptions to avoid
rolling back the primary delete operation. Stale denormalized stats are
acceptable; a failed delete is not. Stats self-correct on the next
review/visit write or any subsequent update_stats() call.
"""
from django.db.models.signals import post_delete
from django.dispatch import receiver
from core.logging import get_logger
from .models import Visit, Review

logger = get_logger(__name__)


@receiver(post_delete, sender=Visit)
def update_stats_after_visit_deletion(sender, instance, **kwargs):
    """
    Update cafe and user stats after a visit is deleted.

    Visits and reviews are independent (decoupled in migration 0008). Deleting a
    visit recalculates cafe/user denormalized stats but does not affect reviews.

    No @transaction.atomic here — the underlying update_cafe_stats/update_user_stats
    in stats_utils.py already wrap themselves in their own transactions.
    """
    try:
        instance.cafe.update_stats()
        instance.user.update_stats()
    except Exception as e:
        logger.error(
            "Stats update failed after visit deletion — stats may be stale",
            extra={
                "visit_id": instance.pk,
                "cafe_id": instance.cafe_id,
                "user_id": instance.user_id,
            },
            exc_info=True,
        )


@receiver(post_delete, sender=Review)
def update_stats_after_review_deletion(sender, instance, **kwargs):
    """
    Update cafe and user stats after a review is deleted.

    After the Review model refactor, Review has direct foreign keys to cafe and user
    (no longer depends on visit). This handler updates denormalized stats on both
    cafe and user when a review is deleted.
    """
    try:
        instance.cafe.update_stats()
        instance.user.update_stats()
    except Exception as e:
        logger.error(
            "Stats update failed after review deletion — stats may be stale",
            extra={
                "review_id": instance.pk,
                "cafe_id": instance.cafe_id,
                "user_id": instance.user_id,
            },
            exc_info=True,
        )
