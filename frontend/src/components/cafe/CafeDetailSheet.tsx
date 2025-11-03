import React from 'react';
import { MapPin, Heart, Star } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { Cafe, Review } from '../../types';
import { Sheet, Loading, EmptyState, ResultModal } from '../common';
import { useReviews, useFavorites, useGeolocation, useResultModal } from '../../hooks';
import { useAuth } from '../../contexts/AuthContext';
import ReviewCard from '../review/ReviewCard';
import RatingsComparison from './RatingsComparison';
import DetailedRatings from './DetailedRatings';
import QuickInfo from './QuickInfo';
import ActionButtons from './ActionButtons';
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
  const { user } = useAuth();
  const {
    reviews,
    loading: loadingReviews,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    deleteReview,
  } = useReviews(cafe.is_registered ? cafe.id : undefined);
  const { toggleFavorite, isFavorite } = useFavorites();
  const { location } = useGeolocation({ watch: false });
  const resultModal = useResultModal();

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Don't allow favoriting unregistered cafes
    if (!cafe.is_registered) {
      resultModal.showResultModal({
        type: 'warning',
        title: 'Cafe Not Registered',
        message: 'This cafe is not registered yet. Log a visit first to add it to the platform!',
        details: (
          <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--neo-gray-600)' }}>
            <p>💡 Tip: Click "Log Visit" below to add this cafe and be the first to review it!</p>
          </div>
        ),
      });
      return;
    }

    try {
      await toggleFavorite(cafe.id);
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      resultModal.showResultModal({
        type: 'error',
        title: 'Failed to Toggle Favorite',
        message: error.message || 'Failed to toggle favorite. Please try again.',
      });
    }
  };

  const handleDirections = () => {
    if (!location) {
      resultModal.showResultModal({
        type: 'warning',
        title: 'Location Permission Required',
        message: 'Location permission needed for directions. Please enable location access.',
        details: (
          <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--neo-gray-600)' }}>
            <p>💡 Tip: Enable location in your browser settings to get turn-by-turn directions.</p>
          </div>
        ),
      });
      return;
    }

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${location.lat},${location.lng}&destination=${cafe.latitude},${cafe.longitude}&travelmode=driving`;
    window.open(mapsUrl, '_blank');
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

      {/* Address & Distance */}
      <div className={styles.cafeMeta}>
        <div className={styles.metaItem}>
          <MapPin size={16} />
          <span>{cafe.address}</span>
        </div>
        {cafe.distance && (
          <div className={styles.metaItem}>
            <span className={styles.distance}>📍 {cafe.distance} away</span>
          </div>
        )}
      </div>

      {/* Ratings Comparison (Google vs WFC) */}
      <RatingsComparison
        googleRating={cafe.google_rating}
        googleCount={cafe.google_ratings_count}
        wfcRating={cafe.average_wfc_rating}
        wfcCount={cafe.total_reviews}
        isRegistered={cafe.is_registered}
      />

      {/* WFC Detailed Ratings (only if has reviews) */}
      {cafe.is_registered && cafe.average_ratings && (
        <DetailedRatings ratings={cafe.average_ratings} />
      )}

      {/* Quick Info */}
      <QuickInfo
        priceRange={cafe.price_range}
        visitors={cafe.unique_visitors}
        visits={cafe.total_visits}
      />

      {/* Action Buttons */}
      <ActionButtons
        onDirections={handleDirections}
        onLogVisit={onLogVisit}
        hasUserLocation={!!location}
        cafeName={cafe.name}
      />

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
              <ReviewCard
                key={review.id}
                review={review}
                currentUserId={user?.id}
                onDelete={deleteReview}
              />
            ))}
            {hasNextPage && (
              <div ref={loadMoreRef} className={styles.loadMoreTrigger}>
                {isFetchingNextPage && <Loading message="Loading more reviews..." />}
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            title="No reviews yet"
            description="Be the first to review this cafe!"
          />
        )}
      </div>

      <ResultModal
        isOpen={resultModal.isOpen}
        onClose={resultModal.closeResultModal}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
        details={resultModal.details}
        primaryButton={resultModal.primaryButton}
        secondaryButton={resultModal.secondaryButton}
        autoClose={resultModal.autoClose}
        autoCloseDelay={resultModal.autoCloseDelay}
      />
    </Sheet>
  );
};

export default CafeDetailSheet;
