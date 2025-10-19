import api from './api';
import {
  Cafe,
  CafeCreate,
  CafeUpdate,
  NearbyCafesParams,
  PaginatedResponse,
  Favorite,
} from '../types';

export const cafeService = {
  // Get all cafes (with optional filters)
  getCafes: async (params?: {
    search?: string;
    price_range?: number;
    is_verified?: boolean;
    ordering?: string;
    page?: number;
  }): Promise<PaginatedResponse<Cafe>> => {
    const response = await api.get('/cafes/', { params });
    return response.data;
  },

  // Get cafe by ID
  getCafe: async (id: string): Promise<Cafe> => {
    const response = await api.get(`/cafes/${id}/`);
    return response.data;
  },

  // Create new cafe
  createCafe: async (data: CafeCreate): Promise<Cafe> => {
    const response = await api.post('/cafes/', data);
    return response.data;
  },

  // Update cafe
  updateCafe: async (id: string, data: CafeUpdate): Promise<Cafe> => {
    const response = await api.patch(`/cafes/${id}/`, data);
    return response.data;
  },

  // Delete (soft delete) cafe
  deleteCafe: async (id: string): Promise<void> => {
    await api.delete(`/cafes/${id}/`);
  },

  // Find nearby cafes
  getNearby: async (params: NearbyCafesParams): Promise<{ count: number; results: Cafe[] }> => {
    const response = await api.get('/cafes/nearby/', { params });
    return response.data;
  },

  // Get user's favorites
  getFavorites: async (): Promise<Favorite[]> => {
    const response = await api.get('/cafes/favorites/');
    return response.data;
  },

  // Add cafe to favorites
  addFavorite: async (cafeId: string): Promise<Favorite> => {
    const response = await api.post('/cafes/favorites/', { cafe_id: cafeId });
    return response.data;
  },

  // Remove from favorites
  removeFavorite: async (favoriteId: number): Promise<void> => {
    await api.delete(`/cafes/favorites/${favoriteId}/`);
  },
};