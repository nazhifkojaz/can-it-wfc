import React, { useState, useEffect, useMemo } from 'react';
import { Clock, MapPinned, DollarSign, Star, CheckCircle } from 'lucide-react';
import { Cafe, CombinedVisitReviewCreate, Review, Visit } from '../../types';
import { Modal, SharedResultModal, StarRating, FacilityCheckbox } from '../common';
import ReviewForm from '../review/ReviewForm';
import { useVisits, useGeolocation, useResultModal, useReviewForm } from '../../hooks';
import { calculateDistance, formatVisitTime } from '../../utils';
import { CURRENCIES, detectCurrencyFromCoordinates, formatCurrency } from '../../utils/currency';
import { VISIT_TIME_OPTIONS, REVIEW_CONFIG } from '../../config/constants';
import { RATING_DIMENSIONS, FACILITY_CONFIG } from '../../config/ratings';
import { visitApi, reviewApi } from '../../api/client';
import { extractApiError, getFieldError } from '../../utils/errorUtils';
import { logger } from '../../utils/logger';
import { trackVisitLogged, trackReviewCreated } from '../../lib/analytics';
import styles from './AddVisitReviewModal.module.css';

/**
 * AddVisitReviewModal Component
 *
 * - Checks if user already has a review for the cafe before showing review toggle
 * - Prevents duplicate reviews (one review per user per cafe)
 * - Directs users to edit existing reviews from visits page
 */

// Client-side validation schema
const visitReviewValidation = {
  validateVisitDate: (date: string): string | null => {
    const visitDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (visitDate > today) {
      return 'Visit date cannot be in the future';
    }
    return null;
  },

  validateAmountSpent: (amount: string): string | null => {
    if (!amount) return null; // Optional field

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return 'Amount must be a valid number';
    }
    if (numAmount <= 0) {
      return 'Amount must be greater than 0';
    }
    if (numAmount > 999999) {
      return 'Amount seems too large';
    }
    return null;
  },

  validateRating: (rating: number, fieldName: string): string | null => {
    if (rating < 1 || rating > 5) {
      return `${fieldName} must be between 1 and 5`;
    }
    return null;
  },

  validateComment: (comment: string): string | null => {
    if (comment.length > 160) {
      return 'Comment must be 160 characters or less';
    }
    return null;
  },
};

interface AddVisitReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedCafe?: Cafe;
}

const AddVisitReviewModal: React.FC<AddVisitReviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedCafe,
}) => {
  const [selectedCafe, setSelectedCafe] = useState<Cafe | undefined>(preselectedCafe);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountSpent, setAmountSpent] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [visitTime, setVisitTime] = useState<number | null>(null);
  const [includeReview, setIncludeReview] = useState(false);

  // Duplicate visit detection
  const [showDuplicateInfo, setShowDuplicateInfo] = useState(false);
  const [existingVisit, setExistingVisit] = useState<Visit | null>(null);

  // Existing review detection
  const [hasExistingReview, setHasExistingReview] = useState(false);
  const [existingReviewLoading, setExistingReviewLoading] = useState(false);
  const [existingReviewData, setExistingReviewData] = useState<Review | null>(null);
  const [showEditReviewForm, setShowEditReviewForm] = useState(false);
  const [reviewCheckFailed, setReviewCheckFailed] = useState(false);

  const resultModal = useResultModal();

  const form = useReviewForm();

  const { createWithReview, loading: submitting } = useVisits();
  const { location, error: locationError, loading: locationLoading, refetch } = useGeolocation({ watch: false });

  // Calculate distance from user to selected cafe
  const distanceKm = useMemo(() => {
    if (!location || !selectedCafe) return null;

    const cafeLat = parseFloat(selectedCafe.latitude);
    const cafeLng = parseFloat(selectedCafe.longitude);

    if (isNaN(cafeLat) || isNaN(cafeLng)) return null;

    return calculateDistance(location.lat, location.lng, cafeLat, cafeLng);
  }, [location, selectedCafe]);

  // Check for duplicate visit and existing review when modal opens
  useEffect(() => {
    const checkDuplicate = async (cafe?: Cafe) => {
      if (isOpen && cafe?.is_registered) {
        try {
          const today = new Date().toISOString().split('T')[0];
          const response = await visitApi.getVisits({ cafe: cafe.id, visit_date: today });

          if (response.results && response.results.length > 0) {
            setExistingVisit(response.results[0]);
            setShowDuplicateInfo(true);
          } else {
            setShowDuplicateInfo(false);
            setExistingVisit(null);
          }
        } catch (error) {
          logger.error('Error checking duplicate visit', error, 'AddVisitReviewModal');
          setShowDuplicateInfo(false);
        }
      } else {
        setShowDuplicateInfo(false);
        setExistingVisit(null);
      }
    };

    const checkExistingReview = async (cafe?: Cafe) => {
      if (isOpen && cafe?.is_registered) {
        setExistingReviewLoading(true);
        setReviewCheckFailed(false);
        try {
          const review = await reviewApi.getUserCafeReview(cafe.id);
          setHasExistingReview(!!review);
          setExistingReviewData(review);
        } catch (error) {
          logger.error('Error checking existing review', error, 'AddVisitReviewModal');
          setReviewCheckFailed(true);
        } finally {
          setExistingReviewLoading(false);
        }
      } else {
        setHasExistingReview(false);
        setExistingReviewData(null);
        setReviewCheckFailed(false);
      }
    };

    if (isOpen) {
      setSelectedCafe(preselectedCafe);
      setVisitDate(new Date().toISOString().split('T')[0]);
      setAmountSpent('');
      setVisitTime(null);
      setIncludeReview(false);
      form.setWifiQuality(3);
      form.setSeatingComfort(3);
      form.setNoiseLevel(3);
      form.setHasSmokingArea(false);
      form.setHasPrayerRoom(false);
      form.setHasIndoorSeating(false);
      form.setHasOutdoorSeating(false);
      form.setComment('');
      setShowEditReviewForm(false);
      setExistingReviewData(null);
      setReviewCheckFailed(false);

      // Auto-detect currency based on cafe location
      if (preselectedCafe) {
        const detectedCurrency = detectCurrencyFromCoordinates(
          parseFloat(preselectedCafe.latitude),
          parseFloat(preselectedCafe.longitude)
        );
        setCurrency(detectedCurrency);
      }

      refetch();
      checkDuplicate(preselectedCafe);
      checkExistingReview(preselectedCafe);
    }
  }, [isOpen, preselectedCafe, refetch]);

  // Show location error modal when location permission is denied
  useEffect(() => {
    if (isOpen && locationError && !locationLoading) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Location Permission Required',
        message: locationError,
        details: (
          <div className={styles.errorTip}>
            <p>💡 Please enable location access in your browser settings and refresh the page.</p>
          </div>
        ),
      });
    }
  }, [isOpen, locationError, locationLoading]);

  const retryReviewCheck = async () => {
    if (!selectedCafe?.is_registered) return;
    setExistingReviewLoading(true);
    setReviewCheckFailed(false);
    try {
      const review = await reviewApi.getUserCafeReview(selectedCafe.id);
      setHasExistingReview(!!review);
      setExistingReviewData(review);
    } catch (error) {
      logger.error('Error retrying review check', error, 'AddVisitReviewModal');
      setReviewCheckFailed(true);
    } finally {
      setExistingReviewLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCafe) return;

    if (!location) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Location Required',
        message: 'Location required to verify visit. Please enable location access and try again.',
        details: (
          <div className={styles.errorTip}>
            <p>💡 Please enable location access in your browser settings and try again.</p>
          </div>
        ),
      });
      return;
    }

    // Client-side validation before API call
    const validationErrors: string[] = [];

    // Validate visit date
    const dateError = visitReviewValidation.validateVisitDate(visitDate);
    if (dateError) validationErrors.push(dateError);

    // Validate amount spent
    const amountError = visitReviewValidation.validateAmountSpent(amountSpent);
    if (amountError) validationErrors.push(amountError);

    // Validate review fields if review is included
    if (includeReview) {
      const commentError = visitReviewValidation.validateComment(form.comment);
      if (commentError) validationErrors.push(commentError);

      const ratingErrors = [
        visitReviewValidation.validateRating(form.wifi_quality, 'WiFi quality'),
        visitReviewValidation.validateRating(form.seating_comfort, 'Seating comfort'),
        visitReviewValidation.validateRating(form.noise_level, 'Noise level'),
      ];
      if (form.power_outlets_rating !== undefined) {
        ratingErrors.push(visitReviewValidation.validateRating(form.power_outlets_rating, 'Power outlets'));
      }

      validationErrors.push(...ratingErrors.filter(Boolean) as string[]);
    }

    // Show validation errors if any
    if (validationErrors.length > 0) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Validation Error',
        message: validationErrors[0],
        details: validationErrors.length > 1 ? (
          <div className={styles.errorTip}>
            <ul>
              {validationErrors.slice(1).map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        ) : undefined,
      });
      return;
    }

    try {
      const visitReviewData: CombinedVisitReviewCreate = {
        visit_date: visitDate,
        amount_spent: amountSpent ? parseFloat(amountSpent) : null,
        currency: amountSpent ? currency : null,
        visit_time: visitTime,
        check_in_latitude: location.lat.toFixed(8),
        check_in_longitude: location.lng.toFixed(8),
        include_review: includeReview,
      };

      // Handle registered vs unregistered cafes
      if (selectedCafe.is_registered) {
        // Scenario 1: Registered cafe - use cafe_id
        visitReviewData.cafe_id = selectedCafe.id;
      } else {
        // Scenario 2: Unregistered cafe - use Google Places data
        if (!selectedCafe.google_place_id) {
          throw new Error('Missing Google Place ID for unregistered cafe');
        }

        const lat = parseFloat(selectedCafe.latitude);
        const lng = parseFloat(selectedCafe.longitude);

        if (isNaN(lat) || isNaN(lng)) {
          throw new Error('Invalid cafe coordinates');
        }

        visitReviewData.google_place_id = selectedCafe.google_place_id;
        visitReviewData.cafe_name = selectedCafe.name;
        visitReviewData.cafe_address = selectedCafe.address;
        visitReviewData.cafe_latitude = lat.toFixed(8);
        visitReviewData.cafe_longitude = lng.toFixed(8);
        visitReviewData.place_category = selectedCafe.place_category;
      }

      if (includeReview) {
        Object.assign(visitReviewData, form.ratingPayload(), form.facilityPayload());
        if (form.comment.trim()) {
          visitReviewData.comment = form.comment.trim();
        }
      }

      await createWithReview(visitReviewData);

      // Track analytics
      trackVisitLogged({
        cafeId: selectedCafe.id,
        includesReview: includeReview,
      });

      if (includeReview) {
        trackReviewCreated({
          cafeId: selectedCafe.id,
          wfcRating: form.wfcRating,
          source: 'visit_modal',
        });
      }

      // Show success modal
      resultModal.showResultModal({
        type: 'success',
        title: 'Visit Logged Successfully!',
        message: includeReview
          ? 'Your visit and review have been recorded. You can edit your review anytime from your visits.'
          : 'Your visit has been recorded.',
        details: (
          <div className={styles.resultSummary}>
            <div className={styles.summaryItem}>
              <MapPinned size={16} />
              <span>{selectedCafe.name}</span>
            </div>
            {amountSpent && (
              <div className={styles.summaryItem}>
                <DollarSign size={16} />
                <span>{formatCurrency(parseFloat(amountSpent), currency)}</span>
              </div>
            )}
            {visitTime && (
              <div className={styles.summaryItem}>
                <Clock size={16} />
                <span>{formatVisitTime(visitTime)}</span>
              </div>
            )}
            {includeReview && (
              <div className={styles.summaryItem}>
                <Star size={16} />
                <span>{form.wfcRating}/5 Rating</span>
              </div>
            )}
          </div>
        ),
        primaryButton: {
          label: 'Okay',
          onClick: () => {
            resultModal.closeResultModal();
            onSuccess();
            onClose();
          }
        }
      });
    } catch (error) {
      const apiError = extractApiError(error);
      logger.error('Error logging visit', apiError, 'AddVisitReviewModal');

      let errorTitle = 'Failed to Log Visit';
      let errorDetails = null;

      // Check for field-specific errors
      const distanceError = getFieldError(apiError, 'check_in_latitude');
      const cafeIdError = getFieldError(apiError, 'cafe_id');
      const visitDateError = getFieldError(apiError, 'visit_date');
      const ratingError = getFieldError(apiError, 'wfc_rating');

      let errorMessage: string;

      if (visitDateError) {
        errorTitle = 'Duplicate Visit';
        errorMessage = visitDateError;
        errorDetails = (
          <div className={styles.errorTip}>
            <p>💡 You can only log one visit per cafe per day. Visit your profile to view your existing visits.</p>
          </div>
        );
      } else if (distanceError) {
        errorTitle = 'Distance Check Failed';
        errorMessage = distanceError;
        errorDetails = (
          <div className={styles.errorTip}>
            <p>💡 You must be within 1km of the cafe to log a visit. Please move closer and try again.</p>
          </div>
        );
      } else if (cafeIdError) {
        errorTitle = 'Review Already Exists';
        errorMessage = cafeIdError;
        errorDetails = (
          <div className={styles.errorTip}>
            <p>💡 You can edit your existing review from your visits page.</p>
          </div>
        );
      } else if (ratingError) {
        errorTitle = 'Validation Error';
        errorMessage = ratingError;
      } else {
        errorMessage = apiError.message;
      }

      resultModal.showResultModal({
        type: 'error',
        title: errorTitle,
        message: errorMessage,
        details: errorDetails,
      });
    }
  };

  const renderContent = () => {
    if (!selectedCafe) return null;

    // Show duplicate visit info panel if visit already logged today
    if (showDuplicateInfo && existingVisit) {
      return (
        <div className={styles.duplicatePanel}>
          <div className={styles.duplicateIcon}>
            <CheckCircle size={48} />
          </div>

          <h3 className={styles.duplicateTitle}>
            Visit Already Logged Today
          </h3>

          <p className={styles.duplicateMessage}>
            You've already logged a visit to <strong>{selectedCafe.name}</strong> on{' '}
            {new Date().toLocaleDateString()}.
          </p>

          <div className={styles.existingVisitInfo}>
            {existingVisit.visit_time && (
              <div className={styles.visitDetail}>
                <Clock size={16} />
                <span>{formatVisitTime(existingVisit.visit_time)}</span>
              </div>
            )}
            {existingVisit.amount_spent && (
              <div className={styles.visitDetail}>
                <DollarSign size={16} />
                <span>{formatCurrency(existingVisit.amount_spent, existingVisit.currency || 'USD')}</span>
              </div>
            )}
          </div>

          <button
            className={styles.okayButton}
            onClick={onClose}
          >
            Okay
          </button>
        </div>
      );
    }

    // Normal form content
    return (
      <>
        {preselectedCafe && (
          <div className={styles.cafeContext}>
            <p className={styles.contextLabel}>Logging visit for:</p>
            <h3 className={styles.contextCafeName}>{selectedCafe.name}</h3>
          </div>
        )}

        <div className={styles.selectedCafe}>
          <p className={styles.cafeAddress}>{selectedCafe.address}</p>

          {locationLoading && (
            <div className={styles.infoBanner}>
              <MapPinned size={16} />
              <p>Getting your location for check-in verification...</p>
            </div>
          )}

          {locationError && (
            <div className={styles.errorBanner}>
              <p>
                ❌ {locationError}
                <br />
                <small>Location is required to verify you're at the cafe (within 1km).</small>
              </p>
            </div>
          )}

          {!locationLoading && !locationError && location && distanceKm !== null && (
            <>
              {distanceKm <= 1.0 ? (
                <div className={styles.successBanner}>
                  <MapPinned size={16} />
                  <p>✅ You are {(distanceKm * 1000).toFixed(0)}m from the cafe - ready to log visit!</p>
                </div>
              ) : (
                <div className={styles.errorBanner}>
                  <MapPinned size={16} />
                  <p>
                    ⚠️ You are {distanceKm.toFixed(2)}km from the cafe.
                    <br />
                    <small>You must be within 1km to log a visit.</small>
                  </p>
                </div>
              )}
            </>
          )}

          {!selectedCafe.is_registered && (
            <div className={styles.infoBanner}>
              <p>
                ℹ️ This cafe will be registered to Can-It-WFC when you log this visit!
              </p>
            </div>
          )}
        </div>

        {/* Visit Date - Hidden (automatic to today) - Can be restored by removing display: none */}
        <div className={styles.formGroup} style={{ display: 'none' }}>
          <label htmlFor="visit-date">
            <Clock size={18} />
            Visit Date
          </label>
          <input
            id="visit-date"
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="amount-spent">
            <DollarSign size={18} />
            How much did you spend? (Optional)
          </label>
          <div className={styles.currencyInputGroup}>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={styles.currencySelect}
            >
              {CURRENCIES.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.symbol} {curr.code}
                </option>
              ))}
            </select>
            <input
              id="amount-spent"
              type="number"
              value={amountSpent}
              onChange={(e) => setAmountSpent(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={styles.currencyInput}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="visit-time">
            <Clock size={18} />
            What time did you visit? (Optional)
          </label>
          <select
            id="visit-time"
            value={visitTime || ''}
            onChange={(e) => setVisitTime(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">Select time...</option>
            {VISIT_TIME_OPTIONS.map((time) => (
              <option key={time.value} value={time.value}>
                {time.label}
              </option>
            ))}
          </select>
        </div>

        {/* Show review toggle only if no existing review */}
        {existingReviewLoading ? (
          <div className={styles.reviewToggle}>
            <p>Checking review status...</p>
          </div>
        ) : reviewCheckFailed ? (
          <div className={styles.infoBanner}>
            <p>Could not check your review status.</p>
            <button
              className={styles.buttonPrimary}
              onClick={retryReviewCheck}
              style={{ marginTop: '0.5rem' }}
            >
              Retry
            </button>
          </div>
        ) : hasExistingReview ? (
          <div className={styles.infoBanner}>
            <p>
              You already have a review for this cafe.
            </p>
            <button
              className={styles.buttonPrimary}
              onClick={() => setShowEditReviewForm(true)}
              style={{ marginTop: '0.5rem' }}
            >
              Edit Your Review
            </button>
          </div>
        ) : (
          <div className={styles.reviewToggle}>
            <input
              type="checkbox"
              id="include-review"
              checked={includeReview}
              onChange={(e) => setIncludeReview(e.target.checked)}
            />
            <label htmlFor="include-review">
              Add a WFC review now
              <span className={styles.optional}>(Optional)</span>
            </label>
          </div>
        )}

        {includeReview && !hasExistingReview && (
          <div className={styles.reviewSection}>
            <h4 className={styles.reviewSectionTitle}>Work From Cafe Review</h4>

            {(() => {
              const subRatings = RATING_DIMENSIONS.filter(d => d.key !== 'wfc_rating');
              return (
                <>
                  <div className={styles.ratingField}>
                    <label className={styles.ratingLabel}>
                      <Star size={18} />
                      Overall WFC Rating
                      <span className={styles.optional}>(Auto)</span>
                    </label>
                    <StarRating value={form.wfcRating} disabled />
                  </div>
                  {subRatings.map(d => {
                    const value = form.ratingValues[d.key];
                    const setter = form.ratingSetters[d.key];
                    if (value === undefined || !setter) return null;
                    return (
                      <div key={d.key} className={styles.ratingField}>
                        <label className={styles.ratingLabel}>
                          {d.icon}
                          {d.label}
                        </label>
                        <StarRating value={value} onChange={setter} />
                      </div>
                    );
                  })}
                  <div className={styles.checkboxGrid}>
                    {FACILITY_CONFIG.map(f => {
                      const checked = form.facilityValues[f.key];
                      const setter = form.facilitySetters[f.key];
                      if (checked === undefined || !setter) return null;
                      return (
                        <FacilityCheckbox
                          key={f.key}
                          label={f.label}
                          icon={f.icon}
                          checked={checked}
                          onChange={setter}
                        />
                      );
                    })}
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="comment">
                      Comment (Optional, max {REVIEW_CONFIG.MAX_COMMENT_LENGTH} chars)
                    </label>
                    <textarea
                      id="comment"
                      value={form.comment}
                      onChange={(e) => form.setComment(e.target.value.slice(0, REVIEW_CONFIG.MAX_COMMENT_LENGTH))}
                      placeholder="Share your experience..."
                      maxLength={REVIEW_CONFIG.MAX_COMMENT_LENGTH}
                      rows={3}
                    />
                    <div className={styles.charCount}>
                      {form.comment.length}/{REVIEW_CONFIG.MAX_COMMENT_LENGTH}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        <div className={styles.modalActions}>
          <button
            className={styles.buttonSecondary}
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className={styles.buttonPrimary}
            onClick={handleSubmit}
            disabled={submitting || locationLoading || !location || (distanceKm !== null && distanceKm > 1.0)}
            title={
              !location
                ? 'Location required for check-in verification'
                : distanceKm !== null && distanceKm > 1.0
                ? `You are ${distanceKm.toFixed(2)}km away - must be within 1km`
                : ''
            }
          >
            {submitting ? 'Submitting...' : includeReview ? 'Log Visit & Review' : 'Log Visit'}
          </button>
        </div>
      </>
    );
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Log Visit" size="lg">
        {renderContent()}
      </Modal>

      <SharedResultModal resultModal={resultModal} />

      {showEditReviewForm && existingReviewData && selectedCafe?.is_registered && (
        <ReviewForm
          cafeId={selectedCafe.id}
          cafeName={selectedCafe.name}
          existingReview={existingReviewData}
          isOpen={showEditReviewForm}
          onClose={() => setShowEditReviewForm(false)}
          onSuccess={() => {
            setShowEditReviewForm(false);
            onSuccess();
          }}
        />
      )}
    </>
  );
};

export default AddVisitReviewModal;
