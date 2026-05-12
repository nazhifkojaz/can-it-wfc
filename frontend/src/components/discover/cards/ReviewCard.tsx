import React from 'react';
import { formatRelativeTime } from '../../../utils/formatters';
import type { DiscoverReview } from '../../../types/discover';
import styles from './ReviewCard.module.css';

const AVATAR_COLORS = [
  'var(--neo-primary-light)',
  'var(--neo-accent)',
  'var(--neo-success)',
  'var(--neo-info)',
  'var(--neo-danger-light)',
  'var(--neo-warning-light)',
];

function hashColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function renderStars(rating: number): string {
  const filled = Math.round(rating);
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

interface ReviewCardProps {
  review: DiscoverReview;
  onCardClick: () => void;
  onUserClick: () => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, onCardClick, onUserClick }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onCardClick();
    }
  };

  const initial = review.user.display_name?.charAt(0) || review.user.username.charAt(0);
  const bgColor = hashColor(review.user.username);

  return (
    <article
      className={styles.card}
      role="button"
      tabIndex={0}
      onClick={onCardClick}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.topRow}>
        {review.user.avatar_url ? (
          <img
            className={styles.avatar}
            src={review.user.avatar_url}
            alt={review.user.display_name}
          />
        ) : (
          <div className={styles.avatarFallback} style={{ backgroundColor: bgColor }}>
            {initial.toUpperCase()}
          </div>
        )}
        <div className={styles.userInfo}>
          <button
            className={styles.usernameBtn}
            onClick={(e) => {
              e.stopPropagation();
              onUserClick();
            }}
          >
            @{review.user.username}
          </button>
          <span className={styles.time}>
            {formatRelativeTime(review.created_at)}
          </span>
        </div>
      </div>
      <div className={styles.cafeRow}>
        <span className={styles.verb}>reviewed</span>
        <span className={styles.cafeName}>{review.cafe.name}</span>
        {review.visit_time_label && (
          <span className={styles.chip}>{review.visit_time_label}</span>
        )}
      </div>
      <div className={styles.ratingRow}>
        <span className={styles.stars}>{renderStars(review.wfc_rating)}</span>
        <span className={styles.ratingNumber}>
          {review.wfc_rating.toFixed(1)} / 5
        </span>
      </div>
      {review.comment && (
        <div className={styles.comment}>{review.comment}</div>
      )}
    </article>
  );
};

export default ReviewCard;
