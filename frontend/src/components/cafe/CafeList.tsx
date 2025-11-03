import React, { useState, useEffect } from 'react';
import { MapPin, Star, Users, Coffee } from 'lucide-react';
import { Cafe } from '../../types';
import './CafeList.css';

interface CafeListProps {
  cafes: Cafe[];
  loading: boolean;
  error: string | null;
  userLocation: { lat: number; lng: number } | null;
  onCafeClick: (cafe: Cafe) => void;
}

type SortOption = 'distance' | 'rating' | 'visits';

const CafeList: React.FC<CafeListProps> = ({ cafes: initialCafes, loading, error: _error, userLocation, onCafeClick }) => {
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [sortedCafes, setSortedCafes] = useState<Cafe[]>([]);

  const sortCafes = (cafes: Cafe[], sortOption: SortOption): Cafe[] => {
    return [...cafes].sort((a, b) => {
      switch (sortOption) {
        case 'distance':
          const distA = parseFloat(a.distance?.replace(' km', '') || '999');
          const distB = parseFloat(b.distance?.replace(' km', '') || '999');
          return distA - distB;

        case 'rating':
          const ratingA = parseFloat(a.average_wfc_rating || '0');
          const ratingB = parseFloat(b.average_wfc_rating || '0');
          return ratingB - ratingA;

        case 'visits':
          return b.total_visits - a.total_visits;

        default:
          return 0;
      }
    });
  };

  // Sort cafes whenever they change or sort option changes
  useEffect(() => {
    setSortedCafes(sortCafes(initialCafes, sortBy));
  }, [initialCafes, sortBy]);

  const getPriceDisplay = (priceRange?: number) => {
    if (!priceRange) return null;
    return '$'.repeat(priceRange);
  };

  const getStatusBadge = (cafe: Cafe) => {
    // Show registration status
    if (!cafe.is_registered) {
      return <span className="status-badge gray">Not in WFC</span>;
    }

    if (cafe.total_reviews > 0) {
      return <span className="status-badge green">{cafe.total_reviews} review{cafe.total_reviews !== 1 ? 's' : ''}</span>;
    }

    return <span className="status-badge blue">No reviews yet</span>;
  };

  if (!userLocation) {
    return (
      <div className="cafe-list">
        <div className="list-empty">
          <p>Enable location to see nearby cafes</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cafe-list">
        <div className="list-loading">
          <div className="spinner"></div>
          <p>Loading cafes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cafe-list">
      <div className="list-header">
        <p className="result-count">{sortedCafes.length} cafes nearby</p>
        <div className="sort-buttons">
          <button
            className={`sort-button ${sortBy === 'distance' ? 'active' : ''}`}
            onClick={() => setSortBy('distance')}
          >
            Nearest
          </button>
          <button
            className={`sort-button ${sortBy === 'rating' ? 'active' : ''}`}
            onClick={() => setSortBy('rating')}
          >
            Top Rated
          </button>
          <button
            className={`sort-button ${sortBy === 'visits' ? 'active' : ''}`}
            onClick={() => setSortBy('visits')}
          >
            Popular
          </button>
        </div>
      </div>

      <div className="list-content">
        {sortedCafes.length === 0 ? (
          <div className="list-empty">
            <p>No cafes found nearby</p>
          </div>
        ) : (
          sortedCafes.map((cafe) => (
            <button
              key={cafe.id}
              className="cafe-card"
              onClick={() => onCafeClick(cafe)}
            >
              <div className="card-badges">
                {getStatusBadge(cafe)}
              </div>

              <div className="card-content">
                <h3 className="cafe-name">{cafe.name}</h3>
                
                <div className="cafe-address">
                  <MapPin size={14} />
                  <span>{cafe.address}</span>
                </div>

                <div className="cafe-stats">
                  {cafe.average_wfc_rating ? (
                    <div className="stat">
                      <Star size={14} fill="currentColor" />
                      <span>{parseFloat(cafe.average_wfc_rating).toFixed(1)}</span>
                    </div>
                  ) : (
                    <div className="stat">
                      <Star size={14} />
                      <span>No ratings</span>
                    </div>
                  )}

                  {cafe.price_range && (
                    <div className="stat price">
                      <span>{getPriceDisplay(cafe.price_range)}</span>
                    </div>
                  )}

                  <div className="stat">
                    <Users size={14} />
                    <span>{cafe.unique_visitors}</span>
                  </div>

                  <div className="stat">
                    <Coffee size={14} />
                    <span>{cafe.total_visits}</span>
                  </div>
                </div>

                {cafe.distance && (
                  <div className="cafe-distance">
                    {cafe.distance} away
                  </div>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default CafeList;