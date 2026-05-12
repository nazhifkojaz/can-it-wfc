import React, { useEffect } from 'react';
import { Flame } from 'lucide-react';
import { createLogger } from '../../../utils/logger';
import TrendingCafeRow from '../cards/TrendingCafeRow';
import type { DiscoverTrendingCafe } from '../../../types/discover';
import styles from './TrendingCafesSection.module.css';

const logger = createLogger('TrendingCafesSection');

const SKELETON_COUNT = 3;

function SkeletonRow() {
  return (
    <div className={styles.skeletonRow} aria-hidden="true">
      <div className={styles.skeletonTopLine}>
        <div className={styles.skeletonRank} />
        <div className={styles.skeletonLine} style={{ flex: 1 }} />
        <div className={styles.skeletonLineSm} />
      </div>
      <div className={styles.skeletonLine} style={{ width: '150px', marginLeft: '36px' }} />
    </div>
  );
}

interface TrendingCafesSectionProps {
  cafes: DiscoverTrendingCafe[];
  isLoading: boolean;
  error: string | null;
  onCafeClick: (cafe: DiscoverTrendingCafe) => void;
  onRefetch: () => void;
}

const TrendingCafesSection: React.FC<TrendingCafesSectionProps> = ({
  cafes,
  isLoading,
  error,
  onCafeClick,
  onRefetch: _onRefetch,
}) => {
  useEffect(() => {
    if (error) {
      logger.error('Failed to load trending cafes', new Error(error));
    }
  }, [error]);

  if (!isLoading && error) {
    return null;
  }

  if (!isLoading && cafes.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby="trending-heading">
      <h2 id="trending-heading" className={styles.heading}>
        <Flame size={18} />
        Trending This Week
      </h2>

      {isLoading ? (
        <div className={styles.list} aria-busy="true">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : (
        <div className={styles.list}>
          {cafes.map((cafe, index) => (
            <TrendingCafeRow
              key={cafe.id}
              cafe={cafe}
              rank={index + 1}
              onClick={() => onCafeClick(cafe)}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default TrendingCafesSection;
