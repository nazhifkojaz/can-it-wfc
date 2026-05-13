import { useInfiniteQuery } from '@tanstack/react-query';
import { reviewApi } from '../api/client';
import { Review, PaginatedResponse } from '../types';
import { queryKeys } from '../config/queryKeys';
import { extractApiError } from '../utils/errorUtils';

export const useUserReviews = (username: string | undefined, enabled?: boolean) => {
  const {
    data,
    isLoading: loading,
    error: fetchError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.userReviews(username || ''),
    queryFn: async ({ pageParam = 1 }) => {
      return await reviewApi.getUserReviews(username!, pageParam);
    },
    getNextPageParam: (lastPage: PaginatedResponse<Review>) => {
      if (!lastPage.next) return undefined;
      const url = new URL(lastPage.next);
      const page = url.searchParams.get('page');
      return page ? parseInt(page) : undefined;
    },
    enabled: !!username && enabled !== false,
    staleTime: 3 * 60 * 1000,
    initialPageParam: 1,
  });

  const reviews = data?.pages.flatMap(page => page.results) || [];

  return {
    reviews,
    loading,
    error: fetchError ? extractApiError(fetchError).message : null,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};
