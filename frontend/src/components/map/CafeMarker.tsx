import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { Cafe } from '../../types';

interface CafeMarkerProps {
  cafe: Cafe;
  onClick: () => void;
}

// Create custom brutalist markers with thick borders
const createMarkerIcon = (color: string) => {
  return new Icon({
    iconUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 28 40" width="32" height="48">
        <path fill="${color}" stroke="black" stroke-width="3" d="M12 0C7.589 0 4 3.589 4 8c0 7 8 20 8 20s8-13 8-20c0-4.411-3.589-8-8-8z"/>
        <circle cx="12" cy="8" r="4" fill="white" stroke="black" stroke-width="2"/>
      </svg>
    `)}`,
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [0, -48],
  });
};

// Define marker colors based on status - using neo-* colors
const getMarkerColor = (cafe: Cafe): string => {
  // Unregistered cafe (from Google Places, no one has visited)
  if (!cafe.is_registered) {
    return '#9CA3AF'; // neo-gray-400
  }

  // Registered cafe with WFC reviews
  if (cafe.total_reviews > 0) {
    return '#10B981'; // neo-success
  }

  // Registered cafe without reviews (someone visited but didn't review)
  return '#3B82F6'; // neo-info
};

const CafeMarker: React.FC<CafeMarkerProps> = React.memo(({ cafe, onClick }) => {
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
            font-weight: var(--neo-font-extrabold, 800);
            margin: 0 0 8px 0;
            color: var(--neo-black, #000);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .popup-info {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 4px;
          }

          .popup-rating {
            font-size: 14px;
            font-weight: var(--neo-font-bold, 700);
          }

          .popup-price {
            font-size: 14px;
            color: var(--neo-primary, #8B5CF6);
            font-weight: var(--neo-font-bold, 700);
          }

          .popup-distance {
            font-size: 13px;
            color: var(--neo-gray-600, #4B5563);
            margin: 4px 0;
            font-weight: 500;
          }

          .popup-stats {
            font-size: 12px;
            color: var(--neo-gray-600, #4B5563);
            margin: 4px 0 8px 0;
            font-weight: 500;
          }

          .popup-button {
            width: 100%;
            padding: 8px 16px;
            background: var(--neo-primary, #8B5CF6);
            color: var(--neo-white, #fff);
            border: var(--neo-border-width, 3px) solid var(--neo-black, #000);
            border-radius: var(--neo-border-radius, 4px);
            font-size: 14px;
            font-weight: var(--neo-font-bold, 700);
            cursor: pointer;
            transition: transform 0.1s, box-shadow 0.1s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 3px 3px 0 var(--neo-black, #000);
          }

          .popup-button:hover {
            background: var(--neo-primary-dark, #7C3AED);
            transform: translate(-1px, -1px);
            box-shadow: 4px 4px 0 var(--neo-black, #000);
          }

          .popup-button:active {
            transform: translate(1px, 1px);
            box-shadow: 2px 2px 0 var(--neo-black, #000);
          }

          .popup-badge {
            display: inline-block;
            background: var(--neo-gray-200, #E5E7EB);
            color: var(--neo-gray-700, #374151);
            font-size: 11px;
            font-weight: var(--neo-font-bold, 700);
            padding: 2px 8px;
            border: var(--neo-border-width-thin, 2px) solid var(--neo-black, #000);
            border-radius: var(--neo-border-radius, 4px);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            box-shadow: 2px 2px 0 var(--neo-black, #000);
          }

          .status-open {
            color: var(--neo-success, #10B981);
            font-weight: var(--neo-font-bold, 700);
          }

          .status-closed {
            color: var(--neo-danger, #DC2626);
            font-weight: var(--neo-font-bold, 700);
          }

          .leaflet-popup-content-wrapper {
            border: var(--neo-border-width-thick, 4px) solid var(--neo-black, #000);
            border-radius: var(--neo-border-radius, 4px);
            padding: 0;
            box-shadow: 6px 6px 0 var(--neo-black, #000);
          }

          .leaflet-popup-content {
            margin: 0;
          }

          .leaflet-popup-tip {
            background: var(--neo-white, #fff);
            border: var(--neo-border-width, 3px) solid var(--neo-black, #000);
            border-top: none;
            border-left: none;
          }
        `}</style>
      </Popup>
    </Marker>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if cafe data actually changed
  // This prevents unnecessary re-renders when map moves/zooms
  return (
    prevProps.cafe.id === nextProps.cafe.id &&
    prevProps.cafe.updated_at === nextProps.cafe.updated_at &&
    prevProps.cafe.total_reviews === nextProps.cafe.total_reviews &&
    prevProps.cafe.average_wfc_rating === nextProps.cafe.average_wfc_rating
  );
});

CafeMarker.displayName = 'CafeMarker';

export default CafeMarker;