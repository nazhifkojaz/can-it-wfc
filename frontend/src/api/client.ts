import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  User,
  UserRegistration,
  UserLogin,
  UserUpdate,
  AuthTokens,
  Cafe,
  CafeCreate,
  CafeUpdate,
  NearbyCafesParams,
  Visit,
  VisitCreate,
  CombinedVisitReviewCreate,
  Review,
  ReviewCreate,
  ReviewUpdate,
  Favorite,
} from '../types';
import { tokenStorage } from '../utils/storage';
import { API_CONFIG } from '../config/constants';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = tokenStorage.getRefreshToken();
        if (refreshToken) {
          const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          tokenStorage.setAccessToken(access);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return axios(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        tokenStorage.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ===========================
// Authentication API
// ===========================

export const authApi = {
  // Register new user
  register: async (data: UserRegistration) => {
    const response = await api.post<User>('/auth/register/', data);
    return response.data;
  },

  // Login user (JWT)
  login: async (data: UserLogin) => {
    const response = await api.post<AuthTokens>('/auth/login/', data);
    const { access, refresh } = response.data;

    // Store tokens
    tokenStorage.setAccessToken(access);
    tokenStorage.setRefreshToken(refresh);

    return response.data;
  },

  // Logout user
  logout: () => {
    tokenStorage.clearTokens();
  },

  // Refresh access token
  refreshToken: async (refreshToken: string) => {
    const response = await api.post<{ access: string }>('/auth/refresh/', {
      refresh: refreshToken,
    });

    tokenStorage.setAccessToken(response.data.access);
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get<User>('/auth/me/');
    return response.data;
  },
};

// ===========================
// User API
// ===========================

export const userApi = {
  // Get user profile
  getProfile: async () => {
    const response = await api.get<User>('/auth/me/');
    return response.data;
  },

  // Update user profile
  updateProfile: async (data: UserUpdate) => {
    const response = await api.patch<User>('/auth/me/', data);
    return response.data;
  },

  // Change password
  changePassword: async (oldPassword: string, newPassword: string) => {
    const response = await api.post('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  // Get user by ID
  getById: async (userId: number) => {
    const response = await api.get<User>(`/auth/users/${userId}/`);
    return response.data;
  },
};

// ===========================
// Cafe API
// ===========================

export const cafeApi = {
  // Get nearby cafes (database only)
  getNearby: async (params: NearbyCafesParams, signal?: AbortSignal) => {
    const response = await api.get<Cafe[]>('/cafes/nearby/', { params, signal });
    return response.data;
  },

  // NEW: Get all nearby cafes (database + Google Places)
  getAllNearby: async (params: NearbyCafesParams, signal?: AbortSignal) => {
    const response = await api.get<{
      count: number;
      registered_count: number;
      unregistered_count: number;
      results: Cafe[];
    }>('/cafes/nearby/all/', { params, signal });
    return response.data;
  },

  // Search cafes
  search: async (query: string) => {
    const response = await api.get<Cafe[]>('/cafes/', {
      params: { search: query },
    });
    return response.data;
  },

  // Get all cafes (with optional filters)
  getAll: async (params?: {
    search?: string;
    ordering?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get<Cafe[]>('/cafes/', { params });
    return response.data;
  },

  // Get cafe by ID
  getById: async (id: number) => {
    const response = await api.get<Cafe>(`/cafes/${id}/`);
    return response.data;
  },

  // Create new cafe
  create: async (data: CafeCreate) => {
    const response = await api.post<Cafe>('/cafes/', data);
    return response.data;
  },

  // Update cafe
  update: async (id: number, data: CafeUpdate) => {
    const response = await api.patch<Cafe>(`/cafes/${id}/`, data);
    return response.data;
  },

  toggleFavorite: async (cafeId: number | undefined) => {
    if (cafeId === undefined || cafeId === null) {
      throw new Error('Cannot favorite unregistered cafes. Please log a visit first to register this cafe.');
    }

    const favoritesResponse = await api.get('/cafes/favorites/');

    const favoritesList = Array.isArray(favoritesResponse.data)
      ? favoritesResponse.data
      : (favoritesResponse.data as any).results || [];

    const existing = favoritesList.find((fav: any) => fav.cafe.id === cafeId);

    if (existing) {
      await api.delete(`/cafes/favorites/${existing.id}/`);
      return { is_favorited: false };
    } else {
      const payload = { cafe_id: cafeId };
      const response = await api.post('/cafes/favorites/', payload);
      return { is_favorited: true, ...response.data };
    }
  },

  // Get user's favorite cafes
  getFavorites: async () => {
    const response = await api.get<Favorite[]>('/cafes/favorites/');
    return response.data;
  },

  // Find potential duplicates (not implemented in backend API yet)
  // findDuplicates: async (name: string, latitude: number, longitude: number) => {
  //   const response = await api.get<Cafe[]>('/cafes/find_duplicates/', {
  //     params: { name, latitude, longitude },
  //   });
  //   return response.data;
  // },
};

// ===========================
// Visit API
// ===========================

export const visitApi = {
  // Create new visit
  create: async (data: VisitCreate) => {
    const response = await api.post<Visit>('/visits/', data);
    return response.data;
  },

  // NEW: Create visit with optional review in one request
  createWithReview: async (data: CombinedVisitReviewCreate) => {
    const response = await api.post<{
      visit: Visit;
      review: Review | null;
      message: string;
    }>('/visits/create-with-review/', data);
    return response.data;
  },

  // Get user's visits (backend filters by current user automatically)
  getMyVisits: async (page: number = 1) => {
    const response = await api.get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: Visit[];
    }>('/visits/', {
      params: { page },
    });
    return response.data;
  },

  // Get visits with filters (for duplicate checking, etc.)
  getVisits: async (filters?: { cafe?: number; visit_date?: string; page?: number }) => {
    const response = await api.get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: Visit[];
    }>('/visits/', {
      params: filters,
    });
    return response.data;
  },

  // Get visit by ID
  getById: async (id: number) => {
    const response = await api.get<Visit>(`/visits/${id}/`);
    return response.data;
  },

  // Get all visits (admin/filtered)
  getAll: async (params?: {
    cafe?: string;
    user?: number;
    ordering?: string;
  }) => {
    const response = await api.get<Visit[]>('/visits/', { params });
    return response.data;
  },

  // Update visit
  update: async (id: number, data: Partial<VisitCreate>) => {
    const response = await api.patch<Visit>(`/visits/${id}/`, data);
    return response.data;
  },

  // Delete visit
  delete: async (id: number) => {
    await api.delete(`/visits/${id}/`);
  },
};

// ===========================
// Review API
// ===========================

export const reviewApi = {
  // Create new review
  create: async (data: ReviewCreate) => {
    const response = await api.post<Review>('/reviews/create/', data);
    return response.data;
  },

  // Get reviews for a cafe
  getByCafe: async (cafeId: number, page: number = 1) => {
    const response = await api.get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: Review[];
    }>('/reviews/', {
      params: { cafe: cafeId, page },
    });
    return response.data;
  },

  // Get review by ID
  getById: async (id: number) => {
    const response = await api.get<Review>(`/reviews/${id}/`);
    return response.data;
  },

  // Update review
  update: async (id: number, data: ReviewUpdate) => {
    const response = await api.patch<Review>(`/reviews/${id}/`, data);
    return response.data;
  },

  // Delete review
  delete: async (id: number) => {
    await api.delete(`/reviews/${id}/`);
  },

  // Get user's reviews
  getMyReviews: async () => {
    const response = await api.get<Review[]>('/reviews/me/');
    return response.data;
  },

  // Mark review as helpful (toggle - marks or unmarks)
  markHelpful: async (reviewId: number) => {
    const response = await api.post(`/reviews/${reviewId}/mark_helpful/`);
    return response.data;
  },

  // Flag review
  flagReview: async (reviewId: number, reason: string) => {
    const response = await api.post('/reviews/flags/', {
      review: reviewId,
      reason
    });
    return response.data;
  },
};

// ===========================
// Export the axios instance for custom requests
// ===========================

export default api;

// ===========================
// Error Handler Utility
// ===========================

export const handleApiError = (error: any) => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    
    if (axiosError.response) {
      // Server responded with error
      const { status, data } = axiosError.response;
      
      switch (status) {
        case 400:
          return data.message || 'Invalid request';
        case 401:
          return 'Unauthorized. Please login again.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'Resource not found';
        case 429:
          return 'Too many requests. Please try again later.';
        case 500:
          return 'Server error. Please try again later.';
        default:
          return data.message || 'An error occurred';
      }
    } else if (axiosError.request) {
      // Request made but no response
      return 'Network error. Please check your connection.';
    }
  }
  
  return 'An unexpected error occurred';
};