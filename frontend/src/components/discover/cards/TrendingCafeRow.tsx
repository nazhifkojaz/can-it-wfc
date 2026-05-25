import React from 'react';
import type { DiscoverTrendingCafe } from '../../../types/discover';
import styles from './TrendingCafeRow.module.css';

function formatActivityLine(cafe: DiscoverTrendingCafe): string {
  const { recent_visit_count: visits, recent_review_count: reviews } = cafe;
  if (visits > 0 && reviews > 0) {
    return `${formatCount(visits, 'visit')} · ${formatCount(reviews, 'review')} this week`;
  }
  if (reviews > 0) {
    return `${formatCount(reviews, 'review')} this week`;
  }
  if (visits > 0) {
    return `${formatCount(visits, 'visit')} this week`;
  }
  return 'No activity this week';
}

function formatCount(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

interface TrendingCafeRowProps {
  cafe: DiscoverTrendingCafe;
  rank: number;
  onClick: () => void;
}

const TrendingCafeRow: React.FC<TrendingCafeRowProps> = ({ cafe, rank, onClick }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <article
      className={styles.row}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.topLine}>
        <span className={styles.rank}>#{rank}</span>
        <span className={styles.cafeName}>{cafe.name}</span>
        <span className={styles.rating}>★ {Number(cafe.average_wfc_rating).toFixed(1)}</span>
      </div>
      <div className={styles.activityLine}>
        {formatActivityLine(cafe)}
      </div>
    </article>
  );
};

export default TrendingCafeRow;
