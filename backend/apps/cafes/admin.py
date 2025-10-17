from django.contrib import admin
from django.utils.html import format_html
from .models import Cafe, Favorite


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