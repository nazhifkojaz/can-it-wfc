export interface CafeFilters {
  min_wifi?: number;           // 1–5, undefined = no filter
  max_noise?: number;          // 1–5, undefined = no filter
  min_power?: number;          // 1–5, undefined = no filter
  min_seating?: number;        // 1–5, undefined = no filter
  min_wfc?: number;            // 1–5, undefined = no filter
  price?: number[];            // subset of [1,2,3,4], undefined/empty = no filter
  hide_closed: boolean;        // default true
  verified: boolean;           // default false
  min_reviews: number;         // default 0
  include_unregistered: boolean; // default true
}

export const DEFAULT_FILTERS: CafeFilters = {
  hide_closed: true,
  verified: false,
  min_reviews: 0,
  include_unregistered: true,
};

export function countActiveFilters(filters: CafeFilters): number {
  let count = 0;
  if (filters.min_wifi !== undefined) count++;
  if (filters.max_noise !== undefined) count++;
  if (filters.min_power !== undefined) count++;
  if (filters.min_seating !== undefined) count++;
  if (filters.min_wfc !== undefined) count++;
  if (filters.price && filters.price.length > 0) count++;
  if (!filters.hide_closed) count++;
  if (filters.verified) count++;
  if (filters.min_reviews > 0) count++;
  if (!filters.include_unregistered) count++;
  return count;
}
