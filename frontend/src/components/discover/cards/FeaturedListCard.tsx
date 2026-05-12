import React, { useState } from 'react';
import type { DiscoverFeaturedList, DiscoverTrendingList } from '../../../types/discover';
import styles from './FeaturedListCard.module.css';

const TRUNCATE_LENGTH = 140;

function truncateDescription(text: string): string {
  if (text.length <= TRUNCATE_LENGTH) return text;
  return text.slice(0, TRUNCATE_LENGTH).trimEnd() + '\u2026';
}

type FeaturedListCardList = DiscoverFeaturedList | DiscoverTrendingList;

interface FeaturedListCardProps {
  list: FeaturedListCardList;
  variant: 'featured' | 'trending';
  onClick: () => void;
}

function isTrendingList(list: FeaturedListCardList): list is DiscoverTrendingList {
  return 'recent_save_count' in list;
}

const FeaturedListCard: React.FC<FeaturedListCardProps> = ({ list, variant, onClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  const needsTruncation = list.description.length > TRUNCATE_LENGTH;
  const displayedDescription = isExpanded ? list.description : truncateDescription(list.description);
  const overflowCount = Math.max(0, list.item_count - 3);
  const chips = list.preview_cafes.slice(0, 3);

  const pillLabel = variant === 'featured' ? 'FEATURED' : 'TRENDING';
  const pillClass = variant === 'featured' ? styles.featuredPill : styles.trendingPill;
  const recentSaves = isTrendingList(list) ? list.recent_save_count : 0;

  return (
    <article
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <span className={pillClass}>{pillLabel}</span>
      <h3 className={styles.title}>{list.name}</h3>

      <div className={styles.description} id={`list-desc-${list.id}`}>
        {displayedDescription}
        {needsTruncation && (
          <>
            {' '}
            <button
              className={styles.moreBtn}
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              aria-expanded={isExpanded}
              aria-controls={`list-desc-${list.id}`}
            >
              {isExpanded ? 'less' : 'more'}
            </button>
          </>
        )}
      </div>

      <div className={styles.chips}>
        {chips.map((cafe) => (
          <span key={cafe.id} className={styles.cafeChip}>{cafe.name}</span>
        ))}
        {overflowCount > 0 && (
          <span className={styles.overflowChip}>+{overflowCount}</span>
        )}
      </div>

      <div className={styles.footer}>
        <span>
          by <span className={styles.curator}>@{list.owner.username}</span>
        </span>
        <span> · {list.item_count} cafe{list.item_count !== 1 ? 's' : ''}</span>
        {variant === 'trending' && recentSaves > 0 && (
          <span> · {recentSaves} save{recentSaves !== 1 ? 's' : ''} this month</span>
        )}
      </div>
    </article>
  );
};

export default FeaturedListCard;
