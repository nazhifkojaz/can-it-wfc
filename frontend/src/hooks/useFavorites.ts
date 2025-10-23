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
      // Backend returns array of Favorite objects with nested cafe property
      // Extract the cafe objects: [{ id, cafe, created_at }] -> [cafe]
      const cafes = Array.isArray(data)
        ? data.map((fav: any) => fav.cafe).filter(Boolean)
        : [];
      setFavorites(cafes);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch favorites');
      setFavorites([]); // Ensure favorites is always an array
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = useCallback(async (cafeId: string) => {
    try {
      const result = await cafeApi.toggleFavorite(cafeId);

      if (result.is_favorited) {
        // Added to favorites - refetch to get updated list
        await fetchFavorites();
      } else {
        // Removed from favorites - remove from local state
        setFavorites(prev => prev.filter(cafe => cafe.id !== cafeId));
      }

      return result.is_favorited;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to toggle favorite';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchFavorites]);

  const isFavorite = useCallback((cafeId: string) => {
    // Safety check: ensure favorites is an array
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
