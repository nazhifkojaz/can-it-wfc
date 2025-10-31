import React from 'react';
import { Navigation, Coffee } from 'lucide-react';
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
  const handleDirectionsClick = () => {
    if (!hasUserLocation) {
      alert('⚠️ Location permission needed to get directions. Please enable location access.');
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
    </div>
  );
};

export default ActionButtons;
