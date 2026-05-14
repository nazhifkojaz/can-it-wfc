import { useCallback } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { discoverApi } from '../api/client';
import { queryKeys } from '../config/queryKeys';
import { extractApiError } from '../utils/errorUtils';

export function useRecentReviews(opts?: { limit?: number }) {
  const limit = opts?.limit ?? 20;

  const {
    data,
    isLoading: loading,
    error: fetchError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    refetch: queryRefetch,
  } = useInfiniteQuery({
    queryKey: queryKeys.discoverRecentReviews(limit),
    queryFn: async ({ pageParam = 0 }) => {
      return discoverApi.getRecentReviews(pageParam, limit);
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined;
      const url = new URL(lastPage.next);
      const offset = url.searchParams.get('offset');
      return offset ? parseInt(offset) : undefined;
    },
    initialPageParam: 0,
    staleTime: 0,
    structuralSharing: true,
  });

  const reviews = data?.pages.flatMap(p => p.results) ?? [];
  const trimmedReviews = reviews.length > 100 ? reviews.slice(0, 100) : reviews;

  const refetch = useCallback(() => {
    if (!isFetching) queryRefetch();
  }, [isFetching, queryRefetch]);

  return {
    reviews: trimmedReviews,
    isLoading: loading,
    isLoadingMore: isFetchingNextPage,
    error: fetchError ? extractApiError(fetchError).message : null,
    refetch,
    loadMore: fetchNextPage,
    hasMore: hasNextPage,
  };
}

export function useFeaturedLists(opts?: { limit?: number }) {
  const limit = opts?.limit ?? 6;

  const {
    data,
    isLoading: loading,
    error: fetchError,
    isFetching,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: queryKeys.discoverFeaturedLists(limit),
    queryFn: () => discoverApi.getFeaturedLists(limit),
    staleTime: 5 * 60 * 1000,
  });

  const refetch = useCallback(() => {
    if (!isFetching) queryRefetch();
  }, [isFetching, queryRefetch]);

  return {
    lists: data?.lists ?? [],
    isLoading: loading,
    error: fetchError ? extractApiError(fetchError).message : null,
    refetch,
  };
}

export function useTrendingCafes(opts?: { days?: number; limit?: number }) {
  const days = opts?.days ?? 7;
  const limit = opts?.limit ?? 5;

  const {
    data,
    isLoading: loading,
    error: fetchError,
    isFetching,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: queryKeys.discoverTrending(days, limit),
    queryFn: () => discoverApi.getTrendingCafes(days, limit),
    staleTime: 15 * 60 * 1000,
  });

  const refetch = useCallback(() => {
    if (!isFetching) queryRefetch();
  }, [isFetching, queryRefetch]);

  return {
    cafes: data?.cafes ?? [],
    isLoading: loading,
    error: fetchError ? extractApiError(fetchError).message : null,
    refetch,
  };
}

export function useTrendingLists(opts?: { days?: number; limit?: number }) {
  const days = opts?.days ?? 30;
  const limit = opts?.limit ?? 6;

  const {
    data,
    isLoading: loading,
    error: fetchError,
    isFetching,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: queryKeys.discoverTrendingLists(days, limit),
    queryFn: () => discoverApi.getTrendingLists(days, limit),
    staleTime: 15 * 60 * 1000,
  });

  const refetch = useCallback(() => {
    if (!isFetching) queryRefetch();
  }, [isFetching, queryRefetch]);

  return {
    lists: data?.lists ?? [],
    isLoading: loading,
    error: fetchError ? extractApiError(fetchError).message : null,
    refetch,
  };
}
