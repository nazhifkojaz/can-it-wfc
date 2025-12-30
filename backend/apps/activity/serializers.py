"""
Activity serializers for API responses.
"""
from rest_framework import serializers
from .models import Activity


class ActivitySerializer(serializers.ModelSerializer):
    """
    Serializer for activity feed items.

    Maps Activity model to API response format that matches
    the old activity feed endpoint for backward compatibility.
    """

    # Map to old format
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
        Generate ID in old format for backward compatibility.

        Old format: "own_visit_123" or "following_review_456"
        """
        activity_type = self.get_type(obj)
        return f"{activity_type}_{obj.pk}"

    def get_type(self, obj):
        """
        Map activity types to old format.

        Old format:
        - own_visit, own_review (user's own activities)
        - following_visit, following_review (followed users' activities)
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
        Flatten data field into top level for backward compatibility.

        Old API response:
        {
            "id": "own_visit_123",
            "type": "own_visit",
            "created_at": "2025-12-23T...",
            "cafe_name": "Coffee Lab",
            "cafe_id": 123,
            ...
        }

        New structure has data nested, so we flatten it.
        """
        ret = super().to_representation(instance)

        # Extract data field
        data = ret.pop('data', {})

        # Merge data into top level
        ret.update(data)

        return ret
