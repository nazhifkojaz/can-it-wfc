import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listApi } from '../api/client';
import { queryKeys } from '../config/queryKeys';
import type { CafeListCreate, CafeListUpdate } from '../types';

export const useLists = () => {
  const queryClient = useQueryClient();

  const { data: lists = [], isLoading } = useQuery({
    queryKey: queryKeys.listsList(),
    queryFn: () => listApi.getLists(),
    staleTime: 2 * 60 * 1000,
  });

  const defaultList = lists.find((l) => l.is_default);

  const createMutation = useMutation({
    mutationFn: (data: CafeListCreate) => listApi.createList(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.lists }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CafeListUpdate }) =>
      listApi.updateList(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.lists }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => listApi.deleteList(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.lists }),
  });

  return {
    lists,
    defaultList,
    isLoading,
    createList: createMutation.mutateAsync,
    updateList: (id: number, data: CafeListUpdate) =>
      updateMutation.mutateAsync({ id, data }),
    deleteList: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
