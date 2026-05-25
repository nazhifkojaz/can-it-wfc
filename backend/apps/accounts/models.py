from django.contrib.auth.models import AbstractUser
from django.db import models, transaction
from django.utils import timezone


class User(AbstractUser):
    """
    Custom user model.
    Adds support for anonymous username display and tracking.
    """
    # Username change cooldown configuration
    USERNAME_CHANGE_COOLDOWN_DAYS = 30

    # Additional fields beyond Django's default User

    date_joined = models.DateTimeField(default=timezone.now)

    # Customizable display name (shown in UI instead of username)
    display_name = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Custom display name. If not set, username is used."
    )

    # Track last username change for cooldown enforcement
    username_changed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of last username change, for cooldown tracking"
    )

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

    def get_follower_ids(self):
        return list(Follow.objects.filter(followed=self, status='active').values_list('follower_id', flat=True))

    def get_following_ids(self):
        return list(Follow.objects.filter(follower=self, status='active').values_list('followed_id', flat=True))

    @property
    def effective_display_name(self):
        """
        Returns the display name to show in UI.

        When profile_visibility is 'private', the name is masked.
        Priority:
        1. Custom display_name field (if set)
        2. Masked display_name if profile is private
        3. Username as fallback
        """
        is_private = getattr(getattr(self, 'settings', None), 'profile_visibility', None) == 'private'
        if self.display_name:
            if is_private and len(self.display_name) > 3:
                return f"{self.display_name[:3]}{'*' * (len(self.display_name) - 3)}"
            return self.display_name
        if is_private and len(self.username) > 3:
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
    
    def update_stats(self):
        from apps.core.stats_utils import update_user_stats
        update_user_stats(self)

    @transaction.atomic
    def update_follow_counts(self):
        """
        Update cached follower/following counts.
        Uses @transaction.atomic to ensure all-or-nothing updates.
        Only counts active (approved) follows.
        """
        self.followers_count = self.followers.filter(status='active').count()
        self.following_count = self.following.filter(status='active').count()
        self.save(update_fields=['followers_count', 'following_count'])


class UserSettings(models.Model):
    """
    User profile privacy and display settings.
    """
    VISIBILITY_CHOICES = [
        ('public', 'Public - Anyone can view'),
        ('private', 'Private - Only me'),
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

    show_followers = models.BooleanField(
        default=True,
        help_text="Show who follows you"
    )

    show_following = models.BooleanField(
        default=True,
        help_text="Show who you follow"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_settings'
        verbose_name = 'User Settings'
        verbose_name_plural = 'User Settings'

    def __str__(self):
        return f"{self.user.username}'s settings"


class LinkedProvider(models.Model):
    """Tracks OAuth providers linked to a user account."""
    PROVIDER_CHOICES = [
        ('google', 'Google'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='linked_providers',
    )
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    provider_user_id = models.CharField(
        max_length=255,
        help_text="External user ID from OAuth provider (e.g. Google sub)",
    )
    email = models.EmailField(
        db_index=True,
        help_text="Email from OAuth provider, used for account linking",
    )
    display_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="Username/handle from OAuth provider",
    )
    avatar_url = models.URLField(blank=True, null=True)
    linked_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'linked_providers'
        unique_together = [('provider', 'provider_user_id')]
        indexes = [
            models.Index(fields=['user', 'provider'], name='lp_user_provider_idx'),
            models.Index(fields=['email'], name='lp_email_idx'),
        ]

    def __str__(self):
        return f"{self.user.username} → {self.provider}"


class Follow(models.Model):
    """
    User follow relationships.
    Supports follow requests for private profiles.
    """
    FOLLOW_STATUS_CHOICES = [
        ('active', 'Active'),
        ('pending', 'Pending'),
        ('rejected', 'Rejected'),
    ]

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
    status = models.CharField(
        max_length=20,
        choices=FOLLOW_STATUS_CHOICES,
        default='active',
        help_text="Follow relationship status"
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
            models.Index(fields=['followed', 'status'], name='follows_followed_status_idx'),
            models.Index(fields=['follower', 'status'], name='follows_follower_status_idx'),
        ]

    def __str__(self):
        return f"{self.follower.username} follows {self.followed.username}"

    def save(self, *args, **kwargs):
        # Prevent self-following
        if self.follower == self.followed:
            raise ValueError("Users cannot follow themselves")
        was_active = self.pk and Follow.objects.filter(pk=self.pk, status='active').exists()
        super().save(*args, **kwargs)
        # Update follow counts when status is or becomes active
        if self.status == 'active':
            self.follower.update_follow_counts()
            self.followed.update_follow_counts()
        elif was_active and self.status != 'active':
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
    Uses get_or_create to avoid IntegrityError on race conditions.
    """
    if created:
        UserSettings.objects.get_or_create(user=instance)
        # Auto-create the default "to-go" and "favorites" cafe lists for every new user.
        # Lazy import avoids a circular dependency between accounts and cafes.
        from apps.cafes.models import CafeList
        from apps.core.constants import DEFAULT_LIST_NAME, DEFAULT_TO_GO_NAME

        CafeList.objects.get_or_create(
            owner=instance,
            list_type='to_go',
            defaults={'name': DEFAULT_TO_GO_NAME, 'icon': 'bookmark'},
        )
        CafeList.objects.get_or_create(
            owner=instance,
            list_type='favorites',
            defaults={'name': DEFAULT_LIST_NAME, 'icon': 'heart'},
        )
