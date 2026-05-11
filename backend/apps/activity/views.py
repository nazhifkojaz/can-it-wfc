"""
Activity API views.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from .services import ActivityService
from .serializers import ActivitySerializer


class ActivityFeedView(APIView):
    """
    Get user's activity feed.

    GET /api/activity/feed/?limit=50

    Returns unified feed of:
    - User's own activities (reviews)
    - Followed users' activities (reviews)
    - Social activities (new followers, follows)
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Get activity feed for authenticated user.

        Query params:
            limit (int): Max activities to return (default: 50, max: 100)

        Returns:
            {
                "activities": [...],
                "count": 50
            }
        """
        user = request.user
        limit = min(int(request.query_params.get('limit', 50)), 100)

        activities = ActivityService.get_user_feed(user, limit=limit)

        # Serialize
        serializer = ActivitySerializer(activities, many=True)

        return Response({
            'activities': serializer.data,
            'count': len(serializer.data)
        })
