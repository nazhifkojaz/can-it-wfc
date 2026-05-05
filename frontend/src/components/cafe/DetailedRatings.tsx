import React, { useState } from 'react';
import { Wifi, Zap, Armchair, Volume2, Coffee, Cigarette, Home, Building2, TreePine } from 'lucide-react';
import { AverageRatings, FacilityStats } from '../../types';
import { Tooltip } from '../common';
import styles from './DetailedRatings.module.css';

interface DetailedRatingsProps {
  ratings: AverageRatings;
  facilityStats?: FacilityStats | null;
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
  { key: 'noise_level', label: 'Audio Comfort', icon: <Volume2 size={18} /> },
  { key: 'wfc_rating', label: 'Overall WFC Score', icon: <Coffee size={18} /> },
];

interface FacilityItem {
  key: keyof FacilityStats;
  label: string;
  icon: React.ReactNode;
}

const FACILITY_ITEMS: FacilityItem[] = [
  { key: 'smoking_area', label: 'Smoking area', icon: <Cigarette size={16} /> },
  { key: 'prayer_room', label: 'Prayer room', icon: <Home size={16} /> },
  { key: 'indoor_seating', label: 'Indoor seating', icon: <Building2 size={16} /> },
  { key: 'outdoor_seating', label: 'Outdoor seating', icon: <TreePine size={16} /> },
];

const getRatingColor = (value: number): string => {
  if (value >= 4.0) return '#10B981'; // Green - Excellent
  if (value >= 3.0) return '#F59E0B'; // Yellow - Good
  if (value >= 2.0) return '#F97316'; // Orange - Fair
  return '#EF4444'; // Red - Poor
};

const DetailedRatings: React.FC<DetailedRatingsProps> = ({ ratings, facilityStats }) => {
  const totalReviewers = facilityStats?.smoking_area?.total_reviewers || 0;
  const [hintDismissed, setHintDismissed] = useState(false);

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

      {facilityStats && totalReviewers > 0 && (
        <div className={styles.facilityRow}>
          {FACILITY_ITEMS.map((item) => {
            const data = facilityStats[item.key];
            if (!data) return null;
            return (
              <Tooltip key={item.key} content={item.label}>
                <button
                  type="button"
                  className={styles.facilityChip}
                  onClick={() => setHintDismissed(true)}
                >
                  <span className={styles.facilityIcon}>{item.icon}</span>
                  <span className={styles.facilityCount}>{data.mentions}</span>
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}

      {facilityStats && totalReviewers > 0 && !hintDismissed && (
        <div className={styles.facilityHint}>
          tap icons for details
        </div>
      )}

      {totalReviewers > 0 && (
        <div className={styles.reviewerFooter}>
          (from {totalReviewers} {totalReviewers === 1 ? 'reviewer' : 'reviewers'})
        </div>
      )}
    </div>
  );
};

export default DetailedRatings;
