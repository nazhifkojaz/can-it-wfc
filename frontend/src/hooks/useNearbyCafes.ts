import { useQuery } from '@tanstack/react-query';
import { cafeApi } from '../api/client';
import { Cafe } from '../types';
import { queryKeys } from '../config/queryKeys';

interface UseNearbyCafesParams {
  latitude: number;       // Search center latitude
  longitude: number;      // Search center longitude
  radius_km?: number;
  enabled?: boolean;
  userLatitude?: number;  // User's actual location (for distance calculation)
  userLongitude?: number; // User's actual location (for distance calculation)
}

interface NearbyCafesResponse {
  results: Cafe[];
  registered_count: number;
  unregistered_count: number;
}

export const useNearbyCafes = ({
  latitude,
  longitude,
  radius_km = 1,
  enabled = true,
  userLatitude,
  userLongitude,
}: UseNearbyCafesParams) => {
  const roundedLat = Number(latitude.toFixed(8));
  const roundedLng = Number(longitude.toFixed(8));
  const roundedUserLat = userLatitude ? Number(userLatitude.toFixed(8)) : undefined;
  const roundedUserLng = userLongitude ? Number(userLongitude.toFixed(8)) : undefined;

  const {
    data,
    isLoading: loading,
    error: fetchError,
    refetch,
  } = useQuery<NearbyCafesResponse>({
    queryKey: queryKeys.cafesNearby(roundedLat, roundedLng, radius_km),
    queryFn: async () => {
      const response = await cafeApi.getAllNearby({
        latitude: roundedLat,
        longitude: roundedLng,
        radius_km,
        limit: 100,
        user_latitude: roundedUserLat,
        user_longitude: roundedUserLng,
      });

      return response;
    },
    enabled: enabled && !!latitude && !!longitude,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  return {
    cafes: data?.results || [],
    registeredCount: data?.registered_count || 0,
    unregisteredCount: data?.unregistered_count || 0,
    loading,
    error: fetchError ? String(fetchError) : null,
    refetch,
    searchCenter: latitude && longitude ? { lat: roundedLat, lng: roundedLng } : null,
  };
};
