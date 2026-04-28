export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || (() => {
    if (import.meta.env.PROD) {
      throw new Error('VITE_API_URL environment variable is required in production');
    }
    return 'http://localhost:8000/api';
  })(),
  TIMEOUT: 60000,
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

export const REVIEW_CONFIG = {
  MAX_COMMENT_LENGTH: 160,
  DAYS_TO_REVIEW_AFTER_VISIT: 3,
  RATING_MIN: 1,
  RATING_MAX: 5,
} as const;

export const VISIT_TIME = {
  MORNING: 1,
  AFTERNOON: 2,
  EVENING: 3,
} as const;

export const VISIT_TIME_ANALYTICS_MAP: Record<number, 'morning' | 'afternoon' | 'evening'> = {
  [VISIT_TIME.MORNING]: 'morning',
  [VISIT_TIME.AFTERNOON]: 'afternoon',
  [VISIT_TIME.EVENING]: 'evening',
};

export const VISIT_TIME_LABELS = {
  [VISIT_TIME.MORNING]: 'Morning (6AM - 12PM)',
  [VISIT_TIME.AFTERNOON]: 'Afternoon (12PM - 6PM)',
  [VISIT_TIME.EVENING]: 'Evening (6PM - 12AM)',
} as const;

export const VISIT_TIME_OPTIONS = [
  { value: VISIT_TIME.MORNING, label: VISIT_TIME_LABELS[VISIT_TIME.MORNING] },
  { value: VISIT_TIME.AFTERNOON, label: VISIT_TIME_LABELS[VISIT_TIME.AFTERNOON] },
  { value: VISIT_TIME.EVENING, label: VISIT_TIME_LABELS[VISIT_TIME.EVENING] },
] as const;

const PRICE_RANGE = {
  BUDGET: 1,
  MODERATE: 2,
  UPSCALE: 3,
  LUXURY: 4,
} as const;

export const PRICE_RANGE_LABELS = {
  [PRICE_RANGE.BUDGET]: '$',
  [PRICE_RANGE.MODERATE]: '$$',
  [PRICE_RANGE.UPSCALE]: '$$$',
  [PRICE_RANGE.LUXURY]: '$$$$',
} as const;

export const FLAG_REASONS = {
  SPAM: 'spam',
  INAPPROPRIATE: 'inappropriate',
  FAKE: 'fake',
  OTHER: 'other',
} as const;

export const FLAG_REASON_LABELS = {
  [FLAG_REASONS.SPAM]: 'Spam',
  [FLAG_REASONS.INAPPROPRIATE]: 'Inappropriate content',
  [FLAG_REASONS.FAKE]: 'Fake review',
  [FLAG_REASONS.OTHER]: 'Other',
} as const;
