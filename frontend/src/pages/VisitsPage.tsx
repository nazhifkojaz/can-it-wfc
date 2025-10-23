import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Plus } from 'lucide-react';
import MobileLayout from '../components/layout/MobileLayout';
import ReviewForm from '../components/review/ReviewForm';
import { Loading, EmptyState } from '../components/common';
import { useVisits } from '../hooks';
import { formatDate, formatRating } from '../utils';
import { REVIEW_CONFIG } from '../config/constants';
import { Visit } from '../types';
import { differenceInDays, format } from 'date-fns';
import './VisitsPage.css';

const VisitsPage: React.FC = () => {
  const { visits, loading } = useVisits();
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const canAddReview = (visit: Visit): boolean => {
    const visitDate = new Date(visit.visit_date);
    const daysSince = differenceInDays(new Date(), visitDate);
    return daysSince <= REVIEW_CONFIG.DAYS_TO_REVIEW_AFTER_VISIT && !visit.has_review;
  };

  const getDaysRemaining = (visit: Visit): number => {
    const visitDate = new Date(visit.visit_date);
    const deadline = new Date(visitDate);
    deadline.setDate(deadline.getDate() + REVIEW_CONFIG.DAYS_TO_REVIEW_AFTER_VISIT);
    return Math.max(0, differenceInDays(deadline, new Date()));
  };

  const handleAddReview = (visit: Visit) => {
    setSelectedVisit(visit);
    setShowReviewForm(true);
  };

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    setSelectedVisit(null);
  };

  const groupVisitsByDate = (visits: Visit[]) => {
    const grouped: { [key: string]: Visit[] } = {};

    visits.forEach(visit => {
      const date = format(new Date(visit.visit_date), 'MMMM yyyy');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(visit);
    });

    return grouped;
  };

  const groupedVisits = groupVisitsByDate(visits);

  if (loading) {
    return (
      <MobileLayout>
        <div className="visits-page">
          <div className="page-header">
            <h1 className="page-title">My Visits</h1>
          </div>
          <Loading message="Loading your visits..." />
        </div>
      </MobileLayout>
    );
  }

  if (visits.length === 0) {
    return (
      <MobileLayout>
        <div className="visits-page">
          <div className="page-header">
            <h1 className="page-title">My Visits</h1>
          </div>
          <EmptyState
            icon={<MapPin size={64} />}
            title="No visits yet"
            description="Start exploring cafes and log your visits!"
          />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="visits-page">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">My Visits</h1>
          <span className="count-badge">{visits.length}</span>
        </div>

        {/* Visits Timeline */}
        <div className="visits-timeline">
          {Object.entries(groupedVisits).map(([month, monthVisits]) => (
            <div key={month} className="month-group">
              <h2 className="month-header">
                <Calendar size={18} />
                {month}
              </h2>

              <div className="visits-list">
                {monthVisits.map((visit) => (
                  <div key={visit.id} className="visit-card">
                    {/* Cafe Info */}
                    <div className="visit-header">
                      <h3 className="cafe-name">{visit.cafe.name}</h3>
                      <p className="visit-date">
                        <Clock size={14} />
                        {formatDate(visit.visit_date)}
                      </p>
                    </div>

                    <p className="cafe-address">
                      <MapPin size={14} />
                      {visit.cafe.address}
                    </p>

                    {/* Visit Stats */}
                    <div className="visit-stats">
                      {visit.cafe.average_wfc_rating && (
                        <span className="stat">
                          ⭐ {formatRating(visit.cafe.average_wfc_rating)}
                        </span>
                      )}
                      <span className="stat">
                        📍 {visit.cafe.total_visits} visits
                      </span>
                    </div>

                    {/* Review Status */}
                    {visit.has_review ? (
                      <div className="review-status completed">
                        ✓ Review added
                      </div>
                    ) : canAddReview(visit) ? (
                      <div className="review-actions">
                        <div className="deadline-notice">
                          <p className="deadline-text">
                            {getDaysRemaining(visit)} {getDaysRemaining(visit) === 1 ? 'day' : 'days'} left to review
                          </p>
                        </div>
                        <button
                          className="add-review-button"
                          onClick={() => handleAddReview(visit)}
                        >
                          <Plus size={18} />
                          Add Review
                        </button>
                      </div>
                    ) : (
                      <div className="review-status expired">
                        Review period expired
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Review Form Modal */}
        {selectedVisit && showReviewForm && (
          <ReviewForm
            visitId={selectedVisit.id}
            cafeId={selectedVisit.cafe.id}
            cafeName={selectedVisit.cafe.name}
            isOpen={showReviewForm}
            onClose={() => setShowReviewForm(false)}
            onSuccess={handleReviewSuccess}
          />
        )}
      </div>
    </MobileLayout>
  );
};

export default VisitsPage;
