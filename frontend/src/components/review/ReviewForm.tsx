import React, { useState } from 'react';
import { Wifi, Zap, Volume2, Armchair, Cigarette, Home } from 'lucide-react';
import { ReviewCreate, Review, ReviewUpdate } from '../../types';
import { Modal, ResultModal } from '../common';
import { useReviews, useResultModal } from '../../hooks';
import { reviewApi } from '../../api/client';
import { isValidReviewComment } from '../../utils';
import { REVIEW_CONFIG } from '../../config/constants';
import styles from './ReviewForm.module.css';

interface ReviewFormProps {
  visitId: number;
  cafeId: number;
  cafeName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingReview?: Review | null;
  isViewMode?: boolean;
}

const ReviewForm: React.FC<ReviewFormProps> = ({
  visitId,
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
    visit_id: visitId,
    wifi_quality: existingReview?.wifi_quality || 3,
    power_outlets_rating: existingReview?.power_outlets_rating || 3,
    noise_level: existingReview?.noise_level || 3,
    seating_comfort: existingReview?.seating_comfort || 3,
    space_availability: existingReview?.space_availability || 3,
    coffee_quality: existingReview?.coffee_quality || 3,
    menu_options: existingReview?.menu_options || 3,
    bathroom_quality: existingReview?.bathroom_quality || undefined,
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
        // Update existing review - default missing criteria to wfc_rating
        const updateData: ReviewUpdate = {
          wifi_quality: formData.wifi_quality,
          power_outlets_rating: formData.power_outlets_rating,
          noise_level: formData.noise_level,
          seating_comfort: formData.seating_comfort,
          // Default these to wfc_rating for consistency
          space_availability: formData.space_availability || formData.wfc_rating,
          coffee_quality: formData.coffee_quality || formData.wfc_rating,
          menu_options: formData.menu_options || formData.wfc_rating,
          bathroom_quality: formData.bathroom_quality || formData.wfc_rating,
          has_smoking_area: hasSmokingArea,
          has_prayer_room: hasPrayerRoom,
          wfc_rating: formData.wfc_rating,
          visit_time: formData.visit_time,
          comment: formData.comment,
        };
        await reviewApi.update(existingReview.id, updateData);

        resultModal.showResultModal({
          type: 'success',
          title: 'Review Updated!',
          message: 'Your review has been updated successfully.',
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
        // Create new review - default missing criteria to wfc_rating
        const reviewData: ReviewCreate = {
          ...formData,
          space_availability: formData.space_availability || formData.wfc_rating,
          coffee_quality: formData.coffee_quality || formData.wfc_rating,
          menu_options: formData.menu_options || formData.wfc_rating,
          bathroom_quality: formData.bathroom_quality || formData.wfc_rating,
          has_smoking_area: hasSmokingArea,
          has_prayer_room: hasPrayerRoom,
        };
        await createReview(reviewData);

        resultModal.showResultModal({
          type: 'success',
          title: 'Review Submitted!',
          message: 'Your review has been submitted successfully.',
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
      if (import.meta.env.DEV) {
        console.error('Error submitting review:', err);
      }
      setError(err.message || 'Failed to submit review');
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

  const renderStarRating = (field: keyof ReviewCreate, value: number) => {
    return (
      <div className={styles.starRating}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`${styles.star} ${value >= star ? styles.active : ''}`}
            onClick={() => !isViewMode && handleRatingChange(field, star)}
            aria-label={`Rate ${star} stars`}
            disabled={isViewMode}
            style={isViewMode ? { cursor: 'default' } : undefined}
          >
            ★
          </button>
        ))}
      </div>
    );
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
                {renderStarRating(category.field, formData[category.field] as number)}
              </div>
            ))}
          </div>
        </div>

        {/* Overall WFC Rating */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Overall WFC Suitability</h3>
          <p className={styles.sectionDescription}>
            How suitable is this cafe for working from?
          </p>
          <div className={styles.ratingCategory}>
            {renderStarRating('wfc_rating', formData.wfc_rating as number)}
          </div>
        </div>

        {/* Additional Facilities */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Additional Facilities</h3>
          <p className={styles.sectionDescription}>
            Does the cafe have these amenities?
          </p>

          <div className={styles.toggleGroup}>
            <div className={styles.toggleField}>
              <label className={styles.toggleLabel}>
                <Cigarette size={18} />
                Has Smoking Area?
              </label>
              <div className={styles.toggleButtons}>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${hasSmokingArea === true ? styles.toggleActive : ''}`}
                  onClick={() => !isViewMode && setHasSmokingArea(true)}
                  disabled={isViewMode}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${hasSmokingArea === false ? styles.toggleActive : ''}`}
                  onClick={() => !isViewMode && setHasSmokingArea(false)}
                  disabled={isViewMode}
                >
                  No
                </button>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${hasSmokingArea === null ? styles.toggleActive : ''}`}
                  onClick={() => !isViewMode && setHasSmokingArea(null)}
                  disabled={isViewMode}
                >
                  Don't Know
                </button>
              </div>
            </div>

            <div className={styles.toggleField}>
              <label className={styles.toggleLabel}>
                <Home size={18} />
                Has Prayer Room?
              </label>
              <div className={styles.toggleButtons}>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${hasPrayerRoom === true ? styles.toggleActive : ''}`}
                  onClick={() => !isViewMode && setHasPrayerRoom(true)}
                  disabled={isViewMode}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${hasPrayerRoom === false ? styles.toggleActive : ''}`}
                  onClick={() => !isViewMode && setHasPrayerRoom(false)}
                  disabled={isViewMode}
                >
                  No
                </button>
                <button
                  type="button"
                  className={`${styles.toggleButton} ${hasPrayerRoom === null ? styles.toggleActive : ''}`}
                  onClick={() => !isViewMode && setHasPrayerRoom(null)}
                  disabled={isViewMode}
                >
                  Don't Know
                </button>
              </div>
            </div>
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
    </>
  );
};

export default ReviewForm;
