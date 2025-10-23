import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { Cafe } from '../../types';

interface CafeMarkerProps {
  cafe: Cafe;
  onClick: () => void;
}

// Create custom icons with different colors
const createMarkerIcon = (color: string) => {
  return new Icon({
    iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="32" height="48">
        <path fill="${color}" stroke="white" stroke-width="2" d="M12 0C7.589 0 4 3.589 4 8c0 7 8 20 8 20s8-13 8-20c0-4.411-3.589-8-8-8z"/>
        <circle cx="12" cy="8" r="4" fill="white"/>
      </svg>
    `)}`,
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [0, -48],
  });
};

// Define marker colors based on status
const getMarkerColor = (cafe: Cafe): string => {
  // Unregistered cafe (from Google Places, no one has visited)
  if (!cafe.is_registered) {
    return '#9ca3af'; // Gray
  }

  // Registered cafe with WFC reviews
  if (cafe.total_reviews > 0) {
    return '#10b981'; // Green
  }

  // Registered cafe without reviews (someone visited but didn't review)
  return '#60a5fa'; // Blue
};

const CafeMarker: React.FC<CafeMarkerProps> = ({ cafe, onClick }) => {
  const position: LatLngExpression = [
    parseFloat(cafe.latitude),
    parseFloat(cafe.longitude),
  ];

  const markerColor = getMarkerColor(cafe);
  const icon = createMarkerIcon(markerColor);

  const getRatingDisplay = () => {
    if (cafe.is_registered && cafe.average_wfc_rating) {
      return `⭐ ${parseFloat(cafe.average_wfc_rating).toFixed(1)} WFC`;
    } else if (!cafe.is_registered && cafe.google_rating) {
      return `⭐ ${cafe.google_rating.toFixed(1)} (Google)`;
    }
    return 'No reviews yet';
  };

  const getPriceDisplay = () => {
    if (!cafe.price_range) return '';
    return '$'.repeat(cafe.price_range);
  };

  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <div className="cafe-popup">
          <h3 className="popup-title">{cafe.name}</h3>

          {!cafe.is_registered && (
            <span className="popup-badge">Not yet in WFC</span>
          )}

          <div className="popup-info">
            <span className="popup-rating">{getRatingDisplay()}</span>
            {cafe.price_range && (
              <span className="popup-price">{getPriceDisplay()}</span>
            )}
          </div>

          {cafe.distance && (
            <p className="popup-distance">{cafe.distance} away</p>
          )}

          {cafe.is_registered ? (
            <p className="popup-stats">
              {cafe.total_visits} visits · {cafe.unique_visitors} visitors
            </p>
          ) : (
            <p className="popup-stats">
              {cafe.google_ratings_count || 0} Google reviews
              {cafe.is_open_now !== undefined && (
                <span className={cafe.is_open_now ? 'status-open' : 'status-closed'}>
                  {' • '}{cafe.is_open_now ? 'Open' : 'Closed'}
                </span>
              )}
            </p>
          )}

          <button className="popup-button" onClick={onClick}>
            View Details
          </button>
        </div>

        <style>{`
          .cafe-popup {
            min-width: 200px;
            padding: 8px;
          }

          .popup-title {
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 8px 0;
            color: var(--gray-900);
          }

          .popup-info {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 4px;
          }

          .popup-rating {
            font-size: 14px;
            font-weight: 500;
          }

          .popup-price {
            font-size: 14px;
            color: var(--primary);
            font-weight: 600;
          }

          .popup-distance {
            font-size: 13px;
            color: var(--gray-600);
            margin: 4px 0;
          }

          .popup-stats {
            font-size: 12px;
            color: var(--gray-500);
            margin: 4px 0 8px 0;
          }

          .popup-button {
            width: 100%;
            padding: 8px 16px;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
          }

          .popup-button:hover {
            background: var(--primary-dark);
          }

          .popup-badge {
            display: inline-block;
            background: var(--gray-200);
            color: var(--gray-700);
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 4px;
            margin-bottom: 8px;
          }

          .status-open {
            color: var(--success);
          }

          .status-closed {
            color: var(--danger);
          }

          .leaflet-popup-content-wrapper {
            border-radius: 12px;
            padding: 0;
          }

          .leaflet-popup-content {
            margin: 0;
          }
        `}</style>
      </Popup>
    </Marker>
  );
};

export default CafeMarker;