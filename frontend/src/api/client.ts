import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  User,
  UserRegistration,
  UserLogin,
  UserUpdate,
  AuthTokens,
  UserProfile,
  UserSettings,
  UserActivityResponse,
  FollowUser,
  ActivityFeedResponse,
  PaginatedResponse,
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
import { buildAppPath } from '../utils/url';
import { extractApiError, ApiError } from '../utils/errorUtils';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests (for httpOnly cookie auth)
});

// Request interceptor - no longer needed for auth tokens (handled by cookies)
// Kept for backward compatibility and custom headers
api.interceptors.request.use(
  (config) => {
    // Tokens now sent automatically via httpOnly cookies
    // No need to add Authorization header from localStorage
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // If error is 401 (Unauthorized), cookies may have expired
    // Redirect to login page
    if (error.response?.status === 401) {
      // Clear any old localStorage tokens (migration cleanup)
      tokenStorage.clearTokens();

      // Redirect to login only if not already on login page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/')) {
        window.location.href = buildAppPath('/');
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
    // Tokens now set as httpOnly cookies by backend
    return response.data;
  },

  // Logout user
  logout: async () => {
    try {
      // Call backend to clear httpOnly cookies
      await api.post('/auth/logout/');
    } catch (error) {
      console.error('Logout error:', error);
    }
    // Also clear any old localStorage tokens (migration cleanup)
    tokenStorage.clearTokens();
  },

  // Refresh access token
  // NOTE: This function is deprecated with httpOnly cookie authentication
  // Tokens are now automatically refreshed by the backend via cookies
  refreshToken: async (refreshToken: string) => {
    const response = await api.post<{ access: string }>('/auth/refresh/', {
      refresh: refreshToken,
    });

    // Tokens now managed via httpOnly cookies - no localStorage needed
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get<User>('/auth/me/');
    return response.data;
  },

  // Google OAuth login
  googleLogin: async (accessToken: string): Promise<{ user: User }> => {
    const response = await api.post('/auth/google/', { access_token: accessToken });
    const { user } = response.data;

    // Tokens now set as httpOnly cookies by backend
    // Clear any old localStorage tokens (migration cleanup)
    tokenStorage.clearTokens();

    return { user };
  },

  // Update profile (for username, bio, etc.)
  updateProfile: async (data: UserUpdate): Promise<User> => {
    const response = await api.patch<User>('/auth/me/', data);
    return response.data;
  },

  // Change password
  changePassword: async (data: {
    old_password: string;
    new_password: string;
  }): Promise<void> => {
    await api.post('/auth/change-password/', data);
  },

  // Get public profile by username
  getUserByUsername: async (username: string): Promise<User> => {
    const response = await api.get<User>(`/auth/users/${username}/`);
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

  // Get user profile by username or ID (Phase 1: Social Features)
  getUserProfile: async (usernameOrId: string | number): Promise<UserProfile> => {
    const response = await api.get<UserProfile>(`/auth/users/${usernameOrId}/profile/`);
    return response.data;
  },

  // Get user activity by username or ID (Phase 1: Social Features)
  getUserActivity: async (usernameOrId: string | number, limit: number = 20): Promise<UserActivityResponse> => {
    const response = await api.get<UserActivityResponse>(`/auth/users/${usernameOrId}/activity/`, {
      params: { limit },
    });
    return response.data;
  },

  // Get current user's settings (Phase 1: Social Features)
  getSettings: async (): Promise<UserSettings> => {
    const response = await api.get<UserSettings>('/auth/me/settings/');
    return response.data;
  },

  // Update current user's settings (Phase 1: Social Features)
  updateSettings: async (data: Partial<UserSettings>): Promise<UserSettings> => {
    const response = await api.patch<UserSettings>('/auth/me/settings/', data);
    return response.data;
  },

  // Follow Management
  followUser: async (username: string) => {
    const response = await api.post(`/auth/follow/${username}/`);
    return response.data;
  },

  unfollowUser: async (username: string) => {
    const response = await api.delete(`/auth/unfollow/${username}/`);
    return response.data;
  },

  // Followers/Following Lists
  getMyFollowers: async (): Promise<FollowUser[]> => {
    const response = await api.get<PaginatedResponse<FollowUser>>('/auth/me/followers/');
    return response.data.results;
  },

  getMyFollowing: async (): Promise<FollowUser[]> => {
    const response = await api.get<PaginatedResponse<FollowUser>>('/auth/me/following/');
    return response.data.results;
  },

  getUserFollowers: async (username: string): Promise<FollowUser[]> => {
    const response = await api.get<PaginatedResponse<FollowUser>>(`/auth/users/${username}/followers/`);
    return response.data.results;
  },

  getUserFollowing: async (username: string): Promise<FollowUser[]> => {
    const response = await api.get<PaginatedResponse<FollowUser>>(`/auth/users/${username}/following/`);
    return response.data.results;
  },

  // Enhanced Activity Feed (NEW: Optimized endpoint using Activity table)
  getActivityFeed: async (limit: number = 50): Promise<ActivityFeedResponse> => {
    const response = await api.get<ActivityFeedResponse>('/activity/feed/', {
      params: { limit },
    });
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
    const response = await api.get<PaginatedResponse<Cafe>>('/cafes/', {
      params: { search: query },
    });
    return response.data.results;
  },

  // Get all cafes (with optional filters)
  getAll: async (params?: {
    search?: string;
    ordering?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get<PaginatedResponse<Cafe>>('/cafes/', { params });
    return response.data.results;
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
    const response = await api.get<PaginatedResponse<Favorite>>('/cafes/favorites/');
    return response.data.results;
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
    const response = await api.get<PaginatedResponse<Visit>>('/visits/', { params });
    return response.data.results;
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
  // Create new review (UPDATED: now uses cafe_id)
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

  // Update review (UPDATED: no time restrictions now)
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
    const response = await api.get<PaginatedResponse<Review>>('/reviews/me/');
    return response.data.results;
  },

  // NEW: Check if user has a review for a specific cafe
  getUserCafeReview: async (cafeId: number): Promise<Review | null> => {
    try {
      const response = await api.get<Review>('/reviews/for-cafe/', {
        params: { cafe: cafeId }
      });
      return response.data;
    } catch (error: any) {
      // Return null if 404 (no review found)
      if (error.response?.status === 404) {
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  },

  // NEW: Bulk get reviews for multiple cafes (prevents 429 errors)
  getUserCafeReviews: async (cafeIds: number[]): Promise<Record<number, Review | null>> => {
    const response = await api.post<Record<string, Review | null>>('/reviews/bulk/', {
      cafe_ids: cafeIds
    });

    // Convert string keys back to numbers
    const result: Record<number, Review | null> = {};
    for (const [key, value] of Object.entries(response.data)) {
      result[parseInt(key)] = value;
    }
    return result;
  },

  // Mark review as helpful (toggle - marks or unmarks)
  markHelpful: async (reviewId: number) => {
    const response = await api.post(`/reviews/${reviewId}/mark_helpful/`);
    return response.data;
  },

  // Flag review
  flagReview: async (reviewId: number, reason: string, description?: string) => {
    const response = await api.post('/reviews/flags/', {
      review_id: reviewId,
      reason,
      comment: description || ''
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

/**
 * Handle API error and return user-friendly message.
 * Uses centralized error extraction utility.
 */
export const handleApiError = (error: any): string => {
  const apiError = extractApiError(error);

  // Log in development
  if (import.meta.env.DEV) {
    console.error('API Error:', {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
      status: apiError.status,
    });
  }

  return apiError.message;
};

/**
 * Get full API error info (code, message, details).
 * Useful for programmatic error handling.
 */
export const getApiError = (error: any): ApiError => {
  return extractApiError(error);
};
