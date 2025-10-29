import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { visitApi } from '../api/client';
import { VisitCreate } from '../types';
import { queryKeys } from '../config/queryKeys';

export const useVisits = () => {
  const queryClient = useQueryClient();

  const {
    data: visits = [],
    isLoading: loading,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.visitsList(),
    queryFn: async () => {
      const data = await visitApi.getMyVisits();
      return Array.isArray(data) ? data : (data as any).results || [];
    },
    staleTime: 1 * 60 * 1000,
  });

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
    createVisit,
    deleteVisit,
  };
};
