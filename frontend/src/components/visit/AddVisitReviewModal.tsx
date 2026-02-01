import React, { useState, useEffect, useMemo } from 'react';
import { Clock, MapPinned, DollarSign, Star, Wifi, Zap, Armchair, Volume2, CheckCircle, Cigarette, Home } from 'lucide-react';
import { z } from 'zod';
import { Cafe, CombinedVisitReviewCreate, Visit } from '../../types';
import { Modal, ResultModal } from '../common';
import { useVisits, useGeolocation, useResultModal } from '../../hooks';
import { calculateDistance, formatVisitTime } from '../../utils';
import { CURRENCIES, detectCurrencyFromCoordinates, formatCurrency } from '../../utils/currency';
import { VISIT_TIME_OPTIONS } from '../../config/constants';
import { visitApi, reviewApi } from '../../api/client';
import { extractApiError, getFieldError } from '../../utils/errorUtils';
import { logger } from '../../utils/logger';
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

  validateReviewFields: (includeReview: boolean, wfcRating: number): string | null => {
    if (includeReview && (!wfcRating || wfcRating < 1 || wfcRating > 5)) {
      return 'Overall WFC rating is required when adding a review';
    }
    return null;
  }
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

  // Result modal
  const resultModal = useResultModal();

  // Review fields (simplified form with 5 key criteria)
  const [wfcRating, setWfcRating] = useState<number>(3);
  const [wifiQuality, setWifiQuality] = useState<number>(3);
  const [powerOutlets, setPowerOutlets] = useState<number>(3);
  const [seatingComfort, setSeatingComfort] = useState<number>(3);
  const [noiseLevel, setNoiseLevel] = useState<number>(3);
  const [hasSmokingArea, setHasSmokingArea] = useState<boolean | null>(null);
  const [hasPrayerRoom, setHasPrayerRoom] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');

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
    const checkDuplicate = async () => {
      if (isOpen && selectedCafe?.is_registered) {
        try {
          const today = new Date().toISOString().split('T')[0];
          const response = await visitApi.getVisits({ cafe: selectedCafe.id, visit_date: today });

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

    const checkExistingReview = async () => {
      if (isOpen && selectedCafe?.is_registered) {
        setExistingReviewLoading(true);
        try {
          const review = await reviewApi.getUserCafeReview(selectedCafe.id);
          setHasExistingReview(!!review);
        } catch (error) {
          logger.error('Error checking existing review', error, 'AddVisitReviewModal');
          setHasExistingReview(false);
        } finally {
          setExistingReviewLoading(false);
        }
      } else {
        setHasExistingReview(false);
      }
    };

    if (isOpen) {
      setSelectedCafe(preselectedCafe);
      setVisitDate(new Date().toISOString().split('T')[0]);
      setAmountSpent('');
      setVisitTime(null);
      setIncludeReview(false);
      setWfcRating(3);
      setWifiQuality(3);
      setPowerOutlets(3);
      setSeatingComfort(3);
      setNoiseLevel(3);
      setHasSmokingArea(null);
      setHasPrayerRoom(null);
      setComment('');

      // Auto-detect currency based on cafe location
      if (preselectedCafe) {
        const detectedCurrency = detectCurrencyFromCoordinates(
          parseFloat(preselectedCafe.latitude),
          parseFloat(preselectedCafe.longitude)
        );
        setCurrency(detectedCurrency);
      }

      refetch();
      checkDuplicate();
      checkExistingReview();
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
      const reviewError = visitReviewValidation.validateReviewFields(includeReview, wfcRating);
      if (reviewError) validationErrors.push(reviewError);

      const commentError = visitReviewValidation.validateComment(comment);
      if (commentError) validationErrors.push(commentError);

      // Validate all rating fields
      const ratingErrors = [
        visitReviewValidation.validateRating(wfcRating, 'Overall WFC rating'),
        visitReviewValidation.validateRating(wifiQuality, 'WiFi quality'),
        visitReviewValidation.validateRating(powerOutlets, 'Power outlets'),
        visitReviewValidation.validateRating(seatingComfort, 'Seating comfort'),
        visitReviewValidation.validateRating(noiseLevel, 'Noise level'),
      ].filter(Boolean);

      validationErrors.push(...ratingErrors as string[]);
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
      }

      if (includeReview) {
        visitReviewData.wfc_rating = wfcRating;
        visitReviewData.wifi_quality = wifiQuality;
        visitReviewData.power_outlets_rating = powerOutlets;
        visitReviewData.seating_comfort = seatingComfort;
        visitReviewData.noise_level = noiseLevel;
        visitReviewData.has_smoking_area = hasSmokingArea;
        visitReviewData.has_prayer_room = hasPrayerRoom;
        if (comment.trim()) {
          visitReviewData.comment = comment.trim();
        }
      }

      await createWithReview(visitReviewData);

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
                <span>{wfcRating}/5 Rating</span>
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
    } catch (error: any) {
      logger.error('Error logging visit', error, 'AddVisitReviewModal');

      let errorTitle = 'Failed to Log Visit';
      let errorDetails = null;

      // Check for field-specific errors
      const distanceError = getFieldError(error, 'check_in_latitude');
      const cafeIdError = getFieldError(error, 'cafe_id');
      const ratingError = getFieldError(error, 'wfc_rating');

      let errorMessage: string;

      if (distanceError) {
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
        errorMessage = extractApiError(error).message;
      }

      resultModal.showResultModal({
        type: 'error',
        title: errorTitle,
        message: errorMessage,
        details: errorDetails,
      });
    }
  };

  const renderStarRating = (value: number, onChange: (val: number) => void, label: string, icon: React.ReactNode) => {
    return (
      <div className={styles.ratingField}>
        <label className={styles.ratingLabel}>
          {icon}
          {label}
        </label>
        <div className={styles.starContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`${styles.starButton} ${star <= value ? styles.starActive : ''}`}
              onClick={() => onChange(star)}
              aria-label={`Rate ${star} stars`}
            >
              <Star size={24} fill={star <= value ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
      </div>
    );
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
        ) : hasExistingReview ? (
          <div className={styles.infoBanner}>
            <p>
              ℹ️ You already have a review for this cafe.
              <br />
              <small>You can edit your review from your visits page.</small>
            </p>
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

            {renderStarRating(wfcRating, setWfcRating, 'Overall WFC Rating', <Star size={18} />)}
            {renderStarRating(wifiQuality, setWifiQuality, 'WiFi Quality', <Wifi size={18} />)}
            {renderStarRating(powerOutlets, setPowerOutlets, 'Power Outlets', <Zap size={18} />)}
            {renderStarRating(seatingComfort, setSeatingComfort, 'Seat/Desk Comfort', <Armchair size={18} />)}
            {renderStarRating(noiseLevel, setNoiseLevel, 'Audio Comfort', <Volume2 size={18} />)}

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
                    onClick={() => setHasSmokingArea(true)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleButton} ${hasSmokingArea === false ? styles.toggleActive : ''}`}
                    onClick={() => setHasSmokingArea(false)}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleButton} ${hasSmokingArea === null ? styles.toggleActive : ''}`}
                    onClick={() => setHasSmokingArea(null)}
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
                    onClick={() => setHasPrayerRoom(true)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleButton} ${hasPrayerRoom === false ? styles.toggleActive : ''}`}
                    onClick={() => setHasPrayerRoom(false)}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleButton} ${hasPrayerRoom === null ? styles.toggleActive : ''}`}
                    onClick={() => setHasPrayerRoom(null)}
                  >
                    Don't Know
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="comment">
                Comment (Optional, max 160 chars)
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 160))}
                placeholder="Share your experience..."
                maxLength={160}
                rows={3}
              />
              <div className={styles.charCount}>
                {comment.length}/160
              </div>
            </div>
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

export default AddVisitReviewModal;
