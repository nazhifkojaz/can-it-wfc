import React, { useState, useEffect, useMemo } from 'react';
import { Clock, MapPinned } from 'lucide-react';
import { Cafe, VisitCreate } from '../../types';
import { Modal, ResultModal } from '../common';
import { useVisits, useGeolocation, useResultModal } from '../../hooks';
import { calculateDistance } from '../../utils';
import styles from './AddVisitModal.module.css';

interface AddVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onAddReview?: (visitId: number, cafeId: number, cafeName: string) => void;
  preselectedCafe?: Cafe;
}

const AddVisitModal: React.FC<AddVisitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onAddReview,
  preselectedCafe,
}) => {
  const [selectedCafe, setSelectedCafe] = useState<Cafe | undefined>(preselectedCafe);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [addReviewNow, setAddReviewNow] = useState(false);

  // Result modal
  const resultModal = useResultModal();

  const { createVisit, loading: submitting } = useVisits();
  const { location, error: locationError, loading: locationLoading, refetch } = useGeolocation({ watch: false });

  // Calculate distance from user to selected cafe
  const distanceKm = useMemo(() => {
    if (!location || !selectedCafe) return null;

    const cafeLat = parseFloat(selectedCafe.latitude);
    const cafeLng = parseFloat(selectedCafe.longitude);

    if (isNaN(cafeLat) || isNaN(cafeLng)) return null;

    return calculateDistance(location.lat, location.lng, cafeLat, cafeLng);
  }, [location, selectedCafe]);

  useEffect(() => {
    if (isOpen) {
      setSelectedCafe(preselectedCafe);
      setVisitDate(new Date().toISOString().split('T')[0]);
      setAddReviewNow(false);
      refetch();
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

  const handleLogVisit = async () => {
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
      const visitData: VisitCreate = {
        visit_date: visitDate,
        check_in_latitude: location.lat.toFixed(8),
        check_in_longitude: location.lng.toFixed(8),
      };

      if (selectedCafe.is_registered) {
        visitData.cafe_id = selectedCafe.id;
      } else {
        if (!selectedCafe.google_place_id) {
          throw new Error('Missing Google Place ID for unregistered cafe');
        }

        if (!selectedCafe.latitude || !selectedCafe.longitude) {
          throw new Error('Cafe coordinates are missing. Please try selecting a different cafe.');
        }

        const lat = parseFloat(selectedCafe.latitude);
        const lng = parseFloat(selectedCafe.longitude);

        if (isNaN(lat) || isNaN(lng)) {
          throw new Error('Invalid cafe coordinates. Please try selecting a different cafe.');
        }

        visitData.google_place_id = selectedCafe.google_place_id;
        visitData.cafe_name = selectedCafe.name;
        visitData.cafe_address = selectedCafe.address;
        visitData.cafe_latitude = lat.toFixed(8);
        visitData.cafe_longitude = lng.toFixed(8);
      }

      const newVisit = await createVisit(visitData);

      if (!newVisit) {
        throw new Error('Failed to create visit');
      }

      if (addReviewNow && onAddReview) {
        // Don't show success panel, let the review form handle it
        onAddReview(newVisit.id, newVisit.cafe.id, newVisit.cafe.name);
      } else {
        // Show success modal
        resultModal.showResultModal({
          type: 'success',
          title: 'Visit Logged Successfully!',
          message: 'Your visit has been recorded.',
          details: (
            <div className={styles.resultSummary}>
              <div className={styles.summaryItem}>
                <MapPinned size={16} />
                <span>{selectedCafe.name}</span>
              </div>
              <div className={styles.summaryItem}>
                <Clock size={16} />
                <span>{new Date(visitDate).toLocaleDateString()}</span>
              </div>
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
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error logging visit:', error);
      }

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

        <div className={styles.formGroup}>
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

        {onAddReview && (
          <div className={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="add-review"
              checked={addReviewNow}
              onChange={(e) => setAddReviewNow(e.target.checked)}
            />
            <label htmlFor="add-review">Add review now</label>
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
            onClick={handleLogVisit}
            disabled={submitting || locationLoading || !location || (distanceKm !== null && distanceKm > 1.0)}
            title={
              !location
                ? 'Location required for check-in verification'
                : distanceKm !== null && distanceKm > 1.0
                ? `You are ${distanceKm.toFixed(2)}km away - must be within 1km`
                : ''
            }
          >
            {submitting ? 'Logging...' : 'Log Visit'}
          </button>
        </div>
      </>
    );
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Log Visit" size="md">
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

export default AddVisitModal;
