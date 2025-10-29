import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cafeApi } from '../api/client';
import { Cafe } from '../types';
import { queryKeys } from '../config/queryKeys';
import { useCallback } from 'react';

export const useFavorites = () => {
  const queryClient = useQueryClient();

  const {
    data: favorites = [],
    isLoading: loading,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.favoritesList(),
    queryFn: async () => {
      const data = await cafeApi.getFavorites();
      const favoritesList = Array.isArray(data)
        ? data
        : (data as any).results || [];
      return favoritesList
        .map((fav: any) => fav.cafe)
        .filter(Boolean) as Cafe[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: cafeApi.toggleFavorite,
    onMutate: async (cafeId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.favoritesList() });

      const previousFavorites = queryClient.getQueryData(queryKeys.favoritesList());

      queryClient.setQueryData(queryKeys.favoritesList(), (old: Cafe[] | undefined) => {
        if (!old) return old;
        const isFavorited = old.some((cafe) => cafe.id === cafeId);

        if (isFavorited) {
          return old.filter((cafe) => cafe.id !== cafeId);
        } else {
          return old;
        }
      });

      return { previousFavorites };
    },
    onError: (_err, _cafeId, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(queryKeys.favoritesList(), context.previousFavorites);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.favoritesList() });
    },
  });

  const toggleFavorite = async (cafeId: number | undefined) => {
    if (!cafeId) {
      throw new Error('Cannot favorite unregistered cafes');
    }
    const result = await toggleFavoriteMutation.mutateAsync(cafeId);
    return result.is_favorited;
  };

  const isFavorite = useCallback(
    (cafeId: number | undefined) => {
      if (cafeId === undefined || cafeId === null) {
        return false;
      }
      return Array.isArray(favorites) && favorites.some((cafe) => cafe.id === cafeId);
    },
    [favorites]
  );

  return {
    favorites,
    loading,
    error: fetchError ? String(fetchError) : null,
    refetch,
    toggleFavorite,
    isFavorite,
  };
};
