import React, { useState } from 'react';
import { MapPin, Star, Heart } from 'lucide-react';
import MobileLayout from '../components/layout/MobileLayout';
import CafeDetailSheet from '../components/cafe/CafeDetailSheet';
import { Loading, EmptyState } from '../components/common';
import { useFavorites } from '../hooks';
import { formatPriceRange, formatRating } from '../utils';
import { Cafe } from '../types';

const FavoritesPage: React.FC = () => {
  const { favorites, loading, toggleFavorite } = useFavorites();
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);

  const handleCafeClick = (cafe: Cafe) => {
    setSelectedCafe(cafe);
  };

  const handleRemoveFavorite = async (cafeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleFavorite(cafeId);
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="favorites-page">
          <div className="page-header">
            <h1 className="page-title">Favorites</h1>
          </div>
          <Loading message="Loading favorites..." />
        </div>
      </MobileLayout>
    );
  }

  if (favorites.length === 0) {
    return (
      <MobileLayout>
        <div className="favorites-page">
          <div className="page-header">
            <h1 className="page-title">Favorites</h1>
          </div>
          <EmptyState
            icon={<Heart size={64} />}
            title="No favorites yet"
            description="Start adding cafes to your favorites to see them here!"
          />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="favorites-page">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Favorites</h1>
          <span className="count-badge">{favorites.length}</span>
        </div>

        {/* Favorites Grid */}
        <div className="favorites-grid">
          {favorites.map((cafe) => (
            <button
              key={cafe.id}
              className="cafe-card"
              onClick={() => handleCafeClick(cafe)}
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
            </button>
          ))}
        </div>

        {/* Cafe Detail Sheet */}
        {selectedCafe && (
          <CafeDetailSheet
            cafe={selectedCafe}
            isOpen={!!selectedCafe}
            onClose={() => setSelectedCafe(null)}
            onLogVisit={() => {}}
          />
        )}
      </div>
    </MobileLayout>
  );
};

export default FavoritesPage;
