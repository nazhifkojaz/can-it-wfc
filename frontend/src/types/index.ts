// ===========================
// User Types
// ===========================

export interface UserBase {
  id: number;
  username: string;
  display_name: string;
  effective_display_name: string;
  avatar_url?: string;
}

export interface User extends UserBase {
  email: string;
  bio: string;
  is_anonymous_display: boolean;
  total_reviews: number;
  total_visits: number;
  followers_count?: number;
  following_count?: number;
  date_joined: string;
  account_age_hours?: number;
}

export interface UserUpdate {
  username?: string;
  display_name?: string; // Customizable display name (always editable)
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

export interface UserProfile extends UserBase {
  bio: string;
  total_reviews: number;
  total_visits: number;
  followers_count: number;
  following_count: number;
  date_joined: string;
  settings?: UserSettings;
  is_own_profile?: boolean;
  is_following?: boolean;
  is_followed_by?: boolean;
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

export interface FollowUser extends UserBase {
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
  mentions: number;
  total_reviewers: number;
}

export interface FacilityStats {
  smoking_area: FacilityOption;
  prayer_room: FacilityOption;
  indoor_seating: FacilityOption;
  outdoor_seating: FacilityOption;
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
  my_lists_count?: number;     // How many of the user's lists contain this cafe

  // NEW: Registration status
  is_registered: boolean;  // true = in database, false = from Google Places only
  source: 'database' | 'google_places';

  // NEW: Google Places data (only for unregistered cafes)
  google_rating?: number | null;
  google_ratings_count?: number | null;
  google_rating_updated_at?: string | null;  // ISO timestamp for staleness detection
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
  latitude: number;
  longitude: number;
  radius_km?: number;
  limit?: number;
  user_latitude?: number;
  user_longitude?: number;
  // WFC filter params (see CafeFilters)
  min_wifi?: number;
  max_noise?: number;
  min_power?: number;
  min_seating?: number;
  min_wfc?: number;
  price?: string;        // comma-separated: "1,2"
  hide_closed?: boolean;
  verified?: boolean;
  min_reviews?: number;
}

export interface NearbyCafesResponse {
  count: number;
  registered_count: number;
  unregistered_count: number;
  results: Cafe[];
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
  has_indoor_seating?: boolean | null;
  has_outdoor_seating?: boolean | null;
  comment?: string;
}

// ===========================
// Review Types
// ===========================

export interface ReviewContent {
  wifi_quality: number;
  power_outlets_rating?: number;
  noise_level: number;
  seating_comfort: number;
  has_smoking_area?: boolean | null;
  has_prayer_room?: boolean | null;
  has_indoor_seating?: boolean | null;
  has_outdoor_seating?: boolean | null;
  wfc_rating?: number;
  visit_time: number;
  comment?: string;
}

export interface Review extends ReviewContent {
  id: number;
  user: User;
  cafe: Cafe;
  wfc_rating: number;
  visit_time_display?: string;
  average_rating?: number;
  is_flagged: boolean;
  flag_count: number;
  is_hidden: boolean;
  helpful_count: number;
  is_helpful: boolean;
  user_has_flagged: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewCreate extends ReviewContent {
  cafe_id: number;
}

export interface ReviewUpdate extends Partial<ReviewContent> {}

// ===========================
// Lists / Collections Types
// ===========================

export type {
  CafeList,
  CafeListItem,
  CafeListDetail,
  CafeListMembership,
  CafeListCreate,
  CafeListUpdate,
} from './lists';

// ===========================
// Search Types
// ===========================

export interface SearchResult {
  google_place_id: string;
  is_registered: boolean;
  db_cafe_id?: number;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  distance?: number | string;
  rating?: number;
  average_wfc_rating?: number;
  total_reviews?: number;
  total_visits?: number;
  source: 'google';
  result_type: 'cafe' | 'location';
}




