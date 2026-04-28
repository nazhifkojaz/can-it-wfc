import React from 'react';
import { Navigation, Coffee } from 'lucide-react';
import { SharedResultModal } from '../common';
import { useResultModal } from '../../hooks';
import styles from './ActionButtons.module.css';

interface ActionButtonsProps {
  onDirections: () => void;
  onLogVisit: () => void;
  hasUserLocation: boolean;
  cafeName: string;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onDirections,
  onLogVisit,
  hasUserLocation,
  cafeName,
}) => {
  const resultModal = useResultModal();

  const handleDirectionsClick = () => {
    if (!hasUserLocation) {
      resultModal.showResultModal({
        type: 'warning',
        title: 'Location Permission Required',
        message: 'Location permission needed to get directions. Please enable location access.',
        details: (
          <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--neo-gray-600)' }}>
            <p>💡 Tip: Enable location in your browser settings to get turn-by-turn directions.</p>
          </div>
        ),
      });
      return;
    }
    onDirections();
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.directionsButton}
        onClick={handleDirectionsClick}
        aria-label={`Get directions to ${cafeName}`}
        disabled={!hasUserLocation}
        title={!hasUserLocation ? 'Enable location to get directions' : ''}
      >
        <Navigation size={20} />
        <span>Directions</span>
      </button>

      <button
        className={styles.logVisitButton}
        onClick={onLogVisit}
        aria-label={`Log visit to ${cafeName}`}
      >
        <Coffee size={20} />
        <span>Log Visit</span>
      </button>

      <SharedResultModal resultModal={resultModal} />
    </div>
  );
};

export default ActionButtons;
