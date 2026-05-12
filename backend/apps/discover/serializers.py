from rest_framework import serializers
from apps.reviews.models import Review
from apps.cafes.models import Cafe, CafeList, CafeListItem


class DiscoverReviewSerializer(serializers.ModelSerializer):
    cafe = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()
    visit_time_label = serializers.CharField(source='visit_time_display', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'cafe', 'user', 'wfc_rating', 'comment',
            'visit_time_label', 'created_at',
        ]

    def get_cafe(self, obj):
        return {
            'id': obj.cafe.id,
            'name': obj.cafe.name,
            'address_short': obj.cafe.address.split(',')[0].strip() if obj.cafe.address else '',
        }

    def get_user(self, obj):
        return {
            'username': obj.user.username,
            'display_name': obj.user.effective_display_name,
            'avatar_url': obj.user.avatar_url,
        }


class DiscoverFeaturedListSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField()
    item_count = serializers.IntegerField(read_only=True)
    preview_cafes = serializers.SerializerMethodField()

    class Meta:
        model = CafeList
        fields = [
            'id', 'name', 'description', 'owner',
            'item_count', 'preview_cafes', 'featured_at', 'icon',
        ]

    def get_owner(self, obj):
        return {
            'username': obj.owner.username,
            'display_name': obj.owner.effective_display_name,
            'avatar_url': obj.owner.avatar_url,
        }

    def get_preview_cafes(self, obj):
        items = getattr(obj, 'preview_items', [])
        return [
            {'id': item.cafe.id, 'name': item.cafe.name}
            for item in items
            if item.cafe
        ]


class DiscoverTrendingCafeSerializer(serializers.ModelSerializer):
    address_short = serializers.SerializerMethodField()
    recent_review_count = serializers.IntegerField(read_only=True)
    recent_visit_count = serializers.IntegerField(read_only=True)
    score = serializers.IntegerField(read_only=True)

    class Meta:
        model = Cafe
        fields = [
            'id', 'name', 'address_short',
            'average_wfc_rating', 'recent_review_count',
            'recent_visit_count', 'score',
        ]

    def get_address_short(self, obj):
        return obj.address.split(',')[0].strip() if obj.address else ''


class DiscoverTrendingListSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField()
    item_count = serializers.IntegerField(read_only=True)
    save_count = serializers.IntegerField(read_only=True)
    recent_save_count = serializers.IntegerField(read_only=True)
    preview_cafes = serializers.SerializerMethodField()

    class Meta:
        model = CafeList
        fields = [
            'id', 'name', 'description', 'owner',
            'item_count', 'preview_cafes', 'icon',
            'save_count', 'recent_save_count',
        ]

    def get_owner(self, obj):
        return {
            'username': obj.owner.username,
            'display_name': obj.owner.effective_display_name,
            'avatar_url': obj.owner.avatar_url,
        }

    def get_preview_cafes(self, obj):
        items = getattr(obj, 'preview_items', [])
        return [
            {'id': item.cafe.id, 'name': item.cafe.name}
            for item in items
            if item.cafe
        ]
