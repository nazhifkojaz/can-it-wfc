"""
Activity stream models.

This module implements a fan-out on write activity stream pattern,
similar to Twitter, Instagram, and LinkedIn.

PRIVACY NOTE:
Visit activities have been removed from the social feed for privacy/safety.
Only reviews and follows appear in the social feed.
"""
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model

User = get_user_model()


class ActivityType(models.TextChoices):
    """
    Activity types enum.

    PRIVACY NOTE: VISIT type deprecated - visits are now private.
    """
    VISIT = 'visit', 'Visit (DEPRECATED - privacy fix)'
    REVIEW = 'review', 'Review'
    FOLLOW = 'follow', 'Follow'


class Activity(models.Model):
    """
    Unified activity stream table.

    Fan-out on write approach:
    - When user creates a review, create activity records for:
      1. User themselves (own feed)
      2. All their followers (followers' feeds)

    This trades write complexity for blazing fast reads:
    - Write: O(N) where N = number of followers
    - Read: O(1) - single indexed query

    Performance: 10-50x faster than aggregating from multiple tables.

    PRIVACY NOTE:
    Visit activities are no longer created (privacy fix).
    Only reviews and follows appear in social feeds.
    """

    # === WHO SEES THIS ===
    # Most important field - heavily indexed!
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='activity_feed',
        db_index=True,
        help_text="User who sees this activity in their feed"
    )

    # === WHO DID IT ===
    actor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='activities_done',
        help_text="User who performed the action"
    )

    # === WHAT HAPPENED ===
    activity_type = models.CharField(
        max_length=20,
        choices=ActivityType.choices,
        db_index=True,
        help_text="Type of activity"
    )

    # === WHAT IT'S ABOUT (Polymorphic) ===
    # Points to Visit, Review, or Follow object
    target_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Type of target object (Visit, Review, Follow)"
    )
    target_object_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="ID of target object"
    )
    target = GenericForeignKey('target_content_type', 'target_object_id')

    # === DENORMALIZED DATA ===
    # Store everything needed to display the activity
    # Avoids expensive joins when rendering feed
    data = models.JSONField(
        default=dict,
        help_text="Denormalized data: cafe_name, rating, comment, actor info, etc."
    )
    # Example structure:
    # {
    #   "cafe_id": 123,
    #   "cafe_name": "Coffee Lab",
    #   "cafe_google_place_id": "ChIJ...",
    #   "wfc_rating": 4.5,
    #   "comment": "Great wifi!",
    #   "actor_username": "alice",
    #   "actor_display_name": "Alice",
    #   "actor_avatar_url": "https://...",
    #   "visit_time": 1,
    #   "amount_spent": "50.00",
    #   "currency": "USD"
    # }

    # === METADATA ===
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When the activity occurred"
    )

    # Soft delete instead of hard delete
    # Preserves referential integrity
    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Soft delete flag"
    )

    class Meta:
        db_table = 'activities'
        verbose_name = 'Activity'
        verbose_name_plural = 'Activities'
        ordering = ['-created_at']

        # === CRITICAL INDEXES ===
        # These make queries fast even with millions of records
        indexes = [
            # Primary feed query: Get user's feed ordered by date
            # This is THE MOST IMPORTANT index
            models.Index(
                fields=['recipient', '-created_at'],
                name='feed_query_idx'
            ),
            # Filter by activity type
            models.Index(
                fields=['recipient', 'activity_type', '-created_at'],
                name='feed_type_idx'
            ),
            # Cleanup deleted activities
            models.Index(
                fields=['is_deleted', 'created_at'],
                name='cleanup_idx'
            ),
        ]

    def __str__(self):
        return f"{self.actor.username} -> {self.activity_type} (seen by {self.recipient.username})"

    @property
    def target_object(self):
        """Get the target object (Visit, Review, or Follow)."""
        return self.target
