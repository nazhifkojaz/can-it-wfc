import React from 'react';
import { LocateFixed } from 'lucide-react';
import styles from './map.module.css';

interface FindMyLocationButtonProps {
  onClick: () => void;
  disabled: boolean;
}

const FindMyLocationButton: React.FC<FindMyLocationButtonProps> = ({
  onClick,
  disabled,
}) => {
  return (
    <button
      className={styles.mapControlButton}
      onClick={onClick}
      disabled={disabled}
      aria-label="Find my location"
    >
      <LocateFixed size={20} />
    </button>
  );
};

export default FindMyLocationButton;