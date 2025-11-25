from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Cafe, Favorite, CafeFlag


@admin.register(Cafe)
class CafeAdmin(admin.ModelAdmin):
    """Admin interface for Cafe model with detailed information."""
    
    list_display = [
        'name',
        'address_short',
        'price_display',
        'average_wfc_rating',
        'total_reviews',
        'total_visits',
        'unique_visitors',
        'is_verified',
        'is_closed',
        'created_at'
    ]
    
    list_filter = [
        'is_closed',
        'is_verified',
        'price_range',
        'created_at'
    ]
    
    search_fields = ['name', 'address', 'google_place_id']
    
    ordering = ['-created_at']
    
    readonly_fields = [
        'created_at',
        'updated_at',
        'total_visits',
        'unique_visitors',
        'total_reviews',
        'average_wfc_rating',
        'google_maps_link'
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'address', 'website', 'phone', 'price_range')
        }),
        ('Location', {
            'fields': ('latitude', 'longitude', 'google_maps_link')
        }),
        ('External IDs', {
            'fields': ('google_place_id',),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': (
                'total_visits',
                'unique_visitors',
                'total_reviews',
                'average_wfc_rating'
            ),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_closed', 'is_verified', 'created_by', 'created_at', 'updated_at')
        }),
    )
    
    actions = [
        'mark_as_verified',
        'mark_as_closed',
        'mark_as_open',
        'update_cafe_stats',
        'find_potential_duplicates'
    ]
    
    def address_short(self, obj):
        """Show shortened address."""
        return obj.address[:50] + '...' if len(obj.address) > 50 else obj.address
    address_short.short_description = 'Address'
    
    def price_display(self, obj):
        """Display price range with symbols."""
        if obj.price_range:
            return '$' * obj.price_range
        return '-'
    price_display.short_description = 'Price'
    
    def google_maps_link(self, obj):
        """Generate Google Maps link."""
        url = f"https://www.google.com/maps?q={obj.latitude},{obj.longitude}"
        return format_html('<a href="{}" target="_blank">View on Google Maps</a>', url)
    google_maps_link.short_description = 'Google Maps'
    
    def mark_as_verified(self, request, queryset):
        """Mark selected cafes as verified."""
        count = queryset.update(is_verified=True)
        self.message_user(request, f"Marked {count} cafes as verified.")
    mark_as_verified.short_description = "Mark as verified"
    
    def mark_as_closed(self, request, queryset):
        """Mark selected cafes as closed."""
        count = queryset.update(is_closed=True)
        self.message_user(request, f"Marked {count} cafes as closed.")
    mark_as_closed.short_description = "Mark as closed"
    
    def mark_as_open(self, request, queryset):
        """Mark selected cafes as open."""
        count = queryset.update(is_closed=False)
        self.message_user(request, f"Marked {count} cafes as open.")
    mark_as_open.short_description = "Mark as open"
    
    def update_cafe_stats(self, request, queryset):
        """Update statistics for selected cafes."""
        for cafe in queryset:
            cafe.update_stats()
        self.message_user(request, f"Updated stats for {queryset.count()} cafes.")
    update_cafe_stats.short_description = "Update cafe statistics"
    
    def find_potential_duplicates(self, request, queryset):
        """Find potential duplicate cafes."""
        for cafe in queryset:
            duplicates = Cafe.find_duplicates(
                cafe.name,
                cafe.latitude,
                cafe.longitude
            )
            if duplicates:
                dup_names = ', '.join([d.name for d in duplicates[:3]])
                self.message_user(
                    request,
                    f"'{cafe.name}' has {len(duplicates)} potential duplicates: {dup_names}",
                    level='warning'
                )
            else:
                self.message_user(request, f"No duplicates found for '{cafe.name}'")
    find_potential_duplicates.short_description = "Find potential duplicates"


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    """Admin interface for user favorites."""

    list_display = ['user', 'cafe', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'cafe__name']
    ordering = ['-created_at']
    readonly_fields = ['created_at']


@admin.register(CafeFlag)
class CafeFlagAdmin(admin.ModelAdmin):
    """Admin interface for cafe flags (user reports)."""

    list_display = [
        'cafe',
        'user',
        'reason_display',
        'status',
        'created_at',
        'resolved_at'
    ]

    list_filter = [
        'status',
        'reason',
        'created_at',
        'resolved_at'
    ]

    search_fields = [
        'cafe__name',
        'user__username',
        'description',
        'resolution_notes'
    ]

    ordering = ['-created_at']

    readonly_fields = [
        'user',
        'cafe',
        'created_at',
        'updated_at'
    ]

    fieldsets = (
        ('Flag Information', {
            'fields': ('cafe', 'user', 'reason', 'description', 'created_at')
        }),
        ('Status', {
            'fields': ('status', 'resolved_by', 'resolution_notes', 'resolved_at', 'updated_at')
        }),
    )

    actions = [
        'mark_as_resolved',
        'mark_as_dismissed',
        'mark_as_pending'
    ]

    def reason_display(self, obj):
        """Display reason with colored badge."""
        colors = {
            'not_cafe': '#ef4444',  # red
            'wrong_location': '#f59e0b',  # orange
            'permanently_closed': '#6b7280',  # gray
            'duplicate': '#8b5cf6',  # purple
        }
        color = colors.get(obj.reason, '#3b82f6')
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px; font-weight: bold;">{}</span>',
            color,
            obj.get_reason_display()
        )
    reason_display.short_description = 'Reason'

    def mark_as_resolved(self, request, queryset):
        """Mark selected flags as resolved."""
        count = queryset.update(
            status='resolved',
            resolved_by=request.user,
            resolved_at=timezone.now()
        )
        self.message_user(request, f"Marked {count} flags as resolved.")
    mark_as_resolved.short_description = "Mark as resolved"

    def mark_as_dismissed(self, request, queryset):
        """Mark selected flags as dismissed."""
        count = queryset.update(
            status='dismissed',
            resolved_by=request.user,
            resolved_at=timezone.now()
        )
        self.message_user(request, f"Dismissed {count} flags.")
    mark_as_dismissed.short_description = "Mark as dismissed"

    def mark_as_pending(self, request, queryset):
        """Mark selected flags as pending."""
        count = queryset.update(
            status='pending',
            resolved_by=None,
            resolved_at=None
        )
        self.message_user(request, f"Marked {count} flags as pending.")
    mark_as_pending.short_description = "Mark as pending"