import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
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
import { createLogger } from '../utils/logger';

const log = createLogger('ApiClient');

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests (for httpOnly cookie auth)
});

// ===========================
// HTTP Helper Functions (MP-04)
// Reduces boilerplate by wrapping common axios patterns
// ===========================

/**
 * Generic GET request helper
 * @param url - The endpoint URL
 * @param params - Query parameters
 * @param config - Additional axios config
 * @returns The response data
 */
const get = async <T>(
  url: string,
  params?: Record<string, any>,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await api.get<T>(url, { ...config, params });
  return response.data;
};

/**
 * Generic POST request helper
 * @param url - The endpoint URL
 * @param data - Request body data
 * @param config - Additional axios config
 * @returns The response data
 */
const post = async <T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await api.post<T>(url, data, config);
  return response.data;
};

/**
 * Generic PATCH request helper
 * @param url - The endpoint URL
 * @param data - Request body data
 * @param config - Additional axios config
 * @returns The response data
 */
const patch = async <T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await api.patch<T>(url, data, config);
  return response.data;
};

/**
 * Generic PUT request helper
 * @param url - The endpoint URL
 * @param data - Request body data
 * @param config - Additional axios config
 * @returns The response data
 */
const put = async <T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await api.put<T>(url, data, config);
  return response.data;
};

/**
 * Generic DELETE request helper
 * @param url - The endpoint URL
 * @param config - Additional axios config
 */
const del = async (url: string, config?: AxiosRequestConfig): Promise<void> => {
  await api.delete(url, config);
};

/**
 * Paginated GET request helper
 * Automatically unwraps the `results` array from paginated responses
 * @param url - The endpoint URL
 * @param params - Query parameters
 * @returns The unwrapped results array
 */
const getPaginated = async <T>(
  url: string,
  params?: Record<string, any>
): Promise<T[]> => {
  const response = await api.get<PaginatedResponse<T>>(url, { params });
  return response.data.results;
};

/**
 * GET request with AbortSignal support
 * Useful for cancellable requests (e.g., search-as-you-type)
 */
const getWithSignal = async <T>(
  url: string,
  params?: Record<string, any>,
  signal?: AbortSignal
): Promise<T> => {
  const response = await api.get<T>(url, { params, signal });
  return response.data;
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
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
      // Clear legacy localStorage tokens
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
  register: (data: UserRegistration) => post<User>('/auth/register/', data),

  // Login user (JWT)
  login: (data: UserLogin) => post<AuthTokens>('/auth/login/', data),

  // Logout user
  logout: async () => {
    try {
      // Call backend to clear httpOnly cookies
      await post('/auth/logout/');
    } catch (error) {
      log.error('Logout failed', error);
    }
    // Clear legacy localStorage tokens
    tokenStorage.clearTokens();
  },

  // Refresh access token (deprecated; tokens are refreshed via httpOnly cookies)
  refreshToken: (refreshToken: string) =>
    post<{ access: string }>('/auth/refresh/', { refresh: refreshToken }),

  // Get current user
  getCurrentUser: () => get<User>('/auth/me/'),

  // Google OAuth login
  googleLogin: async (accessToken: string): Promise<{ user: User }> => {
    const { user } = await post<{ user: User }>('/auth/google/', { access_token: accessToken });

    // Clear legacy localStorage tokens
    tokenStorage.clearTokens();

    return { user };
  },

  // Update profile (for username, bio, etc.)
  updateProfile: (data: UserUpdate) => patch<User>('/auth/me/', data),

  // Change password
  changePassword: (data: { old_password: string; new_password: string }) =>
    post('/auth/change-password/', data),

  // Get public profile by username
  getUserByUsername: (username: string) => get<User>(`/auth/users/${username}/`),
};

// ===========================
// User API
// ===========================

export const userApi = {
  // Get user profile
  getProfile: () => get<User>('/auth/me/'),

  // Update user profile
  updateProfile: (data: UserUpdate) => patch<User>('/auth/me/', data),

  // Change password
  changePassword: (oldPassword: string, newPassword: string) =>
    post('/auth/change-password/', { old_password: oldPassword, new_password: newPassword }),

  // Get user by ID
  getById: (userId: number) => get<User>(`/auth/users/${userId}/`),

  // Get user profile by username or ID (Phase 1: Social Features)
  getUserProfile: (usernameOrId: string | number) =>
    get<UserProfile>(`/auth/users/${usernameOrId}/profile/`),

  // Get user activity by username or ID (Phase 1: Social Features)
  getUserActivity: (usernameOrId: string | number, limit: number = 20) =>
    get<UserActivityResponse>(`/auth/users/${usernameOrId}/activity/`, { limit }),

  // Get current user's settings (Phase 1: Social Features)
  getSettings: () => get<UserSettings>('/auth/me/settings/'),

  // Update current user's settings (Phase 1: Social Features)
  updateSettings: (data: Partial<UserSettings>) =>
    patch<UserSettings>('/auth/me/settings/', data),

  // Follow Management
  followUser: (username: string) => post(`/auth/follow/${username}/`),

  unfollowUser: (username: string) => del(`/auth/unfollow/${username}/`),

  // Followers/Following Lists
  getMyFollowers: () => getPaginated<FollowUser>('/auth/me/followers/'),

  getMyFollowing: () => getPaginated<FollowUser>('/auth/me/following/'),

  getUserFollowers: (username: string) => getPaginated<FollowUser>(`/auth/users/${username}/followers/`),

  getUserFollowing: (username: string) => getPaginated<FollowUser>(`/auth/users/${username}/following/`),

  // Enhanced Activity Feed (NEW: Optimized endpoint using Activity table)
  getActivityFeed: (limit: number = 50) => get<ActivityFeedResponse>('/activity/feed/', { limit }),
};

// ===========================
// Cafe API
// ===========================

export const cafeApi = {
  // Get nearby cafes (database only)
  getNearby: (params: NearbyCafesParams, signal?: AbortSignal) =>
    getWithSignal<Cafe[]>('/cafes/nearby/', params, signal),

  // NEW: Get all nearby cafes (database + Google Places)
  getAllNearby: (params: NearbyCafesParams, signal?: AbortSignal) =>
    getWithSignal<{
      count: number;
      registered_count: number;
      unregistered_count: number;
      results: Cafe[];
    }>('/cafes/nearby/all/', params, signal),

  // Search cafes
  search: (query: string) => getPaginated<Cafe>('/cafes/', { search: query }),

  // Get all cafes (with optional filters)
  getAll: (params?: {
    search?: string;
    ordering?: string;
    limit?: number;
    offset?: number;
  }) => getPaginated<Cafe>('/cafes/', params),

  // Get cafe by ID
  getById: (id: number) => get<Cafe>(`/cafes/${id}/`),

  // Create new cafe
  create: (data: CafeCreate) => post<Cafe>('/cafes/', data),

  // Update cafe
  update: (id: number, data: CafeUpdate) => patch<Cafe>(`/cafes/${id}/`, data),

  toggleFavorite: async (cafeId: number | undefined) => {
    if (cafeId === undefined || cafeId === null) {
      throw new Error('Cannot favorite unregistered cafes. Please log a visit first to register this cafe.');
    }

    const favoritesList = await get<Favorite[]>('/cafes/favorites/');
    const existing = favoritesList.find((fav: any) => fav.cafe.id === cafeId);

    if (existing) {
      await del(`/cafes/favorites/${existing.id}/`);
      return { is_favorited: false };
    } else {
      return post<{ is_favorited: boolean } & Favorite>('/cafes/favorites/', { cafe_id: cafeId });
    }
  },

  // Get user's favorite cafes
  getFavorites: () => getPaginated<Favorite>('/cafes/favorites/'),

  // Refresh Google rating for a cafe
  refreshGoogleRating: (cafeId: number) =>
    post<{
      google_rating: number | null;
      google_ratings_count: number | null;
      google_rating_updated_at: string | null;
    }>(`/cafes/${cafeId}/refresh-google-rating/`),

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
  create: (data: VisitCreate) => post<Visit>('/visits/', data),

  // NEW: Create visit with optional review in one request
  createWithReview: (data: CombinedVisitReviewCreate) =>
    post<{
      visit: Visit;
      review: Review | null;
      message: string;
    }>('/visits/create-with-review/', data),

  // Get user's visits (backend filters by current user automatically)
  getMyVisits: (page: number = 1) =>
    get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: Visit[];
    }>('/visits/', { page }),

  // Get visits with filters (for duplicate checking, etc.)
  getVisits: (filters?: { cafe?: number; visit_date?: string; page?: number }) =>
    get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: Visit[];
    }>('/visits/', filters),

  // Get visit by ID
  getById: (id: number) => get<Visit>(`/visits/${id}/`),

  // Get all visits (admin/filtered)
  getAll: (params?: {
    cafe?: string;
    user?: number;
    ordering?: string;
  }) => getPaginated<Visit>('/visits/', params),

  // Update visit
  update: (id: number, data: Partial<VisitCreate>) => patch<Visit>(`/visits/${id}/`, data),

  // Delete visit
  delete: (id: number) => del(`/visits/${id}/`),
};

// ===========================
// Review API
// ===========================

export const reviewApi = {
  // Create new review
  create: (data: ReviewCreate) => post<Review>('/reviews/create/', data),

  // Get reviews for a cafe
  getByCafe: (cafeId: number, page: number = 1) =>
    get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: Review[];
    }>('/reviews/', { cafe: cafeId, page }),

  // Get review by ID
  getById: (id: number) => get<Review>(`/reviews/${id}/`),

  // Update review
  update: (id: number, data: ReviewUpdate) => patch<Review>(`/reviews/${id}/`, data),

  // Delete review
  delete: (id: number) => del(`/reviews/${id}/`),

  // Get user's reviews
  getMyReviews: () => getPaginated<Review>('/reviews/me/'),

  // NEW: Check if user has a review for a specific cafe
  getUserCafeReview: async (cafeId: number): Promise<Review | null> => {
    try {
      return await get<Review>('/reviews/for-cafe/', { cafe: cafeId });
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
    const response = await post<Record<string, Review | null>>('/reviews/bulk/', {
      cafe_ids: cafeIds,
    });

    // Convert string keys back to numbers
    const result: Record<number, Review | null> = {};
    for (const [key, value] of Object.entries(response)) {
      result[parseInt(key)] = value;
    }
    return result;
  },

  // Mark review as helpful (toggle - marks or unmarks)
  markHelpful: (reviewId: number) => post(`/reviews/${reviewId}/mark_helpful/`),

  // Flag review
  flagReview: (reviewId: number, reason: string, description?: string) =>
    post('/reviews/flags/', {
      review_id: reviewId,
      reason,
      comment: description || '',
    }),
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

  // Log error details (logger handles dev/prod filtering)
  log.error('API Error', new Error(apiError.message));
  log.debug('API Error details', {
    code: apiError.code,
    message: apiError.message,
    details: apiError.details,
    status: apiError.status,
  });

  return apiError.message;
};

/**
 * Get full API error info (code, message, details).
 * Useful for programmatic error handling.
 */
export const getApiError = (error: any): ApiError => {
  return extractApiError(error);
};
