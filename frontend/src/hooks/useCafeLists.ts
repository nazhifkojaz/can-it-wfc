import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listApi } from '../api/client';
import { queryKeys } from '../config/queryKeys';
import type { CafeListMembership, CafeListItem } from '../types';

type ToggleListCtx = { prev: CafeListMembership[] | undefined };

export const useCafeLists = (cafeId: number | undefined) => {
  const queryClient = useQueryClient();

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: queryKeys.cafeMemberships(cafeId!),
    queryFn: () => listApi.getCafeMemberships(cafeId!),
    enabled: !!cafeId,
    staleTime: 30 * 1000,
  });

  const isInToGoList = memberships.find((m) => m.list_type === 'to_go')?.in_list ?? false;
  const isInFavoritesList = memberships.find((m) => m.list_type === 'favorites')?.in_list ?? false;

  const invalidateAfterToggle = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.cafeMemberships(cafeId!) });
    queryClient.invalidateQueries({ queryKey: queryKeys.cafeDetail(cafeId!) });
    queryClient.invalidateQueries({ queryKey: queryKeys.lists });
  };

  // Toggle a cafe in/out of a specific named list
  const toggleInListMutation = useMutation<
    void | CafeListItem,
    Error,
    { listId: number; inList: boolean },
    ToggleListCtx
  >({
    mutationFn: ({ listId, inList }) =>
      inList
        ? listApi.removeItem(listId, cafeId!)
        : listApi.addItem(listId, cafeId!),
    onMutate: async ({ listId, inList }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cafeMemberships(cafeId!) });
      const prev = queryClient.getQueryData<CafeListMembership[]>(
        queryKeys.cafeMemberships(cafeId!)
      );
      queryClient.setQueryData<CafeListMembership[]>(
        queryKeys.cafeMemberships(cafeId!),
        (old) => old?.map((m) => (m.id === listId ? { ...m, in_list: !inList } : m))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(queryKeys.cafeMemberships(cafeId!), ctx.prev);
      }
    },
    onSuccess: invalidateAfterToggle,
  });

  // Toggle a cafe in/out of the to-go list (bookmark-button flow)
  const toggleToGoMutation = useMutation<void | CafeListItem, Error, boolean, ToggleListCtx>({
    mutationFn: (inToGo) =>
      inToGo
        ? listApi.removeFromToGo(cafeId!)
        : listApi.addToToGo(cafeId!),
    onMutate: async (inToGo) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cafeMemberships(cafeId!) });
      const prev = queryClient.getQueryData<CafeListMembership[]>(
        queryKeys.cafeMemberships(cafeId!)
      );
      queryClient.setQueryData<CafeListMembership[]>(
        queryKeys.cafeMemberships(cafeId!),
        (old) => old?.map((m) => (m.list_type === 'to_go' ? { ...m, in_list: !inToGo } : m))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(queryKeys.cafeMemberships(cafeId!), ctx.prev);
      }
    },
    onSuccess: invalidateAfterToggle,
  });

  // Toggle a cafe in/out of the favorites list
  const toggleFavoritesMutation = useMutation<void | CafeListItem, Error, boolean, ToggleListCtx>({
    mutationFn: (inFavorites) =>
      inFavorites
        ? listApi.removeFromFavorites(cafeId!)
        : listApi.addToFavorites(cafeId!),
    onMutate: async (inFavorites) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cafeMemberships(cafeId!) });
      const prev = queryClient.getQueryData<CafeListMembership[]>(
        queryKeys.cafeMemberships(cafeId!)
      );
      queryClient.setQueryData<CafeListMembership[]>(
        queryKeys.cafeMemberships(cafeId!),
        (old) => old?.map((m) => (m.list_type === 'favorites' ? { ...m, in_list: !inFavorites } : m))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(queryKeys.cafeMemberships(cafeId!), ctx.prev);
      }
    },
    onSuccess: invalidateAfterToggle,
  });

  return {
    memberships,
    isInToGoList,
    isInFavoritesList,
    isLoading,
    toggleInList: (listId: number, inList: boolean) =>
      toggleInListMutation.mutateAsync({ listId, inList }),
    toggleToGo: () => toggleToGoMutation.mutateAsync(isInToGoList),
    toggleFavorites: () => toggleFavoritesMutation.mutateAsync(isInFavoritesList),
    isToggling:
      toggleInListMutation.isPending ||
      toggleToGoMutation.isPending ||
      toggleFavoritesMutation.isPending,
  };
};
