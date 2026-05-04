import { useState, useEffect, useRef } from 'react';
import { cafeApi } from '../api/client';
import { CafeFilters } from '../types/filters';
import { filtersToApiParams } from '../lib/filterEncoding';

interface UseFilterMatchCountParams {
  latitude: number;
  longitude: number;
  radius_km?: number;
  filters: CafeFilters;
  enabled: boolean;
}

export function useFilterMatchCount({
  latitude,
  longitude,
  radius_km = 1,
  filters,
  enabled,
}: UseFilterMatchCountParams) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const controllerRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    if (!enabled || !latitude || !longitude) {
      setCount(null);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      controllerRef.current?.abort();
      controllerRef.current = new AbortController();

      setLoading(true);
      try {
        const filterParams = filtersToApiParams(filters);
        const result = await cafeApi.getNearbyCount(
          { latitude, longitude, radius_km, ...filterParams },
          controllerRef.current.signal,
        );
        setCount(result.count);
      } catch (err: any) {
        if (err?.name !== 'AbortError' && err?.name !== 'CanceledError') {
          setCount(null);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(debounceRef.current);
      controllerRef.current?.abort();
    };
  }, [latitude, longitude, radius_km, enabled,
    filters.min_wifi, filters.max_noise, filters.min_power,
    filters.min_seating, filters.min_wfc,
    JSON.stringify(filters.price),
    filters.hide_closed, filters.verified, filters.min_reviews,
  ]);

  return { count, loading };
}
