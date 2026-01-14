from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
from django.utils import timezone
from apps.core.currency_utils import CURRENCY_CHOICES
from apps.core.constants import REVIEW_AUTO_HIDE_FLAG_THRESHOLD


class Visit(models.Model):
    """
    Tracks each user visit to a cafe.
    Users can log visits with or without reviews.
    """
    cafe = models.ForeignKey(
        'cafes.Cafe',  # String reference to avoid circular import
        on_delete=models.CASCADE,
        related_name='visits'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='visits'
    )
    visit_date = models.DateField(
        default=timezone.now,
        help_text="Date of the visit"
    )

    # Amount spent (new field)
    amount_spent = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Amount spent at the cafe"
    )

    # Currency (new field)
    currency = models.CharField(
        max_length=3,
        choices=CURRENCY_CHOICES,
        default='USD',
        null=True,
        blank=True,
        help_text="Currency code (e.g., USD, IDR, SGD)"
    )

    # Visit time (new field)
    VISIT_TIME_CHOICES = [
        (1, 'Morning (6AM - 12PM)'),
        (2, 'Afternoon (12PM - 6PM)'),
        (3, 'Evening (6PM - 12AM)'),
    ]
    visit_time = models.IntegerField(
        choices=VISIT_TIME_CHOICES,
        validators=[MinValueValidator(1), MaxValueValidator(3)],
        null=True,
        blank=True,
        help_text="Time of day visited (1=Morning, 2=Afternoon, 3=Evening)"
    )

    # Optional: Location verification (check-in)
    check_in_latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        null=True,
        blank=True,
        help_text="Latitude when checking in (for verification)"
    )
    check_in_longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        null=True,
        blank=True,
        help_text="Longitude when checking in (for verification)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'visits'
        verbose_name = 'Visit'
        verbose_name_plural = 'Visits'
        unique_together = ['user', 'cafe', 'visit_date']
        ordering = ['-visit_date', '-created_at']
        indexes = [
            models.Index(fields=['cafe', '-visit_date']),
            models.Index(fields=['user', '-visit_date']),
        ]
    
    def __str__(self):
        return f"{self.user.username} → {self.cafe.name} on {self.visit_date}"
    
    def is_verified_location(self, max_distance_km=1.0):
        """
        Check if check-in location is within acceptable distance of cafe.
        Returns True if verified, False if too far, None if no check-in data.
        """
        if not self.check_in_latitude or not self.check_in_longitude:
            return None
        
        # Import inside method to avoid circular imports
        from apps.cafes.models import Cafe
        
        distance = Cafe.calculate_distance(
            self.check_in_latitude,
            self.check_in_longitude,
            self.cafe.latitude,
            self.cafe.longitude
        )
        return distance <= max_distance_km


class Review(models.Model):
    """
    WFC-focused cafe reviews.

    UPDATED (Review Refactor):
    Reviews are now independent of visits. One user can only have one review per cafe.
    Users can update their review at any time (no time restrictions).

    - Visits are for personal tracking (private, multiple visits allowed)
    - Reviews are for sharing opinions (public, one per user per cafe)
    """
    # Relationships
    cafe = models.ForeignKey(
        'cafes.Cafe',
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    
    
    # WFC-specific ratings (1-5 scale)
    # WiFi
    wifi_quality = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="WiFi quality (1=very poor, 5=excellent)"
    )
    
    # Power outlets
    power_outlets_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text="Accessibility/quantity of outlets (1=very few, 5=plenty)"
    )
    
    # Noise level
    noise_level = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Noise level (1=very quiet, 5=very loud)"
    )
    
    # Seating & Space
    seating_comfort = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Seating comfort (1=very uncomfortable, 5=very comfortable)"
    )
    space_availability = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="How crowded/available is space (1=always full, 5=plenty of space)"
    )
    
    # Food & Beverage
    coffee_quality = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Coffee quality (1=very poor, 5=excellent)"
    )
    menu_options = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Menu variety (1=very limited, 5=extensive)"
    )
    
    # Facilities
    bathroom_quality = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text="Bathroom quality (1=very poor, 5=excellent)"
    )

    # Additional facilities (new fields - three-state: True/False/None)
    has_smoking_area = models.BooleanField(
        null=True,
        blank=True,
        help_text="Does the cafe have a designated smoking area? (null=don't know)"
    )

    has_prayer_room = models.BooleanField(
        null=True,
        blank=True,
        help_text="Does the cafe have a prayer room/musala? (null=don't know)"
    )

    # Overall WFC suitability (required)
    wfc_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Overall WFC suitability (1=not suitable, 5=perfect for WFC)"
    )
    
    # Visit time (1=morning, 2=afternoon, 3=evening)
    # DEPRECATED: Now stored in Visit model, kept here for backward compatibility
    VISIT_TIME_CHOICES = [
        (1, 'Morning (Open - 1pm)'),
        (2, 'Afternoon (1pm - 6pm)'),
        (3, 'Evening (6pm - Close)'),
    ]
    visit_time = models.IntegerField(
        choices=VISIT_TIME_CHOICES,
        validators=[MinValueValidator(1), MaxValueValidator(3)],
        null=True,
        blank=True,
        help_text="Time of visit (deprecated - now stored in Visit model)"
    )
    
    # Text review (Twitter-style, 160 chars)
    comment = models.TextField(
        blank=True,
        max_length=160,
        help_text="Optional review (max 160 characters)"
    )
    
    # Helpfulness tracking
    helpful_count = models.IntegerField(
        default=0,
        help_text="Number of users who found this review helpful"
    )

    # Moderation
    is_flagged = models.BooleanField(default=False)
    flag_count = models.IntegerField(default=0)
    is_hidden = models.BooleanField(
        default=False,
        help_text="Hidden reviews are not shown publicly"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'reviews'
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'
        ordering = ['-created_at']

        # UPDATED: Unique constraint - one review per user per cafe
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'cafe'],
                name='unique_user_cafe_review'
            )
        ]

        indexes = [
            models.Index(fields=['cafe', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['-wfc_rating']),
            models.Index(fields=['is_hidden']),
            # NEW: Index for user-cafe lookups (checking if review exists)
            models.Index(fields=['user', 'cafe'], name='review_user_cafe_idx'),
            # Composite index for common filter: cafe + is_hidden
            models.Index(fields=['cafe', 'is_hidden'], name='review_cafe_hidden_idx'),
            # Composite index for common query pattern: cafe + is_hidden + ordering by created_at
            # This optimizes: Review.objects.filter(cafe=X, is_hidden=False).order_by('-created_at')
            models.Index(fields=['cafe', 'is_hidden', '-created_at'], name='review_cafe_hidden_created_idx'),
            # Index for helpful count (used in sorting "most helpful" reviews)
            models.Index(fields=['-helpful_count'], name='review_helpful_count_idx'),
        ]
    
    def __str__(self):
        return f"{self.user.username}'s review of {self.cafe.name} ({self.wfc_rating}⭐)"
    
    @property
    def average_rating(self):
        """Calculate average of all rated criteria."""
        ratings = [
            self.wifi_quality,
            self.power_outlets_rating or 0,
            self.noise_level,
            self.seating_comfort,
            self.space_availability,
            self.coffee_quality,
            self.menu_options,
            self.bathroom_quality or 0,
            self.wfc_rating,
        ]
        valid_ratings = [r for r in ratings if r > 0]
        return sum(valid_ratings) / len(valid_ratings) if valid_ratings else 0
    
    @property
    def visit_time_display(self):
        """Return human-readable visit time."""
        time_map = {
            1: 'morning',
            2: 'afternoon',
            3: 'evening'
        }
        return time_map.get(self.visit_time, 'unknown')
    
    def check_spam(self):
        """
        Check if review might be spam based on various heuristics.
        Returns (is_spam: bool, reason: str)
        """
        # Check if user is new
        if not self.user.can_review():
            return True, "Account too new"
        
        # Check if user has too many reviews today
        max_reviews_per_day = getattr(settings, 'MAX_REVIEWS_PER_DAY', 10)
        
        today_count = Review.objects.filter(
            user=self.user,
            created_at__date=timezone.now().date()
        ).count()
        
        if today_count > max_reviews_per_day:
            return True, "Too many reviews in one day"
        
        return False, "OK"


class ReviewHelpful(models.Model):
    """
    Tracks which users found a review helpful.
    Users can only mark a review helpful once.
    """
    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name='helpful_marks'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='helpful_reviews'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'review_helpful'
        verbose_name = 'Review Helpful Mark'
        verbose_name_plural = 'Review Helpful Marks'
        unique_together = ['review', 'user']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['review', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} found review #{self.review.id} helpful"

    def save(self, *args, **kwargs):
        """Update helpful count on review when marking helpful."""
        is_new = self.pk is None
        super().save(*args, **kwargs)

        if is_new:
            # Update helpful count
            self.review.helpful_count = self.review.helpful_marks.count()
            self.review.save(update_fields=['helpful_count'])

    def delete(self, *args, **kwargs):
        """Update helpful count on review when unmarking helpful."""
        review = self.review
        super().delete(*args, **kwargs)

        # Update helpful count
        review.helpful_count = review.helpful_marks.count()
        review.save(update_fields=['helpful_count'])


class ReviewFlag(models.Model):
    """
    User reports of spam/inappropriate reviews.
    Auto-hides review after threshold of flags.
    """
    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name='flags'
    )
    flagged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='review_flags'
    )
    
    REASON_CHOICES = [
        ('spam', 'Spam'),
        ('inappropriate', 'Inappropriate content'),
        ('fake', 'Fake review'),
        ('other', 'Other'),
    ]
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    comment = models.TextField(blank=True, max_length=500)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'review_flags'
        verbose_name = 'Review Flag'
        verbose_name_plural = 'Review Flags'
        unique_together = ['review', 'flagged_by']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.flagged_by.username} flagged review #{self.review.id}"
    
    def save(self, *args, **kwargs):
        """Auto-hide review if it reaches flag threshold."""
        super().save(*args, **kwargs)

        # Update flag count
        self.review.flag_count = self.review.flags.count()

        # Auto-hide if threshold reached
        if self.review.flag_count >= REVIEW_AUTO_HIDE_FLAG_THRESHOLD:
            self.review.is_hidden = True
            self.review.is_flagged = True
        
        self.review.save(update_fields=['flag_count', 'is_hidden', 'is_flagged'])