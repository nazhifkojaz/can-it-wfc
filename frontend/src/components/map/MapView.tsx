import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import CafeMarker from './CafeMarker';
import UserLocationMarker from './UserLocationMarker';
import MapLegend from './MapLegend';
import MapEvents from './MapEvents';
import SearchAreaButton from './SearchAreaButton';
import RecenterButton from './RecenterButton';
import FindMyLocationButton from './FindMyLocationButton';
import ZoomInButton from './ZoomInButton';
import ZoomOutButton from './ZoomOutButton';
import { Cafe } from '../../types';
import styles from './map.module.css';
import 'leaflet/dist/leaflet.css';

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

  // Handle find my location
  const handleFindMyLocation = useCallback(() => {
    if (userLocation) {
      onSearchArea(userLocation);
    }
  }, [userLocation, onSearchArea]);

  const MapResizer = () => {
    const map = useMap();
    useEffect(() => {
      map.invalidateSize();
    }, [map]);
    return null;
  };

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={mapCenter}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        className={styles.leafletContainer}
        zoomControl={false} // Disable default zoom control
      >
        <MapResizer />
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

        {/* Custom Map Controls Group (Bottom Left) */}
        <div className={styles.mapControlsGroup}>
          <FindMyLocationButton
            onClick={handleFindMyLocation}
            disabled={!userLocation}
          />
          <ZoomInButton /> {/* Custom Zoom In Button */}
          <ZoomOutButton /> {/* Custom Zoom Out Button */}
        </div>
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
        <div className={styles.mapLoading}>
          <div className={styles.spinner}></div>
          <p>Loading nearby cafes...</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className={styles.mapError}>
          <p>{error}</p>
        </div>
      )}

      <MapLegend />
    </div>
  );
};

export default MapView;
