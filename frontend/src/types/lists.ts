import type { Cafe } from './index';

export type CafeListType = 'to_go' | 'favorites' | 'custom';

export interface CafeList {
  id: number;
  name: string;
  description: string;
  list_type: CafeListType;
  icon: string;
  is_default: boolean;
  visibility: 'private' | 'shareable' | 'public';
  share_token?: string | null;
  is_featured: boolean;
  save_count: number;
  item_count: number;
  owner?: { id: number; username: string; display_name: string; avatar_url: string | null };
  preview_cafes?: { id: number; name: string }[];
  created_at: string;
  updated_at: string;
}

export interface CafeListItem {
  cafe: Cafe;
  note: string;
  added_at: string;
}

export interface CafeListDetail extends CafeList {
  items: CafeListItem[];
  is_saved_by_user: boolean;
}

export interface CafeListMembership {
  id: number;
  name: string;
  list_type: CafeListType;
  icon: string;
  is_default: boolean;
  in_list: boolean;
}

export interface CafeListCreate {
  name: string;
  description?: string;
  icon?: string;
}

export interface CafeListUpdate {
  name?: string;
  description?: string;
  icon?: string;
  visibility?: 'private' | 'shareable' | 'public';
}

export interface SaveListResponse {
  id: number;
  save_count: number;
  is_saved_by_user: boolean;
  saved_at?: string;
}

export interface SavedListsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CafeList[];
}
