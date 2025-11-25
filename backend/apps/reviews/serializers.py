from rest_framework import serializers
from .models import Visit, Review, ReviewFlag, ReviewHelpful
from apps.accounts.serializers import UserSerializer
from apps.cafes.serializers import CafeListSerializer


class VisitSerializer(serializers.ModelSerializer):
    """Serializer for Visit model with auto-cafe-registration support."""

    cafe = CafeListSerializer(read_only=True)
    cafe_id = serializers.IntegerField(write_only=True, required=False)
    user = UserSerializer(read_only=True)
    has_review = serializers.SerializerMethodField()

    check_in_latitude = serializers.DecimalField(
        max_digits=10, decimal_places=8, write_only=True, required=False,
        error_messages={'required': 'Check-in location is required to verify visit.'}
    )
    check_in_longitude = serializers.DecimalField(
        max_digits=11, decimal_places=8, write_only=True, required=False,
        error_messages={'required': 'Check-in location is required to verify visit.'}
    )

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
            'amount_spent',
            'currency',
            'visit_time',
            'check_in_latitude',
            'check_in_longitude',
            'has_review',
            'created_at',
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

        # Skip most validation for updates (only allow amount_spent and visit_time)
        if self.instance is not None:
            return attrs

        if 'cafe_id' in attrs:
            try:
                cafe = Cafe.objects.get(id=attrs['cafe_id'], is_closed=False)
                attrs['cafe_id'] = cafe
            except Cafe.DoesNotExist:
                raise serializers.ValidationError({
                    'cafe_id': 'Cafe not found or is closed.'
                })

        elif 'google_place_id' in attrs:
            google_place_id = attrs['google_place_id']

            existing_cafe = Cafe.objects.filter(
                google_place_id=google_place_id
            ).first()

            if existing_cafe:
                attrs['cafe_id'] = existing_cafe
            else:
                required_fields = ['cafe_name', 'cafe_address', 'cafe_latitude', 'cafe_longitude']
                missing_fields = [f for f in required_fields if f not in attrs]

                if missing_fields:
                    raise serializers.ValidationError({
                        'non_field_errors': [
                            f'Missing required fields for new cafe: {", ".join(missing_fields)}'
                        ]
                    })

                from apps.cafes.services import GooglePlacesService
                place_details = GooglePlacesService.get_place_details(google_place_id)

                new_cafe = Cafe.objects.create(
                    name=attrs['cafe_name'],
                    address=attrs['cafe_address'],
                    latitude=attrs['cafe_latitude'],
                    longitude=attrs['cafe_longitude'],
                    google_place_id=google_place_id,
                    price_range=place_details.get('price_level') if place_details else None,
                    created_by=request.user,
                    is_verified=False
                )

                attrs['cafe_id'] = new_cafe

        else:
            raise serializers.ValidationError({
                'non_field_errors': [
                    'Either cafe_id or google_place_id must be provided.'
                ]
            })

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

        check_in_lat = attrs.get('check_in_latitude')
        check_in_lng = attrs.get('check_in_longitude')

        if not check_in_lat or not check_in_lng:
            raise serializers.ValidationError({
                'non_field_errors': [
                    'Check-in location is required to verify you are at the cafe.'
                ]
            })

        distance = Cafe.calculate_distance(
            check_in_lat,
            check_in_lng,
            cafe.latitude,
            cafe.longitude
        )

        if distance > 1.0:
            raise serializers.ValidationError({
                'check_in_latitude': [
                    f'You are {distance:.2f}km away from {cafe.name}. You must be within 1km to log a visit.'
                ]
            })

        return attrs

    def create(self, validated_data):
        """Create visit with current user."""
        validated_data.pop('google_place_id', None)
        validated_data.pop('cafe_name', None)
        validated_data.pop('cafe_address', None)
        validated_data.pop('cafe_latitude', None)
        validated_data.pop('cafe_longitude', None)

        cafe = validated_data.pop('cafe_id')
        validated_data['cafe'] = cafe
        validated_data['user'] = self.context['request'].user

        visit = super().create(validated_data)

        cafe.update_stats()

        return visit

    def update(self, instance, validated_data):
        """Update visit within 7-day window."""
        from datetime import date, timedelta

        # Check 7-day window
        days_since_visit = (date.today() - instance.visit_date).days
        if days_since_visit > 7:
            raise serializers.ValidationError({
                'non_field_errors': [
                    f'Cannot edit visit after 7 days. This visit was {days_since_visit} days ago.'
                ]
            })

        # Only allow updating amount_spent, currency, and visit_time
        allowed_fields = ['amount_spent', 'currency', 'visit_time']
        for field in allowed_fields:
            if field in validated_data:
                setattr(instance, field, validated_data[field])

        instance.save()
        return instance


class ReviewListSerializer(serializers.ModelSerializer):
    """Serializer for review list view."""

    user = UserSerializer(read_only=True)
    cafe = CafeListSerializer(read_only=True)
    visit_time_display = serializers.ReadOnlyField()
    is_helpful = serializers.SerializerMethodField()
    user_has_flagged = serializers.SerializerMethodField()

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
            'user_has_flagged',
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

    def get_user_has_flagged(self, obj):
        """Check if current user has flagged this review."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return ReviewFlag.objects.filter(
                review=obj,
                flagged_by=request.user
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
            'has_smoking_area',
            'has_prayer_room',
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

    visit_id = serializers.IntegerField(write_only=True)
    
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
            'has_smoking_area',
            'has_prayer_room',
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
            'has_smoking_area',
            'has_prayer_room',
            'wfc_rating',
            'visit_time',
            'comment'
        ]


class ReviewFlagSerializer(serializers.ModelSerializer):
    """Serializer for flagging reviews."""

    review_id = serializers.IntegerField(write_only=True)
    
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


class CombinedVisitReviewSerializer(serializers.Serializer):
    """
    Serializer for creating a visit with optional review in one request.
    Simplified review form with 5 key criteria.
    Supports both registered cafes (cafe_id) and unregistered cafes (google_place_id).
    """
    # Scenario 1: Existing registered cafe
    cafe_id = serializers.IntegerField(required=False)

    # Scenario 2: Unregistered cafe from Google Places (auto-registers on visit)
    google_place_id = serializers.CharField(required=False)
    cafe_name = serializers.CharField(required=False)
    cafe_address = serializers.CharField(required=False)
    cafe_latitude = serializers.DecimalField(
        max_digits=10, decimal_places=8, required=False
    )
    cafe_longitude = serializers.DecimalField(
        max_digits=11, decimal_places=8, required=False
    )

    visit_date = serializers.DateField()
    amount_spent = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    currency = serializers.CharField(
        max_length=3,
        required=False,
        allow_null=True
    )
    visit_time = serializers.ChoiceField(
        choices=Visit.VISIT_TIME_CHOICES,
        required=False,
        allow_null=True
    )
    check_in_latitude = serializers.DecimalField(
        max_digits=10,
        decimal_places=8,
        required=False,
        allow_null=True
    )
    check_in_longitude = serializers.DecimalField(
        max_digits=11,
        decimal_places=8,
        required=False,
        allow_null=True
    )

    include_review = serializers.BooleanField(default=False)
    wfc_rating = serializers.IntegerField(
        min_value=1,
        max_value=5,
        required=False,
        allow_null=True
    )
    wifi_quality = serializers.IntegerField(
        min_value=1,
        max_value=5,
        required=False,
        allow_null=True
    )
    power_outlets_rating = serializers.IntegerField(
        min_value=1,
        max_value=5,
        required=False,
        allow_null=True
    )
    seating_comfort = serializers.IntegerField(
        min_value=1,
        max_value=5,
        required=False,
        allow_null=True
    )
    noise_level = serializers.IntegerField(
        min_value=1,
        max_value=5,
        required=False,
        allow_null=True
    )
    has_smoking_area = serializers.BooleanField(
        required=False,
        allow_null=True
    )
    has_prayer_room = serializers.BooleanField(
        required=False,
        allow_null=True
    )
    comment = serializers.CharField(
        max_length=160,
        required=False,
        allow_blank=True
    )

    def validate(self, data):
        from apps.cafes.models import Cafe

        # Validate that either cafe_id or google_place_id is provided
        cafe = None
        if 'cafe_id' in data:
            # Scenario 1: Registered cafe
            try:
                cafe = Cafe.objects.get(id=data['cafe_id'], is_closed=False)
            except Cafe.DoesNotExist:
                raise serializers.ValidationError({
                    'cafe_id': 'Cafe not found or is closed.'
                })
        elif 'google_place_id' in data:
            # Scenario 2: Unregistered cafe - validate required fields
            required_fields = ['cafe_name', 'cafe_address', 'cafe_latitude', 'cafe_longitude']
            missing_fields = [f for f in required_fields if f not in data]
            if missing_fields:
                raise serializers.ValidationError({
                    'non_field_errors': [
                        f'Missing required fields for new cafe: {", ".join(missing_fields)}'
                    ]
                })
            # Check if cafe already exists with this google_place_id
            cafe = Cafe.objects.filter(google_place_id=data['google_place_id']).first()
        else:
            raise serializers.ValidationError({
                'non_field_errors': [
                    'Either cafe_id or google_place_id must be provided.'
                ]
            })

        # Check for duplicate visit (same user, cafe, date)
        if cafe and data.get('visit_date'):
            user = self.context['request'].user
            existing_visit = Visit.objects.filter(
                user=user,
                cafe=cafe,
                visit_date=data['visit_date']
            ).exists()
            if existing_visit:
                raise serializers.ValidationError({
                    'visit_date': 'You have already logged a visit to this cafe on this date.'
                })

        if data.get('include_review', False):
            if not data.get('wfc_rating'):
                raise serializers.ValidationError({
                    'wfc_rating': 'Overall WFC rating is required when adding a review.'
                })
        return data

    def create(self, validated_data):
        from apps.cafes.models import Cafe
        from apps.cafes.services import GooglePlacesService

        request = self.context['request']
        user = request.user
        include_review = validated_data.pop('include_review', False)

        review_fields = [
            'wfc_rating', 'wifi_quality', 'power_outlets_rating',
            'seating_comfort', 'noise_level', 'has_smoking_area',
            'has_prayer_room', 'comment'
        ]
        review_data = {}
        for field in review_fields:
            if field in validated_data:
                review_data[field] = validated_data.pop(field)

        # Handle cafe - either get existing or create new
        if 'cafe_id' in validated_data:
            cafe = Cafe.objects.get(id=validated_data.pop('cafe_id'))
        else:
            # Create cafe from Google Places data
            google_place_id = validated_data.pop('google_place_id')

            # Check if cafe already exists
            existing_cafe = Cafe.objects.filter(google_place_id=google_place_id).first()
            if existing_cafe:
                cafe = existing_cafe
            else:
                # Fetch Google Places details for additional data
                place_details = GooglePlacesService.get_place_details(google_place_id)

                cafe = Cafe.objects.create(
                    name=validated_data.pop('cafe_name'),
                    address=validated_data.pop('cafe_address'),
                    latitude=validated_data.pop('cafe_latitude'),
                    longitude=validated_data.pop('cafe_longitude'),
                    google_place_id=google_place_id,
                    price_range=place_details.get('price_level') if place_details else None,
                    created_by=user,
                    is_verified=False
                )

        validated_data['cafe'] = cafe
        validated_data['user'] = user

        visit = Visit.objects.create(**validated_data)

        review = None
        if include_review and review_data.get('wfc_rating'):
            # Copy visit_time from Visit to Review for backward compatibility
            review_data['visit_time'] = visit.visit_time

            wfc_rating = review_data['wfc_rating']
            review_data.setdefault('wifi_quality', review_data.get('wifi_quality', wfc_rating))
            review_data.setdefault('power_outlets_rating', review_data.get('power_outlets_rating', wfc_rating))
            review_data.setdefault('seating_comfort', review_data.get('seating_comfort', wfc_rating))
            review_data.setdefault('noise_level', review_data.get('noise_level', wfc_rating))
            review_data.setdefault('space_availability', wfc_rating)
            review_data.setdefault('coffee_quality', wfc_rating)
            review_data.setdefault('menu_options', wfc_rating)
            review_data.setdefault('bathroom_quality', wfc_rating)

            review = Review.objects.create(
                visit=visit,
                user=user,
                cafe=cafe,
                **review_data
            )

            cafe.update_stats()
            user.update_stats()

        return {
            'visit': visit,
            'review': review
        }