import type { Cafe } from './index';

export interface CafeList {
  id: number;
  name: string;
  description: string;
  is_default: boolean;
  is_public: boolean;
  item_count: number;
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
}

export interface CafeListMembership {
  id: number;
  name: string;
  is_default: boolean;
  in_list: boolean;
}

export interface CafeListCreate {
  name: string;
  description?: string;
}

export interface CafeListUpdate {
  name?: string;
  description?: string;
}
