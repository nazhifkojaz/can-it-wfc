import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import styles from './map.module.css';

const MapLegend: React.FC = () => {
  const [isLegendVisible, setIsLegendVisible] = useState(false);

  const toggleLegend = () => {
    setIsLegendVisible(prev => !prev);
  };

  return (
    <div className={styles.mapLegend}>
      {!isLegendVisible && (
        <button className={styles.legendToggleButton} onClick={toggleLegend}>
          Legend <ChevronUp size={16} />
        </button>
      )}

      {isLegendVisible && (
        <div className={styles.legendContent}>
          <div className={styles.legendHeader}>
            <h4 className={styles.legendTitle}>Legend</h4>
            <button className={styles.legendCloseButton} onClick={toggleLegend} aria-label="Hide legend">
              <ChevronDown size={20} />
            </button>
          </div>

          <div className={styles.legendSection}>
            <span className={styles.legendSectionTitle}>Status</span>
            <div className={styles.legendItems}>
              <div className={styles.legendItem}>
                <div className={`${styles.legendMarker} ${styles.markerGreen}`}></div>
                <span>Reviewed on WFC</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendMarker} ${styles.markerBlue}`}></div>
                <span>Added to WFC, no reviews</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendMarker} ${styles.markerGray}`}></div>
                <span>From Google, not verified</span>
              </div>
            </div>
          </div>

          <div className={styles.legendDivider} />

          <div className={styles.legendSection}>
            <span className={styles.legendSectionTitle}>Place type</span>
            <div className={styles.legendItems}>
              <div className={styles.legendItem}>
                <div className={`${styles.legendMarker} ${styles.legendTypeCircle}`}></div>
                <span>Cafe</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendMarker} ${styles.legendTypeSquare}`}></div>
                <span>Coworking space</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendMarker} ${styles.legendTypeBook}`}></div>
                <span>Library</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapLegend;
