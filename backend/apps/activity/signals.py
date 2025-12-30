"""
Django signals for auto-creating activities.

These signals automatically create Activity records when
reviews or follows are created/deleted.

PRIVACY NOTE:
Visit activities have been removed from the social feed to protect user privacy.
Visit logging can enable location tracking and stalking. Only intentionally
public activities (reviews, follows) appear in the social feed.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from apps.reviews.models import Visit, Review
from apps.accounts.models import Follow
from .services import ActivityService
import logging

logger = logging.getLogger(__name__)


# PRIVACY FIX: Visit activities removed from social feed
# Visits can enable location tracking/stalking - they are now private
# Only reviews (intentionally public) appear in followers' feeds
#
# @receiver(post_save, sender=Visit)
# def create_visit_activity(sender, instance, created, **kwargs):
#     """
#     Auto-create activity when visit is created.
#
#     Signal fires after Visit.save()
#     Creates activity for user and all their followers.
#     """
#     if created:  # Only on create, not update
#         try:
#             count = ActivityService.create_visit_activity(instance)
#             logger.info(f"Created {count} visit activities for visit {instance.id}")
#         except Exception as e:
#             # Log error but don't crash the visit creation
#             logger.error(f"Failed to create visit activity for visit {instance.id}: {e}", exc_info=True)


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


# PRIVACY FIX: Visit activities removed from social feed
# No longer creating visit activities, so no need to soft-delete them
#
# @receiver(post_delete, sender=Visit)
# def soft_delete_visit_activity(sender, instance, **kwargs):
#     """
#     Soft delete activities when visit is deleted.
#
#     Instead of deleting Activity records, mark them as deleted.
#     Preserves referential integrity.
#     """
#     try:
#         count = ActivityService.soft_delete_activities(Visit, instance.id)
#         logger.info(f"Soft deleted {count} activities for visit {instance.id}")
#     except Exception as e:
#         logger.error(f"Failed to soft delete visit activities for visit {instance.id}: {e}", exc_info=True)


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
