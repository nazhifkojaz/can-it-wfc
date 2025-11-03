import React, { useState } from 'react';
import { User, ThumbsUp, Star, Wifi, Zap, Armchair, Volume2, Clock, Trash2 } from 'lucide-react';
import { Review } from '../../types';
import { formatRelativeTime, formatRating, getRatingColor } from '../../utils';
import { ConfirmDialog, ResultModal } from '../common';
import { useResultModal } from '../../hooks';
import styles from './ReviewCard.module.css';

interface ReviewCardProps {
  review: Review;
  currentUserId?: number;
  onDelete?: (reviewId: number) => Promise<void>;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, currentUserId, onDelete }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const resultModal = useResultModal();

  const displayName = review.user?.display_name || review.user?.username || 'Anonymous';
  const averageRating = review.average_rating || 0;
  const ratingColor = getRatingColor(averageRating);

  // Check if this is the current user's review
  const isOwnReview = currentUserId && review.user?.id === currentUserId;

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
      console.error('Failed to delete review:', error);
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

  return (
    <div className={styles.reviewCard}>
      {/* User info */}
      <div className={styles.reviewHeader}>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {review.user?.avatar_url ? (
              <img src={review.user.avatar_url} alt={displayName} />
            ) : (
              <User size={20} />
            )}
          </div>
          <div className={styles.userDetails}>
            <p className={styles.userName}>{displayName}</p>
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
                fill={i < Math.round(averageRating) ? '#FBBC04' : 'none'}
                color={i < Math.round(averageRating) ? '#FBBC04' : '#D1D5DB'}
              />
            ))}
            <span className={styles.ratingValue} style={{ color: ratingColor }}>
              {formatRating(averageRating)}
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

      {/* Review text */}
      {review.comment && (
        <p className={styles.reviewText}>{review.comment}</p>
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

      {/* Helpful count */}
      {review.helpful_count && review.helpful_count > 0 && (
        <div className={styles.helpfulCount}>
          <ThumbsUp size={14} />
          <span>{review.helpful_count} found helpful</span>
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
    </div>
  );
};

export default ReviewCard;
