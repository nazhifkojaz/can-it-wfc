from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserSettings, Follow


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin with additional fields."""
    
    list_display = [
        'username',
        'email',
        'display_name',
        'total_reviews',
        'total_visits',
        'followers_count',
        'following_count',
        'is_staff',
        'date_joined'
    ]
    
    list_filter = [
        'is_staff',
        'is_superuser',
        'is_active',
        'date_joined'
    ]
    
    search_fields = ['username', 'email', 'first_name', 'last_name']
    
    ordering = ['-date_joined']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Profile', {
            'fields': ('bio', 'avatar_url',)
        }),
        ('Statistics', {
            'fields': ('total_reviews', 'total_visits', 'followers_count', 'following_count'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['date_joined', 'last_login']
    
    actions = ['update_user_stats']
    
    def update_user_stats(self, request, queryset):
        """Update statistics for selected users."""
        for user in queryset:
            user.update_stats()
        self.message_user(request, f"Updated stats for {queryset.count()} users.")
    update_user_stats.short_description = "Update user statistics"


@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    """User Settings admin."""

    list_display = [
        'user',
        'profile_visibility',
        'show_followers',
        'show_following',
    ]

    list_filter = [
        'profile_visibility',
        'show_followers',
        'show_following'
    ]

    search_fields = ['user__username', 'user__email']


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    """Follow relationships admin."""

    list_display = ['follower', 'followed', 'status', 'created_at']
    list_filter = ['created_at', 'status']
    search_fields = ['follower__username', 'followed__username']
    date_hierarchy = 'created_at'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('follower', 'followed')
