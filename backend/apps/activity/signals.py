"""
Django signals for auto-creating activities.

These signals automatically create Activity records when
reviews or follows are created/deleted.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from apps.reviews.models import Review
from apps.accounts.models import Follow
from core.logging import get_logger
from .services import ActivityService

logger = get_logger(__name__)


@receiver(post_save, sender=Review)
def create_review_activity(sender, instance, created, **kwargs):
    """
    Auto-create activity when review is created.

    Signal fires after Review.save()
    Creates activity for user and all their followers.
    """
    if created:  # Only on create, not update
        try:
            count = ActivityService.create_review_activity(instance)
            logger.info(f"Created {count} review activities for review {instance.id}")
        except Exception as e:
            logger.error(f"Failed to create review activity for review {instance.id}: {e}", exc_info=True)


@receiver(post_save, sender=Follow)
def create_follow_activity(sender, instance, created, **kwargs):
    """
    Auto-create activity when follow happens.

    Signal fires after Follow.save()
    Creates:
    - Notification for person being followed
    - Feed items for follower's followers
    """
    if created:  # Only on create, not update
        try:
            count = ActivityService.create_follow_activity(instance)
            logger.info(f"Created {count} follow activities for follow {instance.id}")
        except Exception as e:
            logger.error(f"Failed to create follow activity for follow {instance.id}: {e}", exc_info=True)


@receiver(post_delete, sender=Review)
def soft_delete_review_activity(sender, instance, **kwargs):
    """
    Soft delete activities when review is deleted.
    """
    try:
        count = ActivityService.soft_delete_activities(Review, instance.id)
        logger.info(f"Soft deleted {count} activities for review {instance.id}")
    except Exception as e:
        logger.error(f"Failed to soft delete review activities for review {instance.id}: {e}", exc_info=True)


@receiver(post_delete, sender=Follow)
def soft_delete_follow_activity(sender, instance, **kwargs):
    """
    Soft delete activities when follow is removed.
    """
    try:
        count = ActivityService.soft_delete_activities(Follow, instance.id)
        logger.info(f"Soft deleted {count} activities for follow {instance.id}")
    except Exception as e:
        logger.error(f"Failed to soft delete follow activities for follow {instance.id}: {e}", exc_info=True)
