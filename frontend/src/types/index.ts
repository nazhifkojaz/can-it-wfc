// ===========================
// User Types
// ===========================

export interface User {
  id: number;
  username: string;
  email: string;
  display_name: string;
  bio: string;
  avatar_url?: string;
  is_anonymous_display: boolean;
  total_reviews: number;
  total_visits: number;
  followers_count?: number;
  following_count?: number;
  date_joined: string;
  account_age_hours?: number;
}

export interface UserRegistration {
  username: string;
  email: string;
  password: string;
  password2: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface UserUpdate {
  username?: string;
  bio?: string;
  avatar_url?: string;
  is_anonymous_display?: boolean;
}

// ===========================
// API Response Types
// ===========================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ===========================
// User Settings & Profile Types (Phase 1: Social Features)
// ===========================

export interface UserSettings {
  profile_visibility: 'public' | 'private';
  show_activity_dates: boolean;
  show_followers: boolean;
  show_following: boolean;
  activity_visibility: 'public' | 'followers' | 'private';
}

export interface UserProfile {
  id: number;
  username: string;
  display_name: string;
  bio: string;
  avatar_url?: string;
  total_reviews: number;
  total_visits: number;
  followers_count: number;
  following_count: number;
  date_joined: string;
  settings?: UserSettings;
  is_own_profile?: boolean;
  is_following?: boolean;
  is_followed_by?: boolean;
  // For private profiles
  profile_visibility?: 'private';
  message?: string;
}

export interface UserActivityItem {
  id: number;
  type: 'visit' | 'review';
  cafe_id: number;
  cafe_name: string;
  cafe_google_place_id: string | null;
  date: string | null; // Hidden if show_activity_dates=false
  created_at: string;
  // Review-specific fields (null for visits)
  wfc_rating?: number | null;
  comment?: string | null;
  // Visit-specific fields (null for reviews)
  visit_time?: number | null;
  amount_spent?: number | null;
  currency?: string | null;
}

export interface UserActivityResponse {
  user_id: number;
  username: string;
  activity: UserActivityItem[];
  message?: string; // For private profiles
}

export type ActivityType =
  | 'own_visit'
  | 'own_review'
  | 'following_visit'
  | 'following_review'
  | 'new_follower'
  | 'following_followed';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  created_at: string;

  // Actor (who did the action)
  actor_username?: string;
  actor_display_name?: string;
  actor_avatar_url?: string;

  // Target (for follows)
  target_username?: string;
  target_display_name?: string;
  target_avatar_url?: string;

  // Cafe (for cafe activities)
  cafe_id?: number;
  cafe_name?: string;
  cafe_google_place_id?: string | null;

  // Activity details
  wfc_rating?: number | null;
  comment?: string | null;
  visit_time?: number | null;
  amount_spent?: number | null;
  currency?: string | null;
}

export interface ActivityFeedResponse {
  activities: ActivityItem[];
  count: number;
}

export interface FollowUser {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio: string;
  total_visits: number;
  total_reviews: number;
  is_following?: boolean;
}

// ===========================
// Cafe Types
// ===========================

export interface AverageRatings {
  wifi_quality: number;
  power_outlets_rating: number;
  seating_comfort: number;
  noise_level: number;
  wfc_rating: number;
}

export interface FacilityOption {
  yes: number;
  no: number;
  unknown: number;
  yes_percentage: number;
  no_percentage: number;
  unknown_percentage: number;
}

export interface FacilityStats {
  smoking_area: FacilityOption;
  prayer_room: FacilityOption;
}

export interface Cafe {
  id: number;  // Backend uses integer ID (AutoField), not UUID
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  google_place_id?: string;
  price_range?: 1 | 2 | 3 | 4;
  total_visits: number;
  unique_visitors: number;
  total_reviews: number;
  average_wfc_rating?: string;
  is_closed: boolean;
  is_verified: boolean;
  created_by?: User;
  created_at?: string;  // Optional - null for unregistered cafes
  updated_at?: string;  // Optional - null for unregistered cafes
  distance?: number | string;  // Numeric from API, string for backward compat
  is_favorited?: boolean;

  // NEW: Registration status
  is_registered: boolean;  // true = in database, false = from Google Places only
  source: 'database' | 'google_places';

  // NEW: Google Places data (only for unregistered cafes)
  google_rating?: number;
  google_ratings_count?: number;
  is_open_now?: boolean;

  // NEW: Average ratings breakdown (only for registered cafes with reviews)
  average_ratings?: AverageRatings | null;

  // NEW: Facility statistics (smoking area, prayer room)
  facility_stats?: FacilityStats | null;
}

export interface CafeCreate {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  google_place_id?: string;
  price_range?: 1 | 2 | 3 | 4;
}

export interface CafeUpdate {
  name?: string;
  address?: string;
  price_range?: 1 | 2 | 3 | 4;
  is_closed?: boolean;
}

export interface NearbyCafesParams {
  latitude: number;       // Search center latitude
  longitude: number;      // Search center longitude
  radius_km?: number;
  limit?: number;
  user_latitude?: number;  // User's actual location (for distance calculation)
  user_longitude?: number; // User's actual location (for distance calculation)
}

// ===========================
// Visit Types
// ===========================

export interface Visit {
  id: number;  // Backend uses integer ID, not UUID
  cafe: Cafe;
  user: User;
  visit_date: string;
  amount_spent?: number | null;
  currency?: string | null;  // Currency code (e.g., USD, IDR, SGD)
  visit_time?: number | null;  // (1=Morning, 2=Afternoon, 3=Evening)
  check_in_latitude?: string;
  check_in_longitude?: string;
  created_at: string;
  updated_at: string;
  // REMOVED: has_review, can_review, days_until_review_deadline
  // Reviews are now independent of visits
}

export interface VisitCreate {
  // Scenario 1: Existing registered cafe
  cafe_id?: number; // Cafe integer ID

  // Scenario 2: Unregistered cafe from Google Places (auto-registers on visit)
  google_place_id?: string;
  cafe_name?: string;
  cafe_address?: string;
  cafe_latitude?: string;
  cafe_longitude?: string;

  // Common fields
  visit_date: string; // ISO date string
  amount_spent?: number | null;
  currency?: string | null;  // Currency code
  visit_time?: number | null;

  // REQUIRED: Check-in location for visit verification (within 1km of cafe)
  check_in_latitude: string;
  check_in_longitude: string;
}

// Combined Visit + Review Creation (new simplified flow)
export interface CombinedVisitReviewCreate {
  // Scenario 1: Existing registered cafe
  cafe_id?: number;

  // Scenario 2: Unregistered cafe from Google Places (auto-registers on visit)
  google_place_id?: string;
  cafe_name?: string;
  cafe_address?: string;
  cafe_latitude?: string;
  cafe_longitude?: string;

  // Common fields
  visit_date: string;
  amount_spent?: number | null;
  currency?: string | null;
  visit_time?: number | null;
  check_in_latitude?: string;
  check_in_longitude?: string;
  include_review: boolean;
  wfc_rating?: number;
  wifi_quality?: number;
  power_outlets_rating?: number;
  seating_comfort?: number;
  noise_level?: number;
  has_smoking_area?: boolean | null;
  has_prayer_room?: boolean | null;
  comment?: string;
}

// ===========================
// Review Types
// ===========================

export interface Review {
  id: number;
  // REMOVED: visit field - reviews are now independent of visits
  user: User;
  cafe: Cafe;

  // WFC Ratings (1-5)
  wifi_quality: number;
  power_outlets_rating?: number;
  noise_level: number;
  seating_comfort: number;
  space_availability: number;
  coffee_quality: number;
  menu_options: number;
  bathroom_quality?: number;

  // Additional facilities (three-state: true/false/null)
  has_smoking_area?: boolean | null;
  has_prayer_room?: boolean | null;

  // Overall WFC rating
  wfc_rating: number;

  // Visit time (1=morning, 2=afternoon, 3=evening)
  visit_time: number;
  visit_time_display?: string; // Computed property

  // Calculated
  average_rating?: number;

  // Text review (max 160 chars)
  comment?: string;

  // Moderation
  is_flagged: boolean;
  flag_count: number;
  is_hidden: boolean;

  // Helpful votes
  helpful_count: number;
  is_helpful: boolean; // Whether current user marked as helpful
  user_has_flagged: boolean; // Whether current user has flagged this review

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ReviewCreate {
  cafe_id: number;  // UPDATED: Changed from visit_id to cafe_id

  // WFC Ratings (1-5)
  wifi_quality: number;
  power_outlets_rating?: number;
  noise_level: number;
  seating_comfort: number;
  space_availability: number;
  coffee_quality: number;
  menu_options: number;
  bathroom_quality?: number;

  // Additional facilities (three-state: true/false/null)
  has_smoking_area?: boolean | null;
  has_prayer_room?: boolean | null;

  // Overall WFC rating (required)
  wfc_rating: number;

  // Visit time (1=morning, 2=afternoon, 3=evening)
  visit_time: number;

  // Optional text review (max 160 chars)
  comment?: string;
}

// ===========================
// Review Flag Types
// ===========================

export interface ReviewFlag {
  id: number;
  review: number;
  user: User;
  reason: string;
  created_at: string;
}

export interface ReviewUpdate {
  // WFC Ratings (1-5)
  wifi_quality?: number;
  power_outlets_rating?: number;
  noise_level?: number;
  seating_comfort?: number;
  space_availability?: number;
  coffee_quality?: number;
  menu_options?: number;
  bathroom_quality?: number;

  // Additional facilities (three-state: true/false/null)
  has_smoking_area?: boolean | null;
  has_prayer_room?: boolean | null;

  // Overall WFC rating
  wfc_rating?: number;

  // Visit time (1=morning, 2=afternoon, 3=evening)
  visit_time?: number;

  // Optional text review (max 160 chars)
  comment?: string;
}

// ===========================
// Favorite Types
// ===========================

export interface Favorite {
  id: number;
  user: User;
  cafe: Cafe;
  created_at: string;
}

// ===========================
// Location Types
// ===========================

export interface Location {
  lat: number;
  lng: number;
}

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

// ===========================
// API Response Types
// ===========================

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ===========================
// Form State Types
// ===========================

export interface LoginFormState {
  username: string;
  password: string;
}

export interface RegisterFormState {
  username: string;
  email: string;
  password: string;
  password2: string;
}

export interface ReviewFormState extends ReviewCreate {
  // Additional UI state if needed
}

// ===========================
// Filter/Sort Types
// ===========================

export type SortOption = 'distance' | 'rating' | 'visits' | 'recent';

export interface CafeFilters {
  priceRange?: (1 | 2 | 3 | 4)[];
  minRating?: number;
  hasWifi?: boolean;
  hasOutlets?: boolean;
  maxDistance?: number;
}

// ===========================
// Map Types
// ===========================

export interface MarkerData {
  id: string;
  position: [number, number];
  cafe: Cafe;
  status: 'visited' | 'reviewed' | 'new';
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// ===========================
// UI State Types
// ===========================

export type ViewMode = 'map' | 'list';

export interface BottomSheetState {
  isOpen: boolean;
  cafe: Cafe | null;
}

export interface ModalState {
  isOpen: boolean;
  type: 'add-visit' | 'review' | 'edit-profile' | null;
  data?: any;
}

// ===========================
// Stats Types
// ===========================

export interface UserStats {
  total_visits: number;
  total_reviews: number;
  favorite_cafes: number;
  avg_wfc_rating: number;
  most_visited_cafe?: Cafe;
}

export interface CafeStats {
  wifi_quality_avg: number;
  power_outlets_avg: number;
  noise_level_avg: number;
  seating_comfort_avg: number;
  menu_selection_avg: number;
  price_value_avg: number;
  overall_avg: number;
}

// ===========================
// Notification Types
// ===========================

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

// ===========================
// Time Periods
// ===========================

export enum TimePeriod {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
}

// ===========================
// Price Range
// ===========================

export enum PriceRange {
  BUDGET = 1,
  MODERATE = 2,
  UPSCALE = 3,
  LUXURY = 4,
}

// ===========================
// Helper Type Guards
// ===========================

export function isUser(obj: any): obj is User {
  return obj && typeof obj.id === 'number' && typeof obj.username === 'string';
}

export function isCafe(obj: any): obj is Cafe {
  return obj && typeof obj.id === 'number' && typeof obj.name === 'string';
}

export function isReview(obj: any): obj is Review {
  return obj && typeof obj.id === 'number' && typeof obj.average_rating === 'number';
}

// ===========================
// Utility Types
// ===========================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};
