import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listApi } from '../api/client';
import { queryKeys } from '../config/queryKeys';

export const useListDetail = (listId: number | undefined) => {
  const queryClient = useQueryClient();

  const { data: list, isLoading } = useQuery({
    queryKey: queryKeys.listDetail(listId!),
    queryFn: () => listApi.getList(listId!),
    enabled: !!listId,
    staleTime: 60 * 1000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.listDetail(listId!) });
    queryClient.invalidateQueries({ queryKey: queryKeys.lists });
  };

  const addItemMutation = useMutation({
    mutationFn: ({ cafeId, note }: { cafeId: number; note?: string }) =>
      listApi.addItem(listId!, cafeId, note),
    onSuccess: invalidate,
  });

  const removeItemMutation = useMutation({
    mutationFn: (cafeId: number) => listApi.removeItem(listId!, cafeId),
    onSuccess: invalidate,
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ cafeId, note }: { cafeId: number; note: string }) =>
      listApi.updateNote(listId!, cafeId, note),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.listDetail(listId!) }),
  });

  return {
    list,
    isLoading,
    addItem: addItemMutation.mutateAsync,
    removeItem: removeItemMutation.mutateAsync,
    updateNote: (cafeId: number, note: string) =>
      updateNoteMutation.mutateAsync({ cafeId, note }),
    isAddingItem: addItemMutation.isPending,
    isRemovingItem: removeItemMutation.isPending,
  };
};
