import type { CafeListOwnerSummary, CafeListPreviewCafe } from './lists';

export interface DiscoverReview {
  id: number;
  cafe: { id: number; name: string; address_short: string };
  user: { username: string; display_name: string; avatar_url: string | null };
  wfc_rating: number;
  comment: string;
  visit_time_label: string | null;
  created_at: string;
}

export interface FeaturedListsResponse {
  lists: DiscoverFeaturedList[];
}

export interface DiscoverFeaturedList {
  id: number;
  name: string;
  description: string;
  owner: CafeListOwnerSummary;
  item_count: number;
  preview_cafes: CafeListPreviewCafe[];
  featured_at: string;
  icon: string;
}

export interface TrendingCafesResponse {
  window_days: number;
  generated_at: string;
  cafes: DiscoverTrendingCafe[];
}

export interface DiscoverTrendingCafe {
  id: number;
  name: string;
  address_short: string;
  average_wfc_rating: number;
  recent_review_count: number;
  recent_visit_count: number;
  score: number;
}

export interface TrendingListsResponse {
  lists: DiscoverTrendingList[];
}

export interface DiscoverTrendingList {
  id: number;
  name: string;
  description: string;
  owner: CafeListOwnerSummary;
  item_count: number;
  preview_cafes: CafeListPreviewCafe[];
  icon: string;
  save_count: number;
  recent_save_count: number;
}
