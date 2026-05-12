import React, { useEffect } from 'react';
import { Star } from 'lucide-react';
import { createLogger } from '../../../utils/logger';
import FeaturedListCard from '../cards/FeaturedListCard';
import type { DiscoverFeaturedList } from '../../../types/discover';
import styles from './FeaturedListsSection.module.css';

const logger = createLogger('FeaturedListsSection');

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

interface FeaturedListsSectionProps {
  lists: DiscoverFeaturedList[];
  isLoading: boolean;
  error: string | null;
  onListClick: (list: DiscoverFeaturedList) => void;
  onRefetch: () => void;
}

const FeaturedListsSection: React.FC<FeaturedListsSectionProps> = ({
  lists,
  isLoading,
  error,
  onListClick,
  onRefetch: _onRefetch,
}) => {
  useEffect(() => {
    if (error) {
      logger.error('Failed to load featured lists', new Error(error));
    }
  }, [error]);

  if (!isLoading && error) {
    return null;
  }

  if (!isLoading && lists.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} aria-labelledby="featured-heading">
      <h2 id="featured-heading" className={styles.heading}>
        <Star size={18} />
        Featured Lists
      </h2>

      {isLoading ? (
        <div
          className={styles.carousel}
          aria-busy="true"
          role="region"
          aria-roledescription="carousel"
          aria-label="Featured Lists"
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
          aria-label="Featured Lists"
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
                variant="featured"
                onClick={() => onListClick(list)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default FeaturedListsSection;
