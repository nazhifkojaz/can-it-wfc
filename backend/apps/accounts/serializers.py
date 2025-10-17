from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

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
            'date_joined',
            'account_age_hours'
        ]
        read_only_fields = ['id', 'total_reviews', 'total_visits', 'date_joined', 'account_age_hours']


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
        fields = ['bio', 'avatar_url', 'is_anonymous_display']


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