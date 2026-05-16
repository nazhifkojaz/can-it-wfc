import React, { useState } from 'react';
import { ReviewCreate, Review, ReviewUpdate } from '../../types';
import { Modal, SharedResultModal } from '../common';
import { useReviews, useResultModal, useReviewForm } from '../../hooks';
import { reviewApi } from '../../api/client';
import { isValidReviewComment } from '../../utils';
import { extractApiError, getFieldError } from '../../utils/errorUtils';
import { REVIEW_CONFIG } from '../../config/constants';
import { logger } from '../../utils/logger';
import { trackReviewCreated } from '../../lib/analytics';
import ReviewFields from './ReviewFields';
import styles from './ReviewForm.module.css';

/**
 * ReviewForm Component
 *
 * One user can only have one review per cafe.
 * Duplicate reviews are prevented at the backend level.
 */

interface ReviewFormProps {
  cafeId: number;
  cafeName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingReview?: Review | null;
  isViewMode?: boolean;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  cafeId,
  cafeName,
  isOpen,
  onClose,
  onSuccess,
  existingReview,
  isViewMode = false,
}) => {
  const { createReview } = useReviews(cafeId);
  const isEditMode = !!existingReview && !isViewMode;
  const resultModal = useResultModal();

  const visitTime = existingReview?.visit_time || 2;

  const form = useReviewForm({
    initial: {
      wifi_quality: existingReview?.wifi_quality || 3,
      power_outlets_rating: existingReview?.power_outlets_rating || 3,
      noise_level: existingReview?.noise_level || 3,
      seating_comfort: existingReview?.seating_comfort || 3,
      hasSmokingArea: existingReview?.has_smoking_area === true,
      hasPrayerRoom: existingReview?.has_prayer_room === true,
      hasIndoorSeating: existingReview?.has_indoor_seating === true,
      hasOutdoorSeating: existingReview?.has_outdoor_seating === true,
      comment: existingReview?.comment || '',
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.comment && !isValidReviewComment(form.comment)) {
      setError(`Comment must be ${REVIEW_CONFIG.MAX_COMMENT_LENGTH} characters or less`);
      return;
    }

    setLoading(true);

    try {
      if (isEditMode && existingReview) {
        const updateData: ReviewUpdate = {
          ...form.ratingPayload(),
          ...form.facilityPayload(),
          visit_time: visitTime,
          comment: form.comment,
        };
        await reviewApi.update(existingReview.id, updateData);

        resultModal.showResultModal({
          type: 'success',
          title: 'Review Updated!',
          message: 'Your review has been updated successfully. You can edit it again anytime.',
          primaryButton: {
            label: 'Okay',
            onClick: () => {
              resultModal.closeResultModal();
              onSuccess();
              onClose();
            }
          }
        });
      } else {
        const reviewData: ReviewCreate = {
          cafe_id: cafeId,
          ...form.ratingPayload(),
          ...form.facilityPayload(),
          visit_time: visitTime,
          comment: form.comment,
        };
        await createReview(reviewData);

        trackReviewCreated({
          cafeId,
          wfcRating: form.wfcRating || 3,
          source: 'standalone',
        });

        resultModal.showResultModal({
          type: 'success',
          title: 'Review Submitted!',
          message: 'Your review has been submitted successfully. You can edit it anytime from your visits.',
          primaryButton: {
            label: 'Okay',
            onClick: () => {
              resultModal.closeResultModal();
              onSuccess();
              onClose();
            }
          }
        });
      }
    } catch (err: unknown) {
      logger.error('Error submitting review', err, 'ReviewForm');

      // Check for field-specific errors first (e.g., duplicate review)
      const cafeIdError = getFieldError(err, 'cafe_id');
      const errorMessage = cafeIdError || extractApiError(err).message;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getModalTitle = () => {
    if (isViewMode) return "Your Review";
    if (isEditMode) return "Edit Your Review";
    return "Rate Your Experience";
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={getModalTitle()}
        size="lg"
      >
      <div className={styles.formHeader}>
        <p className={styles.formSubtitle}>{cafeName}</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.formBody}>
        <ReviewFields
          form={form}
          variant="detailed"
          disabled={isViewMode}
          readOnly={isViewMode}
          textareaId="review-text"
          commentRows={4}
          commentPlaceholder={isViewMode ? '' : 'Share your experience working from this cafe...'}
          commentLabel={<>Your Review {!isViewMode && '(Optional)'}</>}
          showCommentCount={!isViewMode}
          classes={{
            section: styles.section,
            sectionTitle: styles.sectionTitle,
            sectionDescription: styles.sectionDescription,
            ratingCategories: styles.ratingCategories,
            ratingCategory: styles.ratingCategory,
            categoryHeader: styles.categoryHeader,
            categoryIcon: styles.categoryIcon,
            categoryInfo: styles.categoryInfo,
            categoryLabel: styles.categoryLabel,
            categoryDescription: styles.categoryDescription,
            checkboxGrid: styles.checkboxGrid,
            textareaContainer: styles.textareaContainer,
            reviewTextarea: styles.reviewTextarea,
            characterCount: styles.characterCount,
          }}
        />

        {/* Error Message */}
        {error && (
          <div className={styles.errorMessage}>
            <p>{error}</p>
          </div>
        )}

        {/* Submit Button - hidden in view mode */}
        {!isViewMode && (
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading
              ? (isEditMode ? 'Updating...' : 'Submitting...')
              : (isEditMode ? 'Update Review' : 'Submit Review')
            }
          </button>
        )}
      </form>
      </Modal>

      <SharedResultModal resultModal={resultModal} />
    </>
  );
};

export default ReviewForm;
