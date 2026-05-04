from rest_framework import serializers
from django.core.validators import MaxLengthValidator
from core.logging import get_logger
from .models import Cafe, CafeFlag, CafeList, CafeListItem
from apps.accounts.serializers import UserSerializer
from decimal import Decimal

# Constants for TextField max length validation
MAX_CAFE_ADDRESS_LENGTH = 500
MAX_FLAG_DESCRIPTION_LENGTH = 1000
MAX_FLAG_RESOLUTION_NOTES_LENGTH = 1000

logger = get_logger(__name__)


class CafeStatsMixin:
    """
    Mixin for cafe serializers providing common stat calculation methods.
    Eliminates code duplication between CafeSummarySerializer and CafeDetailSerializer.
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


class CafeSummarySerializer(CafeStatsMixin, serializers.ModelSerializer):
    """Cafe summary used in list views and as a nested read-only representation."""

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
    """
    Detailed serializer for cafe detail view.

    Google ratings are returned from cache (stale-while-revalidate pattern).
    The frontend can detect stale ratings via google_rating_updated_at and
    trigger a background refresh via the refresh endpoint.
    """

    created_by = UserSerializer(read_only=True)
    distance = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        required=False,
        read_only=True
    )
    is_registered = serializers.SerializerMethodField()
    source = serializers.SerializerMethodField()
    average_ratings = serializers.SerializerMethodField()
    facility_stats = serializers.SerializerMethodField()
    # Annotated by CafeDetailView.get_queryset for authenticated users; 0 for anon.
    my_lists_count = serializers.IntegerField(read_only=True, default=0)

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
            'my_lists_count',
            'is_registered',
            'source',
            'average_ratings',
            'facility_stats',
            'google_rating',
            'google_ratings_count',
            'google_rating_updated_at',
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

    def get_is_registered(self, obj):
        """All cafes in DB are registered."""
        return True

    def get_source(self, obj):
        """Source is always database for cafes retrieved from DB."""
        return 'database'


class CafeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new cafe."""

    address = serializers.CharField(
        max_length=MAX_CAFE_ADDRESS_LENGTH,
        error_messages={
            'max_length': f'Address cannot exceed {MAX_CAFE_ADDRESS_LENGTH} characters.'
        }
    )

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

    address = serializers.CharField(
        max_length=MAX_CAFE_ADDRESS_LENGTH,
        required=False,
        error_messages={
            'max_length': f'Address cannot exceed {MAX_CAFE_ADDRESS_LENGTH} characters.'
        }
    )

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


# ---------------------------------------------------------------------------
# CafeList / CafeListItem serializers
# ---------------------------------------------------------------------------

class CafeListSerializer(serializers.ModelSerializer):
    """Cafe list (named collection) summary — used in the lists index."""

    class Meta:
        model = CafeList
        fields = ['id', 'name', 'description', 'is_default', 'is_public', 'item_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'is_default', 'is_public', 'item_count', 'created_at', 'updated_at']


class CafeListItemSerializer(serializers.ModelSerializer):
    """Single item inside a named cafe list."""

    cafe = CafeSummarySerializer(read_only=True)

    class Meta:
        model = CafeListItem
        fields = ['cafe', 'note', 'added_at']
        read_only_fields = ['cafe', 'added_at']


class CafeListDetailSerializer(CafeListSerializer):
    """List metadata + all embedded items. Used for GET /api/lists/<id>/."""

    items = CafeListItemSerializer(many=True, read_only=True)

    class Meta(CafeListSerializer.Meta):
        fields = CafeListSerializer.Meta.fields + ['items']


class CafeListCreateSerializer(serializers.ModelSerializer):
    """Write serializer for POST /api/lists/."""

    class Meta:
        model = CafeList
        fields = ['name', 'description']


class CafeListUpdateSerializer(serializers.ModelSerializer):
    """Write serializer for PATCH /api/lists/<id>/."""

    class Meta:
        model = CafeList
        fields = ['name', 'description']
        extra_kwargs = {'name': {'required': False}}


class CafeListItemCreateSerializer(serializers.Serializer):
    """Write serializer for POST /api/lists/<id>/items/."""

    cafe_id = serializers.IntegerField()
    note = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')


class CafeListItemNoteSerializer(serializers.ModelSerializer):
    """Write serializer for PATCH /api/lists/<id>/items/<cafe_id>/."""

    class Meta:
        model = CafeListItem
        fields = ['note']


class CafeListMembershipSerializer(serializers.ModelSerializer):
    """One row in GET /api/cafes/<id>/my-lists/ — all user lists with in_list flag."""

    in_list = serializers.BooleanField(read_only=True)

    class Meta:
        model = CafeList
        fields = ['id', 'name', 'is_default', 'in_list']


class CafeFlagCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating cafe flags (user reports)."""

    description = serializers.CharField(
        max_length=MAX_FLAG_DESCRIPTION_LENGTH,
        required=False,
        allow_blank=True,
        error_messages={
            'max_length': f'Description cannot exceed {MAX_FLAG_DESCRIPTION_LENGTH} characters.'
        }
    )

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

    cafe = CafeSummarySerializer(read_only=True)
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


class CafeFilterSerializer(serializers.Serializer):
    """Validates WFC filter query params for nearby/count endpoints."""

    min_wifi = serializers.DecimalField(max_digits=3, decimal_places=1, required=False, min_value=1, max_value=5)
    max_noise = serializers.DecimalField(max_digits=3, decimal_places=1, required=False, min_value=1, max_value=5)
    min_power = serializers.DecimalField(max_digits=3, decimal_places=1, required=False, min_value=1, max_value=5)
    min_seating = serializers.DecimalField(max_digits=3, decimal_places=1, required=False, min_value=1, max_value=5)
    min_wfc = serializers.DecimalField(max_digits=3, decimal_places=1, required=False, min_value=1, max_value=5)
    price = serializers.CharField(required=False, allow_blank=True)
    hide_closed = serializers.BooleanField(required=False, default=True)
    verified = serializers.BooleanField(required=False, default=False)
    min_reviews = serializers.IntegerField(required=False, default=0, min_value=0)
    include_unregistered = serializers.BooleanField(required=False, default=True)

    def validate_price(self, value):
        if not value:
            return []
        try:
            prices = [int(p.strip()) for p in value.split(',') if p.strip()]
            if not all(1 <= p <= 4 for p in prices):
                raise serializers.ValidationError('Price values must be between 1 and 4.')
            return prices
        except ValueError:
            raise serializers.ValidationError('Invalid price format. Expected comma-separated integers (e.g. "1,2").')


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
    limit = serializers.IntegerField(
        default=10,
        min_value=1,
        max_value=50,
        error_messages={
            'min_value': 'Limit must be at least 1',
            'max_value': 'Limit cannot exceed 50'
        }
    )