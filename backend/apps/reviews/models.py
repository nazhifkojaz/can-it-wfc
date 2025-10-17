from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
from django.utils import timezone


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
    WFC-focused cafe reviews with detailed criteria.
    Must be linked to a visit - users can only review cafes they've visited.
    """
    # Relationships
    visit = models.OneToOneField(
        Visit,
        on_delete=models.CASCADE,
        related_name='review',
        help_text="Link to a specific visit (required)"
    )
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
    
    # Overall WFC suitability (required)
    wfc_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Overall WFC suitability (1=not suitable, 5=perfect for WFC)"
    )
    
    # Visit time (1=morning, 2=afternoon, 3=evening)
    VISIT_TIME_CHOICES = [
        (1, 'Morning (Open - 1pm)'),
        (2, 'Afternoon (1pm - 6pm)'),
        (3, 'Evening (6pm - Close)'),
    ]
    visit_time = models.IntegerField(
        choices=VISIT_TIME_CHOICES,
        validators=[MinValueValidator(1), MaxValueValidator(3)],
        help_text="Time of visit"
    )
    
    # Text review (Twitter-style, 160 chars)
    comment = models.TextField(
        blank=True,
        max_length=160,
        help_text="Optional review (max 160 characters)"
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
        indexes = [
            models.Index(fields=['cafe', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['-wfc_rating']),
            models.Index(fields=['is_hidden']),
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
        if self.review.flag_count >= 3:
            self.review.is_hidden = True
            self.review.is_flagged = True
        
        self.review.save(update_fields=['flag_count', 'is_hidden', 'is_flagged'])