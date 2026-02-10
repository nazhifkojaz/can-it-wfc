import React, { useState } from 'react';
import { MapPin, Star, Heart, Home } from 'lucide-react';
import CafeDetailSheet from '../cafe/CafeDetailSheet';
import AddVisitReviewModal from '../visit/AddVisitReviewModal';
import { Loading, EmptyState, ResultModal } from '../common';
import { useFavorites, useResultModal } from '../../hooks';
import { usePanel } from '../../contexts/PanelContext';
import { formatPriceRange, formatRating, formatDistance } from '../../utils';
import { extractApiError } from '../../utils/errorUtils';
import { Cafe } from '../../types';
import { logger } from '../../utils/logger';
import { trackCafeUnfavorited } from '../../lib/analytics';
import './FavoritesPanel.css';

const FavoritesPanel: React.FC = () => {
  const { hidePanel } = usePanel();
  const { favorites, loading, toggleFavorite, refetch } = useFavorites();
  const resultModal = useResultModal();
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);

  // Visit + Review modal state
  const [showAddVisitReview, setShowAddVisitReview] = useState(false);
  const [visitCafe, setVisitCafe] = useState<Cafe | undefined>(undefined);

  const handleCafeClick = (cafe: Cafe) => {
    setSelectedCafe(cafe);
  };

  const handleRemoveFavorite = async (cafeId: number, _cafeName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleFavorite(cafeId);

      // Track analytics after successful removal
      trackCafeUnfavorited({
        cafeId,
        source: 'favorites_panel',
      });
    } catch (error) {
      const apiError = extractApiError(error);
      logger.error('Error removing favorite', apiError, 'FavoritesPanel');
      resultModal.showResultModal({
        type: 'error',
        title: 'Failed to Remove Favorite',
        message: apiError.message || 'Failed to remove favorite. Please try again.',
      });
    }
  };

  const handleLogVisit = () => {
    if (selectedCafe) {
      setVisitCafe(selectedCafe);
    }
    setShowAddVisitReview(true);
    setSelectedCafe(null); // Close cafe detail sheet for clean modal transition
  };

  const handleVisitReviewSuccess = () => {
    setShowAddVisitReview(false);
    setVisitCafe(undefined);
    setSelectedCafe(null);

    // Refetch favorites to update stats
    refetch();
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
                onClick={(e) => handleRemoveFavorite(cafe.id, cafe.name, e)}
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
              {cafe.distance !== undefined && (
                <span className="distance">{formatDistance(cafe.distance)}</span>
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

      {/* Add Visit + Review Modal */}
      <AddVisitReviewModal
        isOpen={showAddVisitReview}
        onClose={() => {
          setShowAddVisitReview(false);
          setVisitCafe(undefined);
        }}
        onSuccess={handleVisitReviewSuccess}
        preselectedCafe={visitCafe}
      />

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
