import React from 'react';
import { MapPin } from 'lucide-react';
import styles from './map.module.css';

interface RecenterButtonProps {
  onClick: () => void;
}

const RecenterButton: React.FC<RecenterButtonProps> = ({ onClick }) => {
  return (
    <button
      className={styles.recenterButton}
      onClick={onClick}
      aria-label="Center on my location"
      title="Center on my location"
    >
      <MapPin size={20} />
    </button>
  );
};

export default RecenterButton;
