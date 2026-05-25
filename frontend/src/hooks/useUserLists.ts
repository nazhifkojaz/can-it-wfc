import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/client';
import { queryKeys } from '../config/queryKeys';
import type { CafeList } from '../types';
import { extractApiError } from '../utils/errorUtils';

export const useUserLists = (username: string | undefined, enabled = true) => {
  const {
    data,
    isLoading: loading,
    isFetching,
    error: fetchError,
    refetch,
  } = useQuery<CafeList[]>({
    queryKey: queryKeys.userLists(username || ''),
    queryFn: () => userApi.getUserLists(username!),
    enabled: !!username && enabled,
    retry: false,
    staleTime: 3 * 60 * 1000,
  });

  return {
    lists: data || [],
    loading: loading || (isFetching && !data),
    error: fetchError ? extractApiError(fetchError).message : null,
    refetch,
  };
};
