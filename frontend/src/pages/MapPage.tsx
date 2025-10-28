import React, { useState, useEffect } from 'react';
import { AlertCircle, List, Map as MapIcon } from 'lucide-react';
import MobileLayout from '../components/layout/MobileLayout';
import MapView from '../components/map/MapView';
import CafeList from '../components/cafe/CafeList';
import CafeDetailSheet from '../components/cafe/CafeDetailSheet';
import AddVisitModal from '../components/visit/AddVisitModal';
import ReviewForm from '../components/review/ReviewForm';
import { Loading } from '../components/common';
import { useGeolocation } from '../hooks';
import { Cafe } from '../types';
import { cafeApi } from '../api/client';
import './MapPage.css';

type ViewMode = 'map' | 'list';

const MapPage: React.FC = () => {
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [visitCafe, setVisitCafe] = useState<Cafe | undefined>(undefined); // Cafe to log visit for
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewVisitId, setReviewVisitId] = useState<number | null>(null);
  const [reviewCafeId, setReviewCafeId] = useState<number | null>(null);
  const [reviewCafeName, setReviewCafeName] = useState<string>('');

  // Shared cafe data state
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loadingCafes, setLoadingCafes] = useState(false);
  const [cafesError, setCafesError] = useState<string | null>(null);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);

  const { location, error: locationError, loading: locationLoading } = useGeolocation();

  // Fetch nearby cafes (shared by both map and list views)
  const fetchNearbyCafes = async (center: { lat: number; lng: number }, signal?: AbortSignal) => {
    setLoadingCafes(true);
    setCafesError(null);

    // Round coordinates to 8 decimal places to match backend validation
    // Backend expects: latitude (max_digits=10, decimal_places=8), longitude (max_digits=11, decimal_places=8)
    const latitude = Number(center.lat.toFixed(8));
    const longitude = Number(center.lng.toFixed(8));

    try {
      const response = await cafeApi.getAllNearby({
        latitude,
        longitude,
        radius_km: 1,
        limit: 100,
      }, signal);

      if (!signal?.aborted) {
        setCafes(response.results);
        // Store rounded coordinates as search center
        setSearchCenter({ lat: latitude, lng: longitude });
        console.log(
          `Loaded ${response.registered_count} registered + ` +
          `${response.unregistered_count} unregistered cafes at (${latitude}, ${longitude})`
        );
      }
    } catch (err: any) {
      if (!signal?.aborted) {
        console.error('Error fetching nearby cafes:', err);
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          setCafesError('Failed to load nearby cafes');
          setCafes([]);
        }
      }
    } finally {
      if (!signal?.aborted) {
        setLoadingCafes(false);
      }
    }
  };

  // Initial fetch when user location is available
  useEffect(() => {
    if (!location) {
      setCafes([]);
      setSearchCenter(null);
      return;
    }

    const abortController = new AbortController();

    fetchNearbyCafes(location, abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [location?.lat, location?.lng]);

  // Handle search area request from map
  const handleSearchArea = (center: { lat: number; lng: number }) => {
    fetchNearbyCafes(center);
  };

  const handleCafeClick = (cafe: Cafe) => {
    setSelectedCafe(cafe);
  };

  const handleCloseSheet = () => {
    setSelectedCafe(null);
  };

  const handleLogVisit = () => {
    if (selectedCafe) {
      setVisitCafe(selectedCafe); // Save cafe for visit modal
    }
    setShowAddVisit(true);
    setSelectedCafe(null); // Close cafe detail sheet for clean modal transition
  };

  const handleVisitSuccess = () => {
    setShowAddVisit(false);
    setVisitCafe(undefined); // Clear visit cafe
    setSelectedCafe(null);

    // Refetch cafes to update markers with new visit count
    if (searchCenter) {
      fetchNearbyCafes(searchCenter);
    }

    // Show success message
    alert('✅ Visit logged successfully!');
  };

  const handleAddReview = (visitId: number, cafeId: number, cafeName: string) => {
    setReviewVisitId(visitId);
    setReviewCafeId(cafeId);
    setReviewCafeName(cafeName);
    setShowAddVisit(false);
    setVisitCafe(undefined); // Clear visit cafe when opening review form
    setShowReviewForm(true);
  };

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    setReviewVisitId(null);
    setReviewCafeId(null);
    setReviewCafeName('');

    // Refetch cafes to update markers with new review/rating
    if (searchCenter) {
      fetchNearbyCafes(searchCenter);
    }

    // Show success message
    alert('✅ Review submitted successfully!');
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'map' ? 'list' : 'map');
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
              searchCenter={searchCenter}
              onCafeClick={handleCafeClick}
              onSearchArea={handleSearchArea}
              userLocation={location}
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
      </div>
    </MobileLayout>
  );
};

export default MapPage;
