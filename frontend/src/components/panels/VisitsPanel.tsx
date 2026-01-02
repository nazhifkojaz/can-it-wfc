import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, MapPin, Clock, Plus, Home, Trash2, Edit, DollarSign } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import ReviewForm from '../review/ReviewForm';
import { Loading, EmptyState, ConfirmDialog, ResultModal } from '../common';
import { useVisits, useResultModal } from '../../hooks';
import { usePanel } from '../../contexts/PanelContext';
import { reviewApi } from '../../api/client';
import { formatDate, formatRating } from '../../utils';
import { formatCurrency, CURRENCIES } from '../../utils/currency';
import { VISIT_TIME_LABELS } from '../../config/constants';
import { Visit, Review } from '../../types';
import { format } from 'date-fns';
import './VisitsPanel.css';

const VisitsPanel: React.FC = () => {
  const { hidePanel } = usePanel();
  const resultModal = useResultModal();
  const {
    visits,
    loading,
    deleteVisit,
    updateVisit,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVisits();

  // Review state - now tracked per cafe, not per visit
  const [cafeReviews, setCafeReviews] = useState<Map<number, Review | null>>(new Map());
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [selectedCafeId, setSelectedCafeId] = useState<number | null>(null);
  const [selectedCafeName, setSelectedCafeName] = useState<string>('');
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Edit visit state
  const [showEditVisit, setShowEditVisit] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [editAmountSpent, setEditAmountSpent] = useState<string>('');
  const [editCurrency, setEditCurrency] = useState<string>('USD');
  const [editVisitTime, setEditVisitTime] = useState<number | null>(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<Visit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // UPDATED: Load review status for all cafes when visits change
  // Memoize cafe IDs to prevent unnecessary refetches
  const cafeIds = useMemo(() => {
    if (visits.length === 0) return [];
    return [...new Set(visits.map(v => v.cafe.id))];
  }, [visits]);

  // Convert to stable string key for dependency comparison
  const cafeIdsKey = cafeIds.join(',');

  useEffect(() => {
    const loadReviewStatuses = async () => {
      if (cafeIds.length === 0) return;

      setLoadingReviews(true);
      try {
        // NEW: Use bulk endpoint - single request instead of N parallel requests
        const reviewMap = await reviewApi.getUserCafeReviews(cafeIds);

        // Convert to Map for state
        const reviewEntries: [number, Review | null][] = Object.entries(reviewMap).map(
          ([id, review]) => [parseInt(id), review]
        );
        setCafeReviews(new Map(reviewEntries));
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error loading review statuses:', error);
        }
      } finally {
        setLoadingReviews(false);
      }
    };

    loadReviewStatuses();
  }, [cafeIdsKey]); // Use string key instead of visits array

  // Helper to get review for a cafe
  const getReviewForCafe = (cafeId: number): Review | null => {
    return cafeReviews.get(cafeId) || null;
  };

  const getAmountSpentLabel = (visit: Visit): string => {
    if (!visit.amount_spent) return 'Not specified';
    const currency = visit.currency || 'USD';
    return formatCurrency(visit.amount_spent, currency);
  };

  const getVisitTimeLabel = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'Not specified';
    const numValue = typeof value === 'string' ? parseInt(value) : value;
    if (isNaN(numValue) || ![1, 2, 3].includes(numValue)) return 'Not specified';
    return VISIT_TIME_LABELS[numValue as 1 | 2 | 3] || 'Not specified';
  };

  // UPDATED: Cafe-level review actions
  const handleAddCafeReview = (cafeId: number, cafeName: string) => {
    setSelectedCafeId(cafeId);
    setSelectedCafeName(cafeName);
    setExistingReview(null);
    setShowReviewForm(true);
  };

  const handleEditCafeReview = (cafeId: number, cafeName: string, review: Review) => {
    setSelectedCafeId(cafeId);
    setSelectedCafeName(cafeName);
    setExistingReview(review);
    setShowReviewForm(true);
  };

  const handleReviewFormSuccess = async () => {
    setShowReviewForm(false);
    setSelectedCafeId(null);
    setSelectedCafeName('');
    setExistingReview(null);

    // Refetch review statuses for all cafes
    if (visits.length > 0) {
      const cafeIds = [...new Set(visits.map(v => v.cafe.id))];
      const reviewPromises = cafeIds.map(async (cafeId) => {
        const review = await reviewApi.getUserCafeReview(cafeId);
        return [cafeId, review] as const;
      });
      const reviewResults = await Promise.all(reviewPromises);
      setCafeReviews(new Map(reviewResults));
    }

    resultModal.showResultModal({
      type: 'success',
      title: existingReview ? 'Review Updated!' : 'Review Added!',
      message: existingReview
        ? 'Your review has been updated successfully!'
        : 'Your review has been added successfully!',
      autoClose: true,
      autoCloseDelay: 2000,
    });
  };

  const handleEditVisit = (visit: Visit) => {
    setEditingVisit(visit);
    setEditAmountSpent(visit.amount_spent ? visit.amount_spent.toString() : '');
    setEditCurrency(visit.currency || 'USD');
    setEditVisitTime(visit.visit_time || null);
    setShowEditVisit(true);
  };

  const handleSaveVisitEdit = async () => {
    if (!editingVisit) return;

    try {
      await updateVisit(editingVisit.id, {
        amount_spent: editAmountSpent ? parseFloat(editAmountSpent) : null,
        currency: editAmountSpent ? editCurrency : null,
        visit_time: editVisitTime,
      });

      setShowEditVisit(false);
      setEditingVisit(null);
      refetch();

      resultModal.showResultModal({
        type: 'success',
        title: 'Visit Updated!',
        message: 'Your visit has been updated successfully.',
        autoClose: true,
        autoCloseDelay: 2000,
      });
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error updating visit:', error);
      }
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to update visit';

      resultModal.showResultModal({
        type: 'error',
        title: 'Failed to Update Visit',
        message: errorMsg,
      });
    }
  };

  const handleDeleteClick = (visit: Visit, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisitToDelete(visit);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!visitToDelete) return;

    setIsDeleting(true);

    try {
      await deleteVisit(visitToDelete.id);
      setShowDeleteConfirm(false);
      setVisitToDelete(null);
      refetch();

      resultModal.showResultModal({
        type: 'success',
        title: 'Visit Deleted',
        message: 'Your visit has been deleted successfully.',
        autoClose: true,
        autoCloseDelay: 2000,
      });
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error deleting visit:', error);
      }
      const errorMsg = error?.response?.data?.detail || error?.message || 'Failed to delete visit';

      resultModal.showResultModal({
        type: 'error',
        title: 'Failed to Delete Visit',
        message: errorMsg,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setVisitToDelete(null);
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
      <div className="visits-page">
        <div className="page-header">
          <h1 className="page-title">My Visits</h1>
          <div className="header-right">
            <button
              className="home-button"
              onClick={hidePanel}
              aria-label="Return to map"
            >
              <Home size={20} />
            </button>
          </div>
        </div>
        <Loading message="Loading your visits..." />
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div className="visits-page">
        <div className="page-header">
          <h1 className="page-title">My Visits</h1>
          <div className="header-right">
            <button
              className="home-button"
              onClick={hidePanel}
              aria-label="Return to map"
            >
              <Home size={20} />
            </button>
          </div>
        </div>
        <EmptyState
          icon={<MapPin size={64} />}
          title="No visits yet"
          description="Start exploring cafes and log your visits!"
        />
      </div>
    );
  }

  return (
    <div className="visits-page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">My Visits</h1>
        <div className="header-right">
          {visits.length > 0 && <span className="count-badge">{visits.length}</span>}
          <button
            className="home-button"
            onClick={hidePanel}
            aria-label="Return to map"
          >
            <Home size={20} />
          </button>
        </div>
      </div>

      {/* Visits Container - Scrollable wrapper */}
      <div className="visits-container">
        <div className="visits-timeline">
          {Object.entries(groupedVisits).map(([month, monthVisits]) => (
            <div key={month} className="month-group">
              <h2 className="month-header">
                <Calendar size={18} />
                {month}
              </h2>

              <div className="visits-list">
                {monthVisits.map((visit) => {
                  const review = getReviewForCafe(visit.cafe.id);

                  return (
                    <div key={visit.id} className="visit-card">
                      {/* Cafe Info */}
                      <div className="visit-header">
                        <div className="visit-info">
                          <h3 className="cafe-name">{visit.cafe.name}</h3>
                          <p className="visit-date">
                            <Clock size={14} />
                            {formatDate(visit.visit_date)}
                          </p>
                        </div>
                        <button
                          className="delete-button"
                          onClick={(e) => handleDeleteClick(visit, e)}
                          aria-label="Delete visit"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <p className="cafe-address">
                        <MapPin size={14} />
                        {visit.cafe.address}
                      </p>

                      {/* Visit Details */}
                      {(visit.amount_spent || visit.visit_time) && (
                        <div className="visit-details">
                          {visit.amount_spent && (
                            <span className="detail-badge">
                              {getAmountSpentLabel(visit)}
                            </span>
                          )}
                          {visit.visit_time && (
                            <span className="detail-badge">
                              <Clock size={14} />
                              {getVisitTimeLabel(visit.visit_time)}
                            </span>
                          )}
                        </div>
                      )}

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

                      {/* Edit Visit Button */}
                      <button
                        className="edit-visit-button"
                        onClick={() => handleEditVisit(visit)}
                      >
                        <Edit size={16} />
                        Edit Visit Details
                      </button>

                      {/* UPDATED: Review Status - Cafe-level, not visit-level */}
                      <div className="review-section">
                        {loadingReviews ? (
                          <div className="review-loading">
                            Loading review status...
                          </div>
                        ) : review ? (
                          <>
                            <div className="review-status-display">
                              <div className="review-header">
                                <span className="review-badge">⭐ Your Review</span>
                                <span className="review-rating">{review.wfc_rating}/5</span>
                              </div>
                              {review.comment && (
                                <p className="review-comment">"{review.comment}"</p>
                              )}
                              <p className="review-meta">
                                Last updated {new Date(review.updated_at).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              className="edit-review-button"
                              onClick={() => handleEditCafeReview(visit.cafe.id, visit.cafe.name, review)}
                            >
                              <Edit size={16} />
                              Edit Your Review for {visit.cafe.name}
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="no-review-notice">
                              <span className="no-review-icon">📝</span>
                              <span>No review yet for {visit.cafe.name}</span>
                            </div>
                            <button
                              className="add-review-button"
                              onClick={() => handleAddCafeReview(visit.cafe.id, visit.cafe.name)}
                            >
                              <Plus size={16} />
                              Add Review for {visit.cafe.name}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Load More Trigger */}
          {hasNextPage && (
            <div ref={loadMoreRef} className="load-more-trigger">
              {isFetchingNextPage && (
                <div className="load-more-spinner">
                  <Loading message="Loading more visits..." />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* UPDATED: Review Form Modal - Now cafe-based */}
      {selectedCafeId && showReviewForm && (
        <ReviewForm
          cafeId={selectedCafeId}
          cafeName={selectedCafeName}
          existingReview={existingReview}
          isOpen={showReviewForm}
          onClose={() => {
            setShowReviewForm(false);
            setSelectedCafeId(null);
            setSelectedCafeName('');
            setExistingReview(null);
          }}
          onSuccess={handleReviewFormSuccess}
        />
      )}

      {/* Edit Visit Modal */}
      {showEditVisit && editingVisit && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Visit Details</h2>
            <div className="form-group">
              <label>Amount Spent</label>
              <div className="amount-input-group">
                <input
                  type="number"
                  value={editAmountSpent}
                  onChange={(e) => setEditAmountSpent(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
                <select
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  disabled={!editAmountSpent}
                >
                  {Object.entries(CURRENCIES).map(([code, { symbol, name }]) => (
                    <option key={code} value={code}>
                      {code} ({symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Visit Time</label>
              <select
                value={editVisitTime || ''}
                onChange={(e) => setEditVisitTime(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">Not specified</option>
                <option value="1">Morning (6AM - 12PM)</option>
                <option value="2">Afternoon (12PM - 6PM)</option>
                <option value="3">Evening (6PM - 12AM)</option>
              </select>
            </div>

            <div className="modal-actions">
              <button onClick={handleSaveVisitEdit}>Save</button>
              <button onClick={() => setShowEditVisit(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Visit?"
        message={`Are you sure you want to delete this visit to ${visitToDelete?.cafe.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
        variant="danger"
      />

      {/* Result Modal */}
      <ResultModal
        isOpen={resultModal.isOpen}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
        onClose={resultModal.hideResultModal}
      />
    </div>
  );
};

export default VisitsPanel;
