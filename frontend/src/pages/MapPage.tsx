import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, List, Map as MapIcon } from 'lucide-react';
import MobileLayout from '../components/layout/MobileLayout';
import MapView from '../components/map/MapView';
import CafeList from '../components/cafe/CafeList';
import CafeDetailSheet from '../components/cafe/CafeDetailSheet';
import AddVisitReviewModal from '../components/visit/AddVisitReviewModal';
import { Loading, ResultModal } from '../components/common';
import { SearchOverlay } from '../components/map/SearchOverlay';
import { useGeolocation, useNearbyCafes, useResultModal } from '../hooks';
import { Cafe } from '../types';
import PanelManager from '../components/panels/PanelManager';
import { usePanel } from '../contexts/PanelContext';
import { cafeApi } from '../api/client';
import './MapPage.css';

type ViewMode = 'map' | 'list';

interface SearchResult {
  google_place_id: string;
  is_registered: boolean;
  db_cafe_id?: number;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  distance?: string;
  rating?: number;
  average_wfc_rating?: number;
  total_reviews?: number;
  total_visits?: number;
  source: 'google';
  result_type: 'cafe' | 'location';
}

const MapPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [showAddVisitReview, setShowAddVisitReview] = useState(false);
  const [visitCafe, setVisitCafe] = useState<Cafe | undefined>(undefined);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [tempSearchMarker, setTempSearchMarker] = useState<SearchResult | null>(null);
  const [jumpToLocation, setJumpToLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [manualSearchCenter, setManualSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const resultModal = useResultModal();
  const { activePanel } = usePanel();

  const { location, error: locationError, loading: locationLoading } = useGeolocation();

  // Close CafeDetailSheet when any panel opens
  React.useEffect(() => {
    if (activePanel) {
      setSelectedCafe(null);
    }
  }, [activePanel]);

  // Handle cafe query parameter (from activity clicks)
  React.useEffect(() => {
    const cafeId = searchParams.get('cafe');
    if (cafeId && !activePanel) {
      const fetchAndJumpToCafe = async () => {
        try {
          const cafe = await cafeApi.getById(parseInt(cafeId));
          // Jump to cafe location
          setJumpToLocation({ lat: cafe.latitude, lng: cafe.longitude });

          // Create temp marker to ensure cafe is visible
          // If cafe is already in nearby list, MapView will handle showing it
          setTempSearchMarker({
            google_place_id: cafe.google_place_id || '',
            is_registered: true,
            db_cafe_id: cafe.id,
            name: cafe.name,
            address: cafe.address,
            latitude: cafe.latitude.toString(),
            longitude: cafe.longitude.toString(),
            rating: cafe.google_rating,
            average_wfc_rating: cafe.average_wfc_rating,
            total_reviews: cafe.total_reviews,
            total_visits: cafe.total_visits,
            source: 'google',
            result_type: 'cafe',
          });

          // Clear query param
          setSearchParams({});
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Failed to jump to cafe from activity:', error);
          }
          resultModal.showResultModal({
            type: 'error',
            title: 'Cafe Not Found',
            message: 'Failed to open the selected cafe. It may have been removed.',
          });
          setSearchParams({});
        }
      };
      fetchAndJumpToCafe();
    }
  }, [searchParams, activePanel, setSearchParams, resultModal]);

  const searchCenter = manualSearchCenter || location;
  const {
    cafes,
    loading: loadingCafes,
    error: cafesError,
    refetch: refetchCafes,
    searchCenter: activeSearchCenter,
  } = useNearbyCafes({
    latitude: searchCenter?.lat || 0,
    longitude: searchCenter?.lng || 0,
    enabled: !!searchCenter,
    // Pass user's actual location for distance calculation
    userLatitude: location?.lat,
    userLongitude: location?.lng,
  });

  const handleSearchArea = (center: { lat: number; lng: number }) => {
    setManualSearchCenter(center);
  };

  const handleCafeClick = React.useCallback((cafe: Cafe) => {
    setSelectedCafe(cafe);
  }, []);

  const handleCloseSheet = () => {
    setSelectedCafe(null);
  };

  const handleLogVisit = () => {
    if (selectedCafe) {
      setVisitCafe(selectedCafe); // Save cafe for visit modal
    }
    setShowAddVisitReview(true);
    setSelectedCafe(null); // Close cafe detail sheet for clean modal transition
  };

  const handleVisitReviewSuccess = () => {
    setShowAddVisitReview(false);
    setVisitCafe(undefined);
    setSelectedCafe(null);
    setTempSearchMarker(null); // Clear temp marker after successful visit

    // Refetch cafes to update markers with new visit count and review/rating
    // React Query will automatically update related queries
    refetchCafes();

    resultModal.showResultModal({
      type: 'success',
      title: 'Visit Logged!',
      message: 'Your visit has been recorded successfully.',
      autoClose: true,
      autoCloseDelay: 2000,
    });
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'map' ? 'list' : 'map');
  };

  const handleSearchSelect = (result: SearchResult) => {
    const lat = parseFloat(result.latitude);
    const lng = parseFloat(result.longitude);

    // Jump map to selected location
    setJumpToLocation({ lat, lng });

    // If it's a location (not a cafe), just pan - no marker
    if (result.result_type === 'location') {
      return;
    }

    // For cafes - ALWAYS show marker, DON'T auto-open detail sheet
    if (result.is_registered && result.db_cafe_id) {
      // Registered cafe - check if it's already in nearby list
      const existingCafe = cafes.find(c => c.id === result.db_cafe_id);

      if (!existingCafe) {
        // Cafe not in nearby list (far from current location)
        // Create temp marker so user can click it to open detail sheet
        // Keep SearchResult shape for consistency
        setTempSearchMarker(result);
      }
      // If cafe is in nearby list, marker already exists - just pan to it
      // User can click the marker to open detail sheet
    } else {
      // New cafe from Google - show temporary marker
      setTempSearchMarker(result);
    }
  };

  return (
    <MobileLayout>
      <div className="map-page">
        {/* Header with view toggle */}
        <div className="map-header">
          <h1 className="page-title">Can-It-WFC</h1>
          <button
            className="view-toggle"
            onClick={toggleViewMode}
            aria-label={`Switch to ${viewMode === 'map' ? 'list' : 'map'} view`}
          >
            {viewMode === 'map' ? (
              <>
                <List size={20} />
                <span>List</span>
              </>
            ) : (
              <>
                <MapIcon size={20} />
                <span>Map</span>
              </>
            )}
          </button>
        </div>

        {/* Location error */}
        {locationError && (
          <div className="location-error">
            <AlertCircle size={20} />
            <div>
              <p className="error-title">Location access needed</p>
              <p className="error-message">{locationError}</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {locationLoading && (
          <Loading fullScreen message="Getting your location..." />
        )}

        {/* Map view */}
        {viewMode === 'map' && !locationLoading && (
          <div className="map-view-container">
            <MapView
              cafes={cafes}
              loading={loadingCafes}
              error={cafesError}
              searchCenter={activeSearchCenter}
              onCafeClick={handleCafeClick}
              onSearchArea={handleSearchArea}
              userLocation={location}
              jumpToLocation={jumpToLocation}
              tempSearchMarker={tempSearchMarker}
              onSearchClick={() => setShowSearchOverlay(true)}
            />
          </div>
        )}

        {/* List view */}
        {viewMode === 'list' && !locationLoading && (
          <div className="list-view-container">
            <CafeList
              cafes={cafes}
              loading={loadingCafes}
              error={cafesError}
              onCafeClick={handleCafeClick}
              userLocation={location}
            />
          </div>
        )}

        {/* Cafe Detail Sheet */}
        {selectedCafe && (
          <CafeDetailSheet
            cafe={selectedCafe}
            isOpen={!!selectedCafe}
            onClose={handleCloseSheet}
            onLogVisit={handleLogVisit}
          />
        )}

        {/* Add Visit + Review Modal (Combined) */}
        <AddVisitReviewModal
          isOpen={showAddVisitReview}
          onClose={() => {
            setShowAddVisitReview(false);
            setVisitCafe(undefined); // Clear visit cafe on close
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

        {/* Search Overlay */}
        <SearchOverlay
          isOpen={showSearchOverlay}
          onClose={() => setShowSearchOverlay(false)}
          onSelectResult={handleSearchSelect}
          userLocation={location ? { lat: location.lat, lon: location.lng } : undefined}
        />
      </div>
      {activePanel && <PanelManager />}
    </MobileLayout>
  );
};

export default MapPage;