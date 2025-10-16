from django.contrib.auth.models import AbstractUser
from django.db import models
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
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']
    
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
    
    def update_stats(self):
        """Update denormalized statistics."""
        from apps.reviews.models import Review, Visit
        
        self.total_reviews = Review.objects.filter(user=self).count()
        self.total_visits = Visit.objects.filter(user=self).count()
        self.save(update_fields=['total_reviews', 'total_visits'])