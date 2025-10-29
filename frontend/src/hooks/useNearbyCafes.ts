import { useQuery } from '@tanstack/react-query';
import { cafeApi } from '../api/client';
import { Cafe } from '../types';
import { queryKeys } from '../config/queryKeys';

interface UseNearbyCafesParams {
  latitude: number;
  longitude: number;
  radius_km?: number;
  enabled?: boolean;
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
}: UseNearbyCafesParams) => {
  const roundedLat = Number(latitude.toFixed(8));
  const roundedLng = Number(longitude.toFixed(8));

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
      });

      console.log(
        `Loaded ${response.registered_count} registered + ` +
        `${response.unregistered_count} unregistered cafes at (${roundedLat}, ${roundedLng})`
      );

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
