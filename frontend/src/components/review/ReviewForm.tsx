import React, { useState, useEffect } from 'react';
import { Wifi, Zap, Volume2, Armchair, Cigarette, Home } from 'lucide-react';
import { ReviewCreate, Review, ReviewUpdate } from '../../types';
import { Modal, SharedResultModal, StarRating, FacilityToggle } from '../common';
import { useReviews, useResultModal } from '../../hooks';
import { reviewApi } from '../../api/client';
import { isValidReviewComment, computeWfcRating } from '../../utils';
import { extractApiError, getFieldError } from '../../utils/errorUtils';
import { REVIEW_CONFIG } from '../../config/constants';
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

  const [formData, setFormData] = useState<ReviewCreate>({
    cafe_id: cafeId,
    wifi_quality: existingReview?.wifi_quality || 3,
    power_outlets_rating: existingReview?.power_outlets_rating || 3,
    noise_level: existingReview?.noise_level || 3,
    seating_comfort: existingReview?.seating_comfort || 3,
    wfc_rating: existingReview?.wfc_rating || 3,
    visit_time: existingReview?.visit_time || 2,
    comment: existingReview?.comment || '',
  });

  const [hasSmokingArea, setHasSmokingArea] = useState<boolean | null>(
    existingReview?.has_smoking_area ?? null
  );
  const [hasPrayerRoom, setHasPrayerRoom] = useState<boolean | null>(
    existingReview?.has_prayer_room ?? null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-compute overall WFC rating from sub-criteria
  useEffect(() => {
    const computed = computeWfcRating(
      formData.wifi_quality,
      formData.noise_level,
      formData.seating_comfort,
      formData.power_outlets_rating,
    );
    setFormData(prev => ({ ...prev, wfc_rating: computed }));
  }, [formData.wifi_quality, formData.power_outlets_rating, formData.seating_comfort, formData.noise_level]);

  const handleRatingChange = (field: keyof ReviewCreate, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTextChange = (value: string) => {
    if (value.length <= REVIEW_CONFIG.MAX_COMMENT_LENGTH) {
      setFormData(prev => ({ ...prev, comment: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.comment && !isValidReviewComment(formData.comment)) {
      setError(`Comment must be ${REVIEW_CONFIG.MAX_COMMENT_LENGTH} characters or less`);
      return;
    }

    setLoading(true);

    try {
      if (isEditMode && existingReview) {
        // Update existing review
        const updateData: ReviewUpdate = {
          wifi_quality: formData.wifi_quality,
          power_outlets_rating: formData.power_outlets_rating,
          noise_level: formData.noise_level,
          seating_comfort: formData.seating_comfort,
          has_smoking_area: hasSmokingArea,
          has_prayer_room: hasPrayerRoom,
          wfc_rating: formData.wfc_rating,
          visit_time: formData.visit_time,
          comment: formData.comment,
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
        // Create new review
        const reviewData: ReviewCreate = {
          ...formData,
          has_smoking_area: hasSmokingArea,
          has_prayer_room: hasPrayerRoom,
        };
        await createReview(reviewData);

        // Track analytics for review creation
        trackReviewCreated({
          cafeId,
          cafeName,
          wfcRating: formData.wfc_rating || 3,
          wifiQuality: formData.wifi_quality,
          hasComment: !!formData.comment?.trim(),
          commentLength: formData.comment?.length || 0,
          source: 'standalone',
          hasSmokingArea: hasSmokingArea === true ? 'yes' : hasSmokingArea === false ? 'no' : 'unknown',
          hasPrayerRoom: hasPrayerRoom === true ? 'yes' : hasPrayerRoom === false ? 'no' : 'unknown',
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
    } catch (err: any) {
      logger.error('Error submitting review', err, 'ReviewForm');

      // Check for field-specific errors first (e.g., duplicate review)
      const cafeIdError = getFieldError(err, 'cafe_id');
      const errorMessage = cafeIdError || extractApiError(err).message;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Simplified 5-criteria review (matching AddVisitReviewModal)
  const ratingCategories = [
    {
      field: 'wifi_quality' as keyof ReviewCreate,
      label: 'WiFi Quality',
      icon: <Wifi size={20} />,
      description: 'Speed and reliability',
    },
    {
      field: 'power_outlets_rating' as keyof ReviewCreate,
      label: 'Power Outlets',
      icon: <Zap size={20} />,
      description: 'Availability and access',
    },
    {
      field: 'seating_comfort' as keyof ReviewCreate,
      label: 'Seat/Desk Comfort',
      icon: <Armchair size={20} />,
      description: 'Comfort for long work sessions',
    },
    {
      field: 'noise_level' as keyof ReviewCreate,
      label: 'Audio Comfort',
      icon: <Volume2 size={20} />,
      description: 'How comfortable is the audio environment for work',
    },
  ];

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
                  value={formData[category.field] as number}
                  onChange={(val) => handleRatingChange(category.field, val)}
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
            <StarRating value={formData.wfc_rating || 3} disabled />
          </div>
        </div>

        {/* Additional Facilities */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Additional Facilities</h3>
          <p className={styles.sectionDescription}>
            Does the cafe have these amenities?
          </p>

          <div className={styles.toggleGroup}>
            <FacilityToggle
              label="Has Smoking Area?"
              icon={<Cigarette size={18} />}
              value={hasSmokingArea}
              onChange={setHasSmokingArea}
              disabled={isViewMode}
            />

            <FacilityToggle
              label="Has Prayer Room?"
              icon={<Home size={18} />}
              value={hasPrayerRoom}
              onChange={setHasPrayerRoom}
              disabled={isViewMode}
            />
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
              value={formData.comment}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={4}
              maxLength={REVIEW_CONFIG.MAX_COMMENT_LENGTH}
              disabled={isViewMode}
              readOnly={isViewMode}
            />
            {!isViewMode && (
              <p className={styles.characterCount}>
                {formData.comment?.length || 0} / {REVIEW_CONFIG.MAX_COMMENT_LENGTH}
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
