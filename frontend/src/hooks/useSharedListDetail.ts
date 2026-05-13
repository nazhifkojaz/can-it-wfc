import { useQuery } from '@tanstack/react-query';
import { listApi } from '../api/client';

export const useSharedListDetail = (listId: number, token?: string) => {
  return useQuery({
    queryKey: ['sharedList', listId, token],
    queryFn: () => listApi.getList(listId, token),
    enabled: !!listId,
    retry: false,
    staleTime: 60 * 1000,
  });
};
