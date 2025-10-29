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
    onMutate: async (newReview) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.reviewsList(cafeId) });

      const previousReviews = queryClient.getQueryData(queryKeys.reviewsList(cafeId));

      queryClient.setQueryData(queryKeys.reviewsList(cafeId), (old: any) => {
        if (!old) return old;

        const optimisticReview = {
          id: Date.now(),
          ...newReview,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          helpful_count: 0,
          user: {
            id: 0,
            username: 'You',
            display_name: 'You',
          },
        };

        return {
          ...old,
          pages: old.pages.map((page: any, index: number) => {
            if (index === 0) {
              return {
                ...page,
                results: [optimisticReview, ...page.results],
              };
            }
            return page;
          }),
        };
      });

      return { previousReviews };
    },
    onError: (_err, _newReview, context) => {
      if (context?.previousReviews && cafeId) {
        queryClient.setQueryData(queryKeys.reviewsList(cafeId), context.previousReviews);
      }
    },
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
    onMutate: async (reviewId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.reviewsList(cafeId) });

      const previousReviews = queryClient.getQueryData(queryKeys.reviewsList(cafeId));

      queryClient.setQueryData(queryKeys.reviewsList(cafeId), (old: any) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            results: page.results.filter((review: any) => review.id !== reviewId),
          })),
        };
      });

      return { previousReviews };
    },
    onError: (_err, _reviewId, context) => {
      if (context?.previousReviews && cafeId) {
        queryClient.setQueryData(queryKeys.reviewsList(cafeId), context.previousReviews);
      }
    },
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
