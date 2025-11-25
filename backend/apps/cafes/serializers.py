from rest_framework import serializers
from .models import Cafe, Favorite, CafeFlag
from apps.accounts.serializers import UserSerializer
from decimal import Decimal


class CafeListSerializer(serializers.ModelSerializer):
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
            'facility_stats'
        ]

    def get_average_ratings(self, obj):
        """
        Calculate average ratings for each WFC criterion.
        Returns None if cafe has no reviews.
        Optimized version for list views.
        """
        # Only calculate for registered cafes with reviews
        if not obj.is_closed and obj.total_reviews > 0:
            from apps.reviews.models import Review
            from django.db.models import Avg

            # Get non-hidden reviews for this cafe
            reviews = Review.objects.filter(cafe=obj, is_hidden=False)

            if not reviews.exists():
                return None

            # Calculate averages for each criterion
            aggregates = reviews.aggregate(
                wifi_quality=Avg('wifi_quality'),
                power_outlets_rating=Avg('power_outlets_rating'),
                seating_comfort=Avg('seating_comfort'),
                noise_level=Avg('noise_level'),
                wfc_rating=Avg('wfc_rating'),
            )

            # Round to 1 decimal place and handle None values
            return {
                'wifi_quality': round(aggregates['wifi_quality'], 1) if aggregates['wifi_quality'] else 0,
                'power_outlets_rating': round(aggregates['power_outlets_rating'], 1) if aggregates['power_outlets_rating'] else 0,
                'seating_comfort': round(aggregates['seating_comfort'], 1) if aggregates['seating_comfort'] else 0,
                'noise_level': round(aggregates['noise_level'], 1) if aggregates['noise_level'] else 0,
                'wfc_rating': round(aggregates['wfc_rating'], 1) if aggregates['wfc_rating'] else 0,
            }

        return None

    def get_facility_stats(self, obj):
        """
        Get facility statistics (smoking area, prayer room) from reviews.
        Returns None if cafe has no reviews.
        """
        # Only calculate for registered cafes with reviews
        if not obj.is_closed and obj.total_reviews > 0:
            from apps.reviews.models import Review
            from django.db.models import Count, Q

            # Get non-hidden reviews for this cafe
            reviews = Review.objects.filter(cafe=obj, is_hidden=False)

            if not reviews.exists():
                return None

            total_reviews = reviews.count()

            # Calculate smoking area stats
            smoking_yes = reviews.filter(has_smoking_area=True).count()
            smoking_no = reviews.filter(has_smoking_area=False).count()
            smoking_unknown = reviews.filter(has_smoking_area__isnull=True).count()

            # Calculate prayer room stats
            prayer_yes = reviews.filter(has_prayer_room=True).count()
            prayer_no = reviews.filter(has_prayer_room=False).count()
            prayer_unknown = reviews.filter(has_prayer_room__isnull=True).count()

            return {
                'smoking_area': {
                    'yes': smoking_yes,
                    'no': smoking_no,
                    'unknown': smoking_unknown,
                    'yes_percentage': round((smoking_yes / total_reviews) * 100, 1) if total_reviews > 0 else 0,
                    'no_percentage': round((smoking_no / total_reviews) * 100, 1) if total_reviews > 0 else 0,
                    'unknown_percentage': round((smoking_unknown / total_reviews) * 100, 1) if total_reviews > 0 else 0,
                },
                'prayer_room': {
                    'yes': prayer_yes,
                    'no': prayer_no,
                    'unknown': prayer_unknown,
                    'yes_percentage': round((prayer_yes / total_reviews) * 100, 1) if total_reviews > 0 else 0,
                    'no_percentage': round((prayer_no / total_reviews) * 100, 1) if total_reviews > 0 else 0,
                    'unknown_percentage': round((prayer_unknown / total_reviews) * 100, 1) if total_reviews > 0 else 0,
                }
            }

        return None


class CafeDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for cafe detail view."""

    created_by = UserSerializer(read_only=True)
    distance = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        required=False,
        read_only=True
    )
    is_favorited = serializers.SerializerMethodField()
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
            'average_ratings',
            'facility_stats'
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
        """Check if current user has favorited this cafe."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, cafe=obj).exists()
        return False

    def get_average_ratings(self, obj):
        """
        Calculate average ratings for each WFC criterion.
        Returns None if cafe has no reviews.
        """
        # Only calculate for registered cafes with reviews
        if not obj.is_closed and obj.total_reviews > 0:
            from apps.reviews.models import Review
            from django.db.models import Avg

            # Get non-hidden reviews for this cafe
            reviews = Review.objects.filter(cafe=obj, is_hidden=False)

            if not reviews.exists():
                return None

            # Calculate averages for each criterion
            aggregates = reviews.aggregate(
                wifi_quality=Avg('wifi_quality'),
                power_outlets_rating=Avg('power_outlets_rating'),
                seating_comfort=Avg('seating_comfort'),
                noise_level=Avg('noise_level'),
                wfc_rating=Avg('wfc_rating'),
            )

            # Round to 1 decimal place and handle None values
            return {
                'wifi_quality': round(aggregates['wifi_quality'], 1) if aggregates['wifi_quality'] else 0,
                'power_outlets_rating': round(aggregates['power_outlets_rating'], 1) if aggregates['power_outlets_rating'] else 0,
                'seating_comfort': round(aggregates['seating_comfort'], 1) if aggregates['seating_comfort'] else 0,
                'noise_level': round(aggregates['noise_level'], 1) if aggregates['noise_level'] else 0,
                'wfc_rating': round(aggregates['wfc_rating'], 1) if aggregates['wfc_rating'] else 0,
            }

        return None

    def get_facility_stats(self, obj):
        """
        Get facility statistics (smoking area, prayer room) from reviews.
        Returns None if cafe has no reviews.
        """
        # Only calculate for registered cafes with reviews
        if not obj.is_closed and obj.total_reviews > 0:
            from apps.reviews.models import Review

            # Get non-hidden reviews for this cafe
            reviews = Review.objects.filter(cafe=obj, is_hidden=False)

            if not reviews.exists():
                return None

            total_reviews = reviews.count()

            # Calculate smoking area stats
            smoking_yes = reviews.filter(has_smoking_area=True).count()
            smoking_no = reviews.filter(has_smoking_area=False).count()
            smoking_unknown = reviews.filter(has_smoking_area__isnull=True).count()

            # Calculate prayer room stats
            prayer_yes = reviews.filter(has_prayer_room=True).count()
            prayer_no = reviews.filter(has_prayer_room=False).count()
            prayer_unknown = reviews.filter(has_prayer_room__isnull=True).count()

            return {
                'smoking_area': {
                    'yes': smoking_yes,
                    'no': smoking_no,
                    'unknown': smoking_unknown,
                    'yes_percentage': round((smoking_yes / total_reviews) * 100, 1) if total_reviews > 0 else 0,
                    'no_percentage': round((smoking_no / total_reviews) * 100, 1) if total_reviews > 0 else 0,
                    'unknown_percentage': round((smoking_unknown / total_reviews) * 100, 1) if total_reviews > 0 else 0,
                },
                'prayer_room': {
                    'yes': prayer_yes,
                    'no': prayer_no,
                    'unknown': prayer_unknown,
                    'yes_percentage': round((prayer_yes / total_reviews) * 100, 1) if total_reviews > 0 else 0,
                    'no_percentage': round((prayer_no / total_reviews) * 100, 1) if total_reviews > 0 else 0,
                    'unknown_percentage': round((prayer_unknown / total_reviews) * 100, 1) if total_reviews > 0 else 0,
                }
            }

        return None


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