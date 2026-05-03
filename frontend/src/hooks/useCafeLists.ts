import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listApi } from '../api/client';
import { queryKeys } from '../config/queryKeys';
import type { CafeListMembership } from '../types';

type ToggleListCtx = { prev: CafeListMembership[] | undefined };

export const useCafeLists = (cafeId: number | undefined) => {
  const queryClient = useQueryClient();

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: queryKeys.cafeMemberships(cafeId!),
    queryFn: () => listApi.getCafeMemberships(cafeId!),
    enabled: !!cafeId,
    staleTime: 30 * 1000,
  });

  const isInDefaultList = memberships.find((m) => m.is_default)?.in_list ?? false;

  const invalidateAfterToggle = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.cafeMemberships(cafeId!) });
    queryClient.invalidateQueries({ queryKey: queryKeys.cafeDetail(cafeId!) });
  };

  // Toggle a cafe in/out of a specific named list
  const toggleInListMutation = useMutation<
    unknown,
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

  // Toggle a cafe in/out of the default list (heart-button flow)
  const toggleDefaultMutation = useMutation<unknown, Error, boolean, ToggleListCtx>({
    mutationFn: (inDefault) =>
      inDefault
        ? listApi.removeFromDefault(cafeId!)
        : listApi.addToDefault(cafeId!),
    onMutate: async (inDefault) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cafeMemberships(cafeId!) });
      const prev = queryClient.getQueryData<CafeListMembership[]>(
        queryKeys.cafeMemberships(cafeId!)
      );
      queryClient.setQueryData<CafeListMembership[]>(
        queryKeys.cafeMemberships(cafeId!),
        (old) => old?.map((m) => (m.is_default ? { ...m, in_list: !inDefault } : m))
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
    isInDefaultList,
    isLoading,
    toggleInList: (listId: number, inList: boolean) =>
      toggleInListMutation.mutateAsync({ listId, inList }),
    toggleDefault: () => toggleDefaultMutation.mutateAsync(isInDefaultList),
    isToggling: toggleInListMutation.isPending || toggleDefaultMutation.isPending,
  };
};
