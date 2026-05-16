import axios, { AxiosHeaders, AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import {
  User,
  UserUpdate,
  UserProfile,
  UserSettings,
  FollowUser,
  PaginatedResponse,
  Cafe,
  CafeCreate,
  CafeUpdate,
  NearbyCafesParams,
  NearbyCafesResponse,
  Visit,
  VisitCreate,
  CombinedVisitReviewCreate,
  Review,
  ReviewCreate,
  ReviewUpdate,
  CafeList,
  CafeListDetail,
  CafeListItem,
  CafeListMembership,
  CafeListCreate,
  CafeListUpdate,
  SaveListResponse,
  SavedListsResponse,
  PlaceCategory,
} from '../types';
import { CafeInsightsResponse } from '../types/insights';
import type {
  DiscoverReview,
  FeaturedListsResponse,
  TrendingCafesResponse,
  TrendingListsResponse,
} from '../types/discover';
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

let csrfToken: string | null = null;
let csrfTokenRequest: Promise<string> | null = null;
const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);

const ensureCsrfToken = async (): Promise<string> => {
  if (csrfToken) {
    return csrfToken;
  }

  if (!csrfTokenRequest) {
    csrfTokenRequest = api.get<{ csrfToken: string }>('/auth/csrf/')
      .then(response => {
        csrfToken = response.data.csrfToken;
        return csrfToken;
      })
      .finally(() => {
        csrfTokenRequest = null;
      });
  }

  return csrfTokenRequest;
};

api.interceptors.request.use(async config => {
  const method = config.method?.toLowerCase();
  if (method && unsafeMethods.has(method)) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('X-CSRFToken', await ensureCsrfToken());
    config.headers = headers;
  }
  return config;
});

/** Generic GET request helper */
const get = async <T>(
  url: string,
  params?: object,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await api.get<T>(url, { ...config, params });
  return response.data;
};

/** Generic POST request helper */
const post = async <T>(
  url: string,
  data?: object,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await api.post<T>(url, data, config);
  return response.data;
};

/** Generic PATCH request helper */
const patch = async <T>(
  url: string,
  data?: object,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await api.patch<T>(url, data, config);
  return response.data;
};

/** Generic DELETE request helper */
const del = async (url: string, config?: AxiosRequestConfig): Promise<void> => {
  await api.delete(url, config);
};

/** Paginated GET request helper — unwraps the results array */
const getPaginated = async <T>(
  url: string,
  params?: object
): Promise<T[]> => {
  const response = await api.get<PaginatedResponse<T>>(url, { params });
  return response.data.results;
};

/** GET request with AbortSignal support for cancellable requests */
const getWithSignal = async <T>(
  url: string,
  params?: object,
  signal?: AbortSignal
): Promise<T> => {
  const response = await api.get<T>(url, { params, signal });
  return response.data;
};

// Response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // If error is 401 (Unauthorized), cookies may have expired
    // Redirect to auth page
    if (error.response?.status === 401) {
      // Redirect to landing page only if not already on a public page
      const path = window.location.pathname;
      const base = import.meta.env.BASE_URL || '/';
      const normalizedBase = base === '/' ? '' : base.replace(/\/$/, '');
      const rootPaths = ['/', `${normalizedBase}/`, normalizedBase || '/'];
      const landingVariants = [2, 4].map(n => `${normalizedBase}/${n}`);
      const publicPaths = [...rootPaths, ...landingVariants];

      // Allow public resource routes that work without auth
      const listPrefix = normalizedBase ? `${normalizedBase}/list/` : '/list/';
      const userPrefix = normalizedBase ? `${normalizedBase}/user/` : '/user/';
      const isPublicRoute = publicPaths.some(p => path === p || path === `${p}/`);
      const isListRoute = path.startsWith(listPrefix);
      const isUserRoute = path.startsWith(userPrefix);

      if (!isPublicRoute && !isListRoute && !isUserRoute) {
        window.location.href = buildAppPath('/');
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  // Generic OAuth login (replaces googleLogin + password login)
  oauthLogin: async (
    provider: 'google',
    accessToken: string,
  ): Promise<{ user: User; created: boolean }> => {
    const response = await post<{ user: User; created: boolean }>(
      `/auth/oauth/${provider}/`,
      { access_token: accessToken },
    );
    return { user: response.user, created: response.created ?? false };
  },

  // Logout user
  logout: async () => {
    try {
      // Call backend to clear httpOnly cookies
      await post('/auth/logout/');
    } catch (error) {
      log.error('Logout failed', error);
    }
  },

  // Get current user
  getCurrentUser: () => get<User>('/auth/me/'),

  // Update profile (for username, bio, etc.)
  updateProfile: (data: UserUpdate) => patch<User>('/auth/me/', data),

};

export const userApi = {
  // Get user by ID
  getById: (userId: number) => get<User>(`/auth/users/${userId}/`),

  // Get user profile by username or ID (Phase 1: Social Features)
  getUserProfile: (usernameOrId: string | number) =>
    get<UserProfile>(`/auth/users/${usernameOrId}/profile/`),

  // Get current user's settings (Phase 1: Social Features)
  getSettings: () => get<UserSettings>('/auth/me/settings/'),

  // Update current user's settings (Phase 1: Social Features)
  updateSettings: (data: Partial<UserSettings>) =>
    patch<UserSettings>('/auth/me/settings/', data),

  // Saved lists
  getSavedLists: (offset: number = 0, limit: number = 20) =>
    get<SavedListsResponse>('/auth/me/saved-lists/', { offset, limit }),

  // Follow Management
  followUser: (username: string) =>
    post<{ message: string; follow_status: string; is_following: boolean }>(`/auth/follow/${username}/`),

  unfollowUser: (username: string) => del(`/auth/unfollow/${username}/`),

  // Followers/Following Lists
  getMyFollowers: () => getPaginated<FollowUser>('/auth/me/followers/'),

  getMyFollowing: () => getPaginated<FollowUser>('/auth/me/following/'),

  getUserFollowers: (username: string) => getPaginated<FollowUser>(`/auth/users/${username}/followers/`),

  getUserFollowing: (username: string) => getPaginated<FollowUser>(`/auth/users/${username}/following/`),

  // Follow Requests
  getFollowRequests: () => get<FollowUser[]>('/auth/me/follow-requests/'),

  handleFollowRequest: (userId: number, action: 'accept' | 'reject') =>
    post<{ message: string }>(`/auth/follow-requests/${userId}/handle/`, { action }),

  // Get user's public lists
  getUserLists: (username: string) => get<CafeList[]>(`/auth/users/${username}/lists/`),
};

export const cafeApi = {
  // Get nearby cafes (database only)
  getNearby: (params: NearbyCafesParams, signal?: AbortSignal) =>
    getWithSignal<Cafe[]>('/cafes/nearby/', params, signal),

  // NEW: Get all nearby cafes (database + Google Places)
  getAllNearby: (params: NearbyCafesParams, signal?: AbortSignal) =>
    getWithSignal<NearbyCafesResponse>('/cafes/nearby/all/', params, signal),

  // Count of registered cafes matching filters in area (for live match indicator)
  getNearbyCount: (params: NearbyCafesParams, signal?: AbortSignal) =>
    getWithSignal<{ count: number }>('/cafes/nearby/count/', params, signal),

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

  // Refresh Google rating for a cafe
  refreshGoogleRating: (cafeId: number) =>
    post<{
      google_rating: number | null;
      google_ratings_count: number | null;
      google_rating_updated_at: string | null;
    }>(`/cafes/${cafeId}/refresh-google-rating/`),

  getInsights: (cafeId: number) =>
    get<CafeInsightsResponse>(`/cafes/${cafeId}/insights/`),

  // Find potential duplicates (not implemented in backend API yet)
  // findDuplicates: async (name: string, latitude: number, longitude: number) => {
  //   const response = await api.get<Cafe[]>('/cafes/find_duplicates/', {
  //     params: { name, latitude, longitude },
  //   });
  //   return response.data;
  // },
};

export const listApi = {
  // Lists CRUD
  getLists: () => get<CafeList[]>('/lists/'),
  createList: (data: CafeListCreate) => post<CafeList>('/lists/', data),
  getList: (id: number, token?: string) =>
    get<CafeListDetail>(`/lists/${id}/`, token ? { token } : undefined),
  updateList: (id: number, data: CafeListUpdate) => patch<CafeList>(`/lists/${id}/`, data),
  deleteList: (id: number) => del(`/lists/${id}/`),

  // Items
  addItem: (listId: number, cafeId: number, note?: string) =>
    post<CafeListItem>(`/lists/${listId}/items/`, { cafe_id: cafeId, note }),
  removeItem: (listId: number, cafeId: number) =>
    del(`/lists/${listId}/items/${cafeId}/`),
  updateNote: (listId: number, cafeId: number, note: string) =>
    patch<CafeListItem>(`/lists/${listId}/items/${cafeId}/`, { note }),

  // Special-list convenience (bookmark-button flow)
  addToToGo: (cafeId: number) =>
    post<CafeListItem>('/lists/to-go/items/', { cafe_id: cafeId }),
  removeFromToGo: (cafeId: number) =>
    del(`/lists/to-go/items/${cafeId}/`),
  addToFavorites: (cafeId: number) =>
    post<CafeListItem>('/lists/favorites/items/', { cafe_id: cafeId }),
  removeFromFavorites: (cafeId: number) =>
    del(`/lists/favorites/items/${cafeId}/`),

  // Auto-register an unregistered cafe and add it to a list
  addItemWithRegistration: (
    listId: number,
    data: {
      google_place_id: string;
      cafe_name: string;
      cafe_address: string;
      cafe_latitude: string;
      cafe_longitude: string;
      place_category?: PlaceCategory;
      note?: string;
    }
  ) => post<CafeListItem>(`/lists/${listId}/items/`, data),

  addToToGoWithRegistration: (data: {
    google_place_id: string;
    cafe_name: string;
    cafe_address: string;
    cafe_latitude: string;
    cafe_longitude: string;
    place_category?: PlaceCategory;
  }) => post<CafeListItem>('/lists/to-go/items/', data),
  addToFavoritesWithRegistration: (data: {
    google_place_id: string;
    cafe_name: string;
    cafe_address: string;
    cafe_latitude: string;
    cafe_longitude: string;
    place_category?: PlaceCategory;
  }) => post<CafeListItem>('/lists/favorites/items/', data),

  // Membership — powers the save-to-list popover state
  getCafeMemberships: (cafeId: number) =>
    get<CafeListMembership[]>(`/cafes/${cafeId}/my-lists/`),

  // Save/unsave a public list
  save: (listId: number) =>
    post<SaveListResponse>(`/lists/${listId}/save/`),
  unsave: (listId: number) =>
    del(`/lists/${listId}/save/`),
};

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
  getMyVisits: (page: number = 1, filters?: { ordering?: string; visit_date__gte?: string; visit_date__lte?: string }) =>
    get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: Visit[];
    }>('/visits/', { page, ...filters }),

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
  getMyReviews: (page: number = 1) =>
    get<PaginatedResponse<Review>>('/reviews/me/', { page }),

  // Get another user's public reviews
  getUserReviews: (username: string, page: number = 1) =>
    get<PaginatedResponse<Review>>(`/reviews/users/${username}/reviews/`, { page }),

  // NEW: Check if user has a review for a specific cafe
  getUserCafeReview: async (cafeId: number): Promise<Review | null> => {
    try {
      return await get<Review>('/reviews/for-cafe/', { cafe: cafeId });
    } catch (error) {
      // Return null if 404 (no review found)
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 404) {
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

export const discoverApi = {
  getRecentReviews: (offset: number = 0, limit: number = 20) =>
    get<PaginatedResponse<DiscoverReview>>('/discover/recent-reviews/', { offset, limit }),

  getFeaturedLists: (limit: number = 6) =>
    get<FeaturedListsResponse>('/discover/featured-lists/', { limit }),

  getTrendingCafes: (days: number = 7, limit: number = 5) =>
    get<TrendingCafesResponse>('/discover/trending/', { days, limit }),

  getTrendingLists: (days: number = 30, limit: number = 6) =>
    get<TrendingListsResponse>('/discover/trending-lists/', { days, limit }),
};

export default api;

/** Handle API error and return user-friendly message */
export const handleApiError = (error: unknown): string => {
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

/** Get full API error info (code, message, details) */
export const getApiError = (error: unknown): ApiError => {
  return extractApiError(error);
};
