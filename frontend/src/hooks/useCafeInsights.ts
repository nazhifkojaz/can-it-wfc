import { useQuery } from '@tanstack/react-query';
import { cafeApi } from '../api/client';
import { queryKeys } from '../config/queryKeys';

export const useCafeInsights = (cafeId: number | undefined, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.cafeInsights(cafeId!),
    queryFn: () => cafeApi.getInsights(cafeId!),
    enabled: !!cafeId && cafeId > 0 && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};
