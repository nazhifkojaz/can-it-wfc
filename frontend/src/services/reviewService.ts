import api from './api';
import {
  Visit,
  VisitCreate,
  Review,
  ReviewCreate,
  ReviewUpdate,
  ReviewFlag,
  PaginatedResponse,
} from '../types';

export const reviewService = {
  // ===== Visits =====
  
  // Get user's visits
  getVisits: async (params?: { cafe?: string }): Promise<Visit[]> => {
    const response = await api.get('/visits/', { params });
    return response.data;
  },

  // Get visit by ID
  getVisit: async (id: string): Promise<Visit> => {
    const response = await api.get(`/visits/${id}/`);
    return response.data;
  },

  // Create visit
  createVisit: async (data: VisitCreate): Promise<Visit> => {
    const response = await api.post('/visits/', data);
    return response.data;
  },

  // Delete visit
  deleteVisit: async (id: string): Promise<void> => {
    await api.delete(`/visits/${id}/`);
  },

  // ===== Reviews =====
  
  // Get all reviews (public)
  getReviews: async (params?: {
    cafe?: string;
    user?: number;
    wfc_rating?: number;
    visit_time?: number;
    ordering?: string;
    page?: number;
  }): Promise<PaginatedResponse<Review>> => {
    const response = await api.get('/reviews/', { params });
    return response.data;
  },

  // Get review by ID
  getReview: async (id: string): Promise<Review> => {
    const response = await api.get(`/reviews/${id}/`);
    return response.data;
  },

  // Get current user's reviews
  getMyReviews: async (): Promise<Review[]> => {
    const response = await api.get('/reviews/me/');
    return response.data;
  },

  // Get reviews for a specific cafe
  getCafeReviews: async (cafeId: string, params?: {
    ordering?: string;
  }): Promise<Review[]> => {
    const response = await api.get(`/cafes/${cafeId}/reviews/`, { params });
    return response.data;
  },

  // Create review
  createReview: async (data: ReviewCreate): Promise<Review> => {
    const response = await api.post('/reviews/create/', data);
    return response.data;
  },

  // Update review
  updateReview: async (id: string, data: ReviewUpdate): Promise<Review> => {
    const response = await api.patch(`/reviews/${id}/`, data);
    return response.data;
  },

  // Delete review
  deleteReview: async (id: string): Promise<void> => {
    await api.delete(`/reviews/${id}/`);
  },

  // Flag review
  flagReview: async (data: ReviewFlag): Promise<void> => {
    await api.post('/reviews/flags/', data);
  },
};