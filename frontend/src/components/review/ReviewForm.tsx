import React, { useState } from 'react';
import { Wifi, Zap, Volume2, Armchair, Coffee, DollarSign } from 'lucide-react';
import { ReviewCreate, Review, ReviewUpdate } from '../../types';
import { Modal } from '../common';
import { useReviews } from '../../hooks';
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
        // Update existing review
        const updateData: ReviewUpdate = {
          wifi_quality: formData.wifi_quality,
          power_outlets_rating: formData.power_outlets_rating,
          noise_level: formData.noise_level,
          seating_comfort: formData.seating_comfort,
          space_availability: formData.space_availability,
          coffee_quality: formData.coffee_quality,
          menu_options: formData.menu_options,
          bathroom_quality: formData.bathroom_quality,
          wfc_rating: formData.wfc_rating,
          visit_time: formData.visit_time,
          comment: formData.comment,
        };
        await reviewApi.update(existingReview.id, updateData);
        alert('✅ Review updated successfully!');
      } else {
        // Create new review
        await createReview(formData);
        alert('✅ Review submitted successfully!');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error submitting review:', err);
      setError(err.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

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
      field: 'noise_level' as keyof ReviewCreate,
      label: 'Noise Level',
      icon: <Volume2 size={20} />,
      description: 'Quieter is better for WFC',
    },
    {
      field: 'seating_comfort' as keyof ReviewCreate,
      label: 'Seating Comfort',
      icon: <Armchair size={20} />,
      description: 'Comfort for long sessions',
    },
    {
      field: 'coffee_quality' as keyof ReviewCreate,
      label: 'Coffee Quality',
      icon: <Coffee size={20} />,
      description: 'Taste and variety',
    },
    {
      field: 'menu_options' as keyof ReviewCreate,
      label: 'Menu Options',
      icon: <DollarSign size={20} />,
      description: 'Food and drink variety',
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
          <h3 className={styles.sectionTitle}>WFC Ratings</h3>
          <p className={styles.sectionDescription}>
            Rate each aspect from {REVIEW_CONFIG.RATING_MIN} (poor) to {REVIEW_CONFIG.RATING_MAX} (excellent)
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
  );
};

export default ReviewForm;
