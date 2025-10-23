import React, { useState } from 'react';
import { Search, MapPin, Clock } from 'lucide-react';
import { Cafe, VisitCreate } from '../../types';
import { Modal, Loading, EmptyState } from '../common';
import { useCafes, useVisits } from '../../hooks';
import { formatDistance } from '../../utils';
import styles from './AddVisitModal.module.css';

interface AddVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onAddReview?: (visitId: string, cafeId: string, cafeName: string) => void;
  preselectedCafe?: Cafe;
}

type Step = 'search' | 'confirm';

const AddVisitModal: React.FC<AddVisitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onAddReview,
  preselectedCafe,
}) => {
  const [step, setStep] = useState<Step>(preselectedCafe ? 'confirm' : 'search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCafe, setSelectedCafe] = useState<Cafe | undefined>(preselectedCafe);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [addReviewNow, setAddReviewNow] = useState(false);

  const { searchCafes, cafes: searchResults, loading: searching } = useCafes({ autoFetch: false });
  const { createVisit, loading: submitting } = useVisits();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      return;
    }

    await searchCafes(query);
  };

  const handleSelectCafe = (cafe: Cafe) => {
    setSelectedCafe(cafe);
    setStep('confirm');
  };

  const handleLogVisit = async () => {
    if (!selectedCafe) return;

    try {
      const visitData: VisitCreate = {
        visit_date: visitDate,
      };

      // Scenario 1: Registered cafe (already in database)
      if (selectedCafe.is_registered) {
        visitData.cafe_id = selectedCafe.id;
      }
      // Scenario 2: Unregistered cafe (from Google Places - will auto-register)
      else {
        if (!selectedCafe.google_place_id) {
          throw new Error('Missing Google Place ID for unregistered cafe');
        }

        visitData.google_place_id = selectedCafe.google_place_id;
        visitData.cafe_name = selectedCafe.name;
        visitData.cafe_address = selectedCafe.address;
        visitData.cafe_latitude = selectedCafe.latitude;
        visitData.cafe_longitude = selectedCafe.longitude;
      }

      const newVisit = await createVisit(visitData);

      if (addReviewNow && onAddReview && newVisit) {
        onAddReview(newVisit.id, newVisit.cafe.id, newVisit.cafe.name);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error logging visit:', error);
    }
  };

  const renderSearchStep = () => (
    <>
      <div className={styles.searchBox}>
        <Search size={20} />
        <input
          type="text"
          placeholder="Search cafe name..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
        />
      </div>

      {searching && <Loading message="Searching cafes..." />}

      {!searching && searchResults.length > 0 && (
        <div className={styles.searchResults}>
          {searchResults.map((cafe) => (
            <button
              key={cafe.id}
              className={styles.cafeResult}
              onClick={() => handleSelectCafe(cafe)}
            >
              <div className={styles.resultInfo}>
                <p className={styles.resultName}>{cafe.name}</p>
                <p className={styles.resultAddress}>
                  <MapPin size={14} />
                  {cafe.address}
                </p>
              </div>
              {cafe.distance && (
                <span className={styles.resultDistance}>
                  {formatDistance(cafe.distance)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
        <EmptyState
          title="No cafes found"
          description="Try a different search term"
        />
      )}
    </>
  );

  const renderConfirmStep = () => {
    if (!selectedCafe) return null;

    return (
      <>
        <div className={styles.selectedCafe}>
          <h3 className={styles.cafeName}>{selectedCafe.name}</h3>
          <p className={styles.cafeAddress}>{selectedCafe.address}</p>

          {/* NEW: Show info for unregistered cafes */}
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
            onClick={() => setStep('search')}
            disabled={submitting}
          >
            Back
          </button>
          <button
            className={styles.buttonPrimary}
            onClick={handleLogVisit}
            disabled={submitting}
          >
            {submitting ? 'Logging...' : 'Log Visit'}
          </button>
        </div>
      </>
    );
  };

  const getTitle = () => {
    if (step === 'search') return 'Search Cafe';
    if (step === 'confirm') return 'Confirm Visit';
    return '';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size="md">
      {step === 'search' && renderSearchStep()}
      {step === 'confirm' && renderConfirmStep()}
    </Modal>
  );
};

export default AddVisitModal;
