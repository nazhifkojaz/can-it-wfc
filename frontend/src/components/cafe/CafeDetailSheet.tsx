import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Bookmark, Star, Flag, ChevronDown } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { Cafe, Review } from '../../types';
import { Sheet, Loading, EmptyState, SharedResultModal } from '../common';
import { useReviews, useCafeLists, useGeolocation, useResultModal, useCafeDetail } from '../../hooks';
import { useAuth } from '../../contexts/AuthContext';
import ReviewCard from '../review/ReviewCard';
import UserProfileModal from '../profile/UserProfileModal';
import FlagCafeModal from './FlagCafeModal';
import SaveToListPopover from './SaveToListPopover';
import RatingsComparison from './RatingsComparison';
import CafeInsightsCard from './CafeInsightsCard';
import ActionButtons from './ActionButtons';

import { formatDistance } from '../../utils/formatters';
import { calculateDistance } from '../../utils';
import { ListIcon } from '../../utils/listIcons';
import { trackCafeViewed, trackDirectionsClicked, trackGoogleRatingRefreshed } from '../../lib/analytics';
import styles from './CafeDetailSheet.module.css';

interface CafeDetailSheetProps {
  cafe: Cafe;
  isOpen: boolean;
  onClose: () => void;
  onLogVisit: () => void;
  source?: 'map_marker' | 'list_item' | 'search_result' | 'activity_feed' | 'favorite' | 'direct';
}

const CafeDetailSheet: React.FC<CafeDetailSheetProps> = ({
  cafe: initialCafe,
  isOpen,
  onClose,
  onLogVisit,
  source = 'direct',
}) => {
  const { user } = useAuth();
  const { location } = useGeolocation({ watch: false });

  const { cafe, isRefreshingRating, refreshGoogleRating } = useCafeDetail({
    initialCafe,
    isOpen,
    userLocation: location,
  });

  // Track cafe view once when sheet opens
  const hasTrackedViewRef = useRef(false);

  useEffect(() => {
    if (isOpen && !hasTrackedViewRef.current) {
      const distanceKm = location
        ? calculateDistance(
            location.lat,
            location.lng,
            parseFloat(cafe.latitude),
            parseFloat(cafe.longitude)
          )
        : null;

      trackCafeViewed({
        cafeId: cafe.id,
        cafeName: cafe.name,
        isRegistered: cafe.is_registered,
        hasWfcRating: !!cafe.average_wfc_rating,
        source,
        distanceKm,
      });
      hasTrackedViewRef.current = true;
    }
    // Reset tracking when sheet closes
    if (!isOpen) {
      hasTrackedViewRef.current = false;
    }
  }, [isOpen, cafe.id, cafe.name, cafe.is_registered, cafe.average_wfc_rating, cafe.latitude, cafe.longitude, source, location]);

  const {
    reviews,
    loading: loadingReviews,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    deleteReview,
    toggleHelpful,
    flagReview,
  } = useReviews(cafe.is_registered && cafe.id > 0 ? cafe.id : undefined);
  const { memberships, isToggling: isSaving } = useCafeLists(
    cafe.is_registered && cafe.id > 0 ? cafe.id : undefined
  );

  // Determine dynamic icon based on list memberships with priority: to_go > favorites > custom
  const sortedMemberships = [...memberships].sort((a, b) => {
    const priority = { to_go: 0, favorites: 1, custom: 2 };
    return (priority[a.list_type] ?? 3) - (priority[b.list_type] ?? 3);
  });
  const firstInListMembership = sortedMemberships.find(m => m.in_list);
  const isInAnyList = !!firstInListMembership;
  const activeIcon = firstInListMembership?.icon || 'bookmark';
  const resultModal = useResultModal();

  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showListPopover, setShowListPopover] = useState(false);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  // Load more reviews when scrolling
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleDirections = () => {
    if (!location) {
      resultModal.showResultModal({
        type: 'warning',
        title: 'Location Permission Required',
        message: 'Location permission needed for directions. Please enable location access.',
        details: (
          <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--neo-gray-600)' }}>
            <p>Tip: Enable location in your browser settings to get turn-by-turn directions.</p>
          </div>
        ),
      });
      return;
    }

    const distanceKm = calculateDistance(
      location.lat,
      location.lng,
      parseFloat(cafe.latitude),
      parseFloat(cafe.longitude)
    );

    trackDirectionsClicked({
      cafeId: cafe.id,
      cafeName: cafe.name,
      distanceKm,
    });

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${location.lat},${location.lng}&destination=${cafe.latitude},${cafe.longitude}&travelmode=driving`;
    window.open(mapsUrl, '_blank');
  };

  const handleRefreshGoogleRating = () => {
    trackGoogleRatingRefreshed({ cafeId: cafe.id });
    refreshGoogleRating();
  };

  const handleFlagClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Only allow flagging registered cafes
    if (!cafe.is_registered) {
      resultModal.showResultModal({
        type: 'warning',
        title: 'Cafe Not Registered',
        message: 'This cafe is not registered yet. You can only report issues with registered cafes.',
        details: (
          <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--neo-gray-600)' }}>
            <p>Tip: Log a visit to register this cafe first!</p>
          </div>
        ),
      });
      return;
    }

    // Check if user is authenticated
    if (!user) {
      resultModal.showResultModal({
        type: 'warning',
        title: 'Login Required',
        message: 'You need to be logged in to report issues with cafes.',
      });
      return;
    }

    setShowFlagModal(true);
  };

  const handleFlagSuccess = () => {
    resultModal.showResultModal({
      type: 'success',
      title: 'Report Submitted',
      message: 'Thank you for helping us keep the platform accurate!',
      autoClose: true,
      autoCloseDelay: 3000,
    });
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      showHandle
      showCloseButton
      snapPoints={[100]}
    >
      {/* Cafe Header */}
      <div className={styles.cafeHeader}>
        <h2 className={styles.cafeName}>{cafe.name}</h2>
        <div className={styles.headerActions}>
          <button
            className={styles.flagButton}
            onClick={handleFlagClick}
            aria-label="Report issue with this cafe"
            title="Report issue"
          >
            <Flag size={20} />
          </button>

          {/* Bookmark + chevron group */}
          <div className={`${styles.saveGroup}${user ? ` ${styles.saveGroupJoined}` : ''}`} style={{ position: 'relative' }}>
            <button
              className={`${styles.favoriteButton} ${isInAnyList ? styles.active : ''}`}
              onClick={(e) => { e.stopPropagation(); setShowListPopover((v) => !v); }}
              disabled={isSaving}
              aria-label={isInAnyList ? 'Manage lists' : 'Save to lists'}
              title={isInAnyList ? 'Manage lists' : 'Save to lists'}
            >
              <ListIcon icon={activeIcon} size={22} fill={isInAnyList ? 'currentColor' : 'none'} />
            </button>
            {user && (
              <button
                className={styles.listChevron}
                onClick={(e) => { e.stopPropagation(); setShowListPopover((v) => !v); }}
                aria-label="Manage lists"
                title="Save to lists"
              >
                <ChevronDown size={14} />
              </button>
            )}
            {showListPopover && (
              <SaveToListPopover
                cafe={cafe}
                onClose={() => setShowListPopover(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Address & Distance */}
      <div className={styles.cafeMeta}>
        <div className={styles.metaItem}>
          <MapPin size={16} />
          <span>{cafe.address}</span>
        </div>
        {cafe.distance !== undefined && (
          <div className={styles.metaItem}>
            <span className={styles.distance}>📍 {formatDistance(cafe.distance)} away</span>
          </div>
        )}
        {cafe.saved_by_count !== undefined && cafe.saved_by_count > 0 && (
          <div className={styles.metaItem}>
            <Bookmark size={14} />
            <span className={styles.listsCount}>
              Saved by {cafe.saved_by_count} {cafe.saved_by_count === 1 ? 'user' : 'users'}
            </span>
          </div>
        )}
        {user && cafe.is_registered && memberships.some(m => m.in_list) && (
          <div className={styles.myListsSection}>
            {memberships
              .filter(m => m.in_list)
              .map(m => (
                <div key={m.id} className={styles.myListBadge}>
                  <ListIcon icon={m.icon} size={14} />
                  <span>{m.name}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Ratings Comparison (Google vs WFC) */}
      <RatingsComparison
        googleRating={cafe.google_rating}
        googleCount={cafe.google_ratings_count}
        googleRatingUpdatedAt={cafe.google_rating_updated_at}
        googlePlaceId={cafe.google_place_id}
        isRefreshingRating={isRefreshingRating}
        wfcRating={cafe.average_wfc_rating}
        wfcCount={cafe.total_reviews}
        isRegistered={cafe.is_registered}
        onRefreshRating={handleRefreshGoogleRating}
      />

      {/* Insights block: DetailedRatings (default) + advanced slide-in */}
      <CafeInsightsCard
        cafe={cafe}
        ratings={cafe.average_ratings}
        facilityStats={cafe.facility_stats}
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
                onToggleHelpful={toggleHelpful}
                onFlagReview={flagReview}
                onUsernameClick={(username) => setSelectedUsername(username)}
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

      <SharedResultModal resultModal={resultModal} />

      {/* User Profile Modal */}
      {selectedUsername && (
        <UserProfileModal
          isOpen={!!selectedUsername}
          onClose={() => setSelectedUsername(null)}
          username={selectedUsername}
        />
      )}

      {/* Flag Cafe Modal */}
      {cafe.is_registered && (
        <FlagCafeModal
          isOpen={showFlagModal}
          onClose={() => setShowFlagModal(false)}
          cafeId={cafe.id}
          cafeName={cafe.name}
          onSuccess={handleFlagSuccess}
        />
      )}
    </Sheet>
  );
};

export default CafeDetailSheet;
