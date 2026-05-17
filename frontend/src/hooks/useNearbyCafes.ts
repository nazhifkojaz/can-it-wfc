import { useQuery } from '@tanstack/react-query';
import { cafeApi } from '../api/client';
import { NearbyCafesResponse } from '../types';
import { CafeFilters } from '../types/filters';
import { filtersToApiParams } from '../lib/filterEncoding';
import { normalizeNearbyCoordinate, queryKeys } from '../config/queryKeys';

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
  const searchLat = normalizeNearbyCoordinate(latitude);
  const searchLng = normalizeNearbyCoordinate(longitude);
  const searchUserLat = userLatitude != null ? normalizeNearbyCoordinate(userLatitude) : undefined;
  const searchUserLng = userLongitude != null ? normalizeNearbyCoordinate(userLongitude) : undefined;

  const {
    data,
    isLoading: loading,
    error: fetchError,
    refetch,
  } = useQuery<NearbyCafesResponse>({
    queryKey: queryKeys.cafesNearby(
      searchLat,
      searchLng,
      radius_km,
      filters,
      searchUserLat,
      searchUserLng,
    ),
    queryFn: async () => {
      const filterParams = filters ? filtersToApiParams(filters) : {};
      const response = await cafeApi.getAllNearby({
        latitude: searchLat,
        longitude: searchLng,
        radius_km,
        limit: 100,
        user_latitude: searchUserLat,
        user_longitude: searchUserLng,
        ...filterParams,
      });

      return response;
    },
    enabled: enabled && Number.isFinite(latitude) && Number.isFinite(longitude),
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
    searchCenter: enabled && Number.isFinite(latitude) && Number.isFinite(longitude) ? { lat: searchLat, lng: searchLng } : null,
  };
};
