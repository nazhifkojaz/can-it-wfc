import React, { useState } from 'react';
import { MapPin, Star, Heart, Home } from 'lucide-react';
import CafeDetailSheet from '../cafe/CafeDetailSheet';
import AddVisitModal from '../visit/AddVisitModal';
import ReviewForm from '../review/ReviewForm';
import { Loading, EmptyState, ResultModal } from '../common';
import { useFavorites, useResultModal } from '../../hooks';
import { usePanel } from '../../contexts/PanelContext'; // Import usePanel
import { formatPriceRange, formatRating } from '../../utils';
import { Cafe } from '../../types';
import './FavoritesPanel.css';

const FavoritesPanel: React.FC = () => {
  const { hidePanel } = usePanel(); // Use hidePanel from context
  const { favorites, loading, toggleFavorite, refetch } = useFavorites();
  const resultModal = useResultModal();
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);

  // Visit logging state
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [visitCafe, setVisitCafe] = useState<Cafe | undefined>(undefined);

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewVisitId, setReviewVisitId] = useState<number | null>(null);
  const [reviewCafeId, setReviewCafeId] = useState<number | null>(null);
  const [reviewCafeName, setReviewCafeName] = useState<string>('');

  const handleCafeClick = (cafe: Cafe) => {
    setSelectedCafe(cafe);
  };

  const handleRemoveFavorite = async (cafeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleFavorite(cafeId);
    } catch (error: any) { 
      if (import.meta.env.DEV) {
        console.error('Error removing favorite:', error);
      }
      resultModal.showResultModal({
        type: 'error',
        title: 'Failed to Remove Favorite',
        message: error.message || 'Failed to remove favorite. Please try again.',
      });
    }
  };

  const handleLogVisit = () => {
    if (selectedCafe) {
      setVisitCafe(selectedCafe);
    }
    setShowAddVisit(true);
    setSelectedCafe(null); // Close cafe detail sheet for clean modal transition
  };

  const handleVisitSuccess = () => {
    setShowAddVisit(false);
    setVisitCafe(undefined);
    setSelectedCafe(null);

    // Refetch favorites to update stats
    refetch();

    // Show success message
    resultModal.showResultModal({
      type: 'success',
      title: 'Visit Logged!',
      message: 'Your visit has been recorded successfully.',
      autoClose: true,
      autoCloseDelay: 2000,
    });
  };

  const handleAddReview = (visitId: number, cafeId: number, cafeName: string) => {
    setReviewVisitId(visitId);
    setReviewCafeId(cafeId);
    setReviewCafeName(cafeName);
    setShowAddVisit(false);
    setVisitCafe(undefined);
    setShowReviewForm(true);
  };

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    setReviewVisitId(null);
    setReviewCafeId(null);
    setReviewCafeName('');

    // Refetch favorites to update stats
    refetch();

    // Show success message
    resultModal.showResultModal({
      type: 'success',
      title: 'Review Submitted!',
      message: 'Your review has been submitted successfully.',
      autoClose: true,
      autoCloseDelay: 2000,
    });
  };

  if (loading) {
    return (
      <div className="favorites-page">
        <div className="page-header">
          <h1 className="page-title">Favorites</h1>
          <div className="header-right">
            <button
              className="home-button"
              onClick={hidePanel} // Use hidePanel
              aria-label="Return to map"
            >
              <Home size={20} />
            </button>
          </div>
        </div>
        <Loading message="Loading favorites..." />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="favorites-page">
        <div className="page-header">
          <h1 className="page-title">Favorites</h1>
          <div className="header-right">
            <button
              className="home-button"
              onClick={hidePanel} // Use hidePanel
              aria-label="Return to map"
            >
              <Home size={20} />
            </button>
          </div>
        </div>
        <EmptyState
          icon={<Heart size={64} />}
          title="No favorites yet"
          description="Start adding cafes to your favorites to see them here!"
        />
      </div>
    );
  }

  return (
    <div className="favorites-page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Favorites</h1>
        <div className="header-right">
          {favorites.length > 0 && <span className="count-badge">{favorites.length}</span>}
          <button
            className="home-button"
            onClick={hidePanel} // Use hidePanel
            aria-label="Return to map"
          >
            <Home size={20} />
          </button>
        </div>
      </div>
      {/* Favorites Grid */}
      <div className="favorites-grid">
        {favorites.map((cafe) => (
          <div
            key={cafe.id}
            className="cafe-card"
            onClick={() => handleCafeClick(cafe)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => e.key === 'Enter' && handleCafeClick(cafe)}
          >
            <div className="card-header">
              <h3 className="cafe-name">{cafe.name}</h3>
              <button
                className="favorite-button active"
                onClick={(e) => handleRemoveFavorite(cafe.id, e)}
                aria-label="Remove from favorites"
              >
                <Heart size={20} fill="currentColor" />
              </button>
            </div>

            <p className="cafe-address">
              <MapPin size={14} />
              {cafe.address}
            </p>

            <div className="cafe-meta">
              {cafe.average_wfc_rating && (
                <span className="rating">
                  <Star size={14} fill="currentColor" />
                  {formatRating(cafe.average_wfc_rating)}
                </span>
              )}
              {cafe.price_range && (
                <span className="price">{formatPriceRange(cafe.price_range)}</span>
              )}
              {cafe.distance && (
                <span className="distance">{cafe.distance}</span>
              )}
            </div>

            <div className="cafe-stats">
              <span className="stat">{cafe.total_reviews || 0} reviews</span>
              <span className="stat">{cafe.total_visits || 0} visits</span>
            </div>
          </div>
        ))}
      </div>

      {/* Cafe Detail Sheet */}
      {selectedCafe && (
        <CafeDetailSheet
          cafe={selectedCafe}
          isOpen={!!selectedCafe}
          onClose={() => setSelectedCafe(null)}
          onLogVisit={handleLogVisit}
        />
      )}

      {/* Add Visit Modal */}
      <AddVisitModal
        isOpen={showAddVisit}
        onClose={() => {
          setShowAddVisit(false);
          setVisitCafe(undefined); // Clear visit cafe on close
        }}
        onSuccess={handleVisitSuccess}
        onAddReview={handleAddReview}
        preselectedCafe={visitCafe}
      />

      {/* Review Form Modal */}
      {showReviewForm && reviewVisitId !== null && reviewCafeId !== null && (
        <ReviewForm
          visitId={reviewVisitId}
          cafeId={reviewCafeId}
          cafeName={reviewCafeName}
          isOpen={showReviewForm}
          onClose={() => setShowReviewForm(false)}
          onSuccess={handleReviewSuccess}
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

export default FavoritesPanel;
