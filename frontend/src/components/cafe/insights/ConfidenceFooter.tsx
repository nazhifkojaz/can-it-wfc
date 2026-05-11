import React from 'react';
import { RecentActivityInsight } from '../../../types/insights';
import styles from './insights.module.css';

interface Props {
  totalVisits: number;
  totalReviews: number;
  recentActivity?: RecentActivityInsight | null;
}

const ConfidenceFooter: React.FC<Props> = ({ totalVisits, totalReviews, recentActivity }) => {
  return (
    <div className={styles.confidenceFooter}>
      {recentActivity && recentActivity.visits_last_30d > 0 && (
        <div>
          <strong>{recentActivity.visits_last_30d}</strong>{' '}
          {recentActivity.visits_last_30d === 1 ? 'visit' : 'visits'} logged in the last 30 days
        </div>
      )}
      <div>
        Based on {totalVisits} {totalVisits === 1 ? 'visit' : 'visits'} and{' '}
        {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
      </div>
    </div>
  );
};

export default ConfidenceFooter;
