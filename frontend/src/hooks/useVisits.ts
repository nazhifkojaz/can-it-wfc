import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visitApi } from '../api/client';
import { VisitCreate } from '../types';
import { queryKeys } from '../config/queryKeys';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitsList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cafes });
    },
  });

  const deleteVisitMutation = useMutation({
    mutationFn: visitApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitsList() });
      queryClient.invalidateQueries({ queryKey: queryKeys.cafes });
    },
  });

  const createVisit = async (data: VisitCreate) => {
    return await createVisitMutation.mutateAsync(data);
  };

  const deleteVisit = async (id: number) => {
    await deleteVisitMutation.mutateAsync(id);
  };

  return {
    visits,
    loading,
    error: fetchError ? String(fetchError) : null,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    createVisit,
    deleteVisit,
  };
};
