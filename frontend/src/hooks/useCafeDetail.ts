/**
 * Custom hook for managing cafe detail state.
 *
 * Encapsulates:
 * - Syncing with initial cafe prop
 * - Refreshing data for registered cafes
 * - Distance calculation from user location
 * - Staleness detection and background refresh for Google ratings
 */

import { useState, useEffect, useCallback } from 'react';
import { Cafe } from '../types';
import { cafeApi } from '../api/client';
import { calculateDistance, isGoogleRatingStale } from '../utils/calculations';
import { logger } from '../utils/logger';

/**
 * Check if cafe has a valid database ID (positive integer).
 * Unregistered cafes have string IDs like "google_..." which should be rejected.
 */
const isValidCafeId = (id: unknown): id is number => {
  return typeof id === 'number' && id > 0;
};

interface UseCafeDetailOptions {
  /** Initial cafe data (from parent component) */
  initialCafe: Cafe;
  /** Whether the detail view is open (triggers refresh) */
  isOpen: boolean;
  /** User's current location for distance calculation */
  userLocation?: { lat: number; lng: number } | null;
}

interface UseCafeDetailResult {
  /** Current cafe data (may be refreshed from API) */
  cafe: Cafe;
  /** Whether cafe data is being refreshed */
  isRefreshing: boolean;
  /** Whether Google rating is being refreshed in background */
  isRefreshingRating: boolean;
  /** Whether Google rating is stale (older than 24 hours) */
  isRatingStale: boolean;
  /** Error message if refresh failed */
  error: string | null;
  /** Manually trigger a refresh */
  refreshCafe: () => Promise<void>;
  /** Manually trigger Google rating refresh */
  refreshGoogleRating: () => Promise<void>;
}

export const useCafeDetail = ({
  initialCafe,
  isOpen,
  userLocation,
}: UseCafeDetailOptions): UseCafeDetailResult => {
  const [cafe, setCafe] = useState<Cafe>(initialCafe);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingRating, setIsRefreshingRating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if Google rating is stale
  const isRatingStale = isGoogleRatingStale(cafe.google_rating_updated_at);

  // Sync with initialCafe changes (e.g., when selecting different cafe)
  useEffect(() => {
    setCafe(initialCafe);
    setError(null);
  }, [initialCafe]);

  // Refresh cafe data for registered cafes when sheet opens
  useEffect(() => {
    const refreshCafeData = async () => {
      // Only refresh registered cafes with valid IDs
      if (!isOpen || !initialCafe.is_registered || !isValidCafeId(initialCafe.id)) {
        return;
      }

      setIsRefreshing(true);
      setError(null);

      try {
        const freshCafe = await cafeApi.getById(initialCafe.id);
        setCafe(prev => ({
          ...freshCafe,
          // Preserve frontend-computed distance
          distance: prev.distance,
        }));
      } catch (err) {
        logger.error('Error refreshing cafe data', err, 'useCafeDetail');
        setError('Failed to refresh cafe data');
        // Keep using existing cafe data on error
      } finally {
        setIsRefreshing(false);
      }
    };

    refreshCafeData();
  }, [isOpen, initialCafe.id, initialCafe.is_registered]);

  // Background refresh for stale Google ratings
  useEffect(() => {
    let cancelled = false;

    const refreshGoogleRatingInBackground = async () => {
      // Only refresh if cafe has Google Place ID, is registered, and rating is stale
      if (!cafe.google_place_id || !cafe.is_registered || !isValidCafeId(cafe.id)) {
        return;
      }

      if (!isGoogleRatingStale(cafe.google_rating_updated_at)) {
        return; // Not stale, no need to refresh
      }

      // Trigger background refresh
      setIsRefreshingRating(true);

      try {
        const ratingData = await cafeApi.refreshGoogleRating(cafe.id);

        // Update cafe with fresh rating data (only if not cancelled)
        if (!cancelled) {
          setCafe(prev => ({
            ...prev,
            google_rating: ratingData.google_rating,
            google_ratings_count: ratingData.google_ratings_count,
            google_rating_updated_at: ratingData.google_rating_updated_at,
          }));
        }

        logger.info(`Refreshed Google rating for cafe ${cafe.id}`, {}, 'useCafeDetail');
      } catch (err) {
        // Silently fail - user still sees cached data
        logger.warn('Failed to refresh Google rating (cached data still shown)', { error: String(err) }, 'useCafeDetail');
      } finally {
        if (!cancelled) {
          setIsRefreshingRating(false);
        }
      }
    };

    // Add a small delay to not interfere with initial page load
    const timerId = setTimeout(() => {
      refreshGoogleRatingInBackground();
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [cafe.google_place_id, cafe.is_registered, cafe.id, cafe.google_rating_updated_at]);

  // Calculate distance if missing and user location available
  useEffect(() => {
    if (cafe.distance === undefined && userLocation) {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        parseFloat(String(cafe.latitude)),
        parseFloat(String(cafe.longitude))
      );
      setCafe(prev => ({
        ...prev,
        distance: distance,
      }));
    }
  }, [cafe.distance, cafe.latitude, cafe.longitude, userLocation]);

  // Manual refresh function
  const refreshCafe = useCallback(async () => {
    if (!cafe.is_registered || !isValidCafeId(cafe.id)) {
      return;
    }

    setIsRefreshing(true);
    setError(null);

    try {
      const freshCafe = await cafeApi.getById(cafe.id);
      setCafe(prev => ({
        ...freshCafe,
        distance: prev.distance,
      }));
    } catch (err) {
      logger.error('Error refreshing cafe', err, 'useCafeDetail');
      setError('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  }, [cafe.id, cafe.is_registered, cafe.distance]);

  // Manual Google rating refresh function
  const refreshGoogleRating = useCallback(async () => {
    if (!cafe.google_place_id || !isValidCafeId(cafe.id)) {
      return;
    }

    setIsRefreshingRating(true);

    try {
      const ratingData = await cafeApi.refreshGoogleRating(cafe.id);

      setCafe(prev => ({
        ...prev,
        google_rating: ratingData.google_rating,
        google_ratings_count: ratingData.google_ratings_count,
        google_rating_updated_at: ratingData.google_rating_updated_at,
      }));
    } catch (err) {
      logger.error('Error refreshing Google rating', err, 'useCafeDetail');
      setError('Failed to refresh Google rating');
    } finally {
      setIsRefreshingRating(false);
    }
  }, [cafe.google_place_id, cafe.id]);

  return {
    cafe,
    isRefreshing,
    isRefreshingRating,
    isRatingStale,
    error,
    refreshCafe,
    refreshGoogleRating,
  };
};
