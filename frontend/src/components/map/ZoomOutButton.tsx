import React from 'react';
import { Minus } from 'lucide-react';
import { useMap } from 'react-leaflet';
import styles from './map.module.css';

const ZoomOutButton: React.FC = () => {
  const map = useMap();

  const handleZoomOut = () => {
    map.zoomOut();
  };

  return (
    <button
      className={styles.mapControlButton}
      onClick={handleZoomOut}
      aria-label="Zoom out"
    >
      <Minus size={20} />
    </button>
  );
};

export default ZoomOutButton;
