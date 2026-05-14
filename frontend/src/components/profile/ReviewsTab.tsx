import React from 'react';
import { Calendar, MapPin, Clock, Edit, Trash2 } from 'lucide-react';
import { Loading, EmptyState } from '../common';
import { Review } from '../../types';
import { formatDate } from '../../utils';
import { formatVisitTime } from '../../utils/visit';
import { useInView } from 'react-intersection-observer';
import { format } from 'date-fns';

interface ReviewsTabProps {
  reviews: Review[];
  loading: boolean;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isOwnProfile: boolean;
  onDeleteReview?: (reviewId: number, cafeName: string) => void;
  onEditReview?: (review: Review) => void;
}

const groupReviewsByMonth = (reviews: Review[]): Record<string, Review[]> => {
  const grouped: Record<string, Review[]> = {};
  reviews.forEach(review => {
    const date = format(new Date(review.created_at), 'MMMM yyyy');
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(review);
  });
  return grouped;
};

const ReviewsTab: React.FC<ReviewsTabProps> = ({
  reviews,
  loading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isOwnProfile,
  onDeleteReview,
  onEditReview,
}) => {
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
  });

  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (loading) {
    return <Loading message="Loading reviews..." />;
  }

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={<Calendar size={64} />}
        title="No reviews yet"
        description="Review a cafe you've visited to share your experience!"
      />
    );
  }

  const grouped = groupReviewsByMonth(reviews);

  return (
    <div className="reviews-timeline">
      {Object.entries(grouped).map(([month, monthReviews]) => (
        <div key={month} className="month-group">
          <h2 className="month-header">
            <Calendar size={18} />
            {month}
          </h2>

          <div className="visits-list">
            {monthReviews.map((review) => (
              <div key={review.id} className="review-card">
                <div className="review-header">
                  <div className="review-info">
                    <h3 className="review-cafe-name">{review.cafe.name}</h3>
                    <p className="review-date">
                      <Clock size={14} />
                      {formatDate(review.created_at)}
                    </p>
                  </div>
                  {isOwnProfile && onDeleteReview && (
                    <button
                      className="delete-button"
                      onClick={() => onDeleteReview(review.id, review.cafe.name)}
                      aria-label="Delete review"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>

                <p className="review-cafe-address">
                  <MapPin size={14} />
                  {review.cafe.address}
                </p>

                <div className="review-rating">
                  <span className="review-stars">
                    {'⭐'.repeat(review.wfc_rating)}
                  </span>
                  <span className="review-wfc-label">
                    {review.wfc_rating}/5
                  </span>
                </div>

                {review.comment && (
                  <p className="review-comment">"{review.comment}"</p>
                )}

                <div className="review-details">
                  {review.visit_time && (
                    <span className="review-detail-badge">
                      <Clock size={14} />
                      {formatVisitTime(review.visit_time)}
                    </span>
                  )}
                  {review.wifi_quality > 0 && (
                    <span className="review-detail-badge">
                      📶 WiFi: {review.wifi_quality}/5
                    </span>
                  )}
                  {review.noise_level > 0 && (
                    <span className="review-detail-badge">
                      🔇 Noise: {review.noise_level}/5
                    </span>
                  )}
                  {review.seating_comfort > 0 && (
                    <span className="review-detail-badge">
                      🪑 Seating: {review.seating_comfort}/5
                    </span>
                  )}
                </div>

                {isOwnProfile && onEditReview && (
                  <div className="review-actions-row">
                    <button
                      className="review-edit-button"
                      onClick={() => onEditReview(review)}
                    >
                      <Edit size={16} />
                      Edit Review
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {hasNextPage && (
        <div ref={loadMoreRef} className="load-more-trigger">
          {isFetchingNextPage && (
            <div className="load-more-spinner">
              <Loading message="Loading more reviews..." />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewsTab;
