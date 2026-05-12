import { useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { userApi } from '../api/client';
import { queryKeys } from '../config/queryKeys';
import { extractApiError } from '../utils/errorUtils';

export function useSavedLists(opts?: { limit?: number }) {
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
    queryKey: queryKeys.savedLists(limit),
    queryFn: async ({ pageParam = 0 }) => {
      return userApi.getSavedLists(pageParam, limit);
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

  const lists = data?.pages.flatMap((p) => p.results) ?? [];

  const refetch = useCallback(() => {
    if (!isFetching) queryRefetch();
  }, [isFetching, queryRefetch]);

  return {
    lists,
    isLoading: loading,
    isLoadingMore: isFetchingNextPage,
    error: fetchError ? extractApiError(fetchError).message : null,
    refetch,
    loadMore: fetchNextPage,
    hasMore: hasNextPage,
  };
}
