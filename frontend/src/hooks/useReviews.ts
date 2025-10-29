import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '../api/client';
import { ReviewUpdate } from '../types';
import { queryKeys } from '../config/queryKeys';

export const useReviews = (cafeId?: number) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: loading,
    error: fetchError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: queryKeys.reviewsList(cafeId),
    queryFn: async ({ pageParam = 1 }) => {
      if (!cafeId) return { results: [], count: 0, next: null, previous: null };
      const response = await reviewApi.getByCafe(cafeId, pageParam);
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined;
      const url = new URL(lastPage.next);
      const page = url.searchParams.get('page');
      return page ? parseInt(page) : undefined;
    },
    enabled: !!cafeId,
    staleTime: 3 * 60 * 1000,
    initialPageParam: 1,
  });

  const reviews = data?.pages.flatMap(page => page.results) || [];

  const createReviewMutation = useMutation({
    mutationFn: reviewApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews });
      queryClient.invalidateQueries({ queryKey: queryKeys.visits });
      queryClient.invalidateQueries({ queryKey: queryKeys.cafes });
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReviewUpdate }) =>
      reviewApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews });
      queryClient.invalidateQueries({ queryKey: queryKeys.cafes });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: reviewApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews });
      queryClient.invalidateQueries({ queryKey: queryKeys.visits });
      queryClient.invalidateQueries({ queryKey: queryKeys.cafes });
    },
  });

  return {
    reviews,
    loading,
    error: fetchError ? String(fetchError) : null,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    createReview: createReviewMutation.mutateAsync,
    updateReview: (id: number, data: ReviewUpdate) =>
      updateReviewMutation.mutateAsync({ id, data }),
    deleteReview: deleteReviewMutation.mutateAsync,
  };
};

export const useMyReviews = () => {
  const {
    data: reviews = [],
    isLoading: loading,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.myReviews(),
    queryFn: async () => {
      const data = await reviewApi.getMyReviews();
      return Array.isArray(data) ? data : (data as any).results || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  return {
    reviews,
    loading,
    error: fetchError ? String(fetchError) : null,
    refetch,
  };
};
