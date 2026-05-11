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

export type PriceLabel = 'cheaper_than_most' | 'mid_range' | 'pricier_than_most';

export interface SpendPercentile {
  rank: number;
  cluster_size: number;
  currency: string;
  label: PriceLabel;
}

export interface SpendInsight {
  primary: SpendPrimary;
  secondary?: SpendSecondary[];
  percentile?: SpendPercentile;
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

export type StickinessLabel =
  | 'beloved'
  | 'has_regulars'
  | 'discovery_phase'
  | 'steady_mix';

export interface StickinessInsight {
  ratio: number;
  label: StickinessLabel;
  active_regulars: number;
  unique_visitors: number;
  cadence_days?: number;
}

export interface GoogleDeltaInsight {
  wfc: number;
  google: number;
  delta: number;
}

export type ConsistencyLabel = 'consistent' | 'mixed' | 'polarizing';

export interface RatingDistributionInsight {
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
  n: number;
  polarized: boolean;
  consistency: ConsistencyLabel;
  top_share: number;
}

export type DayOfWeekLabel = 'weekday_heavy' | 'weekend_heavy' | 'balanced';

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface DayOfWeekInsight {
  weekday_share: number;
  weekend_share: number;
  n: number;
  label: DayOfWeekLabel;
  by_day?: Record<DayKey, number>;
}

export interface CafeInsights {
  version: number;
  ratings?: RatingsInsight;
  rating_distribution?: RatingDistributionInsight;
  spend?: SpendInsight;
  time_of_day?: TimeOfDayInsight;
  day_of_week?: DayOfWeekInsight;
  recent_activity?: RecentActivityInsight;
  stickiness?: StickinessInsight;
  google_delta?: GoogleDeltaInsight;
}

