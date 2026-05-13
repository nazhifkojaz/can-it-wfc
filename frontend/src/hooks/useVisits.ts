import { useInfiniteQuery, useMutation, useQueryClient, InfiniteData, keepPreviousData } from '@tanstack/react-query';
import { visitApi } from '../api/client';
import { Visit, VisitCreate, CombinedVisitReviewCreate, PaginatedResponse } from '../types';
import { queryKeys } from '../config/queryKeys';
import { extractApiError } from '../utils/errorUtils';

type VisitsPageData = InfiniteData<PaginatedResponse<Visit>>;

export interface VisitFilters {
  ordering?: string;
  visit_date__gte?: string;
  visit_date__lte?: string;
}

export const useVisits = (filters?: VisitFilters) => {
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
    queryKey: queryKeys.visitsList(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await visitApi.getMyVisits(pageParam, filters);
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.next) return undefined;
      const url = new URL(lastPage.next);
      const page = url.searchParams.get('page');
      return page ? parseInt(page) : undefined;
    },
    staleTime: 1 * 60 * 1000,
    placeholderData: keepPreviousData,
    initialPageParam: 1,
  });

  const visits = data?.pages.flatMap(page => page.results) || [];

  const createWithReviewMutation = useMutation({
    mutationFn: visitApi.createWithReview,
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.visitsList(filters) });
      await queryClient.cancelQueries({ queryKey: queryKeys.cafes });

      const previousVisits = queryClient.getQueryData(queryKeys.visitsList(filters));

      queryClient.setQueryData(queryKeys.visitsList(filters), (old: VisitsPageData | undefined) => {
        if (!old) return old;

        const optimisticVisit = {
          id: Date.now(),
          cafe_id: newData.cafe_id,
          visit_date: newData.visit_date,
          amount_spent: newData.amount_spent,
          visit_time: newData.visit_time,
          created_at: new Date().toISOString(),
        } as unknown as Visit;

        return {
          ...old,
          pages: old.pages.map((page, index) => {
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
        queryClient.setQueryData(queryKeys.visitsList(filters), context.previousVisits);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitsList(filters) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cafes });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews });
    },
  });

  const deleteVisitMutation = useMutation({
    mutationFn: visitApi.delete,
    onMutate: async (visitId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.visitsList(filters) });

      const previousVisits = queryClient.getQueryData(queryKeys.visitsList(filters));

      queryClient.setQueryData(queryKeys.visitsList(filters), (old: VisitsPageData | undefined) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            results: page.results.filter(visit => visit.id !== visitId),
          })),
        };
      });

      return { previousVisits };
    },
    onError: (_err, _visitId, context) => {
      if (context?.previousVisits) {
        queryClient.setQueryData(queryKeys.visitsList(filters), context.previousVisits);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitsList(filters) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cafes });
    },
  });

  const updateVisitMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<VisitCreate> }) =>
      visitApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitsList(filters) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cafes });
    },
  });

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
    createWithReview,
    updateVisit,
    deleteVisit,
  };
};
