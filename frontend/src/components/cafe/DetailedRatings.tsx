import React from 'react';
import { Wifi, Zap, Armchair, Volume2, Coffee } from 'lucide-react';
import { AverageRatings } from '../../types';
import styles from './DetailedRatings.module.css';

interface DetailedRatingsProps {
  ratings: AverageRatings;
}

interface RatingItem {
  key: keyof AverageRatings;
  label: string;
  icon: React.ReactNode;
}

const RATING_ITEMS: RatingItem[] = [
  { key: 'wifi_quality', label: 'WiFi Quality', icon: <Wifi size={18} /> },
  { key: 'power_outlets_rating', label: 'Power Outlets', icon: <Zap size={18} /> },
  { key: 'seating_comfort', label: 'Seating Comfort', icon: <Armchair size={18} /> },
  { key: 'noise_level', label: 'Noise Level', icon: <Volume2 size={18} /> },
  { key: 'wfc_rating', label: 'Overall WFC Score', icon: <Coffee size={18} /> },
];

const getRatingColor = (value: number): string => {
  if (value >= 4.0) return '#10B981'; // Green - Excellent
  if (value >= 3.0) return '#F59E0B'; // Yellow - Good
  if (value >= 2.0) return '#F97316'; // Orange - Fair
  return '#EF4444'; // Red - Poor
};

const DetailedRatings: React.FC<DetailedRatingsProps> = ({ ratings }) => {
  return (
    <div className={styles.container}>
      <h3 className={styles.sectionTitle}>WFC Detailed Ratings</h3>

      <div className={styles.ratingsContainer}>
        {RATING_ITEMS.map((item) => {
          const value = ratings[item.key];
          const percentage = (value / 5) * 100;
          const color = getRatingColor(value);
          const isOverall = item.key === 'wfc_rating';

          return (
            <div
              key={item.key}
              className={`${styles.ratingRow} ${isOverall ? styles.overallRow : ''}`}
            >
              <div className={styles.ratingLabel}>
                <span className={styles.ratingIcon}>{item.icon}</span>
                <span className={styles.labelText}>{item.label}</span>
              </div>

              <div className={styles.ratingBar}>
                <div
                  className={styles.ratingFill}
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: color,
                  }}
                />
              </div>

              <div className={styles.ratingValue} style={{ color }}>
                {value.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ backgroundColor: '#10B981' }} />
          <span>Excellent (4.0-5.0)</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ backgroundColor: '#F59E0B' }} />
          <span>Good (3.0-3.9)</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ backgroundColor: '#F97316' }} />
          <span>Fair (2.0-2.9)</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendDot} style={{ backgroundColor: '#EF4444' }} />
          <span>Poor (0-1.9)</span>
        </div>
      </div>
    </div>
  );
};

export default DetailedRatings;
