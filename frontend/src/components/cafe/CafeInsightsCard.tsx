import React, { useState } from 'react';
import { ChevronRight, ArrowLeft, BarChart3 } from 'lucide-react';
import { Cafe, AverageRatings, FacilityStats } from '../../types';
import { useCafeInsights } from '../../hooks';
import DetailedRatings from './DetailedRatings';
import CostSummary from './insights/CostSummary';
import TimeOfDayChart from './insights/TimeOfDayChart';
import GoogleDelta from './insights/GoogleDelta';
import ConfidenceFooter from './insights/ConfidenceFooter';
import styles from './insights/insights.module.css';

interface Props {
  cafe: Cafe;
  ratings?: AverageRatings | null;
  facilityStats?: FacilityStats | null;
}

const SkeletonCard = () => (
  <div className={styles.card}>
    <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
    <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
    <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
    <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
  </div>
);

const CafeInsightsCard: React.FC<Props> = ({ cafe, ratings, facilityStats }) => {
  const [showInsights, setShowInsights] = useState(false);
  const { data, isLoading } = useCafeInsights(
    cafe.is_registered && typeof cafe.id === 'number' && cafe.id > 0
      ? cafe.id
      : undefined
  );

  const insights = data?.insights;
  const exchangeRates = data?.exchange_rates;
  const totalVisits = cafe.total_visits ?? 0;
  const totalReviews = cafe.total_reviews ?? 0;
  const hasData = totalVisits > 0 || totalReviews > 0;

  const hasAdvancedInsights =
    !!insights &&
    (
      !!insights.spend ||
      !!insights.time_of_day ||
      !!insights.google_delta
    );

  if (!cafe.is_registered) return null;

  if (!hasData) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyText}>
          No insights yet — be the first to log a visit.
        </p>
      </div>
    );
  }

  const openInsights = () => setShowInsights(true);
  const closeInsights = () => setShowInsights(false);

  return (
    <div className={styles.slideContainer}>
      <div
        className={`${styles.slideWrapper} ${showInsights ? styles.showInsights : ''}`}
      >
        {/* Main view — standard DetailedRatings + button */}
        <div className={styles.mainView}>
          {ratings && (
            <DetailedRatings
              ratings={ratings}
              facilityStats={facilityStats}
            />
          )}
          {hasAdvancedInsights ? (
            <button
              className={styles.insightsButton}
              onClick={openInsights}
              type="button"
            >
              <BarChart3 size={18} />
              See Detailed Insights
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              className={styles.insightsButtonDisabled}
              disabled
              type="button"
            >
              <BarChart3 size={18} />
              Not enough data for advanced insights yet
            </button>
          )}
        </div>

        {/* Insights sub-view — slide in */}
        <div className={styles.insightsView}>
          <div className={styles.card}>
            <div className={styles.insightsHeader}>
              <button
                className={styles.backButton}
                onClick={closeInsights}
                type="button"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <h3 className={styles.insightsTitle}>Cafe Insights</h3>
            </div>

            {isLoading && <SkeletonCard />}

            {!isLoading && insights && (
              <>
                {/* TODO: Replace static "good for" chips with NLP-derived tags
                    from review text analysis. See backend stats_utils.py TODO. */}
                {insights.spend && <CostSummary spend={insights.spend} exchangeRates={exchangeRates} />}
                {insights.time_of_day && (
                  <TimeOfDayChart timeOfDay={insights.time_of_day} />
                )}
                {insights.google_delta && <GoogleDelta delta={insights.google_delta} />}
                <ConfidenceFooter
                  totalVisits={totalVisits}
                  totalReviews={totalReviews}
                  recentActivity={insights.recent_activity}
                />
              </>
            )}

            {!isLoading && !insights && (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>
                  No detailed insights available yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CafeInsightsCard;
