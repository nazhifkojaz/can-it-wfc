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
  total_reviews: number;
  total_visits: number;
  followers_count?: number;
  following_count?: number;
  date_joined: string;
  account_age_hours?: number;
  settings?: UserSettings;
}

export interface UserUpdate {
  username?: string;
  display_name?: string; // Customizable display name (always editable)
  bio?: string;
  avatar_url?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface UserSettings {
  profile_visibility: 'public' | 'private';
  show_followers: boolean;
  show_following: boolean;
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
  follow_status?: 'none' | 'active' | 'pending' | 'rejected';
  profile_visibility?: 'private';
  message?: string;
}

export interface FollowUser extends UserBase {
  bio: string;
  total_visits: number;
  total_reviews: number;
  is_following?: boolean;
  follow_status?: string;
}

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

export type PlaceCategory = 'cafe' | 'coworking_space' | 'library';
export type PlaceCategoryConfidence = 'high' | 'medium' | 'low';

export interface UnregisteredCafeRegistrationPayload {
  google_place_id: string;
  cafe_name: string;
  cafe_address: string;
  cafe_latitude: string;
  cafe_longitude: string;
  place_category?: PlaceCategory;
}

export type CafeListItemRegistrationCreate = UnregisteredCafeRegistrationPayload & {
  note?: string;
};

export interface Cafe {
  id: number;  // Backend uses integer ID (AutoField), not UUID
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  google_place_id?: string;
  place_category?: PlaceCategory;
  place_category_label?: string;
  place_category_confidence?: PlaceCategoryConfidence;
  provider_types?: string[];
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
  saved_by_count?: number;     // How many distinct users saved this cafe to any list

  // NEW: Registration status
  is_registered: boolean;  // true = in database, false = from Google Places only
  source: 'database' | 'google_places';
  provider?: string;  // e.g. 'google'

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
  place_category?: PlaceCategory;
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
  include_unregistered?: boolean;
  categories?: string;
}

export interface NearbyCafesResponse {
  count: number;
  registered_count: number;
  unregistered_count: number;
  results: Cafe[];
}

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

export interface VisitCreate extends Partial<UnregisteredCafeRegistrationPayload> {
  // Scenario 1: Existing registered cafe
  cafe_id?: number; // Cafe integer ID

  // Scenario 2: optional UnregisteredCafeRegistrationPayload fields auto-register Google Places cafes.

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
export interface CombinedVisitReviewCreate extends Partial<UnregisteredCafeRegistrationPayload> {
  // Scenario 1: Existing registered cafe
  cafe_id?: number;

  // Scenario 2: optional UnregisteredCafeRegistrationPayload fields auto-register Google Places cafes.

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

export type {
  CafeList,
  CafeListItem,
  CafeListDetail,
  CafeListMembership,
  CafeListOwnerSummary,
  CafeListPreviewCafe,
  CafeListCreate,
  CafeListUpdate,
  SaveListResponse,
  SavedListsResponse,
} from './lists';

export type {
  DiscoverReview,
  DiscoverFeaturedList,
  DiscoverTrendingCafe,
  DiscoverTrendingList,
  FeaturedListsResponse,
  TrendingCafesResponse,
  TrendingListsResponse,
} from './discover';

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
  place_category?: PlaceCategory | null;
  place_category_label?: string;
  place_category_confidence?: PlaceCategoryConfidence;
  provider_types?: string[];
  average_wfc_rating?: number;
  total_reviews?: number;
  total_visits?: number;
  source: 'database' | 'google';
  provider?: string;  // e.g. 'google'
  result_type: 'cafe' | 'location';
  match_score?: number | null;  // 0-1 trigram similarity (DB results only)
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  total_results: number;
}
