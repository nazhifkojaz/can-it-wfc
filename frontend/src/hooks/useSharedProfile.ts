import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/client';

export const useSharedProfile = (username: string) => {
  return useQuery({
    queryKey: ['sharedProfile', username],
    queryFn: () => userApi.getUserProfile(username),
    enabled: !!username,
    retry: false,
    staleTime: 60 * 1000,
  });
};
