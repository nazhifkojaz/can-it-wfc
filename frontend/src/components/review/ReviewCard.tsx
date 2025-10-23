import React from 'react';
import { User, ThumbsUp } from 'lucide-react';
import { Review } from '../../types';
import { formatRelativeTime, formatRating, getRatingColor } from '../../utils';
import styles from './ReviewCard.module.css';

interface ReviewCardProps {
  review: Review;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const displayName = review.user?.display_name || review.user?.username || 'Anonymous';
  const averageRating = review.average_rating || 0;
  const ratingColor = getRatingColor(averageRating);

  return (
    <div className={styles.reviewCard}>
      {/* User info */}
      <div className={styles.reviewHeader}>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {review.user?.avatar_url ? (
              <img src={review.user.avatar_url} alt={displayName} />
            ) : (
              <User size={20} />
            )}
          </div>
          <div>
            <p className={styles.userName}>{displayName}</p>
            <p className={styles.reviewTime}>
              {formatRelativeTime(review.created_at)}
            </p>
          </div>
        </div>

        {/* Average rating */}
        <div className={styles.averageRating}>
          <span
            className={styles.ratingValue}
            style={{ color: ratingColor }}
          >
            {formatRating(averageRating)}
          </span>
          <span className={styles.ratingLabel}>avg</span>
        </div>
      </div>

      {/* Review text */}
      {review.comment && (
        <p className={styles.reviewText}>{review.comment}</p>
      )}

      {/* WFC Ratings Grid */}
      <div className={styles.wfcRatings}>
        <div className={styles.ratingItem}>
          <span className={styles.ratingLabel}>WiFi</span>
          <span className={styles.ratingValue}>{review.wifi_quality}/5</span>
        </div>
        {review.power_outlets_rating && (
          <div className={styles.ratingItem}>
            <span className={styles.ratingLabel}>Outlets</span>
            <span className={styles.ratingValue}>{review.power_outlets_rating}/5</span>
          </div>
        )}
        <div className={styles.ratingItem}>
          <span className={styles.ratingLabel}>Noise</span>
          <span className={styles.ratingValue}>{review.noise_level}/5</span>
        </div>
        <div className={styles.ratingItem}>
          <span className={styles.ratingLabel}>Seating</span>
          <span className={styles.ratingValue}>{review.seating_comfort}/5</span>
        </div>
        <div className={styles.ratingItem}>
          <span className={styles.ratingLabel}>Coffee</span>
          <span className={styles.ratingValue}>{review.coffee_quality}/5</span>
        </div>
        <div className={styles.ratingItem}>
          <span className={styles.ratingLabel}>Menu</span>
          <span className={styles.ratingValue}>{review.menu_options}/5</span>
        </div>
      </div>

      {/* Visit time tag */}
      {review.visit_time_display && (
        <div className={styles.timeTags}>
          <span className={styles.timeTag}>{review.visit_time_display}</span>
        </div>
      )}

      {/* Helpful count */}
      {review.helpful_count && review.helpful_count > 0 && (
        <div className={styles.helpfulCount}>
          <ThumbsUp size={14} />
          <span>{review.helpful_count} found helpful</span>
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
