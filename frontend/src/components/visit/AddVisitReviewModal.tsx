import React, { useState, useEffect, useMemo } from 'react';
import { Clock, MapPinned, DollarSign, Star, Wifi, Zap, Armchair, Volume2, CheckCircle } from 'lucide-react';
import { Cafe, CombinedVisitReviewCreate, Visit } from '../../types';
import { Modal, ResultModal } from '../common';
import { useVisits, useGeolocation, useResultModal } from '../../hooks';
import { calculateDistance, formatVisitTime } from '../../utils';
import { VISIT_TIME_OPTIONS, AMOUNT_SPENT_RANGES } from '../../config/constants';
import { visitApi } from '../../api/client';
import styles from './AddVisitReviewModal.module.css';

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
  const [amountSpent, setAmountSpent] = useState<number | null>(null);
  const [visitTime, setVisitTime] = useState<number | null>(null);
  const [includeReview, setIncludeReview] = useState(false);

  // Duplicate visit detection
  const [showDuplicateInfo, setShowDuplicateInfo] = useState(false);
  const [existingVisit, setExistingVisit] = useState<Visit | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Result modal
  const resultModal = useResultModal();

  // Review fields (simplified form with 5 key criteria)
  const [wfcRating, setWfcRating] = useState<number>(3);
  const [wifiQuality, setWifiQuality] = useState<number>(3);
  const [powerOutlets, setPowerOutlets] = useState<number>(3);
  const [seatingComfort, setSeatingComfort] = useState<number>(3);
  const [noiseLevel, setNoiseLevel] = useState<number>(3);
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

  // Check for duplicate visit when modal opens
  useEffect(() => {
    const checkDuplicate = async () => {
      if (isOpen && selectedCafe?.is_registered) {
        setCheckingDuplicate(true);
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
          console.error('Error checking duplicate visit:', error);
          setShowDuplicateInfo(false);
        } finally {
          setCheckingDuplicate(false);
        }
      } else {
        setShowDuplicateInfo(false);
        setExistingVisit(null);
      }
    };

    if (isOpen) {
      setSelectedCafe(preselectedCafe);
      setVisitDate(new Date().toISOString().split('T')[0]);
      setAmountSpent(null);
      setVisitTime(null);
      setIncludeReview(false);
      setWfcRating(3);
      setWifiQuality(3);
      setPowerOutlets(3);
      setSeatingComfort(3);
      setNoiseLevel(3);
      setComment('');
      refetch();
      checkDuplicate();
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

    try {
      const visitReviewData: CombinedVisitReviewCreate = {
        visit_date: visitDate,
        amount_spent: amountSpent,
        visit_time: visitTime,
        check_in_latitude: location.lat,
        check_in_longitude: location.lng,
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
        visitReviewData.cafe_latitude = parseFloat(lat.toFixed(8));
        visitReviewData.cafe_longitude = parseFloat(lng.toFixed(8));
      }

      if (includeReview) {
        visitReviewData.wfc_rating = wfcRating;
        visitReviewData.wifi_quality = wifiQuality;
        visitReviewData.power_outlets_rating = powerOutlets;
        visitReviewData.seating_comfort = seatingComfort;
        visitReviewData.noise_level = noiseLevel;
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
          ? 'Your visit and review have been recorded.'
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
                <span>${amountSpent.toFixed(2)}</span>
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
      console.error('Error logging visit:', error);

      let errorTitle = 'Failed to Log Visit';
      let errorMessage = error.response?.data?.message || error.message || 'Failed to log visit. Please try again.';
      let errorDetails = null;

      if (error.response?.data?.check_in_latitude) {
        errorTitle = 'Distance Check Failed';
        errorMessage = error.response.data.check_in_latitude[0];
        errorDetails = (
          <div className={styles.errorTip}>
            <p>💡 You must be within 1km of the cafe to log a visit. Please move closer and try again.</p>
          </div>
        );
      } else if (error.response?.data?.wfc_rating) {
        errorTitle = 'Validation Error';
        errorMessage = error.response.data.wfc_rating[0];
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
                <span>${existingVisit.amount_spent.toFixed(2)}</span>
              </div>
            )}
            {existingVisit.review ? (
              <div className={styles.visitDetail}>
                <Star size={16} />
                <span>Review submitted</span>
              </div>
            ) : (
              <div className={styles.visitDetail}>
                <Star size={16} />
                <span>No review yet</span>
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
          <select
            id="amount-spent"
            value={amountSpent || ''}
            onChange={(e) => setAmountSpent(e.target.value ? parseFloat(e.target.value) : null)}
          >
            <option value="">Select amount...</option>
            {AMOUNT_SPENT_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
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

        {includeReview && (
          <div className={styles.reviewSection}>
            <h4 className={styles.reviewSectionTitle}>Work From Cafe Review</h4>

            {renderStarRating(wfcRating, setWfcRating, 'Overall WFC Rating', <Star size={18} />)}
            {renderStarRating(wifiQuality, setWifiQuality, 'WiFi Quality', <Wifi size={18} />)}
            {renderStarRating(powerOutlets, setPowerOutlets, 'Power Outlets', <Zap size={18} />)}
            {renderStarRating(seatingComfort, setSeatingComfort, 'Seat/Desk Comfort', <Armchair size={18} />)}
            {renderStarRating(noiseLevel, setNoiseLevel, 'Noise Level', <Volume2 size={18} />)}

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
