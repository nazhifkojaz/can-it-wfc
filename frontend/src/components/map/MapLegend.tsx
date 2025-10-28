import React from 'react';
import styles from './map.module.css';

const MapLegend: React.FC = () => {
  return (
    <div className={styles.mapLegend}>
      <h4 className={styles.legendTitle}>Legend</h4>
      <div className={styles.legendItems}>
        <div className={styles.legendItem}>
          <div className={`${styles.legendMarker} ${styles.markerGreen}`}></div>
          <span>Visited & Reviewed</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendMarker} ${styles.markerBlue}`}></div>
          <span>Visited (No review)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendMarker} ${styles.markerGray}`}></div>
          <span>Not visited yet</span>
        </div>
      </div>
    </div>
  );
};

export default MapLegend;
