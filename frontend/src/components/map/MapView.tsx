import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import CafeMarker from './CafeMarker';
import UserLocationMarker from './UserLocationMarker';
import MapLegend from './MapLegend';
import MapEvents from './MapEvents';
import SearchAreaButton from './SearchAreaButton';
import RecenterButton from './RecenterButton';
import { Cafe } from '../../types';

interface MapViewProps {
  cafes: Cafe[];
  loading: boolean;
  error: string | null;
  searchCenter: { lat: number; lng: number } | null;
  onCafeClick: (cafe: Cafe) => void;
  onSearchArea: (center: { lat: number; lng: number }) => void;
  userLocation: { lat: number; lng: number } | null;
}

// Component to fly to a location when explicitly requested
function MapFlyer({ center, shouldFly }: { center: LatLngExpression; shouldFly: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (shouldFly) {
      map.flyTo(center, map.getZoom(), {
        duration: 1.5,
      });
    }
  }, [shouldFly, center, map]);

  return null;
}

const MapView: React.FC<MapViewProps> = ({
  cafes,
  loading,
  error,
  searchCenter,
  onCafeClick,
  onSearchArea,
  userLocation
}) => {
  const [currentMapCenter, setCurrentMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [showSearchButton, setShowSearchButton] = useState(false);
  const [shouldFlyToCenter, setShouldFlyToCenter] = useState(false);

  // Use ref for debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Default center (Jakarta, Indonesia)
  const defaultCenter: LatLngExpression = [-6.2088, 106.8456];
  const mapCenter = searchCenter
    ? [searchCenter.lat, searchCenter.lng] as LatLngExpression
    : defaultCenter;

  // Trigger fly animation when search center changes
  useEffect(() => {
    if (searchCenter) {
      setShouldFlyToCenter(true);
      // Reset fly flag after animation
      const timer = setTimeout(() => setShouldFlyToCenter(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [searchCenter?.lat, searchCenter?.lng]);

  // Memoize calculateDistance to avoid recreating it
  const calculateDistance = useMemo(() => {
    return (
      point1: { lat: number; lng: number },
      point2: { lat: number; lng: number }
    ): number => {
      const R = 6371; // Earth's radius in km
      const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
      const dLng = ((point2.lng - point1.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((point1.lat * Math.PI) / 180) *
          Math.cos((point2.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };
  }, []);

  // Handle map movement with debouncing
  const handleMapMoveEnd = useCallback((center: { lat: number; lng: number }) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce state updates by 200ms
    debounceTimerRef.current = setTimeout(() => {
      setCurrentMapCenter(center);

      if (searchCenter) {
        const distance = calculateDistance(center, searchCenter);
        // Show button if moved more than 500 meters from search center
        setShowSearchButton(distance > 0.5);
      }
    }, 200);
  }, [searchCenter, calculateDistance]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle search this area
  const handleSearchArea = useCallback(() => {
    if (currentMapCenter) {
      setShowSearchButton(false);
      onSearchArea(currentMapCenter);
    }
  }, [currentMapCenter, onSearchArea]);

  // Handle recenter to user location
  const handleRecenter = useCallback(() => {
    if (userLocation) {
      setShowSearchButton(false);
      onSearchArea(userLocation);
    }
  }, [userLocation, onSearchArea]);

  return (
    <div className="map-container">
      <MapContainer
        center={mapCenter}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Map event listeners */}
        <MapEvents onMoveEnd={handleMapMoveEnd} />

        {/* Fly to center when search is triggered */}
        <MapFlyer center={mapCenter} shouldFly={shouldFlyToCenter} />

        {/* User location marker */}
        {userLocation && (
          <UserLocationMarker position={[userLocation.lat, userLocation.lng]} />
        )}

        {/* Cafe markers */}
        {cafes.map((cafe) => (
          <CafeMarker
            key={cafe.id}
            cafe={cafe}
            onClick={() => onCafeClick(cafe)}
          />
        ))}
      </MapContainer>

      {/* Search this area button */}
      {showSearchButton && !loading && (
        <SearchAreaButton
          onClick={handleSearchArea}
          loading={loading}
        />
      )}

      {/* Recenter button (shown when map has been moved) */}
      {userLocation && showSearchButton && (
        <RecenterButton onClick={handleRecenter} />
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="map-loading">
          <div className="spinner"></div>
          <p>Loading nearby cafes...</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="map-error">
          <p>{error}</p>
        </div>
      )}

      <style>{`
        .map-container {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .leaflet-container {
          font-family: inherit;
        }

        .map-loading,
        .map-error {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          padding: 12px 24px;
          border-radius: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .map-error {
          background: #fef2f2;
          color: var(--danger);
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid var(--gray-200);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Fix Leaflet marker icons not showing */
        .leaflet-marker-icon {
          background: transparent;
        }
      `}</style>

      <MapLegend />
    </div>
  );
};

export default MapView;