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
