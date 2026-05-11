"""
Activity serializers for API responses.
"""
from rest_framework import serializers
from .models import Activity


class ActivitySerializer(serializers.ModelSerializer):
    """
    Serializer for activity feed items.
    """

    id = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = [
            'id',
            'type',
            'created_at',
            'data',
        ]

    def get_id(self, obj):
        """
        Generate composite ID from type and primary key.
        Format: "own_review_123" or "following_followed_456"
        """
        activity_type = self.get_type(obj)
        return f"{activity_type}_{obj.pk}"

    def get_type(self, obj):
        """
        Map activity types to feed display types.

        - own_review, following_review (review activities)
        - new_follower (notification: someone followed you)
        - following_followed (feed: someone you follow followed someone)
        """
        # Is this user's own activity?
        is_own = obj.recipient == obj.actor

        if obj.activity_type == 'visit':
            return 'own_visit' if is_own else 'following_visit'
        elif obj.activity_type == 'review':
            return 'own_review' if is_own else 'following_review'
        elif obj.activity_type == 'follow':
            # Determine if it's new_follower or following_followed
            # new_follower: Someone followed YOU (recipient is target)
            # following_followed: Someone you follow followed someone
            target_username = obj.data.get('target_username', '')
            if obj.recipient.username == target_username:
                return 'new_follower'
            else:
                return 'following_followed'

        return obj.activity_type

    def to_representation(self, instance):
        """
        Flatten data field into top level.

        Response:
        {
            "id": "own_review_123",
            "type": "own_review",
            "created_at": "2025-12-23T...",
            "cafe_name": "Coffee Lab",
            ...
        }
        """
        ret = super().to_representation(instance)

        # Extract data field
        data = ret.pop('data', {})

        # Merge data into top level
        ret.update(data)

        return ret
