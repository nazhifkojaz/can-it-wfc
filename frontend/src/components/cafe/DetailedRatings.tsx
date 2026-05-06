import React, { useState } from 'react';
import { AverageRatings, FacilityStats } from '../../types';
import { getRatingColor } from '../../utils';
import { RATING_DIMENSIONS, FACILITY_CONFIG } from '../../config/ratings';
import { Tooltip } from '../common';
import styles from './DetailedRatings.module.css';

interface DetailedRatingsProps {
  ratings: AverageRatings;
  facilityStats?: FacilityStats | null;
}

const DetailedRatings: React.FC<DetailedRatingsProps> = ({ ratings, facilityStats }) => {
  const totalReviewers = facilityStats?.smoking_area?.total_reviewers || 0;
  const [hintDismissed, setHintDismissed] = useState(false);

  return (
    <div className={styles.container}>
      <h3 className={styles.sectionTitle}>WFC Detailed Ratings</h3>

      <div className={styles.ratingsContainer}>
        {RATING_DIMENSIONS.map((item) => {
          const value = ratings[item.key as keyof AverageRatings];
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
          {FACILITY_CONFIG.map((item) => {
            const data = facilityStats[item.key as keyof FacilityStats];
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
