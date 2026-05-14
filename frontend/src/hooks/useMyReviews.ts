import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { reviewApi } from '../api/client';
import { Review, PaginatedResponse } from '../types';
import { queryKeys } from '../config/queryKeys';
import { extractApiError } from '../utils/errorUtils';

type ReviewsPageData = InfiniteData<PaginatedResponse<Review>>;

export const useMyReviews = () => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: loading,
    error: fetchError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.myReviews(),
    queryFn: async ({ pageParam = 1 }) => {
      return await reviewApi.getMyReviews(pageParam);
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined;
      const url = new URL(lastPage.next);
      const page = url.searchParams.get('page');
      return page ? parseInt(page) : undefined;
    },
    staleTime: 3 * 60 * 1000,
    initialPageParam: 1,
  });

  const reviews = data?.pages.flatMap(page => page.results) || [];

  const deleteReviewMutation = useMutation({
    mutationFn: reviewApi.delete,
    onMutate: async (reviewId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.myReviews() });

      const previousReviews = queryClient.getQueryData(queryKeys.myReviews());

      queryClient.setQueryData(queryKeys.myReviews(), (old: ReviewsPageData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            results: page.results.filter(review => review.id !== reviewId),
          })),
        };
      });

      return { previousReviews };
    },
    onError: (_err, _reviewId, context) => {
      if (context?.previousReviews) {
        queryClient.setQueryData(queryKeys.myReviews(), context.previousReviews);
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
    error: fetchError ? extractApiError(fetchError).message : null,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    deleteReview: deleteReviewMutation.mutateAsync,
  };
};
