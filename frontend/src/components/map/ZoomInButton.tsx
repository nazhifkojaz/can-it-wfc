import React from 'react';
import { Plus } from 'lucide-react';
import { useMap } from 'react-leaflet';
import styles from './map.module.css';

const ZoomInButton: React.FC = () => {
  const map = useMap();

  const handleZoomIn = () => {
    map.zoomIn();
  };

  return (
    <button
      className={styles.mapControlButton}
      onClick={handleZoomIn}
      aria-label="Zoom in"
    >
      <Plus size={20} />
    </button>
  );
};

export default ZoomInButton;
