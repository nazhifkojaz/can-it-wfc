import React, { useState, useMemo } from 'react';
import { User, ThumbsUp, Star, Wifi, Zap, Armchair, Volume2, Clock, Trash2, Flag } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Review } from '../../types';
import { formatRelativeTime, formatRating, getRatingColor } from '../../utils';
import { ConfirmDialog, ResultModal } from '../common';
import { useResultModal } from '../../hooks';
import FlagReviewModal from './FlagReviewModal';
import styles from './ReviewCard.module.css';

interface ReviewCardProps {
  review: Review;
  currentUserId?: number;
  onDelete?: (reviewId: number) => Promise<void>;
  onToggleHelpful?: (reviewId: number) => Promise<void>;
  onFlagReview?: (reviewId: number, reason: string, description?: string) => Promise<void>;
  onUsernameClick?: (username: string) => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  currentUserId,
  onDelete,
  onToggleHelpful,
  onFlagReview,
  onUsernameClick
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [isHelpful, setIsHelpful] = useState(review.is_helpful);
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count);
  const [isTogglingHelpful, setIsTogglingHelpful] = useState(false);
  const [hasFlagged, setHasFlagged] = useState(review.user_has_flagged);
  const [avatarError, setAvatarError] = useState(false);
  const resultModal = useResultModal();

  const displayName = review.user?.display_name || review.user?.username || 'Anonymous';
  const overallRating = typeof review.wfc_rating === 'number' ? review.wfc_rating : (review.average_rating || 0);
  const roundedStars = Math.round(overallRating);
  const ratingColor = getRatingColor(overallRating);

  // Check if this is the current user's review
  const isOwnReview = currentUserId && review.user?.id === currentUserId;

  // Sanitize review comment to prevent XSS attacks
  const sanitizedComment = useMemo(() => {
    if (!review.comment) return '';
    return DOMPurify.sanitize(review.comment, {
      ALLOWED_TAGS: [], // Strip all HTML tags for plain text only
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true
    });
  }, [review.comment]);

  const handleUsernameClick = () => {
    if (review.user?.username && onUsernameClick) {
      onUsernameClick(review.user.username);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(review.id);
      setShowDeleteConfirm(false);

      // Show success modal
      resultModal.showResultModal({
        type: 'success',
        title: 'Review Deleted',
        message: 'Your review has been deleted successfully.',
        autoClose: true,
        autoCloseDelay: 2000,
      });
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Failed to delete review:', error);
      }
      setShowDeleteConfirm(false);

      resultModal.showResultModal({
        type: 'error',
        title: 'Failed to Delete Review',
        message: error.response?.data?.detail || error.message || 'Failed to delete review. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleHelpful = async () => {
    if (!onToggleHelpful || !currentUserId || isTogglingHelpful) return;

    // Optimistic update
    const previousIsHelpful = isHelpful;
    const previousCount = helpfulCount;

    setIsHelpful(!isHelpful);
    setHelpfulCount(isHelpful ? helpfulCount - 1 : helpfulCount + 1);

    try {
      setIsTogglingHelpful(true);
      await onToggleHelpful(review.id);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Failed to toggle helpful:', error);
      }

      // Revert on error
      setIsHelpful(previousIsHelpful);
      setHelpfulCount(previousCount);

      resultModal.showResultModal({
        type: 'error',
        title: 'Failed to Update',
        message: 'Could not update your vote. Please try again.',
      });
    } finally {
      setIsTogglingHelpful(false);
    }
  };

  const handleFlagSubmit = async (reason: string, description?: string) => {
    if (!onFlagReview) return;

    try {
      await onFlagReview(review.id, reason, description);

      // Mark as flagged locally
      setHasFlagged(true);

      resultModal.showResultModal({
        type: 'success',
        title: 'Report Submitted',
        message: 'Thank you for reporting this review. Our team will review it shortly.',
        autoClose: true,
        autoCloseDelay: 3000,
      });
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Failed to flag review:', error);
      }

      const errorMessage = error.response?.data?.detail ||
                          error.response?.data?.non_field_errors?.[0] ||
                          'Failed to submit report. Please try again.';

      resultModal.showResultModal({
        type: 'error',
        title: 'Report Failed',
        message: errorMessage,
      });

      throw error; // Re-throw so modal knows to not close
    }
  };

  return (
    <div className={styles.reviewCard}>
      {/* User info */}
      <div className={styles.reviewHeader}>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {review.user?.avatar_url && !avatarError ? (
              <img
                src={review.user.avatar_url}
                alt={displayName}
                onError={() => setAvatarError(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <User size={20} />
            )}
          </div>
          <div className={styles.userDetails}>
            <p
              className={styles.userName}
              onClick={handleUsernameClick}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && handleUsernameClick()}
            >
              {displayName}
            </p>
            <div className={styles.metaInfo}>
              <Clock size={12} />
              <span className={styles.reviewTime}>
                {formatRelativeTime(review.created_at)}
              </span>
              {review.visit_time_display && (
                <>
                  <span className={styles.metaDivider}>•</span>
                  <span className={styles.visitTime}>{review.visit_time_display}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Star rating display + Delete button */}
        <div className={styles.headerActions}>
          <div className={styles.starRating}>
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={16}
                fill={i < roundedStars ? '#FBBC04' : 'none'}
                color={i < roundedStars ? '#FBBC04' : '#D1D5DB'}
                stroke="#111"
                strokeWidth={1}
              />
            ))}
            <span className={styles.ratingValue} style={{ color: ratingColor }}>
              {formatRating(overallRating)}
            </span>
          </div>

          {/* Delete button (only for own reviews) */}
          {isOwnReview && onDelete && (
            <button
              className={styles.deleteButton}
              onClick={handleDeleteClick}
              aria-label="Delete review"
              title="Delete review"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Review text - sanitized for XSS protection */}
      {sanitizedComment && (
        <p className={styles.reviewText}>{sanitizedComment}</p>
      )}

      {/* WFC Ratings with Icons - Inline */}
      <div className={styles.wfcRatingsInline}>
        <div className={styles.inlineRating}>
          <Wifi size={14} />
          <span>{review.wifi_quality}</span>
        </div>
        {review.power_outlets_rating && (
          <div className={styles.inlineRating}>
            <Zap size={14} />
            <span>{review.power_outlets_rating}</span>
          </div>
        )}
        {review.seating_comfort && (
          <div className={styles.inlineRating}>
            <Armchair size={14} />
            <span>{review.seating_comfort}</span>
          </div>
        )}
        {review.noise_level && (
          <div className={styles.inlineRating}>
            <Volume2 size={14} />
            <span>{review.noise_level}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {currentUserId && !isOwnReview && (
        <div className={styles.actionButtons}>
          {/* Helpful button */}
          {onToggleHelpful && (
            <button
              onClick={handleToggleHelpful}
              className={`${styles.actionButton} ${isHelpful ? styles.actionButtonActive : ''}`}
              disabled={isTogglingHelpful}
              aria-label={isHelpful ? 'Remove helpful vote' : 'Mark as helpful'}
            >
              <ThumbsUp size={16} fill={isHelpful ? 'currentColor' : 'none'} />
              <span>
                Helpful {helpfulCount > 0 && `(${helpfulCount})`}
              </span>
            </button>
          )}

          {/* Flag button - only show if user hasn't flagged yet */}
          {onFlagReview && !hasFlagged && (
            <button
              onClick={() => setShowFlagModal(true)}
              className={styles.actionButton}
              aria-label="Report review"
            >
              <Flag size={16} />
              <span>Report</span>
            </button>
          )}

          {/* Show "Reported" badge if user has flagged */}
          {hasFlagged && (
            <div className={styles.reportedBadge}>
              <Flag size={14} />
              <span>Reported</span>
            </div>
          )}
        </div>
      )}

      {/* Show helpful count for own reviews or logged-out users */}
      {(!currentUserId || isOwnReview) && helpfulCount > 0 && (
        <div className={styles.helpfulCount}>
          <ThumbsUp size={14} />
          <span>{helpfulCount} found helpful</span>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Review?"
        message={
          <>Are you sure you want to delete your review for <span className="neo-highlight">{review.cafe?.name || 'this cafe'}</span>? This action cannot be undone. Your visit record will remain, but the review will be permanently deleted.</>
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
        isLoading={isDeleting}
      />

      <ResultModal
        isOpen={resultModal.isOpen}
        onClose={resultModal.closeResultModal}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
        details={resultModal.details}
        primaryButton={resultModal.primaryButton}
        secondaryButton={resultModal.secondaryButton}
        autoClose={resultModal.autoClose}
        autoCloseDelay={resultModal.autoCloseDelay}
      />

      {/* Flag review modal */}
      <FlagReviewModal
        isOpen={showFlagModal}
        onClose={() => setShowFlagModal(false)}
        onSubmit={handleFlagSubmit}
        reviewUsername={displayName}
      />
    </div>
  );
};

export default ReviewCard;
