"""
Signal handler tests for Review and Visit models.

Tests use mocking to avoid database schema issues with test database.
"""
import pytest
from unittest.mock import Mock, patch
from apps.reviews.models import Review
from apps.reviews.signals import update_stats_after_review_deletion


@pytest.mark.django_db
class TestReviewDeletionSignal:
    """Test post_delete signal for Review model"""

    def test_signal_handler_updates_cafe_and_user_without_visit_fields(self):
        """Review deletion stats updates use direct cafe/user relationships."""
        mock_review = Mock(spec_set=['cafe', 'user'])
        mock_cafe = Mock()
        mock_user = Mock()

        mock_review.cafe = mock_cafe
        mock_review.user = mock_user

        update_stats_after_review_deletion(sender=Review, instance=mock_review)

        mock_cafe.update_stats.assert_called_once()
        mock_user.update_stats.assert_called_once()

    def test_signal_handler_handles_exceptions_gracefully(self):
        """Stats failures are logged and do not block review deletion."""
        mock_review = Mock(spec_set=['pk', 'cafe', 'user', 'cafe_id', 'user_id'])
        mock_cafe = Mock()
        mock_user = Mock()

        mock_review.cafe = mock_cafe
        mock_review.user = mock_user
        mock_review.pk = 123
        mock_review.cafe_id = 456
        mock_review.user_id = 789

        mock_cafe.update_stats.side_effect = Exception("Database error")

        with patch('apps.reviews.signals.logger') as mock_logger:
            update_stats_after_review_deletion(sender=Review, instance=mock_review)

        mock_logger.error.assert_called_once()
        mock_user.update_stats.assert_not_called()
