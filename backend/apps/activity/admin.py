"""
Django admin configuration for Activity app.
"""
from django.contrib import admin
from .models import Activity


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    """Admin interface for Activity model."""

    list_display = [
        'id',
        'recipient',
        'actor',
        'activity_type',
        'created_at',
        'is_deleted'
    ]

    list_filter = [
        'activity_type',
        'is_deleted',
        'created_at'
    ]

    search_fields = [
        'recipient__username',
        'actor__username',
        'data'
    ]

    date_hierarchy = 'created_at'

    readonly_fields = ['created_at']

    def get_queryset(self, request):
        """Optimize queryset with select_related."""
        qs = super().get_queryset(request)
        return qs.select_related('recipient', 'actor')

    def has_add_permission(self, request):
        """
        Disable manual creation.
        Activities should only be created via signals.
        """
        return False
