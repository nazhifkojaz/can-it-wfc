/**
 * Application-wide constants
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  TIMEOUT: 60000, // 60 seconds (increased for Google Places API integration)
} as const;

// Token Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

// Map Configuration
export const MAP_CONFIG = {
  DEFAULT_CENTER: { lat: -6.2088, lng: 106.8456 }, // Jakarta
  DEFAULT_ZOOM: 13,
  NEARBY_RADIUS_KM: 5,
  MAX_NEARBY_RADIUS_KM: 10,
  TILE_LAYER_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  TILE_LAYER_ATTRIBUTION: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  CAFE_LIST_LIMIT: 50,
  MAP_CAFE_LIMIT: 100,
} as const;

// Review Configuration
export const REVIEW_CONFIG = {
  MAX_COMMENT_LENGTH: 160,
  DAYS_TO_REVIEW_AFTER_VISIT: 3,
  RATING_MIN: 1,
  RATING_MAX: 5,
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  REVIEWS_PER_HOUR: 10,
  MAX_REVIEWS_PER_DAY: 10,
} as const;

// Distance Configuration
export const DISTANCE_CONFIG = {
  CHECK_IN_VERIFICATION_RADIUS_KM: 1.0,
  DUPLICATE_CAFE_THRESHOLD_METERS: 50,
} as const;

// UI Configuration
export const UI_CONFIG = {
  DEBOUNCE_DELAY_MS: 300,
  TOAST_DURATION_MS: 3000,
  MODAL_ANIMATION_DURATION_MS: 200,
} as const;

// Visit Time Options
export const VISIT_TIME = {
  MORNING: 1,
  AFTERNOON: 2,
  EVENING: 3,
} as const;

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

// Amount Spent Ranges
export const AMOUNT_SPENT_RANGES = [
  { value: 2.5, label: 'Under $5' },
  { value: 7.5, label: '$5 - $10' },
  { value: 12.5, label: '$10 - $15' },
  { value: 17.5, label: '$15 - $20' },
  { value: 25, label: 'Over $20' },
] as const;

// Price Range
export const PRICE_RANGE = {
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

// Review Flag Reasons
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
