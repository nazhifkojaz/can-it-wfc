from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import UserSettings, Follow

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model (public view)."""
    
    display_name = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'display_name',
            'bio',
            'avatar_url',
            'total_reviews',
            'total_visits',
            'date_joined'
        ]
        read_only_fields = ['id', 'total_reviews', 'total_visits', 'date_joined']


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for authenticated user (private view)."""

    display_name = serializers.ReadOnlyField()
    account_age_hours = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'display_name',
            'bio',
            'avatar_url',
            'is_anonymous_display',
            'total_reviews',
            'total_visits',
            'followers_count',
            'following_count',
            'date_joined',
            'account_age_hours'
        ]
        read_only_fields = [
            'id', 'total_reviews', 'total_visits',
            'followers_count', 'following_count',
            'date_joined', 'account_age_hours'
        ]


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2']
    
    def validate(self, attrs):
        """Validate that passwords match."""
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs
    
    def create(self, validated_data):
        """Create user with hashed password."""
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""

    class Meta:
        model = User
        fields = ['username', 'bio', 'avatar_url', 'is_anonymous_display']


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change."""

    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        """Validate old password."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def save(self, **kwargs):
        """Update password."""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class UserSettingsSerializer(serializers.ModelSerializer):
    """Serializer for user privacy and display settings."""

    class Meta:
        model = UserSettings
        fields = [
            'profile_visibility',
            'show_activity_dates',
            'show_followers',
            'show_following',
            'activity_visibility'
        ]


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for public user profiles.
    Respects privacy settings and shows limited information.
    """
    display_name = serializers.ReadOnlyField()
    settings = UserSettingsSerializer(read_only=True)
    is_own_profile = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    is_followed_by = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'display_name',
            'bio',
            'avatar_url',
            'total_reviews',
            'total_visits',
            'followers_count',
            'following_count',
            'date_joined',
            'settings',
            'is_own_profile',
            'is_following',
            'is_followed_by'
        ]
        read_only_fields = [
            'id', 'username', 'total_reviews', 'total_visits',
            'followers_count', 'following_count', 'date_joined'
        ]

    def get_is_own_profile(self, obj):
        """Check if this is the current user's own profile."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return request.user.is_authenticated and request.user.id == obj.id
        return False

    def get_is_following(self, obj):
        """Check if current user is following this user."""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return Follow.objects.filter(follower=request.user, followed=obj).exists()
        return False

    def get_is_followed_by(self, obj):
        """Check if this user is following current user."""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return Follow.objects.filter(follower=obj, followed=request.user).exists()
        return False

    def to_representation(self, instance):
        """Filter representation based on privacy settings."""
        ret = super().to_representation(instance)
        request = self.context.get('request')

        # Get or create settings
        settings, _ = UserSettings.objects.get_or_create(user=instance)

        # Populate settings in response (fix null issue for existing users)
        ret['settings'] = UserSettingsSerializer(settings).data

        # If profile is private and not own profile, hide sensitive data
        is_own_profile = (
            request and
            hasattr(request, 'user') and
            request.user.is_authenticated and
            request.user.id == instance.id
        )

        if settings.profile_visibility == 'private' and not is_own_profile:
            # For private profiles, only show minimal information
            return {
                'id': ret['id'],
                'username': ret['username'],
                'display_name': ret['display_name'],
                'profile_visibility': 'private',
                'message': 'This profile is private'
            }

        return ret


class UserActivityItemSerializer(serializers.Serializer):
    """
    Serializer for user activity items (visits and reviews).
    Returns a unified format for both activity types.
    """
    id = serializers.IntegerField()
    type = serializers.CharField()  # 'visit' or 'review'
    cafe_id = serializers.IntegerField()
    cafe_name = serializers.CharField()
    cafe_google_place_id = serializers.CharField(allow_null=True)
    date = serializers.DateField(allow_null=True)  # Hidden if show_activity_dates=False
    created_at = serializers.DateTimeField()

    # Review-specific fields (null for visits)
    wfc_rating = serializers.IntegerField(allow_null=True)
    comment = serializers.CharField(allow_null=True)

    # Visit-specific fields (null for reviews)
    visit_time = serializers.IntegerField(allow_null=True)
    amount_spent = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    currency = serializers.CharField(allow_null=True)
    visit_id = serializers.IntegerField(allow_null=True)  # For merging reviews with visits


class FollowUserSerializer(serializers.ModelSerializer):
    """Serializer for users in follow lists."""

    display_name = serializers.ReadOnlyField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'display_name',
            'avatar_url',
            'bio',
            'total_visits',
            'total_reviews',
            'is_following'
        ]

    def get_is_following(self, obj):
        """Check if current user is following this user."""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return Follow.objects.filter(follower=request.user, followed=obj).exists()
        return False