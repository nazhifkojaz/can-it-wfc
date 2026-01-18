from rest_framework import serializers
from apps.core.constants import GOOGLE_RATING_FRESHNESS_HOURS
from .models import Cafe, Favorite, CafeFlag
from apps.accounts.serializers import UserSerializer
from decimal import Decimal


class CafeStatsMixin:
    """
    Mixin for cafe serializers providing common stat calculation methods.
    Eliminates code duplication between CafeListSerializer and CafeDetailSerializer.
    """

    def get_average_ratings(self, obj):
        """
        Return cached average ratings from latest 100 reviews.
        Eliminates N+1 query problem - no database query needed.
        """
        # Return cached value (precomputed in Cafe.update_stats())
        return obj.average_ratings_cache

    def get_facility_stats(self, obj):
        """
        Return cached facility statistics from latest 100 reviews.
        Eliminates N+1 query problem - no database query needed.
        """
        # Return cached value (precomputed in Cafe.update_stats())
        return obj.facility_stats_cache


class CafeListSerializer(CafeStatsMixin, serializers.ModelSerializer):
    """Serializer for cafe list view (minimal fields)."""

    distance = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        required=False,
        read_only=True,
        help_text="Distance in kilometers (only in nearby queries)"
    )
    average_ratings = serializers.SerializerMethodField()
    facility_stats = serializers.SerializerMethodField()
    is_registered = serializers.SerializerMethodField()
    source = serializers.SerializerMethodField()

    class Meta:
        model = Cafe
        fields = [
            'id',
            'name',
            'address',
            'latitude',
            'longitude',
            'google_place_id',
            'price_range',
            'average_wfc_rating',
            'total_reviews',
            'total_visits',
            'unique_visitors',
            'is_closed',
            'is_verified',
            'created_at',
            'updated_at',
            'distance',
            'average_ratings',
            'facility_stats',
            'is_registered',
            'source',
            'google_rating',  # From database
            'google_ratings_count',  # From database
        ]

    def get_is_registered(self, obj):
        """All cafes in DB are registered."""
        return True

    def get_source(self, obj):
        """Source is always database for cafes retrieved from DB."""
        return 'database'


class CafeDetailSerializer(CafeStatsMixin, serializers.ModelSerializer):
    """Detailed serializer for cafe detail view."""

    created_by = UserSerializer(read_only=True)
    distance = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        required=False,
        read_only=True
    )
    is_favorited = serializers.SerializerMethodField()
    is_registered = serializers.SerializerMethodField()
    source = serializers.SerializerMethodField()
    google_rating = serializers.SerializerMethodField()
    google_ratings_count = serializers.SerializerMethodField()
    average_ratings = serializers.SerializerMethodField()
    facility_stats = serializers.SerializerMethodField()

    class Meta:
        model = Cafe
        fields = [
            'id',
            'name',
            'address',
            'latitude',
            'longitude',
            'google_place_id',
            'price_range',
            'total_visits',
            'unique_visitors',
            'total_reviews',
            'average_wfc_rating',
            'is_closed',
            'is_verified',
            'created_by',
            'created_at',
            'updated_at',
            'distance',
            'is_favorited',
            'is_registered',
            'source',
            'average_ratings',
            'facility_stats',
            'google_rating',
            'google_ratings_count',
        ]
        read_only_fields = [
            'id',
            'total_visits',
            'unique_visitors',
            'total_reviews',
            'average_wfc_rating',
            'created_by',
            'created_at',
            'updated_at'
        ]

    def get_is_favorited(self, obj):
        """
        Check if current user has favorited this cafe.

        Uses prefetched data when available (from CafeDetailView.get_queryset)
        to avoid N+1 query problem. Falls back to database query for edge cases.
        """
        # Use prefetched data if available (avoids N+1 query)
        if hasattr(obj, '_user_favorites'):
            return len(obj._user_favorites) > 0

        # Fallback for cases without prefetch (e.g., nested serializers)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, cafe=obj).exists()
        return False

    def get_is_registered(self, obj):
        """All cafes in DB are registered."""
        return True

    def get_source(self, obj):
        """Source is always database for cafes retrieved from DB."""
        return 'database'

    def _refresh_google_rating_if_stale(self, obj):
        """
        Check if Google rating needs refresh and update if needed.
        Considered stale if: older than 24 hours OR never fetched.

        Returns True if refreshed, False otherwise.
        """
        from django.utils import timezone
        from datetime import timedelta
        import logging

        logger = logging.getLogger(__name__)

        # Only refresh if cafe has Google Place ID
        if not obj.google_place_id:
            return False

        # Check if rating is stale
        is_stale = (
            not obj.google_rating_updated_at or
            (timezone.now() - obj.google_rating_updated_at) > timedelta(hours=GOOGLE_RATING_FRESHNESS_HOURS)
        )

        if not is_stale:
            return False

        # Refresh from Google Places API
        try:
            from apps.cafes.services import GooglePlacesService

            place_details = GooglePlacesService.get_place_details(obj.google_place_id)

            # Update fields
            obj.google_rating = place_details.get('rating')
            obj.google_ratings_count = place_details.get('user_ratings_total')
            obj.google_rating_updated_at = timezone.now()

            # Save only these fields (efficient update)
            obj.save(update_fields=[
                'google_rating',
                'google_ratings_count',
                'google_rating_updated_at'
            ])

            logger.info(f"Refreshed Google rating for cafe {obj.id}: {obj.google_rating}")
            return True

        except Exception as e:
            logger.warning(f"Failed to refresh Google rating for cafe {obj.id}: {e}")
            return False

    def get_google_rating(self, obj):
        """
        Return Google rating from database, refreshing if stale.
        Rating is considered stale if older than 24 hours.
        """
        self._refresh_google_rating_if_stale(obj)
        return float(obj.google_rating) if obj.google_rating else None

    def get_google_ratings_count(self, obj):
        """
        Return Google ratings count from database.
        Already refreshed by get_google_rating if needed.
        """
        return obj.google_ratings_count


class CafeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new cafe."""

    class Meta:
        model = Cafe
        fields = [
            'name',
            'address',
            'latitude',
            'longitude',
            'google_place_id',
            'price_range'
        ]
    
    def validate(self, attrs):
        """Check for duplicate cafes."""
        name = attrs.get('name')
        latitude = attrs.get('latitude')
        longitude = attrs.get('longitude')
        
        # Check for duplicates within 50 meters
        duplicates = Cafe.find_duplicates(name, latitude, longitude, threshold_meters=50)
        
        if duplicates:
            duplicate_names = ', '.join([d.name for d in duplicates[:3]])
            raise serializers.ValidationError({
                'non_field_errors': [
                    f'Potential duplicate cafe found: {duplicate_names}. '
                    'Please check if this cafe already exists.'
                ]
            })
        
        return attrs
    
    def create(self, validated_data):
        """Create cafe with current user as creator."""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class CafeUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating cafe information."""
    
    class Meta:
        model = Cafe
        fields = [
            'name',
            'address',
            'price_range'
        ]


class NearbyQuerySerializer(serializers.Serializer):
    """Serializer for nearby cafes query parameters."""

    # Search center coordinates (required)
    latitude = serializers.DecimalField(max_digits=10, decimal_places=8, required=True)
    longitude = serializers.DecimalField(max_digits=11, decimal_places=8, required=True)

    # User's actual location for distance calculation (optional)
    # If not provided, distance will be calculated from search center
    user_latitude = serializers.DecimalField(max_digits=10, decimal_places=8, required=False)
    user_longitude = serializers.DecimalField(max_digits=11, decimal_places=8, required=False)

    radius_km = serializers.DecimalField(max_digits=5, decimal_places=2, default=Decimal('1.0'))
    limit = serializers.IntegerField(default=50, min_value=1, max_value=100)


class FavoriteSerializer(serializers.ModelSerializer):
    """Serializer for user favorites."""

    cafe = CafeListSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ['id', 'cafe', 'created_at']
        read_only_fields = ['id', 'created_at']


class CafeFlagCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating cafe flags (user reports)."""

    class Meta:
        model = CafeFlag
        fields = ['cafe', 'reason', 'description']

    def validate(self, data):
        """Check if user has already flagged this cafe for this reason."""
        user = self.context['request'].user
        cafe = data['cafe']
        reason = data['reason']

        # Check for duplicate flag
        existing_flag = CafeFlag.objects.filter(
            user=user,
            cafe=cafe,
            reason=reason
        ).exists()

        if existing_flag:
            raise serializers.ValidationError(
                "You have already flagged this cafe for this reason."
            )

        return data

    def create(self, validated_data):
        """Create flag with current user."""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class CafeFlagSerializer(serializers.ModelSerializer):
    """Serializer for listing cafe flags."""

    cafe = CafeListSerializer(read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = CafeFlag
        fields = [
            'id',
            'cafe',
            'reason',
            'reason_display',
            'description',
            'status',
            'status_display',
            'created_at',
            'updated_at'
        ]
        read_only_fields = fields


class CafeSearchQuerySerializer(serializers.Serializer):
    """Serializer for validating query parameters in cafe search."""
    q = serializers.CharField(
        required=True,
        min_length=3,
        max_length=200,
        error_messages={
            'required': 'Search query (q) is required',
            'min_length': 'Query must be at least 3 characters'
        }
    )
    lat = serializers.DecimalField(
        required=False,
        max_digits=10,
        decimal_places=8,
        min_value=-90,
        max_value=90,
        error_messages={'invalid': 'Invalid latitude value'}
    )
    lon = serializers.DecimalField(
        required=False,
        max_digits=11,
        decimal_places=8,
        min_value=-180,
        max_value=180,
        error_messages={'invalid': 'Invalid longitude value'}
    )
    use_google = serializers.ChoiceField(
        choices=['true', 'false', 'auto'],
        default='auto'
    )
    limit = serializers.IntegerField(
        default=10,
        min_value=1,
        max_value=50,
        error_messages={
            'min_value': 'Limit must be at least 1',
            'max_value': 'Limit cannot exceed 50'
        }
    )


class NearbyCafesQuerySerializer(serializers.Serializer):
    """Serializer for validating query parameters in nearby cafes endpoint."""
    latitude = serializers.DecimalField(
        required=True,
        max_digits=9,
        decimal_places=6,
        min_value=-90,
        max_value=90,
        error_messages={
            'required': 'Latitude is required',
            'invalid': 'Invalid latitude value'
        }
    )
    longitude = serializers.DecimalField(
        required=True,
        max_digits=9,
        decimal_places=6,
        min_value=-180,
        max_value=180,
        error_messages={
            'required': 'Longitude is required',
            'invalid': 'Invalid longitude value'
        }
    )
    radius = serializers.IntegerField(
        default=5,
        min_value=1,
        max_value=50,
        error_messages={
            'min_value': 'Radius must be at least 1km',
            'max_value': 'Radius cannot exceed 50km'
        }
    )
    limit = serializers.IntegerField(
        default=20,
        min_value=1,
        max_value=100,
        error_messages={
            'min_value': 'Limit must be at least 1',
            'max_value': 'Limit cannot exceed 100'
        }
    )