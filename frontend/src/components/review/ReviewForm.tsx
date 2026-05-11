import React, { useState } from 'react';
import { ReviewCreate, Review, ReviewUpdate } from '../../types';
import { Modal, SharedResultModal, StarRating, FacilityCheckbox } from '../common';
import { useReviews, useResultModal, useReviewForm } from '../../hooks';
import { reviewApi } from '../../api/client';
import { isValidReviewComment } from '../../utils';
import { extractApiError, getFieldError } from '../../utils/errorUtils';
import { REVIEW_CONFIG } from '../../config/constants';
import { RATING_DIMENSIONS, FACILITY_CONFIG } from '../../config/ratings';
import { logger } from '../../utils/logger';
import { trackReviewCreated, trackReviewEdited } from '../../lib/analytics';
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

        // Track analytics for review edit
        const fieldsChanged = Object.keys(updateData).filter(
          key => updateData[key as keyof ReviewUpdate] !== existingReview[key as keyof Review]
        );
        trackReviewEdited({
          cafeId,
          cafeName,
          fieldsChanged,
        });

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
          cafeName,
          wfcRating: form.wfcRating || 3,
          wifiQuality: form.wifi_quality,
          hasComment: !!form.comment?.trim(),
          commentLength: form.comment?.length || 0,
          source: 'standalone',
          hasSmokingArea: form.hasSmokingArea ? true : null,
          hasPrayerRoom: form.hasPrayerRoom ? true : null,
          hasIndoorSeating: form.hasIndoorSeating ? true : null,
          hasOutdoorSeating: form.hasOutdoorSeating ? true : null,
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

  const ratingCategories = RATING_DIMENSIONS
    .filter(d => d.key !== 'wfc_rating')
    .map(d => ({
      field: d.key as keyof ReviewCreate,
      label: d.label,
      icon: d.icon,
      description: d.description,
    }));

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
        {/* WFC Rating Categories */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Key WFC Criteria</h3>
          <p className={styles.sectionDescription}>
            Rate the most important aspects for working from this cafe
          </p>

          <div className={styles.ratingCategories}>
            {ratingCategories.map((category) => (
              <div key={category.field} className={styles.ratingCategory}>
                <div className={styles.categoryHeader}>
                  <div className={styles.categoryIcon}>{category.icon}</div>
                  <div className={styles.categoryInfo}>
                    <h4 className={styles.categoryLabel}>{category.label}</h4>
                    <p className={styles.categoryDescription}>{category.description}</p>
                  </div>
                </div>
                <StarRating
                  value={form[category.field as keyof typeof form] as number}
                  onChange={(val) => {
                    const map: Record<string, (v: number) => void> = {
                      wifi_quality: form.setWifiQuality,
                      power_outlets_rating: form.setPowerOutlets,
                      seating_comfort: form.setSeatingComfort,
                      noise_level: form.setNoiseLevel,
                    };
                    map[category.field]?.(val);
                  }}
                  disabled={isViewMode}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Overall WFC Rating — Auto-computed */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Overall WFC Suitability</h3>
          <p className={styles.sectionDescription}>
            Auto-calculated from your ratings above
          </p>
          <div className={styles.ratingCategory}>
            <StarRating value={form.wfcRating || 3} disabled />
          </div>
        </div>

        {/* Additional Facilities */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Additional Facilities</h3>
          <p className={styles.sectionDescription}>
            Does the cafe have these amenities?
          </p>

          <div className={styles.checkboxGrid}>
            {FACILITY_CONFIG.map((f) => {
              const setter = form.facilitySetters[f.key];
              const checked = form.facilityValues[f.key] ?? false;
              if (!setter) return null;
              return (
                <FacilityCheckbox
                  key={f.key}
                  label={f.label}
                  icon={f.icon}
                  checked={checked}
                  onChange={setter}
                  disabled={isViewMode}
                />
              );
            })}
          </div>
        </div>

        {/* Review Text */}
        <div className={styles.section}>
          <label htmlFor="review-text" className={styles.sectionTitle}>
            Your Review {!isViewMode && '(Optional)'}
          </label>
          <div className={styles.textareaContainer}>
            <textarea
              id="review-text"
              className={styles.reviewTextarea}
              placeholder={isViewMode ? '' : "Share your experience working from this cafe..."}
              value={form.comment}
              onChange={(e) => form.setComment(e.target.value)}
              rows={4}
              maxLength={REVIEW_CONFIG.MAX_COMMENT_LENGTH}
              disabled={isViewMode}
              readOnly={isViewMode}
            />
            {!isViewMode && (
              <p className={styles.characterCount}>
                {form.comment?.length || 0} / {REVIEW_CONFIG.MAX_COMMENT_LENGTH}
              </p>
            )}
          </div>
        </div>

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
