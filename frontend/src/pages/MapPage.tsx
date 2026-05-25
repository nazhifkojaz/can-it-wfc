import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, List, Map as MapIcon, RefreshCw } from 'lucide-react';
import MobileLayout from '../components/layout/MobileLayout';
import MapView from '../components/map/MapView';
import CafeList from '../components/cafe/CafeList';
import CafeDetailSheet from '../components/cafe/CafeDetailSheet';
import AddVisitReviewModal from '../components/visit/AddVisitReviewModal';
import { SharedResultModal } from '../components/common';
import { SearchOverlay } from '../components/map/SearchOverlay';
import { FilterPanelTrigger } from '../components/map/FilterPanelTrigger';
import { FilterPanel } from '../components/map/FilterPanel';
import { ActiveFilterChips } from '../components/map/ActiveFilterChips';
import { useGeolocation, useNearbyCafes, useResultModal, useMapFilters } from '../hooks';
import { Cafe, SearchResult } from '../types';
import PanelManager from '../components/panels/PanelManager';
import { usePanel } from '../contexts/PanelContext';
import { cafeApi } from '../api/client';
import { logger } from '../utils/logger';

import { getActiveChips } from '../lib/filterEncoding';
import './MapPage.css';

const MapPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showAddVisitReview, setShowAddVisitReview] = useState(false);
  const [visitCafe, setVisitCafe] = useState<Cafe | undefined>(undefined);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [tempSearchMarker, setTempSearchMarker] = useState<SearchResult | null>(null);
  const [jumpToLocation, setJumpToLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [nearbySearchCenter, setNearbySearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [searchAfterLocationRefetch, setSearchAfterLocationRefetch] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const resultModal = useResultModal();
  const { activePanel } = usePanel();
  const { filters, appliedFilters, setFilter, applyFilters, resetAll, clearOne, syncPending } = useMapFilters();

  const { location, error: locationError, loading: locationLoading, refetch } = useGeolocation({ watch: false });

  const searchUserLocation = useMemo(
    () => location ? { lat: location.lat, lon: location.lng } : undefined,
    [location?.lat, location?.lng]
  );

  // Close CafeDetailSheet when any panel opens
  React.useEffect(() => {
    if (activePanel) {
      setSelectedCafe(null);
    }
  }, [activePanel]);

  React.useEffect(() => {
    if (!nearbySearchCenter && location) {
      setNearbySearchCenter(location);
    }
  }, [nearbySearchCenter, location]);

  React.useEffect(() => {
    if (!searchAfterLocationRefetch || locationLoading) return;

    if (location) {
      setNearbySearchCenter(location);
    }
    setSearchAfterLocationRefetch(false);
  }, [searchAfterLocationRefetch, locationLoading, location]);

  const handleRetryLocation = React.useCallback(() => {
    setSearchAfterLocationRefetch(true);
    refetch();
  }, [refetch]);

  // Handle cafe query parameter from profile/list/deep links.
  React.useEffect(() => {
    const cafeId = searchParams.get('cafe');
    if (cafeId && !activePanel) {
      const fetchAndJumpToCafe = async () => {
        try {
          const cafe = await cafeApi.getById(parseInt(cafeId));
          // Jump to cafe location
          setJumpToLocation({ lat: parseFloat(cafe.latitude), lng: parseFloat(cafe.longitude) });

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
            rating: cafe.google_rating ?? undefined,
            place_category: cafe.place_category,
            place_category_label: cafe.place_category_label,
            place_category_confidence: cafe.place_category_confidence,
            provider_types: cafe.provider_types,
            average_wfc_rating: cafe.average_wfc_rating ? parseFloat(String(cafe.average_wfc_rating)) : undefined,
            total_reviews: cafe.total_reviews,
            total_visits: cafe.total_visits,
            source: 'google',
            result_type: 'cafe',
          });

          // Clear only the cafe param, preserve filter params
          setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete('cafe'); return n; }, { replace: true });
        } catch (error) {
          logger.error('Failed to jump to selected cafe', error, 'MapPage');
          resultModal.showResultModal({
            type: 'error',
            title: 'Cafe Not Found',
            message: 'Failed to open the selected cafe. It may have been removed.',
          });
          setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete('cafe'); return n; }, { replace: true });
        }
      };
      fetchAndJumpToCafe();
    }
  }, [searchParams, activePanel, setSearchParams, resultModal]);

  const searchCenter = nearbySearchCenter;
  const {
    cafes,
    loading: loadingCafes,
    error: cafesError,
    refetch: refetchCafes,
    searchCenter: activeSearchCenter,
  } = useNearbyCafes({
    latitude: searchCenter?.lat ?? 0,
    longitude: searchCenter?.lng ?? 0,
    enabled: searchCenter != null,
    userLatitude: location?.lat,
    userLongitude: location?.lng,
    filters: appliedFilters,
  });

  const searchOverlayCenter = useMemo(
    () => activeSearchCenter ?? searchCenter ?? undefined,
    [activeSearchCenter?.lat, activeSearchCenter?.lng, searchCenter?.lat, searchCenter?.lng]
  );

  // Sync selectedCafe with cafes array when data refreshes (e.g. after registration)
  React.useEffect(() => {
    if (!selectedCafe || !cafes.length) return;

    // Try matching by id first (most common case)
    const idMatch = cafes.find(c => c.id === selectedCafe.id);
    if (idMatch) {
      // Only update if the cafe data actually changed
      if (idMatch !== selectedCafe) {
        setSelectedCafe(idMatch);
      }
      return;
    }

    // If not found by id, try matching by google_place_id
    // This handles the case where an unregistered cafe gets registered (id changes)
    if (selectedCafe.google_place_id) {
      const placeMatch = cafes.find(c => c.google_place_id === selectedCafe.google_place_id);
      if (placeMatch) {
        setSelectedCafe(placeMatch);

        // Clear tempSearchMarker since the cafe is now in the nearby list
        setTempSearchMarker(prev => {
          if (prev?.google_place_id === selectedCafe.google_place_id) return null;
          return prev;
        });
      }
    }
  }, [cafes, selectedCafe]);

  const handleSearchArea = (center: { lat: number; lng: number }) => {
    setNearbySearchCenter(center);
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
    // Note: success feedback is handled by AddVisitReviewModal's own result modal
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'map' ? 'list' : 'map');
  };

  const handleSearchSelect = (result: SearchResult) => {
    const lat = parseFloat(result.latitude);
    const lng = parseFloat(result.longitude);
    const selectedLocation = { lat, lng };

    // Jump map to selected location
    setJumpToLocation(selectedLocation);

    // If it's a location (not a cafe), just pan - no marker
    if (result.result_type === 'location') {
      setNearbySearchCenter(selectedLocation);
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
          <div className="header-actions">
            <FilterPanelTrigger
              activeCount={getActiveChips(appliedFilters).length}
              onClick={() => { syncPending(); setShowFilterPanel(true); }}
            />
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
        </div>

        {/* Active filter chips strip */}
        <ActiveFilterChips filters={appliedFilters} onClear={clearOne} />

        {/* Location error - show non-intrusive banner */}
        {locationError && (
          <div className="location-error">
            <AlertCircle size={20} />
            <div>
              <p className="error-title">Location access needed</p>
              <p className="error-message">{locationError}</p>
            </div>
            <button
              onClick={handleRetryLocation}
              className="location-error-retry"
              aria-label="Retry location"
            >
              <RefreshCw size={18} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Location loading - show subtle indicator, don't block UI */}
        {locationLoading && !locationError && (
          <div className="location-loading">
            <div className="location-loading-content">
              <div className="location-loading-spinner"></div>
              <span>Waiting for location permission...</span>
            </div>
          </div>
        )}

        {/* Map view - render immediately, don't wait for location */}
        {viewMode === 'map' && (
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
              onRetryLocation={handleRetryLocation}
            />
          </div>
        )}

        {/* List view - render immediately, don't wait for location */}
        {viewMode === 'list' && (
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

        <SharedResultModal resultModal={resultModal} />

        {/* Search Overlay */}
        <SearchOverlay
          isOpen={showSearchOverlay}
          onClose={() => setShowSearchOverlay(false)}
          onSelectResult={handleSearchSelect}
          userLocation={searchUserLocation}
          searchCenter={searchOverlayCenter}
        />
      </div>
      {activePanel && <PanelManager />}

      {showFilterPanel && (
        <FilterPanel
          filters={filters}
          setFilter={setFilter}
          resetAll={resetAll}
          onApply={applyFilters}
          onClose={() => setShowFilterPanel(false)}
        />
      )}
    </MobileLayout>
  );
};

export default MapPage;
