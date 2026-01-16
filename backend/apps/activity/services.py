"""
Activity service layer.

Handles activity creation and distribution (fan-out).
"""
from typing import List, Type, TYPE_CHECKING
from django.db import transaction
from django.db.models import Model, QuerySet
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from .models import Activity, ActivityType

if TYPE_CHECKING:
    from apps.reviews.models import Visit, Review
    from apps.accounts.models import Follow

User = get_user_model()


class ActivityService:
    """
    Activity creation and distribution service.

    PRIVACY NOTE:
    Visit activities have been removed from the social feed for privacy/safety.
    Only the following activities appear in feeds:
    - Reviews (intentionally public)
    - Follow actions (social connections)

    Visits are tracked privately for the user's own records.

    Fan-out Strategy:
    - Users with <1000 followers: Synchronous fan-out (immediate)
    - Users with 1000+ followers: Could add async (Celery) in future

    Current implementation: All synchronous for simplicity.
    """

    # Future: Add thresholds for async fan-out
    SYNC_FANOUT_THRESHOLD = 1000

    @classmethod
    @transaction.atomic
    def create_visit_activity(cls, visit: 'Visit') -> int:
        """
        DEPRECATED: Visit activities removed from social feed for privacy.

        This method is kept for backward compatibility but is no longer called
        by signals. Visits can enable location tracking and stalking, so they
        are now private. Only reviews (intentionally public) appear in followers' feeds.

        If you want to re-enable visit activities in the future (with opt-in),
        uncomment the signal handler in apps/activity/signals.py.

        Args:
            visit: Visit object

        Returns:
            int: Number of activity records created (0 if disabled)
        """
        user = visit.user

        # Prepare denormalized data
        # Store everything needed to display the activity
        activity_data = {
            'cafe_id': visit.cafe.id,
            'cafe_name': visit.cafe.name,
            'cafe_google_place_id': visit.cafe.google_place_id or '',
            'visit_time': visit.visit_time,
            'amount_spent': str(visit.amount_spent) if visit.amount_spent else None,
            'currency': visit.currency,
            'actor_username': user.username,
            'actor_display_name': user.display_name,
            'actor_avatar_url': user.avatar_url or '',
        }

        activities_to_create = []

        # 1. Activity for user's own feed (own_visit type)
        activities_to_create.append(Activity(
            recipient=user,
            actor=user,
            activity_type=ActivityType.VISIT,
            target_content_type=ContentType.objects.get_for_model(visit),
            target_object_id=visit.id,
            data=activity_data
        ))

        # 2. Fan-out to followers (following_visit type)
        followers = cls._get_visible_followers(user)

        for follower in followers:
            activities_to_create.append(Activity(
                recipient=follower,
                actor=user,
                activity_type=ActivityType.VISIT,
                target_content_type=ContentType.objects.get_for_model(visit),
                target_object_id=visit.id,
                data=activity_data
            ))

        # Bulk create for performance (1 INSERT instead of N)
        Activity.objects.bulk_create(activities_to_create)

        return len(activities_to_create)

    @classmethod
    @transaction.atomic
    def create_review_activity(cls, review: 'Review') -> int:
        """
        Create activity when user reviews a cafe.

        Similar to create_visit_activity but for reviews.

        Args:
            review: Review object

        Returns:
            int: Number of activity records created
        """
        user = review.user

        activity_data = {
            'cafe_id': review.cafe.id,
            'cafe_name': review.cafe.name,
            'cafe_google_place_id': review.cafe.google_place_id or '',
            'wfc_rating': float(review.wfc_rating) if review.wfc_rating else None,
            'comment': review.comment or '',
            'actor_username': user.username,
            'actor_display_name': user.display_name,
            'actor_avatar_url': user.avatar_url or '',
        }

        activities_to_create = []

        # Own feed
        activities_to_create.append(Activity(
            recipient=user,
            actor=user,
            activity_type=ActivityType.REVIEW,
            target_content_type=ContentType.objects.get_for_model(review),
            target_object_id=review.id,
            data=activity_data
        ))

        # Followers' feeds
        followers = cls._get_visible_followers(user)

        for follower in followers:
            activities_to_create.append(Activity(
                recipient=follower,
                actor=user,
                activity_type=ActivityType.REVIEW,
                target_content_type=ContentType.objects.get_for_model(review),
                target_object_id=review.id,
                data=activity_data
            ))

        Activity.objects.bulk_create(activities_to_create)

        return len(activities_to_create)

    @classmethod
    @transaction.atomic
    def create_follow_activity(cls, follow: 'Follow') -> int:
        """
        Create activity when user follows someone.

        Creates:
        1. Notification for person being followed (new_follower)
           "Alice followed you"
        2. Feed item for follower's followers (following_followed)
           "Alice followed Bob"

        Args:
            follow: Follow object

        Returns:
            int: Number of activity records created
        """
        follower = follow.follower
        followed = follow.followed

        activities_to_create = []

        # 1. Notification: "Alice followed you"
        # Shown to the person being followed
        activities_to_create.append(Activity(
            recipient=followed,
            actor=follower,
            activity_type=ActivityType.FOLLOW,
            target_content_type=ContentType.objects.get_for_model(follow),
            target_object_id=follow.id,
            data={
                'actor_username': follower.username,
                'actor_display_name': follower.display_name,
                'actor_avatar_url': follower.avatar_url or '',
                'target_username': followed.username,
                'target_display_name': followed.display_name,
                'target_avatar_url': followed.avatar_url or '',
            }
        ))

        # 2. Feed: "Alice followed Bob"
        # Shown to Alice's followers
        follower_followers = cls._get_all_followers(follower)

        for follower_follower in follower_followers:
            activities_to_create.append(Activity(
                recipient=follower_follower,
                actor=follower,
                activity_type=ActivityType.FOLLOW,
                target_content_type=ContentType.objects.get_for_model(follow),
                target_object_id=follow.id,
                data={
                    'actor_username': follower.username,
                    'actor_display_name': follower.display_name,
                    'actor_avatar_url': follower.avatar_url or '',
                    'target_username': followed.username,
                    'target_display_name': followed.display_name,
                    'target_avatar_url': followed.avatar_url or '',
                }
            ))

        Activity.objects.bulk_create(activities_to_create)

        return len(activities_to_create)

    @classmethod
    def _get_visible_followers(cls, user) -> List[User]:
        """
        Get followers who can see this user's activity.
        Respects privacy settings.

        Args:
            user: User whose followers to get

        Returns:
            List of User objects who can see the activity
        """
        from apps.accounts.models import Follow
        from apps.accounts.utils import can_view_user_activity

        # Get all follower IDs
        follower_ids = Follow.objects.filter(
            followed=user
        ).values_list('follower_id', flat=True)

        followers = User.objects.filter(id__in=follower_ids)

        # Filter by privacy settings
        visible_followers = []
        for follower in followers:
            if can_view_user_activity(follower, user):
                visible_followers.append(follower)

        return visible_followers

    @classmethod
    def _get_all_followers(cls, user) -> List[User]:
        """
        Get all followers (no privacy check).
        Used for follow activities which are always public.

        Args:
            user: User whose followers to get

        Returns:
            List of User objects
        """
        from apps.accounts.models import Follow

        follower_ids = Follow.objects.filter(
            followed=user
        ).values_list('follower_id', flat=True)

        return list(User.objects.filter(id__in=follower_ids))

    @classmethod
    def get_user_feed(cls, user: User, limit: int = 50, offset: int = 0) -> QuerySet[Activity]:
        """
        Get user's activity feed.

        This is the NEW implementation - single query!
        Replaces the old 7-query approach.

        Args:
            user: User whose feed to get
            limit: Max number of activities to return
            offset: Offset for pagination

        Returns:
            QuerySet of Activity objects
        """
        activities = Activity.objects.filter(
            recipient=user,
            is_deleted=False
        ).select_related('actor').order_by('-created_at')[offset:offset + limit]

        return activities

    @classmethod
    def soft_delete_activities(cls, target_model: Type[Model], target_id: int) -> int:
        """
        Soft delete activities when source object is deleted.

        When a Visit/Review is deleted, mark all related activities
        as deleted instead of actually deleting them.

        Args:
            target_model: Model class (Visit, Review, Follow)
            target_id: ID of the deleted object

        Returns:
            int: Number of activities soft-deleted
        """
        content_type = ContentType.objects.get_for_model(target_model)

        updated_count = Activity.objects.filter(
            target_content_type=content_type,
            target_object_id=target_id
        ).update(is_deleted=True)

        return updated_count
