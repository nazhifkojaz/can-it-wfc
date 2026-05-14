import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Loading } from '../../common';
import ReviewCard from '../cards/ReviewCard';
import type { DiscoverReview } from '../../../types/discover';
import styles from './RecentReviewsSection.module.css';

interface RecentReviewsSectionProps {
  reviews: DiscoverReview[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onReviewClick: (review: DiscoverReview) => void;
  onUserClick: (username: string) => void;
  onRefetch: () => void;
  onFindCafe: () => void;
}

const SKELETON_COUNT = 3;

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <div className={styles.skeletonAvatar} />
      <div className={styles.skeletonLine} style={{ width: '120px' }} />
      <div className={styles.skeletonLine} style={{ width: '200px' }} />
      <div className={styles.skeletonLineShort} />
      <div className={styles.skeletonLine} />
    </div>
  );
}

const RecentReviewsSection: React.FC<RecentReviewsSectionProps> = ({
  reviews,
  isLoading,
  isLoadingMore,
  error,
  hasMore,
  onLoadMore,
  onReviewClick,
  onUserClick,
  onRefetch,
  onFindCafe,
}) => {
  return (
    <section className={styles.section} aria-labelledby="recent-reviews-heading">
      <h2 id="recent-reviews-heading" className={styles.heading}>
        <MessageSquare size={18} />
        Recent Reviews
      </h2>

      {isLoading ? (
        <div aria-busy="true">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <p>Couldn&apos;t load reviews.</p>
          <button className={styles.retryBtn} onClick={onRefetch}>
            Retry
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No reviews yet</h3>
          <p>Be the first to share a cafe you&apos;ve worked from.</p>
          <button className={styles.ctaBtn} onClick={onFindCafe}>
            Find a cafe →
          </button>
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onCardClick={() => onReviewClick(review)}
                onUserClick={() => onUserClick(review.user.username)}
              />
            ))}
          </div>
          {isLoadingMore ? (
            <div className={styles.spinnerContainer}>
              <Loading size="sm" />
            </div>
          ) : hasMore ? (
            <div className={styles.loadMoreContainer}>
              <button className={styles.loadMoreBtn} onClick={onLoadMore}>
                Load more
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
};

export default RecentReviewsSection;
