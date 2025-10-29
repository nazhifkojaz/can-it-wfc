import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '../api/client';
import { Review, ReviewCreate, ReviewUpdate } from '../types';
import { queryKeys } from '../config/queryKeys';

export const useReviews = (cafeId?: number) => {
  const queryClient = useQueryClient();

  const {
    data: reviews = [],
    isLoading: loading,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.reviewsList(cafeId),
    queryFn: async () => {
      if (!cafeId) return [];
      const data = await reviewApi.getByCafe(cafeId);
      return Array.isArray(data) ? data : (data as any).results || [];
    },
    enabled: !!cafeId,
    staleTime: 3 * 60 * 1000,
  });

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
    createReview: createReviewMutation.mutateAsync,
    updateReview: (id: number, data: ReviewUpdate) =>
      updateReviewMutation.mutateAsync({ id, data }),
    deleteReview: deleteReviewMutation.mutateAsync,
  };
};

export const useMyReviews = () => {
  const queryClient = useQueryClient();

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
