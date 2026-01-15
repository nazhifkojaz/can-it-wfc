import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visitApi } from '../api/client';
import { VisitCreate, CombinedVisitReviewCreate } from '../types';
import { queryKeys } from '../config/queryKeys';
import { extractApiError } from '../utils/errorUtils';

export const useVisits = () => {
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
    queryKey: queryKeys.visitsList(),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await visitApi.getMyVisits(pageParam);
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined;
      const url = new URL(lastPage.next);
      const page = url.searchParams.get('page');
      return page ? parseInt(page) : undefined;
    },
    staleTime: 1 * 60 * 1000,
    initialPageParam: 1,
  });

  const visits = data?.pages.flatMap(page => page.results) || [];

  const createVisitMutation = useMutation({
    mutationFn: visitApi.create,
    onMutate: async (newVisit) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.visitsList() });

      const previousVisits = queryClient.getQueryData(queryKeys.visitsList());

      queryClient.setQueryData(queryKeys.visitsList(), (old: any) => {
        if (!old) return old;

        const optimisticVisit = {
          id: Date.now(),
          ...newVisit,
          created_at: new Date().toISOString(),
        };

        return {
          ...old,
          pages: old.pages.map((page: any, index: number) => {
            if (index === 0) {
              return {
                ...page,
                results: [optimisticVisit, ...page.results],
              };
            }
            return page;
          }),
        };
      });

      return { previousVisits };
    },
    onError: (_err, _newVisit, context) => {
      if (context?.previousVisits) {
        queryClient.setQueryData(queryKeys.visitsList(), context.previousVisits);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitsList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cafes });
    },
  });

  const createWithReviewMutation = useMutation({
    mutationFn: visitApi.createWithReview,
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.visitsList() });
      await queryClient.cancelQueries({ queryKey: queryKeys.cafes });

      const previousVisits = queryClient.getQueryData(queryKeys.visitsList());

      queryClient.setQueryData(queryKeys.visitsList(), (old: any) => {
        if (!old) return old;

        const optimisticVisit = {
          id: Date.now(),
          cafe_id: newData.cafe_id,
          visit_date: newData.visit_date,
          amount_spent: newData.amount_spent,
          visit_time: newData.visit_time,
          created_at: new Date().toISOString(),
        };

        return {
          ...old,
          pages: old.pages.map((page: any, index: number) => {
            if (index === 0) {
              return {
                ...page,
                results: [optimisticVisit, ...page.results],
              };
            }
            return page;
          }),
        };
      });

      return { previousVisits };
    },
    onError: (_err, _newData, context) => {
      if (context?.previousVisits) {
        queryClient.setQueryData(queryKeys.visitsList(), context.previousVisits);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitsList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cafes });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews });
    },
  });

  const deleteVisitMutation = useMutation({
    mutationFn: visitApi.delete,
    onMutate: async (visitId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.visitsList() });

      const previousVisits = queryClient.getQueryData(queryKeys.visitsList());

      queryClient.setQueryData(queryKeys.visitsList(), (old: any) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            results: page.results.filter((visit: any) => visit.id !== visitId),
          })),
        };
      });

      return { previousVisits };
    },
    onError: (_err, _visitId, context) => {
      if (context?.previousVisits) {
        queryClient.setQueryData(queryKeys.visitsList(), context.previousVisits);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitsList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cafes });
    },
  });

  const updateVisitMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<VisitCreate> }) =>
      visitApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitsList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cafes });
    },
  });

  const createVisit = async (data: VisitCreate) => {
    return await createVisitMutation.mutateAsync(data);
  };

  const createWithReview = async (data: CombinedVisitReviewCreate) => {
    return await createWithReviewMutation.mutateAsync(data);
  };

  const updateVisit = async (id: number, data: Partial<VisitCreate>) => {
    return await updateVisitMutation.mutateAsync({ id, data });
  };

  const deleteVisit = async (id: number) => {
    await deleteVisitMutation.mutateAsync(id);
  };

  return {
    visits,
    loading,
    error: fetchError ? extractApiError(fetchError).message : null,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    createVisit,
    createWithReview,
    updateVisit,
    deleteVisit,
  };
};
