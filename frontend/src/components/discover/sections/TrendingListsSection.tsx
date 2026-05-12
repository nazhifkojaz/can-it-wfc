import React, { useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { createLogger } from '../../../utils/logger';
import FeaturedListCard from '../cards/FeaturedListCard';
import type { DiscoverTrendingList } from '../../../types/discover';
import styles from './FeaturedListsSection.module.css';

const logger = createLogger('TrendingListsSection');

const SKELETON_COUNT = 3;

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <div className={styles.skeletonPill} />
      <div className={styles.skeletonTitle} />
      <div className={styles.skeletonDesc} />
      <div className={styles.chipRow}>
        <div className={styles.skeletonChip} />
        <div className={styles.skeletonChip} />
        <div className={styles.skeletonChip} />
      </div>
      <div className={styles.skeletonFooter} />
    </div>
  );
}

interface TrendingListsSectionProps {
  lists: DiscoverTrendingList[];
  isLoading: boolean;
  error: string | null;
  onListClick: (list: DiscoverTrendingList) => void;
  onRefetch: () => void;
}

const TrendingListsSection: React.FC<TrendingListsSectionProps> = ({
  lists,
  isLoading,
  error,
  onListClick,
  onRefetch: _onRefetch,
}) => {
  useEffect(() => {
    if (error) {
      logger.error('Failed to load trending lists', new Error(error));
    }
  }, [error]);

  if (!isLoading && error) {
    return null;
  }

  if (!isLoading && lists.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby="trending-lists-heading">
      <h2 id="trending-lists-heading" className={styles.heading}>
        <TrendingUp size={18} />
        Trending Lists
      </h2>

      {isLoading ? (
        <div
          className={styles.carousel}
          aria-busy="true"
          role="region"
          aria-roledescription="carousel"
          aria-label="Trending Lists"
        >
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div
          className={styles.carousel}
          role="region"
          aria-roledescription="carousel"
          aria-label="Trending Lists"
        >
          {lists.map((list) => (
            <div
              key={list.id}
              className={styles.cardWrapper}
              role="group"
              aria-roledescription="slide"
            >
              <FeaturedListCard
                list={list}
                variant="trending"
                onClick={() => onListClick(list)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default TrendingListsSection;
