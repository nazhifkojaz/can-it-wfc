import React from 'react';
import { Star, Coffee } from 'lucide-react';
import styles from './RatingsComparison.module.css';

interface RatingsComparisonProps {
  googleRating?: number;
  googleCount?: number;
  wfcRating?: string | null;
  wfcCount: number;
  isRegistered: boolean;
}

const RatingsComparison: React.FC<RatingsComparisonProps> = ({
  googleRating,
  googleCount = 0,
  wfcRating,
  wfcCount,
  isRegistered,
}) => {
  const wfcRatingNumber = wfcRating ? parseFloat(wfcRating) : null;

  return (
    <div className={styles.container}>
      <h3 className={styles.sectionTitle}>Ratings at a Glance</h3>

      <div className={styles.ratingsGrid}>
        {/* Google Rating Card - Always show */}
        <div className={styles.ratingCard + ' ' + styles.googleCard}>
          <div className={styles.cardHeader}>
            <Star size={20} fill="#FBBC04" color="#FBBC04" />
            <span className={styles.cardTitle}>Google Maps</span>
          </div>
          {googleRating ? (
            <>
              <div className={styles.ratingValue}>{googleRating.toFixed(1)}</div>
              <div className={styles.ratingCount}>
                {googleCount.toLocaleString()} {googleCount === 1 ? 'review' : 'reviews'}
              </div>
            </>
          ) : (
            <>
              <div className={styles.ratingValue}>—</div>
              <div className={styles.ratingNote}>No rating available</div>
            </>
          )}
        </div>

        {/* WFC Rating Card - Always show */}
        <div className={styles.ratingCard + ' ' + styles.wfcCard}>
          <div className={styles.cardHeader}>
            <Coffee size={20} color="#8B5CF6" />
            <span className={styles.cardTitle}>Can-It-WFC</span>
          </div>
          {isRegistered ? (
            <>
              <div className={styles.ratingValue}>
                {wfcRatingNumber ? wfcRatingNumber.toFixed(1) : '—'}
              </div>
              <div className={styles.ratingCount}>
                {wfcCount} {wfcCount === 1 ? 'review' : 'reviews'}
              </div>
            </>
          ) : (
            <>
              <div className={styles.ratingValue}>—</div>
              <div className={styles.ratingNote}>
                Not registered yet
              </div>
            </>
          )}
        </div>
      </div>

      {/* CTA for unregistered cafes */}
      {!isRegistered && (
        <p className={styles.ctaMessage}>
          📝 Log a visit to add this cafe and leave the first WFC review!
        </p>
      )}

      {/* CTA for registered cafes with no reviews */}
      {isRegistered && wfcCount === 0 && (
        <p className={styles.ctaMessage}>
          ☕ Be the first to review this cafe's work-from-cafe experience!
        </p>
      )}
    </div>
  );
};

export default RatingsComparison;
