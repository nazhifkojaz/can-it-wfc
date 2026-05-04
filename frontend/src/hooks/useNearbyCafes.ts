import { useQuery } from '@tanstack/react-query';
import { cafeApi } from '../api/client';
import { NearbyCafesResponse } from '../types';
import { CafeFilters } from '../types/filters';
import { filtersToApiParams } from '../lib/filterEncoding';
import { queryKeys } from '../config/queryKeys';

interface UseNearbyCafesParams {
  latitude: number;
  longitude: number;
  radius_km?: number;
  enabled?: boolean;
  userLatitude?: number;
  userLongitude?: number;
  filters?: CafeFilters;
}

export const useNearbyCafes = ({
  latitude,
  longitude,
  radius_km = 1,
  enabled = true,
  userLatitude,
  userLongitude,
  filters,
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
    queryKey: queryKeys.cafesNearby(roundedLat, roundedLng, radius_km, filters),
    queryFn: async () => {
      const filterParams = filters ? filtersToApiParams(filters) : {};
      const response = await cafeApi.getAllNearby({
        latitude: roundedLat,
        longitude: roundedLng,
        radius_km,
        limit: 100,
        user_latitude: roundedUserLat,
        user_longitude: roundedUserLng,
        ...filterParams,
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
