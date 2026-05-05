export interface DimensionRating {
  avg: number | null;
  n: number;
}

export interface RatingsInsight {
  wifi: DimensionRating;
  power: DimensionRating;
  noise: DimensionRating;
  seating: DimensionRating;
}

export type BestForLabel =
  | 'video_calls'
  | 'long_sessions'
  | 'focus_work'
  | 'quick_stops';

export interface SpendPrimary {
  currency: string;
  median: number;
  n: number;
}

export interface SpendSecondary {
  currency: string;
  median: number;
  n: number;
}

export interface SpendInsight {
  primary: SpendPrimary;
  secondary?: SpendSecondary[];
}

export interface CafeInsightsResponse {
  cafe_id: number;
  insights: CafeInsights;
  computed_at: string;
  exchange_rates: Record<string, number>;
}

export interface TimeDistribution {
  morning: number;
  afternoon: number;
  evening: number;
}

export interface TimeOfDayInsight {
  distribution: TimeDistribution;
  wfc_by_bucket?: Record<string, number>;
  n: number;
}

export interface RecentActivityInsight {
  visits_last_30d: number;
  as_of: string;
}

export type StickinessLabel = 'many_regulars' | 'mix' | 'mostly_first_timers';

export interface StickinessInsight {
  ratio: number;
  label: StickinessLabel;
}

export interface GoogleDeltaInsight {
  wfc: number;
  google: number;
  delta: number;
}

export interface CafeInsights {
  version: number;
  ratings?: RatingsInsight;
  best_for?: BestForLabel[];
  spend?: SpendInsight;
  time_of_day?: TimeOfDayInsight;
  recent_activity?: RecentActivityInsight;
  stickiness?: StickinessInsight;
  google_delta?: GoogleDeltaInsight;
}

