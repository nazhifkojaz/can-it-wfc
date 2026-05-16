from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
from django.utils import timezone
from apps.core.constants import EARTH_RADIUS_KM, LIST_ICON_CHOICES
from apps.core.geo_utils import bounding_box_deltas
from core.logging import get_logger
from decimal import Decimal
import math
import uuid

logger = get_logger(__name__)


class Cafe(models.Model):
    """
    Cafe/Coffee shop model with location and statistics.
    """
    class PlaceCategory(models.TextChoices):
        CAFE = 'cafe', 'Cafe'
        COWORKING_SPACE = 'coworking_space', 'Coworking space'
        LIBRARY = 'library', 'Library'

    # Basic information
    name = models.CharField(max_length=200)
    address = models.TextField()
    place_category = models.CharField(
        max_length=32,
        choices=PlaceCategory.choices,
        default=PlaceCategory.CAFE,
        db_index=True,
        help_text="WFC place category used for discovery and map labeling"
    )
    
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

    # Google Places data (ratings)
    google_rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        null=True,
        blank=True,
        validators=[MinValueValidator(1.0), MaxValueValidator(5.0)],
        help_text="Google Maps rating (1.0 - 5.0)",
        db_index=True  # For search/filter queries
    )
    google_ratings_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Number of Google reviews"
    )
    google_rating_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time Google rating was fetched from API",
        db_index=True  # For finding stale ratings
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

    # Per-dimension average ratings (promoted columns for fast filtering)
    avg_wifi_rating = models.DecimalField(
        max_digits=3, decimal_places=2, null=True, blank=True, db_index=True
    )
    avg_power_rating = models.DecimalField(
        max_digits=3, decimal_places=2, null=True, blank=True, db_index=True
    )
    avg_noise_level = models.DecimalField(
        max_digits=3, decimal_places=2, null=True, blank=True, db_index=True
    )
    avg_seating_comfort = models.DecimalField(
        max_digits=3, decimal_places=2, null=True, blank=True, db_index=True
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
        help_text="Cached facility mention counts (smoking area, prayer room, indoor/outdoor seating) from latest 100 reviews"
    )

    # H3 geospatial indexing for local cluster aggregates (price percentile, etc.)
    h3_cell_r7 = models.CharField(
        max_length=15,
        null=True,
        blank=True,
        db_index=True,
        help_text="H3 cell index at resolution 7 (~5 km) for local cluster aggregates"
    )

    # Cafe insights cache (aggregated visit + review data for insights card)
    insights_cache = models.JSONField(
        null=True,
        blank=True,
        help_text="Computed cafe insights (median spend, time-of-day distribution, "
                  "best-for labels, recency). Recomputed on visit/review writes "
                  "and nightly for time-decaying fields."
    )
    insights_cache_version = models.IntegerField(
        default=1,
        help_text="Schema version of insights_cache. Bump to invalidate on logic changes."
    )
    insights_cache_computed_at = models.DateTimeField(null=True, blank=True)

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
            models.Index(fields=['is_closed', '-created_at'], name='cafe_closed_created_idx'),
            models.Index(fields=['avg_wifi_rating', 'avg_noise_level'], name='cafe_wifi_noise_idx'),
        ]
    
    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """Save cafe instance. Auto-compute H3 cell if coordinates are present."""
        if self.latitude is not None and self.longitude is not None:
            try:
                import h3
                self.h3_cell_r7 = h3.latlng_to_cell(
                    float(self.latitude), float(self.longitude), 7
                )
            except ImportError:
                logger.warning(
                    'h3 library not installed — H3 cell will not be computed for cafe %s',
                    getattr(self, 'pk', 'new'),
                )
                self.h3_cell_r7 = None
            except Exception as e:
                logger.error(
                    'Failed to compute H3 cell for cafe %s: %s',
                    getattr(self, 'pk', 'new'),
                    e,
                    exc_info=True,
                )
                self.h3_cell_r7 = None
        super().save(*args, **kwargs)

    @staticmethod
    def calculate_distance(lat1, lon1, lat2, lon2):
        """
        Calculate distance between two points using Haversine formula.
        Returns distance in kilometers.
        """
        R = EARTH_RADIUS_KM
        
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
        threshold_km = threshold_meters / 1000.0
        
        lat_delta_decimal, lon_delta_decimal = bounding_box_deltas(threshold_km, latitude)
        
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
        from apps.core.stats_utils import update_cafe_stats
        update_cafe_stats(self)


class CafeList(models.Model):
    """A named collection of cafes owned by a user."""

    LIST_TYPE_CHOICES = [
        ('to_go', 'to-go'),
        ('favorites', 'favorites'),
        ('custom', 'Custom'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='cafe_lists',
    )
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True, max_length=160)
    list_type = models.CharField(
        max_length=20,
        choices=LIST_TYPE_CHOICES,
        default='custom',
        help_text="Special lists (to-go, favorites) are protected and auto-created.",
    )
    icon = models.CharField(
        max_length=30,
        choices=LIST_ICON_CHOICES,
        default='bookmark',
        help_text="Lucide icon name for this list.",
    )
    is_default = models.BooleanField(
        default=False,
        help_text="True for to-go and favorites (protected special lists).",
    )
    VISIBILITY_CHOICES = [
        ('private', 'Private'),
        ('shareable', 'Shareable'),
        ('public', 'Public'),
    ]
    visibility = models.CharField(
        max_length=10,
        choices=VISIBILITY_CHOICES,
        default='private',
        db_index=True,
        help_text="Who can view this list. Private=owner only, Shareable=anyone with link, Public=everyone.",
    )
    share_token = models.UUIDField(
        null=True,
        blank=True,
        unique=True,
        help_text="Auto-generated when visibility='shareable'. Used for shareable link access.",
    )
    is_featured = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Featured lists appear on the Discover panel. Requires visibility='public'.",
    )
    featured_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the list was featured. Auto-set when is_featured flips true.",
    )
    item_count = models.IntegerField(
        default=0,
        help_text="Denormalized count; updated via signal on item add/remove.",
    )
    save_count = models.PositiveIntegerField(
        default=0,
        db_index=True,
        help_text="Denormalized count; updated via signal on save/unsave.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cafe_lists'
        unique_together = [('owner', 'name')]
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['owner', '-updated_at']),
            models.Index(fields=['owner', 'list_type']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['owner', 'list_type'],
                condition=~models.Q(list_type='custom'),
                name='unique_special_list_per_user',
            )
        ]

    def clean(self):
        super().clean()
        if self.is_featured and self.visibility != 'public':
            raise ValidationError({
                'is_featured': 'Featured lists must be public.',
            })
        if self.visibility in ('public', 'shareable') and self.list_type in ('to_go', 'favorites'):
            raise ValidationError({
                'visibility': 'Special lists (to-go, favorites) cannot be made public or shareable.',
            })

    def save(self, *args, **kwargs):
        """Auto-set is_default based on list_type and featured_at on first feature."""
        self.is_default = self.list_type in ('to_go', 'favorites')
        if self.is_featured and self.featured_at is None:
            self.featured_at = timezone.now()
        if self.visibility == 'shareable' and not self.share_token:
            self.share_token = uuid.uuid4()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.owner.username} / {self.name}"

    @property
    def is_special(self):
        """Whether this is a protected special list (to-go or favorites)."""
        return self.list_type in ('to_go', 'favorites')


class CafeListItem(models.Model):
    """A single cafe entry within a CafeList."""

    cafe_list = models.ForeignKey(
        CafeList,
        on_delete=models.CASCADE,
        related_name='items',
    )
    cafe = models.ForeignKey(
        Cafe,
        on_delete=models.CASCADE,
        related_name='list_entries',
    )
    note = models.TextField(blank=True, max_length=200)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'cafe_list_items'
        unique_together = [('cafe_list', 'cafe')]
        ordering = ['-added_at']
        indexes = [
            models.Index(fields=['cafe_list', '-added_at']),
            models.Index(fields=['cafe', 'cafe_list']),
        ]

    def __str__(self):
        return f"{self.cafe_list} → {self.cafe.name}"


class SavedCafeList(models.Model):
    """A user saving a public CafeList created by another user."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='saved_cafe_lists',
    )
    cafe_list = models.ForeignKey(
        CafeList,
        on_delete=models.CASCADE,
        related_name='saves',
    )
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'saved_cafe_lists'
        unique_together = [('user', 'cafe_list')]
        ordering = ['-saved_at']
        indexes = [
            models.Index(fields=['cafe_list', '-saved_at']),
            models.Index(fields=['user', '-saved_at']),
        ]

    def __str__(self):
        return f"{self.user.username} saved {self.cafe_list.name}"


class PriceCluster(models.Model):
    """
    Precomputed price cluster aggregates per H3 cell + currency.
    Recomputed nightly by `recompute_price_clusters` management command.
    """
    h3_cell = models.CharField(max_length=15, db_index=True)
    currency = models.CharField(max_length=3)
    median_of_medians = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    cafe_medians = models.JSONField(
        help_text="Sorted list of cafe-level spend medians in this cluster"
    )
    cafe_count = models.IntegerField()
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cafes_price_clusters'
        unique_together = [('h3_cell', 'currency')]
        verbose_name = 'Price Cluster'
        verbose_name_plural = 'Price Clusters'

    def __str__(self):
        return f"{self.h3_cell} / {self.currency} ({self.cafe_count} cafes)"


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
