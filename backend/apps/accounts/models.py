from django.contrib.auth.models import AbstractUser
from django.db import models, transaction
from django.utils import timezone


class User(AbstractUser):
    """
    Custom user model.
    Adds support for anonymous username display and tracking.
    """
    # Additional fields beyond Django's default User
    is_anonymous_display = models.BooleanField(
        default=False,
        help_text="If True, username will be displayed as masked (e.g., 'joh***')"
    )
    
    date_joined = models.DateTimeField(default=timezone.now)
    
    # Profile information
    bio = models.TextField(blank=True, max_length=500)
    avatar_url = models.URLField(blank=True, null=True)
    
    # Statistics (denormalized for performance)
    total_reviews = models.IntegerField(default=0)
    total_visits = models.IntegerField(default=0)
    followers_count = models.IntegerField(default=0)
    following_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['email'], name='user_email_idx'),
        ]
    
    def __str__(self):
        return self.username
    
    @property
    def display_name(self):
        """
        Returns the display name for the user.
        If anonymous display is enabled, masks the username.
        """
        if self.is_anonymous_display and len(self.username) > 3:
            # Mask username: show first 3 chars + asterisks
            return f"{self.username[:3]}{'*' * (len(self.username) - 3)}"
        return self.username
    
    @property
    def account_age_hours(self):
        """Returns account age in hours for anti-spam checks."""
        return (timezone.now() - self.date_joined).total_seconds() / 3600
    
    def can_review(self):
        """
        Check if user can create reviews based on account age.
        Prevents spam from newly created accounts.
        """
        from django.conf import settings
        min_age = getattr(settings, 'MIN_ACCOUNT_AGE_HOURS', 0) # will adjust later
        return self.account_age_hours >= min_age
    
    @transaction.atomic
    def update_stats(self):
        """
        Update denormalized statistics.
        Uses @transaction.atomic to ensure all-or-nothing updates.
        """
        from apps.reviews.models import Review, Visit

        self.total_reviews = Review.objects.filter(user=self).count()
        self.total_visits = Visit.objects.filter(user=self).count()
        self.save(update_fields=['total_reviews', 'total_visits'])

    @transaction.atomic
    def update_follow_counts(self):
        """
        Update cached follower/following counts.
        Uses @transaction.atomic to ensure all-or-nothing updates.
        """
        self.followers_count = self.followers.count()
        self.following_count = self.following.count()
        self.save(update_fields=['followers_count', 'following_count'])


class UserSettings(models.Model):
    """
    User profile privacy and display settings.
    """
    VISIBILITY_CHOICES = [
        ('public', 'Public - Anyone can view'),
        ('private', 'Private - Only me'),
    ]

    ACTIVITY_VISIBILITY_CHOICES = [
        ('public', 'Public - Everyone'),
        ('followers', 'Followers Only'),
        ('private', 'Private - Only Me'),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='settings',
        primary_key=True
    )

    profile_visibility = models.CharField(
        max_length=20,
        choices=VISIBILITY_CHOICES,
        default='public',
        help_text="Who can view your profile"
    )

    show_activity_dates = models.BooleanField(
        default=True,
        help_text="Show dates on your activity (reviews and visits)"
    )

    show_followers = models.BooleanField(
        default=True,
        help_text="Show who follows you"
    )

    show_following = models.BooleanField(
        default=True,
        help_text="Show who you follow"
    )

    activity_visibility = models.CharField(
        max_length=20,
        choices=ACTIVITY_VISIBILITY_CHOICES,
        default='public',
        help_text="Who can see your activity in their feed"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_settings'
        verbose_name = 'User Settings'
        verbose_name_plural = 'User Settings'

    def __str__(self):
        return f"{self.user.username}'s settings"


class Follow(models.Model):
    """
    User follow relationships.
    """
    follower = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='following',
        help_text="User who is following"
    )
    followed = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='followers',
        help_text="User being followed"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'follows'
        verbose_name = 'Follow'
        verbose_name_plural = 'Follows'
        unique_together = ('follower', 'followed')
        indexes = [
            models.Index(fields=['follower', '-created_at']),
            models.Index(fields=['followed', '-created_at']),
        ]

    def __str__(self):
        return f"{self.follower.username} follows {self.followed.username}"

    def save(self, *args, **kwargs):
        # Prevent self-following
        if self.follower == self.followed:
            raise ValueError("Users cannot follow themselves")
        super().save(*args, **kwargs)
        # Update follow counts
        self.follower.update_follow_counts()
        self.followed.update_follow_counts()

    def delete(self, *args, **kwargs):
        follower = self.follower
        followed = self.followed
        super().delete(*args, **kwargs)
        # Update follow counts after deletion
        follower.update_follow_counts()
        followed.update_follow_counts()


# Django Signals for auto-creating UserSettings
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=User)
def create_user_settings(sender, instance, created, **kwargs):
    """
    Automatically create UserSettings when a new User is created.
    This eliminates the need for get_or_create() calls throughout the codebase.
    """
    if created:
        UserSettings.objects.create(user=instance)


@receiver(post_save, sender=User)
def ensure_user_settings(sender, instance, **kwargs):
    """
    Ensure UserSettings exists for all users (handles edge cases).
    If settings don't exist for some reason, create them.
    """
    if not hasattr(instance, 'settings'):
        UserSettings.objects.get_or_create(user=instance)