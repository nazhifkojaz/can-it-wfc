from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
from decimal import Decimal
import math


class Cafe(models.Model):
    """
    Cafe/Coffee shop model with location and statistics.
    """
    # Basic information
    name = models.CharField(max_length=200)
    address = models.TextField()
    
    # Location coordinates
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
        help_text="Latitude coordinate (-90 to 90)"
    )
    longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
        help_text="Longitude coordinate (-180 to 180)"
    )

    # External identifiers for deduplication
    google_place_id = models.CharField(
        max_length=255, 
        unique=True, 
        null=True, 
        blank=True,
        help_text="Google Places API Place ID"
    )
    
    # Price range (1=$ to 4=$$$$)
    PRICE_RANGE_CHOICES = [
        (1, '$'),
        (2, '$$'),
        (3, '$$$'),
        (4, '$$$$'),
    ]
    price_range = models.IntegerField(
        choices=PRICE_RANGE_CHOICES,
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(4)]
    )
    
    # statistics (denormalized for performance)
    total_visits = models.IntegerField(default=0)
    unique_visitors = models.IntegerField(default=0)
    total_reviews = models.IntegerField(default=0)
    average_wfc_rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Average WFC rating (1-5)"
    )

    # Cached stats (precomputed from latest 100 reviews for performance)
    average_ratings_cache = models.JSONField(
        null=True,
        blank=True,
        help_text="Cached average ratings (wifi, power, seating, noise, wfc) from latest 100 reviews"
    )
    facility_stats_cache = models.JSONField(
        null=True,
        blank=True,
        help_text="Cached facility statistics (smoking area, prayer room) from latest 100 reviews"
    )
    
    # Status
    is_closed = models.BooleanField(
        default=False,
        help_text="Mark as closed if cafe is no longer operating"
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="Verified by multiple users or admin"
    )
    
    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_cafes'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'cafes'
        verbose_name = 'Cafe'
        verbose_name_plural = 'Cafes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['google_place_id']),
            models.Index(fields=['-average_wfc_rating']),
        ]
    
    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """Save cafe instance."""
        super().save(*args, **kwargs)

    @staticmethod
    def calculate_distance(lat1, lon1, lat2, lon2):
        """
        Calculate distance between two points using Haversine formula.
        Returns distance in kilometers.
        """
        R = 6371  # Earth's radius in kilometers
        
        lat1_rad = math.radians(float(lat1))
        lat2_rad = math.radians(float(lat2))
        delta_lat = math.radians(float(lat2) - float(lat1))
        delta_lon = math.radians(float(lon2) - float(lon1))
        
        a = (math.sin(delta_lat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) *
             math.sin(delta_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    def distance_to(self, lat, lng):
        """Calculate distance from this cafe to given coordinates (in km)."""
        return self.calculate_distance(
            self.latitude, 
            self.longitude, 
            lat, 
            lng
        )
    

    @classmethod
    def find_duplicates(cls, name, latitude, longitude, threshold_meters=50):
        """
        Find potential duplicate cafes by name similarity and proximity.
        """
        # Convert to float for calculations
        lat_float = float(latitude)
        
        threshold_km = threshold_meters / 1000.0
        
        # Calculate bounding box
        lat_delta = threshold_km / 111.0
        lon_delta = threshold_km / (111.0 * math.cos(math.radians(lat_float)))
        
        # Convert deltas to Decimal for database query
        lat_delta_decimal = Decimal(str(lat_delta))
        lon_delta_decimal = Decimal(str(lon_delta))
        
        nearby_cafes = cls.objects.filter(
            name__icontains=name.split()[0],
            latitude__gte=latitude - lat_delta_decimal,
            latitude__lte=latitude + lat_delta_decimal,
            longitude__gte=longitude - lon_delta_decimal,
            longitude__lte=longitude + lon_delta_decimal,
        ).exclude(is_closed=True)
        
        # Filter by exact distance
        duplicates = []
        for cafe in nearby_cafes:
            distance_m = cafe.distance_to(latitude, longitude) * 1000
            if distance_m <= threshold_meters:
                cafe.duplicate_distance = distance_m
                duplicates.append(cafe)
        
        return duplicates
    
    def update_stats(self):
        """
        Update cafe stats efficiently using aggregation.
        Optimized to use only 2 queries instead of 4-6.

        Caches average_ratings and facility_stats from latest 100 reviews
        to keep stats fresh and prevent N+1 queries in serializers.
        """
        from apps.reviews.models import Review, Visit
        from django.db.models import Count, Avg

        # Single aggregated query for visits (1 query instead of 2)
        visit_stats = Visit.objects.filter(cafe=self).aggregate(
            total_visits=Count('id'),
            unique_visitors=Count('user', distinct=True)
        )
        self.total_visits = visit_stats['total_visits'] or 0
        self.unique_visitors = visit_stats['unique_visitors'] or 0

        # Get latest 100 non-hidden reviews for fresh stats
        recent_reviews = Review.objects.filter(
            cafe=self,
            is_hidden=False
        ).order_by('-created_at')[:100]

        # Convert to list to avoid re-querying
        recent_reviews_list = list(recent_reviews)
        total_recent = len(recent_reviews_list)

        # Update total_reviews count (all reviews, not just recent 100)
        self.total_reviews = Review.objects.filter(cafe=self, is_hidden=False).count()

        # Compute average WFC rating from recent reviews
        if recent_reviews_list:
            avg_rating = sum(r.wfc_rating for r in recent_reviews_list) / total_recent
            self.average_wfc_rating = round(avg_rating, 2)

            # Cache average ratings for all criteria
            self.average_ratings_cache = {
                'wifi_quality': round(sum(r.wifi_quality for r in recent_reviews_list) / total_recent, 1),
                'power_outlets_rating': round(sum(r.power_outlets_rating for r in recent_reviews_list) / total_recent, 1),
                'seating_comfort': round(sum(r.seating_comfort for r in recent_reviews_list) / total_recent, 1),
                'noise_level': round(sum(r.noise_level for r in recent_reviews_list) / total_recent, 1),
                'wfc_rating': round(sum(r.wfc_rating for r in recent_reviews_list) / total_recent, 1),
            }

            # Cache facility stats
            smoking_yes = sum(1 for r in recent_reviews_list if r.has_smoking_area is True)
            smoking_no = sum(1 for r in recent_reviews_list if r.has_smoking_area is False)
            smoking_unknown = sum(1 for r in recent_reviews_list if r.has_smoking_area is None)

            prayer_yes = sum(1 for r in recent_reviews_list if r.has_prayer_room is True)
            prayer_no = sum(1 for r in recent_reviews_list if r.has_prayer_room is False)
            prayer_unknown = sum(1 for r in recent_reviews_list if r.has_prayer_room is None)

            self.facility_stats_cache = {
                'smoking_area': {
                    'yes': smoking_yes,
                    'no': smoking_no,
                    'unknown': smoking_unknown,
                    'yes_percentage': round((smoking_yes / total_recent) * 100, 1),
                    'no_percentage': round((smoking_no / total_recent) * 100, 1),
                    'unknown_percentage': round((smoking_unknown / total_recent) * 100, 1),
                },
                'prayer_room': {
                    'yes': prayer_yes,
                    'no': prayer_no,
                    'unknown': prayer_unknown,
                    'yes_percentage': round((prayer_yes / total_recent) * 100, 1),
                    'no_percentage': round((prayer_no / total_recent) * 100, 1),
                    'unknown_percentage': round((prayer_unknown / total_recent) * 100, 1),
                }
            }
        else:
            # No reviews - clear cached data
            self.average_wfc_rating = None
            self.average_ratings_cache = None
            self.facility_stats_cache = None

        self.save(update_fields=[
            'total_visits',
            'unique_visitors',
            'total_reviews',
            'average_wfc_rating',
            'average_ratings_cache',
            'facility_stats_cache'
        ])


class Favorite(models.Model):
    """User's favorite cafes."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favorites'
    )
    cafe = models.ForeignKey(
        Cafe,
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'favorites'
        verbose_name = 'Favorite'
        verbose_name_plural = 'Favorites'
        unique_together = ['user', 'cafe']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} → {self.cafe.name}"


class CafeFlag(models.Model):
    """
    User reports for cafe issues (misclassification, wrong location, etc.)
    Requires authentication to prevent spam.
    """
    # Flag reasons
    REASON_CHOICES = [
        ('not_cafe', 'Not a cafe'),
        ('wrong_location', 'Wrong location'),
        ('permanently_closed', 'Permanently closed'),
        ('duplicate', 'Duplicate entry'),
    ]

    # Flag status
    STATUS_CHOICES = [
        ('pending', 'Pending review'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]

    cafe = models.ForeignKey(
        Cafe,
        on_delete=models.CASCADE,
        related_name='flags'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cafe_flags'
    )
    reason = models.CharField(
        max_length=50,
        choices=REASON_CHOICES,
        help_text="Reason for flagging this cafe"
    )
    description = models.TextField(
        blank=True,
        help_text="Optional additional details about the issue"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Current status of this flag"
    )

    # Admin resolution
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_cafe_flags',
        help_text="Admin who resolved this flag"
    )
    resolution_notes = models.TextField(
        blank=True,
        help_text="Admin notes on how this was resolved"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cafe_flags'
        verbose_name = 'Cafe Flag'
        verbose_name_plural = 'Cafe Flags'
        # Prevent duplicate flags from same user for same reason
        unique_together = ['user', 'cafe', 'reason']
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['cafe', 'status']),
        ]

    def __str__(self):
        return f"{self.user.username} flagged {self.cafe.name} ({self.get_reason_display()})"