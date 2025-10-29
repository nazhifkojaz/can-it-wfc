import React, { useState } from 'react';
import { AlertCircle, List, Map as MapIcon } from 'lucide-react';
import MobileLayout from '../components/layout/MobileLayout';
import MapView from '../components/map/MapView';
import CafeList from '../components/cafe/CafeList';
import CafeDetailSheet from '../components/cafe/CafeDetailSheet';
import AddVisitModal from '../components/visit/AddVisitModal';
import ReviewForm from '../components/review/ReviewForm';
import { Loading } from '../components/common';
import { useGeolocation, useNearbyCafes } from '../hooks';
import { Cafe } from '../types';
import './MapPage.css';

type ViewMode = 'map' | 'list';

const MapPage: React.FC = () => {
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [visitCafe, setVisitCafe] = useState<Cafe | undefined>(undefined);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewVisitId, setReviewVisitId] = useState<number | null>(null);
  const [reviewCafeId, setReviewCafeId] = useState<number | null>(null);
  const [reviewCafeName, setReviewCafeName] = useState<string>('');

  const [manualSearchCenter, setManualSearchCenter] = useState<{ lat: number; lng: number } | null>(null);

  const { location, error: locationError, loading: locationLoading } = useGeolocation();

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
  });

  const handleSearchArea = (center: { lat: number; lng: number }) => {
    setManualSearchCenter(center);
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
    setVisitCafe(undefined);
    setSelectedCafe(null);

    // Refetch cafes to update markers with new visit count
    // React Query will automatically update related queries
    refetchCafes();

    alert('✅ Visit logged successfully!');
  };

  const handleAddReview = (visitId: number, cafeId: number, cafeName: string) => {
    setReviewVisitId(visitId);
    setReviewCafeId(cafeId);
    setReviewCafeName(cafeName);
    setShowAddVisit(false);
    setVisitCafe(undefined);
    setShowReviewForm(true);
  };

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    setReviewVisitId(null);
    setReviewCafeId(null);
    setReviewCafeName('');

    // Refetch cafes to update markers with new review/rating
    refetchCafes();

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
              searchCenter={activeSearchCenter}
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
