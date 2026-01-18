/**
 * Custom hook for managing cafe detail state.
 *
 * Encapsulates:
 * - Syncing with initial cafe prop
 * - Refreshing data for registered cafes
 * - Distance calculation from user location
 */

import { useState, useEffect, useCallback } from 'react';
import { Cafe } from '../types';
import { cafeApi } from '../api/client';
import { calculateDistance } from '../utils/calculations';

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
  /** Error message if refresh failed */
  error: string | null;
  /** Manually trigger a refresh */
  refreshCafe: () => Promise<void>;
}

export const useCafeDetail = ({
  initialCafe,
  isOpen,
  userLocation,
}: UseCafeDetailOptions): UseCafeDetailResult => {
  const [cafe, setCafe] = useState<Cafe>(initialCafe);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with initialCafe changes (e.g., when selecting different cafe)
  useEffect(() => {
    setCafe(initialCafe);
    setError(null);
  }, [initialCafe]);

  // Refresh cafe data for registered cafes when sheet opens
  useEffect(() => {
    const refreshCafeData = async () => {
      // Only refresh registered cafes with valid IDs
      if (!isOpen || !initialCafe.is_registered || !initialCafe.id || initialCafe.id <= 0) {
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
        if (import.meta.env.DEV) {
          console.error('Error refreshing cafe data:', err);
        }
        setError('Failed to refresh cafe data');
        // Keep using existing cafe data on error
      } finally {
        setIsRefreshing(false);
      }
    };

    refreshCafeData();
  }, [isOpen, initialCafe.id, initialCafe.is_registered]);

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
    if (!cafe.is_registered || !cafe.id || cafe.id <= 0) {
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
      if (import.meta.env.DEV) {
        console.error('Error refreshing cafe:', err);
      }
      setError('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  }, [cafe.id, cafe.is_registered]);

  return {
    cafe,
    isRefreshing,
    error,
    refreshCafe,
  };
};
