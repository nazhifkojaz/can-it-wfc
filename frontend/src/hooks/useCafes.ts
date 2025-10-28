/**
 * Custom hook for managing cafes
 */

import { useState, useEffect, useCallback } from 'react';
import { cafeApi } from '../api/client';
import { Cafe, NearbyCafesParams } from '../types';

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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch cafes');
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search cafes');
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

export const useNearbyCafes = (params?: NearbyCafesParams) => {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNearbyCafes = useCallback(async (searchParams: NearbyCafesParams) => {
    setLoading(true);
    setError(null);

    try {
      const data = await cafeApi.getNearby(searchParams);
      setCafes(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch nearby cafes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (params?.latitude && params?.longitude) {
      fetchNearbyCafes(params);
    }
  }, [params, fetchNearbyCafes]);

  const refetch = useCallback(() => {
    if (params?.latitude && params?.longitude) {
      fetchNearbyCafes(params);
    }
  }, [params, fetchNearbyCafes]);

  return {
    cafes,
    loading,
    error,
    refetch,
    fetchNearbyCafes,
  };
};

export const useCafe = (cafeId?: number) => {
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCafe = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);

    try {
      const data = await cafeApi.getById(id);
      setCafe(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch cafe');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cafeId) {
      fetchCafe(cafeId);
    }
  }, [cafeId, fetchCafe]);

  const refetch = useCallback(() => {
    if (cafeId) {
      fetchCafe(cafeId);
    }
  }, [cafeId, fetchCafe]);

  return {
    cafe,
    loading,
    error,
    refetch,
    fetchCafe,
  };
};
