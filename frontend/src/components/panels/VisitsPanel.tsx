import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Plus, Home, Trash2, Edit, Eye, DollarSign } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import ReviewForm from '../review/ReviewForm';
import { Loading, EmptyState, ConfirmDialog, ResultModal } from '../common';
import { useVisits, useResultModal } from '../../hooks';
import { usePanel } from '../../contexts/PanelContext'; // Import usePanel
import { reviewApi } from '../../api/client';
import { formatDate, formatRating } from '../../utils';
import { REVIEW_CONFIG, VISIT_TIME_LABELS, AMOUNT_SPENT_RANGES } from '../../config/constants';
import { Visit, Review } from '../../types';
import { differenceInDays, format } from 'date-fns';
import '../../pages/VisitsPage.css';

const VisitsPanel: React.FC = () => {
  const { hidePanel } = usePanel(); // Use hidePanel from context
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
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);

  // Edit visit state
  const [showEditVisit, setShowEditVisit] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [editAmountSpent, setEditAmountSpent] = useState<number | null>(null);
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

  const canAddReview = (visit: Visit): boolean => {
    const visitDate = new Date(visit.visit_date);
    const daysSince = differenceInDays(new Date(), visitDate);
    return daysSince <= REVIEW_CONFIG.DAYS_TO_REVIEW_AFTER_VISIT && !visit.has_review;
  };

  const canEditReview = (visit: Visit): boolean => {
    const visitDate = new Date(visit.visit_date);
    const daysSince = differenceInDays(new Date(), visitDate);
    return visit.has_review && daysSince <= REVIEW_CONFIG.DAYS_TO_REVIEW_AFTER_VISIT;
  };

  const canEditVisit = (visit: Visit): boolean => {
    const visitDate = new Date(visit.visit_date);
    const daysSince = differenceInDays(new Date(), visitDate);
    return daysSince <= REVIEW_CONFIG.DAYS_TO_REVIEW_AFTER_VISIT;
  };

  const getDaysRemaining = (visit: Visit): number => {
    const visitDate = new Date(visit.visit_date);
    const deadline = new Date(visitDate);
    deadline.setDate(deadline.getDate() + REVIEW_CONFIG.DAYS_TO_REVIEW_AFTER_VISIT);
    return Math.max(0, differenceInDays(deadline, new Date()));
  };

  const getAmountSpentLabel = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'Not specified';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'Not specified';
    const range = AMOUNT_SPENT_RANGES.find(r => r.value === numValue);
    return range ? range.label : `$${numValue.toFixed(2)}`;
  };

  const getVisitTimeLabel = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'Not specified';
    const numValue = typeof value === 'string' ? parseInt(value) : value;
    if (isNaN(numValue) || ![1, 2, 3].includes(numValue)) return 'Not specified';
    return VISIT_TIME_LABELS[numValue as 1 | 2 | 3] || 'Not specified';
  };

  const handleAddReview = (visit: Visit) => {
    setSelectedVisit(visit);
    setExistingReview(null);
    setIsViewMode(false);
    setShowReviewForm(true);
  };

  const handleEditReview = async (visit: Visit) => {
    setLoadingReview(true);
    try {
      // Fetch all user's reviews and find the one for this visit
      const data = await reviewApi.getMyReviews();
      // Handle paginated response from DRF
      const reviewsList = Array.isArray(data) ? data : (data as any).results || [];
      const review = reviewsList.find((r: Review) => r.visit.id === visit.id);

      if (!review) {
        throw new Error('Review not found');
      }

      setSelectedVisit(visit);
      setExistingReview(review);
      setIsViewMode(false);
      setShowReviewForm(true);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error loading review:', error);
      }
      resultModal.showResultModal({
        type: 'error',
        title: 'Failed to Load Review',
        message: 'Failed to load review. Please try again.',
      });
    } finally {
      setLoadingReview(false);
    }
  };

  const handleViewReview = async (visit: Visit) => {
    setLoadingReview(true);
    try {
      // Fetch all user's reviews and find the one for this visit
      const data = await reviewApi.getMyReviews();
      // Handle paginated response from DRF
      const reviewsList = Array.isArray(data) ? data : (data as any).results || [];
      const review = reviewsList.find((r: Review) => r.visit.id === visit.id);

      if (!review) {
        throw new Error('Review not found');
      }

      setSelectedVisit(visit);
      setExistingReview(review);
      setIsViewMode(true);
      setShowReviewForm(true);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error loading review:', error);
      }
      resultModal.showResultModal({
        type: 'error',
        title: 'Failed to Load Review',
        message: 'Failed to load review. Please try again.',
      });
    } finally {
      setLoadingReview(false);
    }
  };

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    setSelectedVisit(null);
    setExistingReview(null);
    setIsViewMode(false);
    // Refetch visits to update the UI with new review status
    refetch();
  };

  const handleEditVisit = (visit: Visit) => {
    setEditingVisit(visit);
    setEditAmountSpent(visit.amount_spent || null);
    setEditVisitTime(visit.visit_time || null);
    setShowEditVisit(true);
  };

  const handleSaveVisitEdit = async () => {
    if (!editingVisit) return;

    try {
      await updateVisit(editingVisit.id, {
        amount_spent: editAmountSpent,
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
    e.stopPropagation(); // Prevent triggering other click handlers
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
      // Refetch to update the list
      refetch();

      // Show success modal
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
              {monthVisits.map((visit) => (
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
                          <DollarSign size={14} />
                          {getAmountSpentLabel(visit.amount_spent)}
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

                  {/* Edit Visit Button (within 7 days) */}
                  {canEditVisit(visit) && (
                    <button
                      className="edit-visit-button"
                      onClick={() => handleEditVisit(visit)}
                    >
                      <Edit size={16} />
                      Edit Visit Details
                    </button>
                  )}

                  {/* Review Status */}
                  {canEditReview(visit) ? (
                    <div className="review-actions">
                      <div className="deadline-notice">
                        <p className="deadline-text">
                          {getDaysRemaining(visit)} {getDaysRemaining(visit) === 1 ? 'day' : 'days'} left to edit
                        </p>
                      </div>
                      <button
                        className="add-review-button"
                        onClick={() => handleEditReview(visit)}
                        disabled={loadingReview}
                      >
                        <Edit size={18} />
                        {loadingReview ? 'Loading...' : 'Edit Review'}
                      </button>
                    </div>
                  ) : visit.has_review ? (
                    <div className="review-actions">
                      <div className="review-status completed">
                        ✓ Review added
                      </div>
                      <button
                        className="add-review-button"
                        onClick={() => handleViewReview(visit)}
                        disabled={loadingReview}
                        style={{ marginTop: '8px' }}
                      >
                        <Eye size={18} />
                        {loadingReview ? 'Loading...' : 'View Review'}
                      </button>
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

      {/* Review Form Modal */}
      {selectedVisit && showReviewForm && (
        <ReviewForm
          visitId={selectedVisit.id}
          cafeId={selectedVisit.cafe.id}
          cafeName={selectedVisit.cafe.name}
          existingReview={existingReview}
          isViewMode={isViewMode}
          isOpen={showReviewForm}
          onClose={() => {
            setShowReviewForm(false);
            setExistingReview(null);
            setIsViewMode(false);
          }}
          onSuccess={handleReviewSuccess}
        />
      )}

      {/* Edit Visit Modal */}
      {showEditVisit && editingVisit && (
        <div className="modal-overlay" onClick={() => setShowEditVisit(false)}>
          <div className="edit-visit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Visit Details</h2>
              <button className="close-button" onClick={() => setShowEditVisit(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="edit-cafe-name">{editingVisit.cafe.name}</p>
              <p className="edit-visit-date">
                <Clock size={14} />
                {formatDate(editingVisit.visit_date)}
              </p>

              <div className="form-group">
                <label htmlFor="edit-amount-spent">
                  <DollarSign size={16} />
                  Amount Spent
                </label>
                <select
                  id="edit-amount-spent"
                  value={editAmountSpent || ''}
                  onChange={(e) => setEditAmountSpent(e.target.value ? parseFloat(e.target.value) : null)}
                >
                  <option value="">Not specified</option>
                  {AMOUNT_SPENT_RANGES.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="edit-visit-time">
                  <Clock size={16} />
                  Visit Time
                </label>
                <select
                  id="edit-visit-time"
                  value={editVisitTime || ''}
                  onChange={(e) => setEditVisitTime(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Not specified</option>
                  {Object.entries(VISIT_TIME_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="deadline-info">
                <p>
                  {getDaysRemaining(editingVisit)} {getDaysRemaining(editingVisit) === 1 ? 'day' : 'days'} left to edit
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setShowEditVisit(false)}
              >
                Cancel
              </button>
              <button
                className="save-button"
                onClick={handleSaveVisitEdit}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {visitToDelete && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Delete Visit?"
          message={
            visitToDelete.has_review
              ? <>Are you sure you want to delete your visit to <span className="neo-highlight">{visitToDelete.cafe.name}</span>? This will also permanently delete your review. This action cannot be undone.</>
              : <>Are you sure you want to delete your visit to <span className="neo-highlight">{visitToDelete.cafe.name}</span>? This action cannot be undone.</>
          }
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete} 
          onCancel={handleCancelDelete}
          variant="danger"
          isLoading={isDeleting}
        />
      )}

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
    </div>
  );
};

export default VisitsPanel;