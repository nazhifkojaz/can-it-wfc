import React from 'react';
import { Star, Coffee, RefreshCw } from 'lucide-react';
import styles from './RatingsComparison.module.css';

interface RatingsComparisonProps {
  googleRating?: number | null;
  googleCount?: number | null;
  googleRatingUpdatedAt?: string | null;
  googlePlaceId?: string | null;
  isRefreshingRating?: boolean;
  wfcRating?: string | null;
  wfcCount: number;
  isRegistered: boolean;
  onRefreshRating?: () => void;
}

const RatingsComparison: React.FC<RatingsComparisonProps> = ({
  googleRating,
  googleCount = 0,
  googleRatingUpdatedAt,
  googlePlaceId,
  isRefreshingRating = false,
  wfcRating,
  wfcCount,
  isRegistered,
  onRefreshRating,
}) => {
  const wfcRatingNumber = wfcRating ? parseFloat(wfcRating) : null;

  // Handle null/undefined googleCount from database
  const safeGoogleCount = googleCount ?? 0;

  // Safely convert googleRating to number
  const googleRatingNumber: number | null = googleRating != null
    ? (typeof googleRating === 'number' ? googleRating : parseFloat(String(googleRating)))
    : null;

  // Calculate staleness text and determine if should show stale indicator
  const getFreshnessText = () => {
    if (!googleRatingUpdatedAt) {
      return null;
    }
    const updatedTime = new Date(googleRatingUpdatedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - updatedTime.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 1) {
      return null; // Fresh, don't show anything
    } else if (hoursDiff < 24) {
      const hours = Math.floor(hoursDiff);
      return `Updated ${hours}h ago`;
    } else if (hoursDiff < 48) {
      return 'Updated yesterday';
    } else {
      const days = Math.floor(hoursDiff / 24);
      return `Updated ${days}d ago`;
    }
  };

  const freshnessText = getFreshnessText();
  const isStale = googleRatingUpdatedAt && (new Date().getTime() - new Date(googleRatingUpdatedAt).getTime()) / (1000 * 60 * 60) >= 24;

  return (
    <div className={styles.container}>
      <h3 className={styles.sectionTitle}>Ratings at a Glance</h3>

      <div className={styles.ratingsGrid}>
        {/* Google Rating Card - Always show */}
        <div className={styles.ratingCard + ' ' + styles.googleCard} data-testid="google-card">
          <div className={styles.cardHeader}>
            <Star size={20} fill="#FBBC04" color="#FBBC04" />
            <span className={styles.cardTitle}>Google Maps</span>
            {/* Refresh button for stale ratings */}
            {googlePlaceId && googleRatingNumber && onRefreshRating && (
              <button
                className={styles.refreshButton}
                onClick={onRefreshRating}
                disabled={isRefreshingRating}
                title="Refresh Google rating"
                aria-label="Refresh Google rating"
                data-testid="refresh-button"
              >
                <RefreshCw size={14} className={isRefreshingRating ? styles.spinning : ''} data-testid="refresh-icon" />
              </button>
            )}
          </div>
          {googleRatingNumber ? (
            <>
              <div className={styles.ratingValue}>{googleRatingNumber.toFixed(1)}</div>
              <div className={styles.ratingCount}>
                {safeGoogleCount.toLocaleString()} {safeGoogleCount === 1 ? 'review' : 'reviews'}
              </div>
              {/* Staleness indicator */}
              {freshnessText && (
                <div className={styles.freshnessIndicator} data-testid="freshness-indicator">
                  {isStale && <span className={styles.staleDot} data-testid="stale-dot">•</span>}
                  {freshnessText}
                  {isRefreshingRating && (
                    <span className={styles.refreshingText}> Updating...</span>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className={styles.ratingValue}>—</div>
              <div className={styles.ratingNote}>No rating available</div>
            </>
          )}
        </div>

        {/* WFC Rating Card - Always show */}
        <div className={styles.ratingCard + ' ' + styles.wfcCard} data-testid="wfc-card">
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
