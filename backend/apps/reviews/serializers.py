from rest_framework import serializers
from .models import Visit, Review, ReviewFlag, ReviewHelpful
from apps.accounts.serializers import UserSerializer
from apps.cafes.serializers import CafeListSerializer


class VisitSerializer(serializers.ModelSerializer):
    """Serializer for Visit model with auto-cafe-registration support."""

    cafe = CafeListSerializer(read_only=True)
    cafe_id = serializers.UUIDField(write_only=True, required=False)
    user = UserSerializer(read_only=True)
    has_review = serializers.SerializerMethodField()

    # NEW: For creating cafes from Google Places
    google_place_id = serializers.CharField(write_only=True, required=False)
    cafe_name = serializers.CharField(write_only=True, required=False)
    cafe_address = serializers.CharField(write_only=True, required=False)
    cafe_latitude = serializers.DecimalField(
        max_digits=10, decimal_places=8, write_only=True, required=False
    )
    cafe_longitude = serializers.DecimalField(
        max_digits=11, decimal_places=8, write_only=True, required=False
    )

    class Meta:
        model = Visit
        fields = [
            'id',
            'cafe',
            'cafe_id',
            'user',
            'visit_date',
            'check_in_latitude',
            'check_in_longitude',
            'has_review',
            'created_at',
            # NEW fields for cafe creation
            'google_place_id',
            'cafe_name',
            'cafe_address',
            'cafe_latitude',
            'cafe_longitude',
        ]
        read_only_fields = ['id', 'user', 'created_at']
    
    def get_has_review(self, obj):
        """Check if visit has a review."""
        return hasattr(obj, 'review') and obj.review is not None
    
    def validate(self, attrs):
        """Validate visit data and handle cafe creation if needed."""
        request = self.context.get('request')
        from apps.cafes.models import Cafe

        # Scenario 1: cafe_id provided (existing registered cafe)
        if 'cafe_id' in attrs:
            try:
                cafe = Cafe.objects.get(id=attrs['cafe_id'], is_closed=False)
                attrs['cafe_id'] = cafe
            except Cafe.DoesNotExist:
                raise serializers.ValidationError({
                    'cafe_id': 'Cafe not found or is closed.'
                })

        # Scenario 2: google_place_id provided (unregistered cafe from Google Places)
        elif 'google_place_id' in attrs:
            google_place_id = attrs['google_place_id']

            # Check if cafe already exists with this google_place_id
            existing_cafe = Cafe.objects.filter(
                google_place_id=google_place_id
            ).first()

            if existing_cafe:
                # Cafe was already registered by someone else
                attrs['cafe_id'] = existing_cafe
            else:
                # Need to create new cafe - validate required fields
                required_fields = ['cafe_name', 'cafe_address', 'cafe_latitude', 'cafe_longitude']
                missing_fields = [f for f in required_fields if f not in attrs]

                if missing_fields:
                    raise serializers.ValidationError({
                        'non_field_errors': [
                            f'Missing required fields for new cafe: {", ".join(missing_fields)}'
                        ]
                    })

                # Get additional details from Google Places if available
                from apps.cafes.services import GooglePlacesService
                place_details = GooglePlacesService.get_place_details(google_place_id)

                # Create the cafe
                new_cafe = Cafe.objects.create(
                    name=attrs['cafe_name'],
                    address=attrs['cafe_address'],
                    latitude=attrs['cafe_latitude'],
                    longitude=attrs['cafe_longitude'],
                    google_place_id=google_place_id,
                    price_range=place_details.get('price_level') if place_details else None,
                    created_by=request.user,
                    is_verified=False  # Will be verified by admin later
                )

                attrs['cafe_id'] = new_cafe

        else:
            raise serializers.ValidationError({
                'non_field_errors': [
                    'Either cafe_id or google_place_id must be provided.'
                ]
            })

        # Check for duplicate visit on same day
        visit_date = attrs.get('visit_date')
        cafe = attrs['cafe_id']

        if Visit.objects.filter(
            user=request.user,
            cafe=cafe,
            visit_date=visit_date
        ).exists():
            raise serializers.ValidationError({
                'non_field_errors': [
                    'You already logged a visit to this cafe on this date.'
                ]
            })

        # Validate check-in location if provided
        check_in_lat = attrs.get('check_in_latitude')
        check_in_lng = attrs.get('check_in_longitude')

        if check_in_lat and check_in_lng:
            distance = Cafe.calculate_distance(
                check_in_lat,
                check_in_lng,
                cafe.latitude,
                cafe.longitude
            )
            if distance > 1.0:  # More than 1km away
                raise serializers.ValidationError({
                    'check_in_latitude': [
                        f'Check-in location is {distance:.2f}km from cafe. Must be within 1km.'
                    ]
                })

        return attrs

    def create(self, validated_data):
        """Create visit with current user."""
        # Remove cafe creation fields (they were used in validate())
        validated_data.pop('google_place_id', None)
        validated_data.pop('cafe_name', None)
        validated_data.pop('cafe_address', None)
        validated_data.pop('cafe_latitude', None)
        validated_data.pop('cafe_longitude', None)

        # cafe_id is already a Cafe object from validate()
        cafe = validated_data.pop('cafe_id')
        validated_data['cafe'] = cafe
        validated_data['user'] = self.context['request'].user

        visit = super().create(validated_data)

        # Update cafe stats
        cafe.update_stats()

        return visit


class ReviewListSerializer(serializers.ModelSerializer):
    """Serializer for review list view."""

    user = UserSerializer(read_only=True)
    cafe = CafeListSerializer(read_only=True)
    visit_time_display = serializers.ReadOnlyField()
    is_helpful = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id',
            'user',
            'cafe',
            'wfc_rating',
            'wifi_quality',
            'noise_level',
            'visit_time',
            'visit_time_display',
            'comment',
            'helpful_count',
            'is_helpful',
            'created_at'
        ]

    def get_is_helpful(self, obj):
        """Check if current user marked this review as helpful."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return ReviewHelpful.objects.filter(
                review=obj,
                user=request.user
            ).exists()
        return False


class ReviewDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for review."""

    user = UserSerializer(read_only=True)
    cafe = CafeListSerializer(read_only=True)
    visit = VisitSerializer(read_only=True)
    visit_time_display = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField()
    is_helpful = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id',
            'user',
            'cafe',
            'visit',
            'wifi_quality',
            'power_outlets_rating',
            'noise_level',
            'seating_comfort',
            'space_availability',
            'coffee_quality',
            'menu_options',
            'bathroom_quality',
            'wfc_rating',
            'visit_time',
            'visit_time_display',
            'comment',
            'helpful_count',
            'is_helpful',
            'average_rating',
            'created_at',
            'updated_at'
        ]

    def get_is_helpful(self, obj):
        """Check if current user marked this review as helpful."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return ReviewHelpful.objects.filter(
                review=obj,
                user=request.user
            ).exists()
        return False


class ReviewCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a review."""
    
    visit_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = Review
        fields = [
            'visit_id',
            'wifi_quality',
            'power_outlets_rating',
            'noise_level',
            'seating_comfort',
            'space_availability',
            'coffee_quality',
            'menu_options',
            'bathroom_quality',
            'wfc_rating',
            'visit_time',
            'comment'
        ]
    
    def validate_visit_id(self, value):
        """Validate that user can review this visit."""
        request = self.context.get('request')
        
        try:
            visit = Visit.objects.get(id=value)
        except Visit.DoesNotExist:
            raise serializers.ValidationError("Visit not found.")
        
        # Check if visit belongs to user
        if visit.user != request.user:
            raise serializers.ValidationError("You can only review your own visits.")
        
        # Check if visit already has a review
        if hasattr(visit, 'review') and visit.review is not None:
            raise serializers.ValidationError("This visit already has a review.")
        
        return visit
    
    def validate(self, attrs):
        """Additional validation."""
        request = self.context.get('request')
        
        # Check if user can review (account age)
        if not request.user.can_review():
            raise serializers.ValidationError({
                'non_field_errors': [
                    'Your account must be at least 24 hours old to post reviews.'
                ]
            })
        
        # Check spam
        visit = attrs.get('visit_id')
        # Create temporary review object for spam check
        temp_review = Review(
            user=request.user,
            cafe=visit.cafe,
            visit=visit
        )
        is_spam, reason = temp_review.check_spam()
        if is_spam:
            raise serializers.ValidationError({
                'non_field_errors': [f'Review blocked: {reason}']
            })
        
        return attrs
    
    def create(self, validated_data):
        """Create review with user and cafe from visit."""
        visit = validated_data.pop('visit_id')
        validated_data['visit'] = visit
        validated_data['user'] = self.context['request'].user
        validated_data['cafe'] = visit.cafe
        
        review = super().create(validated_data)
        
        # Update cafe and user stats
        visit.cafe.update_stats()
        self.context['request'].user.update_stats()
        
        return review


class ReviewUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a review."""
    
    class Meta:
        model = Review
        fields = [
            'wifi_quality',
            'power_outlets_rating',
            'noise_level',
            'seating_comfort',
            'space_availability',
            'coffee_quality',
            'menu_options',
            'bathroom_quality',
            'wfc_rating',
            'visit_time',
            'comment'
        ]


class ReviewFlagSerializer(serializers.ModelSerializer):
    """Serializer for flagging reviews."""
    
    review_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = ReviewFlag
        fields = ['id', 'review_id', 'reason', 'comment', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def validate_review_id(self, value):
        """Validate that user hasn't already flagged this review."""
        request = self.context.get('request')
        
        try:
            review = Review.objects.get(id=value)
        except Review.DoesNotExist:
            raise serializers.ValidationError("Review not found.")
        
        if ReviewFlag.objects.filter(review=review, flagged_by=request.user).exists():
            raise serializers.ValidationError("You have already flagged this review.")
        
        # Can't flag own reviews
        if review.user == request.user:
            raise serializers.ValidationError("You cannot flag your own review.")
        
        return review
    
    def create(self, validated_data):
        """Create flag with current user."""
        review = validated_data.pop('review_id')
        validated_data['review'] = review
        validated_data['flagged_by'] = self.context['request'].user
        return super().create(validated_data)