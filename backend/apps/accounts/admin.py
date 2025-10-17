from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin with additional fields."""
    
    list_display = [
        'username', 
        'email', 
        'display_name',
        'total_reviews', 
        'total_visits',
        'is_anonymous_display',
        'is_staff',
        'date_joined'
    ]
    
    list_filter = [
        'is_staff',
        'is_superuser',
        'is_active',
        'is_anonymous_display',
        'date_joined'
    ]
    
    search_fields = ['username', 'email', 'first_name', 'last_name']
    
    ordering = ['-date_joined']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Profile', {
            'fields': ('bio', 'avatar_url', 'is_anonymous_display')
        }),
        ('Statistics', {
            'fields': ('total_reviews', 'total_visits'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ['date_joined', 'last_login']
    
    actions = ['update_user_stats', 'enable_anonymous_display', 'disable_anonymous_display']
    
    def update_user_stats(self, request, queryset):
        """Update statistics for selected users."""
        for user in queryset:
            user.update_stats()
        self.message_user(request, f"Updated stats for {queryset.count()} users.")
    update_user_stats.short_description = "Update user statistics"
    
    def enable_anonymous_display(self, request, queryset):
        """Enable anonymous display for selected users."""
        count = queryset.update(is_anonymous_display=True)
        self.message_user(request, f"Enabled anonymous display for {count} users.")
    enable_anonymous_display.short_description = "Enable anonymous display"
    
    def disable_anonymous_display(self, request, queryset):
        """Disable anonymous display for selected users."""
        count = queryset.update(is_anonymous_display=False)
        self.message_user(request, f"Disabled anonymous display for {count} users.")
    disable_anonymous_display.short_description = "Disable anonymous display"