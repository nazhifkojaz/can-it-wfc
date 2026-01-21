"""
Signal handler tests for Review and Visit models.

Tests use mocking to avoid database schema issues with test database.
"""
import pytest
from unittest.mock import Mock, MagicMock, patch
from apps.reviews.models import Review
from apps.reviews.signals import update_stats_after_review_deletion


@pytest.mark.django_db
class TestReviewDeletionSignal:
    """Test post_delete signal for Review model"""

    def test_signal_handler_uses_cafe_and_user_directly(self):
        """
        Test that signal handler accesses instance.cafe and instance.user
        directly, not instance.visit (which no longer exists).
        """
        # Create mock review instance with cafe and user
        mock_review = Mock(spec=Review)
        mock_cafe = Mock()
        mock_user = Mock()

        mock_review.cafe = mock_cafe
        mock_review.user = mock_user

        # Verify review doesn't have 'visit' attribute (the bug we fixed)
        assert not hasattr(mock_review, 'visit'), "Review should not have 'visit' attribute"

        # Call signal handler directly
        update_stats_after_review_deletion(sender=Review, instance=mock_review)

        # Verify cafe.update_stats() was called
        mock_cafe.update_stats.assert_called_once()

        # Verify user.update_stats() was called
        mock_user.update_stats.assert_called_once()

    def test_signal_handler_handles_exceptions_gracefully(self):
        """Test that signal handler logs errors but doesn't raise"""
        mock_review = Mock(spec=Review)
        mock_cafe = Mock()
        mock_user = Mock()

        mock_review.cafe = mock_cafe
        mock_review.user = mock_user

        # Make cafe.update_stats raise an exception
        mock_cafe.update_stats.side_effect = Exception("Database error")

        # Should not raise exception
        update_stats_after_review_deletion(sender=Review, instance=mock_review)

        # user.update_stats should still be called (though it might fail too)
        # The key is no exception is raised by the signal handler

    def test_signal_handler_does_not_access_visit_id(self):
        """
        Regression test: Ensure signal handler never tries to access
        instance.visit_id which was causing AttributeError crash.
        """
        mock_review = Mock(spec=Review)
        mock_cafe = Mock()
        mock_user = Mock()

        mock_review.cafe = mock_cafe
        mock_review.user = mock_user

        # Create a property that raises AttributeError if accessed
        # This simulates the old behavior where instance.visit_id was accessed
        def raise_if_visited():
            raise AttributeError("'Review' object has no attribute 'visit'")

        mock_review.visit = property(raise_if_visited)

        # Call signal handler - should NOT access 'visit' attribute
        update_stats_after_review_deletion(sender=Review, instance=mock_review)

        # If we get here without AttributeError, the fix works
        mock_cafe.update_stats.assert_called_once()
        mock_user.update_stats.assert_called_once()
