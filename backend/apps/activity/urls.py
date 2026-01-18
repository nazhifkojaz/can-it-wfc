"""
Activity app URL configuration.
"""
from django.urls import path
from .views import ActivityFeedView

app_name = 'activity'

urlpatterns = [
    path('feed/', ActivityFeedView.as_view(), name='feed'),
]
