from rest_framework import serializers
from .models import Cafe, Favorite
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
            'distance'
        ]


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
            'is_favorited'
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
    
    latitude = serializers.DecimalField(max_digits=10, decimal_places=8, required=True)
    longitude = serializers.DecimalField(max_digits=11, decimal_places=8, required=True)
    radius_km = serializers.DecimalField(max_digits=5, decimal_places=2, default=Decimal('1.0'))
    limit = serializers.IntegerField(default=50, min_value=1, max_value=100)


class FavoriteSerializer(serializers.ModelSerializer):
    """Serializer for user favorites."""
    
    cafe = CafeListSerializer(read_only=True)
    
    class Meta:
        model = Favorite
        fields = ['id', 'cafe', 'created_at']
        read_only_fields = ['id', 'created_at']