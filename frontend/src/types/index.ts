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
// Cafe Types
// ===========================

export interface AverageRatings {
  wifi_quality: number;
  power_outlets_rating: number;
  seating_comfort: number;
  noise_level: number;
  wfc_rating: number;
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
  distance?: string;
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
  amount_spent?: number | null;  // New field
  visit_time?: number | null;    // New field (1=Morning, 2=Afternoon, 3=Evening)
  check_in_latitude?: string;
  check_in_longitude?: string;
  created_at: string;
  updated_at: string;
  has_review: boolean;
  can_review: boolean;
  days_until_review_deadline?: number;
}

export interface VisitCreate {
  // Scenario 1: Existing registered cafe
  cafe_id?: number; // Cafe integer ID

  // Scenario 2: Unregistered cafe from Google Places (auto-registers on visit)
  google_place_id?: string;
  cafe_name?: string;
  cafe_address?: string;
  cafe_latitude?: number;  // Changed to number to match backend DecimalField
  cafe_longitude?: number; // Changed to number to match backend DecimalField

  // Common fields
  visit_date: string; // ISO date string
  amount_spent?: number | null;  // New field
  visit_time?: number | null;    // New field

  // REQUIRED: Check-in location for visit verification (within 1km of cafe)
  check_in_latitude: number;
  check_in_longitude: number;
}

// Combined Visit + Review Creation (new simplified flow)
export interface CombinedVisitReviewCreate {
  // Scenario 1: Existing registered cafe
  cafe_id?: number;

  // Scenario 2: Unregistered cafe from Google Places (auto-registers on visit)
  google_place_id?: string;
  cafe_name?: string;
  cafe_address?: string;
  cafe_latitude?: number;
  cafe_longitude?: number;

  // Common fields
  visit_date: string;
  amount_spent?: number | null;
  visit_time?: number | null;
  check_in_latitude?: number;
  check_in_longitude?: number;
  include_review: boolean;
  wfc_rating?: number;
  wifi_quality?: number;
  power_outlets_rating?: number;
  seating_comfort?: number;
  noise_level?: number;
  comment?: string;
}

// ===========================
// Review Types
// ===========================

export interface Review {
  id: number;
  visit: Visit;
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
  visit_id: number;

  // WFC Ratings (1-5)
  wifi_quality: number;
  power_outlets_rating?: number;
  noise_level: number;
  seating_comfort: number;
  space_availability: number;
  coffee_quality: number;
  menu_options: number;
  bathroom_quality?: number;

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