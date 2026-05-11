/**
 * Custom hook for managing cafes
 */

import { useState, useEffect, useCallback } from 'react';
import { cafeApi } from '../api/client';
import { Cafe } from '../types';
import { extractApiError } from '../utils/errorUtils';

interface UseCafesOptions {
  autoFetch?: boolean;
  searchQuery?: string;
  ordering?: string;
}

export const useCafes = (options?: UseCafesOptions) => {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCafes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await cafeApi.getAll({
        search: options?.searchQuery,
        ordering: options?.ordering,
      });
      setCafes(data);
    } catch (err: unknown) {
      setError(extractApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [options?.searchQuery, options?.ordering]);

  useEffect(() => {
    if (options?.autoFetch !== false) {
      fetchCafes();
    }
  }, [fetchCafes, options?.autoFetch]);

  const refetch = useCallback(() => {
    fetchCafes();
  }, [fetchCafes]);

  const searchCafes = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await cafeApi.search(query);
      setCafes(data);
    } catch (err: unknown) {
      setError(extractApiError(err).message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    cafes,
    loading,
    error,
    refetch,
    searchCafes,
  };
};
