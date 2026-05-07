from rest_framework import serializers
from django.db import transaction
from apps.core.constants import MAX_CHECKIN_DISTANCE_KM, VISIT_TIME_CHOICES
from core.logging import get_logger
from .models import Visit, Review, ReviewFlag, ReviewHelpful
from apps.accounts.serializers import UserSerializer
from apps.cafes.serializers import CafeSummarySerializer as CafeListSerializer
from apps.cafes.models import Cafe

logger = get_logger(__name__)


class CafeVisitValidationMixin:
    def _resolve_cafe(self, data, request):
        if 'cafe_id' in data:
            try:
                return Cafe.objects.get(id=data['cafe_id'], is_closed=False)
            except Cafe.DoesNotExist:
                raise serializers.ValidationError({
                    'cafe_id': 'Cafe not found or is closed.'
                })
        elif 'google_place_id' in data:
            required_fields = ['cafe_name', 'cafe_address', 'cafe_latitude', 'cafe_longitude']
            missing_fields = [f for f in required_fields if f not in data]
            if missing_fields:
                raise serializers.ValidationError({
                    'non_field_errors': [
                        f'Missing required fields for new cafe: {", ".join(missing_fields)}'
                    ]
                })
            return None
        else:
            raise serializers.ValidationError({
                'non_field_errors': [
                    'Either cafe_id or google_place_id must be provided.'
                ]
            })

    def _validate_no_duplicate_visit(self, user, cafe, visit_date):
        if cafe and visit_date:
            if Visit.objects.filter(user=user, cafe=cafe, visit_date=visit_date).exists():
                raise serializers.ValidationError({
                    'visit_date': [
                        'You already logged a visit to this cafe on this date.'
                    ]
                })

    def _validate_checkin_distance(self, cafe, check_in_lat, check_in_lng):
        if cafe:
            if not check_in_lat or not check_in_lng:
                raise serializers.ValidationError({
                    'non_field_errors': [
                        'Check-in location is required to verify you are at the cafe.'
                    ]
                })

            distance = Cafe.calculate_distance(
                check_in_lat, check_in_lng,
                cafe.latitude, cafe.longitude
            )
            if distance > MAX_CHECKIN_DISTANCE_KM:
                raise serializers.ValidationError({
                    'check_in_latitude': [
                        f'You are {distance:.2f}km away from {cafe.name}. '
                        f'You must be within {MAX_CHECKIN_DISTANCE_KM}km to log a visit.'
                    ]
                })


class VisitSerializer(CafeVisitValidationMixin, serializers.ModelSerializer):
    """
    Serializer for Visit model with auto-cafe-registration support.
    """

    cafe = CafeListSerializer(read_only=True)
    cafe_id = serializers.IntegerField(write_only=True, required=False)
    user = UserSerializer(read_only=True)

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
            'created_at',
            'google_place_id',
            'cafe_name',
            'cafe_address',
            'cafe_latitude',
            'cafe_longitude',
        ]
        read_only_fields = ['id', 'user', 'created_at']
    
    def validate(self, attrs):
        request = self.context.get('request')

        if self.instance is not None:
            return attrs

        cafe = self._resolve_cafe(attrs, request)

        if cafe is None and 'google_place_id' in attrs:
            from apps.cafes.services import CafeService

            cafe_data = {
                'name': attrs['cafe_name'],
                'address': attrs['cafe_address'],
                'latitude': attrs['cafe_latitude'],
                'longitude': attrs['cafe_longitude'],
            }

            try:
                cafe, created = CafeService.get_or_create_from_google(
                    google_place_id=attrs['google_place_id'],
                    cafe_data=cafe_data,
                    created_by=request.user
                )
            except ValueError as e:
                logger.error(f'Cafe validation error: {str(e)}', exc_info=True)
                raise serializers.ValidationError({
                    'non_field_errors': ['An error occurred while processing the cafe data. Please try again.']
                })

        attrs['cafe_id'] = cafe

        self._validate_no_duplicate_visit(request.user, cafe, attrs.get('visit_date'))
        self._validate_checkin_distance(cafe, attrs.get('check_in_latitude'), attrs.get('check_in_longitude'))

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        """
        Create visit with current user and update cafe stats atomically.
        Uses @transaction.atomic to ensure visit creation and stats update succeed together.
        """
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
        from datetime import date

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
        """
        Check if current user marked this review as helpful.
        Uses prefetched data to avoid N+1 queries.
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Use prefetched data if available (from queryset optimization)
            if hasattr(obj, 'user_helpful'):
                return bool(obj.user_helpful)
            # Fallback to query if not prefetched
            return ReviewHelpful.objects.filter(
                review=obj,
                user=request.user
            ).exists()
        return False

    def get_user_has_flagged(self, obj):
        """
        Check if current user has flagged this review.
        Uses prefetched data to avoid N+1 queries.
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Use prefetched data if available (from queryset optimization)
            if hasattr(obj, 'user_flags'):
                return bool(obj.user_flags)
            # Fallback to query if not prefetched
            return ReviewFlag.objects.filter(
                review=obj,
                flagged_by=request.user
            ).exists()
        return False


class ReviewDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for review.
    """

    user = UserSerializer(read_only=True)
    cafe = CafeListSerializer(read_only=True)
    visit_time_display = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField()
    is_helpful = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            'id',
            'user',
            'cafe',
            'wifi_quality',
            'power_outlets_rating',
            'noise_level',
            'seating_comfort',
            'has_smoking_area',
            'has_prayer_room',
            'has_indoor_seating',
            'has_outdoor_seating',
            'wfc_rating',
            'visit_time',
            'visit_time_display',
            'comment',
            'helpful_count',
            'is_helpful',
            'is_hidden',
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
    """
    Serializer for creating a review.
    One user can only have one review per cafe.
    """

    cafe_id = serializers.IntegerField(write_only=True)
    wfc_rating = serializers.IntegerField(
        min_value=1, max_value=5, required=False, allow_null=True
    )

    class Meta:
        model = Review
        fields = [
            'cafe_id',
            'wifi_quality',
            'power_outlets_rating',
            'noise_level',
            'seating_comfort',
            'has_smoking_area',
            'has_prayer_room',
            'has_indoor_seating',
            'has_outdoor_seating',
            'wfc_rating',
            'visit_time',
            'comment'
        ]

    def validate_cafe_id(self, value):
        """Validate that cafe exists."""
        try:
            cafe = Cafe.objects.get(id=value, is_closed=False)
        except Cafe.DoesNotExist:
            raise serializers.ValidationError("Cafe not found or is closed.")

        return cafe

    def validate(self, attrs):
        """Additional validation and auto-compute wfc_rating."""
        request = self.context.get('request')
        cafe = attrs.get('cafe_id')

        # Auto-compute wfc_rating if missing
        if attrs.get('wfc_rating') is None:
            attrs['wfc_rating'] = Review.compute_wfc_rating(
                attrs.get('wifi_quality', 3),
                attrs.get('noise_level', 3),
                attrs.get('seating_comfort', 3),
                attrs.get('power_outlets_rating'),
            )

        # Check if user can review (account age)
        if not request.user.can_review():
            raise serializers.ValidationError({
                'non_field_errors': [
                    'Your account must be at least 24 hours old to post reviews.'
                ]
            })

        # IMPORTANT: Check if user already has a review for this cafe
        existing_review = Review.objects.filter(
            user=request.user,
            cafe=cafe
        ).first()

        if existing_review:
            raise serializers.ValidationError({
                'cafe_id': f'You have already reviewed this cafe. Use PATCH /api/reviews/{existing_review.id}/ to update your review.'
            })

        # Check spam
        temp_review = Review(
            user=request.user,
            cafe=cafe
        )
        is_spam, reason = temp_review.check_spam()
        if is_spam:
            raise serializers.ValidationError({
                'non_field_errors': [f'Review blocked: {reason}']
            })

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        """
        Create review with user and cafe, and update stats atomically.
        Uses @transaction.atomic to ensure review creation and stats updates succeed together.
        """
        cafe = validated_data.pop('cafe_id')
        validated_data['user'] = self.context['request'].user
        validated_data['cafe'] = cafe

        review = super().create(validated_data)

        # Update cafe and user stats
        cafe.update_stats()
        self.context['request'].user.update_stats()

        return review


class ReviewUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a review."""

    wfc_rating = serializers.IntegerField(
        min_value=1, max_value=5, required=False, allow_null=True
    )

    class Meta:
        model = Review
        fields = [
            'wifi_quality',
            'power_outlets_rating',
            'noise_level',
            'seating_comfort',
            'has_smoking_area',
            'has_prayer_room',
            'has_indoor_seating',
            'has_outdoor_seating',
            'wfc_rating',
            'visit_time',
            'comment'
        ]

    def validate(self, attrs):
        """Auto-compute wfc_rating if missing."""
        if self.instance and attrs.get('wfc_rating') is None:
            power = attrs.get('power_outlets_rating')
            if power is None and self.instance.power_outlets_rating is not None:
                power = self.instance.power_outlets_rating
            attrs['wfc_rating'] = Review.compute_wfc_rating(
                attrs.get('wifi_quality', self.instance.wifi_quality),
                attrs.get('noise_level', self.instance.noise_level),
                attrs.get('seating_comfort', self.instance.seating_comfort),
                power,
            )
        return attrs


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


class CombinedVisitReviewSerializer(CafeVisitValidationMixin, serializers.Serializer):
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
        choices=VISIT_TIME_CHOICES,
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
        allow_null=True,
        help_text="Overall WFC suitability (1=not suitable, 5=perfect for WFC). Auto-computed from sub-criteria if omitted."
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
    has_indoor_seating = serializers.BooleanField(
        required=False,
        allow_null=True
    )
    has_outdoor_seating = serializers.BooleanField(
        required=False,
        allow_null=True
    )
    comment = serializers.CharField(
        max_length=160,
        required=False,
        allow_blank=True
    )

    def validate(self, data):
        request = self.context['request']
        user = request.user

        cafe = self._resolve_cafe(data, request)

        if cafe is None and 'google_place_id' in data:
            cafe = Cafe.objects.filter(google_place_id=data['google_place_id']).first()

        self._validate_no_duplicate_visit(user, cafe, data.get('visit_date'))
        self._validate_checkin_distance(cafe, data.get('check_in_latitude'), data.get('check_in_longitude'))

        if data.get('include_review', False):
            if data.get('wifi_quality') is None:
                data['wifi_quality'] = 3
            if data.get('noise_level') is None:
                data['noise_level'] = 3
            if data.get('seating_comfort') is None:
                data['seating_comfort'] = 3
            if not data.get('wfc_rating'):
                data['wfc_rating'] = Review.compute_wfc_rating(
                    data['wifi_quality'],
                    data['noise_level'],
                    data['seating_comfort'],
                    data.get('power_outlets_rating'),
                )
        return data

    def create(self, validated_data):
        """
        Create visit and optional review.

        Cafe get/create happens BEFORE the transaction to avoid:
        1. Holding a transaction open during external API calls
        2. Creating orphaned cafes if visit creation fails

        The transaction only wraps visit+review creation.
        """
        from apps.cafes.services import CafeService

        request = self.context['request']
        user = request.user
        include_review = validated_data.pop('include_review', False)

        review_fields = [
            'wfc_rating', 'wifi_quality', 'power_outlets_rating',
            'seating_comfort', 'noise_level', 'has_smoking_area',
            'has_prayer_room', 'has_indoor_seating', 'has_outdoor_seating',
            'comment'
        ]
        review_data = {}
        for field in review_fields:
            if field in validated_data:
                review_data[field] = validated_data.pop(field)

        # STEP 1: Get or create cafe OUTSIDE the transaction
        # This prevents holding a transaction open during Google API calls
        # and ensures we don't create orphaned cafes if visit creation fails
        if 'cafe_id' in validated_data:
            # Existing cafe - just fetch it
            cafe = Cafe.objects.get(id=validated_data.pop('cafe_id'))
        else:
            # New cafe - get or create from Google Places data
            google_place_id = validated_data.pop('google_place_id')

            cafe_data = {
                'name': validated_data.pop('cafe_name'),
                'address': validated_data.pop('cafe_address'),
                'latitude': validated_data.pop('cafe_latitude'),
                'longitude': validated_data.pop('cafe_longitude'),
            }

            cafe, created = CafeService.get_or_create_from_google(
                google_place_id=google_place_id,
                cafe_data=cafe_data,
                created_by=user
            )

        # STEP 2: Create visit and review inside atomic transaction
        # If this fails, we don't rollback the cafe (which is fine -
        # the cafe already exists or was created intentionally)
        validated_data['cafe'] = cafe
        validated_data['user'] = user

        with transaction.atomic():
            visit = Visit.objects.create(**validated_data)

            review = None
            message = None

            if include_review and review_data.get('wfc_rating'):
                # Check if user already has a review for this cafe
                existing_review = Review.objects.filter(
                    user=user,
                    cafe=cafe
                ).first()

                if existing_review:
                    # User already has a review - don't create duplicate
                    review = existing_review
                    message = 'Visit created. You already have a review for this cafe.'
                else:
                    # Create new review
                    # Set visit_time on the review from the visit
                    review_data['visit_time'] = visit.visit_time

                    review = Review.objects.create(
                        user=user,
                        cafe=cafe,
                        **review_data
                    )

                    cafe.update_stats()
                    user.update_stats()

        return {
            'visit': visit,
            'review': review,
            'message': message
        }