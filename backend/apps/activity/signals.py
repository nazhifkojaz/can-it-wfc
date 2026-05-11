"""
Django signals for auto-creating activities.

These signals automatically create Activity records when
reviews or follows are created/deleted.

Design note: These handlers intentionally swallow exceptions.
Activity records are a non-critical side-effect — a missing activity
in the feed is acceptable; blocking the primary save/delete is not.
Failures are logged at ERROR level with structured context for monitoring.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from apps.reviews.models import Review
from apps.accounts.models import Follow
from core.logging import get_logger
from .services import ActivityService

logger = get_logger(__name__)


def _safe_activity_dispatch(creator_fn, instance, label, extra=None):
    try:
        count = creator_fn(instance)
        logger.info(f"Created {count} {label} activities for {label} {instance.id}")
    except Exception as e:
        log_extra = {f"{label}_id": instance.pk}
        if extra:
            log_extra.update(extra)
        logger.error(
            f"{label.replace('_', ' ').title()} activity creation failed",
            extra=log_extra,
            exc_info=True,
        )


@receiver(post_save, sender=Review)
def create_review_activity(sender, instance, created, **kwargs):
    if created:
        _safe_activity_dispatch(
            ActivityService.create_review_activity,
            instance,
            "review",
            extra={"user_id": instance.user_id},
        )


@receiver(post_save, sender=Follow)
def create_follow_activity(sender, instance, created, **kwargs):
    if created:
        _safe_activity_dispatch(
            ActivityService.create_follow_activity,
            instance,
            "follow",
        )


@receiver(post_delete, sender=Review)
def soft_delete_review_activity(sender, instance, **kwargs):
    count = ActivityService.soft_delete_activities(Review, instance.id)
    logger.info(f"Soft deleted {count} activities for review {instance.id}")


@receiver(post_delete, sender=Follow)
def soft_delete_follow_activity(sender, instance, **kwargs):
    count = ActivityService.soft_delete_activities(Follow, instance.id)
    logger.info(f"Soft deleted {count} activities for follow {instance.id}")
