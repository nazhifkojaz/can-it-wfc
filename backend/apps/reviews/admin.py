from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Avg
from .models import Visit, Review, ReviewFlag, ReviewHelpful


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    """Admin interface for user visits."""
    
    list_display = [
        'user',
        'cafe',
        'visit_date',
        'has_review',
        'is_location_verified',
        'created_at'
    ]
    
    list_filter = [
        'visit_date',
        'created_at'
    ]
    
    search_fields = ['user__username', 'cafe__name']
    
    ordering = ['-visit_date', '-created_at']
    
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Visit Information', {
            'fields': ('user', 'cafe', 'visit_date')
        }),
        ('Location Verification', {
            'fields': ('check_in_latitude', 'check_in_longitude'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at',)
        }),
    )
    
    def has_review(self, obj):
        """Check if visit has a review."""
        has_review = hasattr(obj, 'review') and obj.review is not None
        if has_review:
            return format_html('<span style="color: green;">✓ Yes</span>')
        return format_html('<span style="color: gray;">✗ No</span>')
    has_review.short_description = 'Has Review'
    
    def is_location_verified(self, obj):
        """Show location verification status."""
        status = obj.is_verified_location()
        if status is None:
            return format_html('<span style="color: gray;">-</span>')
        elif status:
            return format_html('<span style="color: green;">✓ Verified</span>')
        else:
            return format_html('<span style="color: red;">✗ Too far</span>')
    is_location_verified.short_description = 'Location'


class ReviewFlagInline(admin.TabularInline):
    """Inline admin for review flags."""
    model = ReviewFlag
    extra = 0
    fields = ['flagged_by', 'reason', 'comment', 'created_at']
    readonly_fields = ['created_at']
    can_delete = False


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """
    Admin interface for reviews with moderation features.
    This is a KEY feature for managing content quality!
    """
    
    list_display = [
        'user_display',
        'cafe',
        'wfc_rating_display',
        'wifi_quality',
        'noise_level',
        'flag_status',
        'is_hidden',
        'created_at'
    ]
    
    list_filter = [
        'is_hidden',
        'is_flagged',
        'wfc_rating',
        'wifi_quality',
        'noise_level',
        'created_at',
        'visit_time'
    ]
    
    search_fields = [
        'user__username',
        'cafe__name',
        'comment'
    ]
    
    ordering = ['-created_at']
    
    readonly_fields = [
        'created_at',
        'updated_at',
        'flag_count',
        'average_rating_display',
        'spam_check_result'
    ]
    
    fieldsets = (
        ('Review Information', {
            'fields': ('user', 'cafe', 'visit', 'comment')
        }),
        ('WiFi & Power', {
            'fields': (
                'wifi_quality',
                'power_outlets_rating'
            )
        }),
        ('Environment', {
            'fields': (
                'noise_level',
                'seating_comfort',
                'space_availability'
            )
        }),
        ('Food & Facilities', {
            'fields': (
                'coffee_quality',
                'menu_options',
                'bathroom_quality'
            )
        }),
        ('WFC Rating', {
            'fields': (
                'wfc_rating',
                'average_rating_display',
                'visit_time'
            )
        }),
        ('Moderation', {
            'fields': (
                'is_flagged',
                'flag_count',
                'is_hidden',
                'spam_check_result'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [ReviewFlagInline]
    
    actions = [
        'hide_reviews',
        'unhide_reviews',
        'mark_as_not_spam',
        'check_for_spam',
        'recalculate_cafe_stats'
    ]
    
    def user_display(self, obj):
        """Display username with anonymous indicator."""
        if obj.user.is_anonymous_display:
            return format_html(
                '{} <span style="color: gray;">(anonymous)</span>',
                obj.user.display_name
            )
        return obj.user.username
    user_display.short_description = 'User'
    
    def wfc_rating_display(self, obj):
        """Display WFC rating with stars."""
        stars = '⭐' * obj.wfc_rating
        return format_html('{} ({})', stars, obj.wfc_rating)
    wfc_rating_display.short_description = 'WFC Rating'
    
    def flag_status(self, obj):
        """Display flag count with color coding."""
        if obj.flag_count == 0:
            return format_html('<span style="color: green;">✓ Clean</span>')
        elif obj.flag_count < 3:
            return format_html(
                '<span style="color: orange;">⚠ {} flag(s)</span>',
                obj.flag_count
            )
        else:
            return format_html(
                '<span style="color: red;">⚠ {} flags (auto-hidden)</span>',
                obj.flag_count
            )
    flag_status.short_description = 'Flags'
    
    def average_rating_display(self, obj):
        """Display average of all ratings."""
        return f"{obj.average_rating:.2f}"
    average_rating_display.short_description = 'Average Rating'
    
    def spam_check_result(self, obj):
        """Show spam check result."""
        is_spam, reason = obj.check_spam()
        if is_spam:
            return format_html(
                '<span style="color: red;">⚠ Potential spam: {}</span>',
                reason
            )
        return format_html('<span style="color: green;">✓ OK</span>')
    spam_check_result.short_description = 'Spam Check'
    
    # Admin actions
    
    def hide_reviews(self, request, queryset):
        """Hide selected reviews."""
        count = queryset.update(is_hidden=True)
        self.message_user(request, f"Hidden {count} reviews.")
    hide_reviews.short_description = "Hide selected reviews"
    
    def unhide_reviews(self, request, queryset):
        """Unhide selected reviews."""
        count = queryset.update(is_hidden=False, is_flagged=False)
        self.message_user(request, f"Unhidden {count} reviews.")
    unhide_reviews.short_description = "Unhide selected reviews"
    
    def mark_as_not_spam(self, request, queryset):
        """Mark reviews as not spam and clear flags."""
        for review in queryset:
            review.is_flagged = False
            review.is_hidden = False
            review.flag_count = 0
            review.save()
            # Optionally delete flags
            review.flags.all().delete()
        self.message_user(request, f"Cleared flags for {queryset.count()} reviews.")
    mark_as_not_spam.short_description = "Mark as not spam (clear flags)"
    
    def check_for_spam(self, request, queryset):
        """Check selected reviews for spam indicators."""
        spam_count = 0
        for review in queryset:
            is_spam, reason = review.check_spam()
            if is_spam:
                spam_count += 1
                self.message_user(
                    request,
                    f"Review #{review.id} by {review.user.username}: {reason}",
                    level='warning'
                )
        
        if spam_count == 0:
            self.message_user(request, "No spam detected in selected reviews.")
        else:
            self.message_user(
                request,
                f"Found {spam_count} potentially spam reviews.",
                level='warning'
            )
    check_for_spam.short_description = "Check for spam"
    
    def recalculate_cafe_stats(self, request, queryset):
        """Recalculate statistics for cafes of selected reviews."""
        cafes = set(review.cafe for review in queryset)
        for cafe in cafes:
            cafe.update_stats()
        self.message_user(
            request,
            f"Recalculated stats for {len(cafes)} cafes."
        )
    recalculate_cafe_stats.short_description = "Recalculate cafe stats"


@admin.register(ReviewFlag)
class ReviewFlagAdmin(admin.ModelAdmin):
    """Admin interface for review flags (moderation)."""
    
    list_display = [
        'review_summary',
        'flagged_by',
        'reason',
        'created_at',
        'review_hidden_status'
    ]
    
    list_filter = [
        'reason',
        'created_at'
    ]
    
    search_fields = [
        'review__user__username',
        'review__cafe__name',
        'flagged_by__username',
        'comment'
    ]
    
    ordering = ['-created_at']
    
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Flag Information', {
            'fields': ('review', 'flagged_by', 'reason', 'comment')
        }),
        ('Metadata', {
            'fields': ('created_at',)
        }),
    )
    
    def review_summary(self, obj):
        """Short summary of the flagged review."""
        return f"Review by {obj.review.user.username} of {obj.review.cafe.name}"
    review_summary.short_description = 'Review'
    
    def review_hidden_status(self, obj):
        """Show if the review is hidden."""
        if obj.review.is_hidden:
            return format_html('<span style="color: red;">Hidden</span>')
        return format_html('<span style="color: green;">Visible</span>')
    review_hidden_status.short_description = 'Review Status'
    
    actions = ['hide_flagged_reviews', 'dismiss_flags']
    
    def hide_flagged_reviews(self, request, queryset):
        """Hide all reviews that were flagged."""
        reviews = set(flag.review for flag in queryset)
        for review in reviews:
            review.is_hidden = True
            review.save()
        self.message_user(request, f"Hidden {len(reviews)} reviews.")
    hide_flagged_reviews.short_description = "Hide flagged reviews"
    
    def dismiss_flags(self, request, queryset):
        """Delete flags (dismiss as invalid)."""
        count = queryset.count()
        queryset.delete()
        self.message_user(request, f"Dismissed {count} flags.")
    dismiss_flags.short_description = "Dismiss flags"


@admin.register(ReviewHelpful)
class ReviewHelpfulAdmin(admin.ModelAdmin):
    """Admin interface for review helpful marks."""

    list_display = [
        'review_summary',
        'user',
        'created_at'
    ]

    list_filter = [
        'created_at'
    ]

    search_fields = [
        'review__user__username',
        'review__cafe__name',
        'user__username'
    ]

    ordering = ['-created_at']

    readonly_fields = ['created_at']

    def review_summary(self, obj):
        """Short summary of the review."""
        return f"Review by {obj.review.user.username} of {obj.review.cafe.name}"
    review_summary.short_description = 'Review'