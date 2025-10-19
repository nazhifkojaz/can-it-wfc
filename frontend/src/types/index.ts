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
  bio?: string;
  avatar_url?: string;
  is_anonymous_display?: boolean;
}

// Cafe Types
export interface Cafe {
  id: string;
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
  created_at: string;
  updated_at: string;
  distance?: string;
  is_favorited?: boolean;
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
}

export interface NearbyCafesParams {
  latitude: number;
  longitude: number;
  radius_km?: number;
  limit?: number;
}

// Visit Types
export interface Visit {
  id: string;
  cafe: Cafe;
  user: User;
  visit_date: string;
  check_in_latitude?: string;
  check_in_longitude?: string;
  has_review: boolean;
  created_at: string;
}

export interface VisitCreate {
  cafe_id: string;
  visit_date: string;
  check_in_latitude?: string;
  check_in_longitude?: string;
}

// Review Types
export type VisitTime = 1 | 2 | 3;

export interface Review {
  id: string;
  user: User;
  cafe: Cafe;
  visit?: Visit;
  wifi_quality: number;
  power_outlets_rating?: number;
  noise_level: number;
  seating_comfort: number;
  space_availability: number;
  coffee_quality: number;
  menu_options: number;
  bathroom_quality?: number;
  wfc_rating: number;
  visit_time: VisitTime;
  visit_time_display: string;
  comment?: string;
  average_rating: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewCreate {
  visit_id: string;
  wifi_quality: number;
  power_outlets_rating?: number;
  noise_level: number;
  seating_comfort: number;
  space_availability: number;
  coffee_quality: number;
  menu_options: number;
  bathroom_quality?: number;
  wfc_rating: number;
  visit_time: VisitTime;
  comment?: string;
}

export interface ReviewUpdate {
  wifi_quality?: number;
  power_outlets_rating?: number;
  noise_level?: number;
  seating_comfort?: number;
  space_availability?: number;
  coffee_quality?: number;
  menu_options?: number;
  bathroom_quality?: number;
  wfc_rating?: number;
  visit_time?: VisitTime;
  comment?: string;
}

export interface ReviewFlag {
  review_id: string;
  reason: 'spam' | 'inappropriate' | 'fake' | 'other';
  comment?: string;
}

// Favorite Types
export interface Favorite {
  id: number;
  cafe: Cafe;
  created_at: string;
}

// API Response Types
export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface APIError {
  detail?: string;
  [key: string]: any;
}

// Location Types
export interface LocationCoords {
  latitude: number;
  longitude: number;
}

// Map Types
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}