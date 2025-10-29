import React from 'react';
import { MapPin, Star, DollarSign, Users, Coffee, Heart } from 'lucide-react';
import { Cafe, Review } from '../../types';
import { Sheet, Loading, EmptyState } from '../common';
import { useReviews, useFavorites } from '../../hooks';
import { formatPriceRange, formatRating } from '../../utils';
import ReviewCard from '../review/ReviewCard';
import styles from './CafeDetailSheet.module.css';

interface CafeDetailSheetProps {
  cafe: Cafe;
  isOpen: boolean;
  onClose: () => void;
  onLogVisit: () => void;
}

const CafeDetailSheet: React.FC<CafeDetailSheetProps> = ({
  cafe,
  isOpen,
  onClose,
  onLogVisit,
}) => {
  // Only fetch reviews for registered cafes (cafes in database)
  const { reviews, loading: loadingReviews } = useReviews(
    cafe.is_registered ? cafe.id : undefined
  );
  const { toggleFavorite, isFavorite } = useFavorites();

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Don't allow favoriting unregistered cafes
    if (!cafe.is_registered) {
      alert('⚠️ This cafe is not registered yet. Log a visit first to add it to the platform!');
      return;
    }

    try {
      await toggleFavorite(cafe.id);
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      alert(`❌ ${error.message || 'Failed to toggle favorite'}`);
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      showHandle
      showCloseButton
      snapPoints={[75]}
    >
      {/* Cafe Header */}
      <div className={styles.cafeHeader}>
        <h2 className={styles.cafeName}>{cafe.name}</h2>
        <button
          className={`${styles.favoriteButton} ${isFavorite(cafe.id) ? styles.active : ''}`}
          onClick={handleToggleFavorite}
          aria-label={isFavorite(cafe.id) ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={24} fill={isFavorite(cafe.id) ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Meta Information */}
      <div className={styles.cafeMeta}>
        <div className={styles.metaItem}>
          <MapPin size={16} />
          <span>{cafe.address}</span>
        </div>
        {cafe.distance && (
          <div className={styles.metaItem}>
            <span className={styles.distance}>{cafe.distance}</span>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className={styles.cafeStats}>
        <div className={styles.statItem}>
          <Star size={18} />
          <span className={styles.statValue}>
            {formatRating(cafe.average_wfc_rating)}
          </span>
          <span className={styles.statLabel}>WFC Rating</span>
        </div>
        {cafe.price_range && (
          <div className={styles.statItem}>
            <DollarSign size={18} />
            <span className={styles.statValue}>
              {formatPriceRange(cafe.price_range)}
            </span>
            <span className={styles.statLabel}>Price</span>
          </div>
        )}
        <div className={styles.statItem}>
          <Users size={18} />
          <span className={styles.statValue}>{cafe.unique_visitors || 0}</span>
          <span className={styles.statLabel}>Visitors</span>
        </div>
        <div className={styles.statItem}>
          <Coffee size={18} />
          <span className={styles.statValue}>{cafe.total_visits || 0}</span>
          <span className={styles.statLabel}>Visits</span>
        </div>
      </div>

      {/* Action Button */}
      <button className={styles.logVisitButton} onClick={onLogVisit}>
        Log Visit
      </button>

      {/* Reviews Section */}
      <div className={styles.reviewsSection}>
        <h3 className={styles.sectionTitle}>
          Reviews {cafe.is_registered ? `(${cafe.total_reviews || 0})` : ''}
        </h3>

        {!cafe.is_registered ? (
          // Show Google ratings for unregistered cafes
          cafe.google_rating ? (
            <div className={styles.googleRating}>
              <div className={styles.googleRatingHeader}>
                <Star size={20} fill="#fbbc04" color="#fbbc04" />
                <span className={styles.googleRatingValue}>
                  {cafe.google_rating.toFixed(1)}
                </span>
                <span className={styles.googleRatingCount}>
                  ({cafe.google_ratings_count || 0} Google reviews)
                </span>
              </div>
              <p className={styles.googleRatingNote}>
                Log a visit to leave your WFC review and see reviews from our community!
              </p>
            </div>
          ) : (
            <EmptyState
              title="Cafe not yet registered"
              description="Log a visit to add this cafe and be the first to review it!"
            />
          )
        ) : loadingReviews ? (
          <Loading message="Loading reviews..." />
        ) : reviews.length > 0 ? (
          <div className={styles.reviewsList}>
            {reviews.map((review: Review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No reviews yet"
            description="Be the first to review this cafe!"
          />
        )}
      </div>
    </Sheet>
  );
};

export default CafeDetailSheet;
