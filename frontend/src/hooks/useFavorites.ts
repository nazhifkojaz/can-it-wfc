/**
 * Custom hook for managing favorite cafes
 */

import { useState, useEffect, useCallback } from 'react';
import { cafeApi } from '../api/client';
import { Cafe } from '../types';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Cafe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await cafeApi.getFavorites();

      const favoritesList = Array.isArray(data)
        ? data
        : (data as any).results || [];

      const cafes = favoritesList
        .map((fav: any) => fav.cafe)
        .filter(Boolean);

      setFavorites(cafes);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch favorites');
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(async (cafeId: number | undefined) => {
    try {
      const result = await cafeApi.toggleFavorite(cafeId);

      if (result.is_favorited) {
        await fetchFavorites();
      } else {
        setFavorites(prev => prev.filter(cafe => cafe.id !== cafeId));
      }

      return result.is_favorited;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to toggle favorite';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchFavorites]);

  const isFavorite = useCallback((cafeId: number | undefined) => {
    if (cafeId === undefined || cafeId === null) {
      return false;
    }

    return Array.isArray(favorites) && favorites.some(cafe => cafe.id === cafeId);
  }, [favorites]);

  return {
    favorites,
    loading,
    error,
    refetch: fetchFavorites,
    toggleFavorite,
    isFavorite,
  };
};
