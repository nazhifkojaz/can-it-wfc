from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from .models import UserSettings, Follow

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model (public view)."""

    effective_display_name = serializers.ReadOnlyField(
        help_text="The display name shown in UI (custom display_name or username)"
    )

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'display_name',
            'effective_display_name',
            'bio',
            'avatar_url',
            'total_reviews',
            'total_visits',
            'date_joined'
        ]
        read_only_fields = ['id', 'total_reviews', 'total_visits', 'date_joined']


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for authenticated user's own profile only.

    WARNING: Contains PII (email). Only use for endpoints that return
    the requesting user's own data (e.g. /auth/me/, login response).
    Never use in public-facing or other-user endpoints.
    """

    effective_display_name = serializers.ReadOnlyField()
    account_age_hours = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'display_name',
            'effective_display_name',
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
    """
    Serializer for updating user profile.

    Fields:
    - display_name: Customizable display name (always editable)
    - username: Changeable with 30-day cooldown
    - avatar_url: Only accepts whitelisted domains (Cloudinary, Google)
    """

    # Explicit avatar_url field with validation
    avatar_url = serializers.URLField(
        required=False,
        allow_null=True,
        allow_blank=True
    )

    # Allow display_name updates
    display_name = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=50
    )

    # Allow username changes with cooldown validation
    username = serializers.CharField(required=False)

    class Meta:
        model = User
        fields = ['username', 'display_name', 'bio', 'avatar_url', 'is_anonymous_display']

    def validate_username(self, value):
        """
        Validate username change with cooldown period and uniqueness check.
        """
        user = self.instance

        # If same username, allow (no change)
        if user.username == value:
            return value

        # Check cooldown period (30 days)
        if user.username_changed_at:
            days_since_change = (timezone.now() - user.username_changed_at).days
            cooldown_days = User.USERNAME_CHANGE_COOLDOWN_DAYS

            if days_since_change < cooldown_days:
                remaining_days = cooldown_days - days_since_change
                raise serializers.ValidationError(
                    {
                        'username': f"Can only change username every {cooldown_days} days. "
                                    f"{remaining_days} days remaining."
                    }
                )

        # Check uniqueness
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                {'username': 'This username is already taken.'}
            )

        return value

    def update(self, instance, validated_data):
        """
        Update user instance and track username changes.
        """
        # Check if username is being changed
        if 'username' in validated_data and validated_data['username'] != instance.username:
            instance.username_changed_at = timezone.now()

        # Call parent's update method
        return super().update(instance, validated_data)

    def validate_avatar_url(self, value):
        """
        Validate avatar_url against a domain whitelist.

        Only allows URLs from trusted domains (Cloudinary, Google).
        Rejects private IP addresses and internal URLs.
        """
        # Allow null/empty values (user can clear their avatar)
        if not value or value.strip() == '':
            return None

        from urllib.parse import urlparse
        import ipaddress

        try:
            parsed = urlparse(value)
            netloc = parsed.netloc.lower()

            # Remove port if present
            if ':' in netloc:
                netloc = netloc.split(':')[0]

            # Allowed domains for avatar hosting
            allowed_domains = [
                'res.cloudinary.com',
                'lh3.googleusercontent.com'
            ]

            if netloc not in allowed_domains:
                raise serializers.ValidationError(
                    f"Avatar URL must be from an approved provider: {', '.join(allowed_domains)}"
                )

            # Additional safety: reject private IP ranges
            try:
                ip = ipaddress.ip_address(netloc)
                if ip.is_private or ip.is_loopback or ip.is_link_local:
                    raise serializers.ValidationError(
                        "Avatar URL cannot use private IP addresses."
                    )
            except ValueError:
                # Not an IP address, that's fine
                pass

        except serializers.ValidationError:
            # Re-raise our validation errors
            raise
        except Exception:
            # If URL parsing fails, reject the URL
            raise serializers.ValidationError("Invalid avatar URL format.")

        return value


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
        """Update password and invalidate all existing sessions."""
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()

        # Blacklist all outstanding refresh tokens to force re-login
        tokens = OutstandingToken.objects.filter(user=user)
        for token in tokens:
            BlacklistedToken.objects.get_or_create(token=token)

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
    effective_display_name = serializers.ReadOnlyField()
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
            'effective_display_name',
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
                'effective_display_name': ret['effective_display_name'],
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

    effective_display_name = serializers.ReadOnlyField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'display_name',
            'effective_display_name',
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