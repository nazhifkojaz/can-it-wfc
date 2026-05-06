import { CafeFilters, DEFAULT_FILTERS } from '../types/filters';
import { PRICE_RANGE_LABELS } from '../config/constants';

export const FILTER_PARAM_KEYS = [
  'min_wifi', 'max_noise', 'min_power', 'min_seating', 'min_wfc',
  'price', 'hide_closed', 'verified', 'min_reviews', 'include_unregistered',
] as const;

/** Convert CafeFilters to backend API query params (only sends non-default values). */
export function filtersToApiParams(filters: CafeFilters): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};
  if (filters.min_wifi !== undefined) params.min_wifi = filters.min_wifi;
  if (filters.max_noise !== undefined) params.max_noise = filters.max_noise;
  if (filters.min_power !== undefined) params.min_power = filters.min_power;
  if (filters.min_seating !== undefined) params.min_seating = filters.min_seating;
  if (filters.min_wfc !== undefined) params.min_wfc = filters.min_wfc;
  if (filters.price && filters.price.length > 0) params.price = filters.price.join(',');
  if (!filters.hide_closed) params.hide_closed = false;
  if (filters.verified) params.verified = true;
  if (filters.min_reviews > 0) params.min_reviews = filters.min_reviews;
  if (!filters.include_unregistered) params.include_unregistered = false;
  return params;
}

/** Convert CafeFilters to URL query params (omits default values for clean URLs). */
export function filtersToParams(filters: CafeFilters): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filtersToApiParams(filters)).map(([k, v]) => [k, String(v)])
  );
}

/** Parse URL search params back into CafeFilters, falling back to defaults. */
export function paramsToFilters(params: URLSearchParams): CafeFilters {
  const filters: CafeFilters = { ...DEFAULT_FILTERS };

  const minWifi = params.get('min_wifi');
  if (minWifi) filters.min_wifi = Number(minWifi);

  const maxNoise = params.get('max_noise');
  if (maxNoise) filters.max_noise = Number(maxNoise);

  const minPower = params.get('min_power');
  if (minPower) filters.min_power = Number(minPower);

  const minSeating = params.get('min_seating');
  if (minSeating) filters.min_seating = Number(minSeating);

  const minWfc = params.get('min_wfc');
  if (minWfc) filters.min_wfc = Number(minWfc);

  const price = params.get('price');
  if (price) {
    const parsed = price.split(',').map(Number).filter(n => n >= 1 && n <= 4);
    if (parsed.length > 0) filters.price = parsed;
  }

  if (params.get('hide_closed') === 'false') filters.hide_closed = false;
  if (params.get('verified') === 'true') filters.verified = true;

  const minReviews = params.get('min_reviews');
  if (minReviews) filters.min_reviews = Number(minReviews);

  if (params.get('include_unregistered') === 'false') filters.include_unregistered = false;

  return filters;
}

/** Return the set of active filters as displayable chip descriptors. */
export function getActiveChips(filters: CafeFilters): Array<{ key: keyof CafeFilters; label: string }> {
  const chips: Array<{ key: keyof CafeFilters; label: string }> = [];
  if (filters.min_wifi !== undefined) chips.push({ key: 'min_wifi', label: `WiFi ≥ ${filters.min_wifi}` });
  if (filters.max_noise !== undefined) chips.push({ key: 'max_noise', label: `Noise ≤ ${filters.max_noise}` });
  if (filters.min_power !== undefined) chips.push({ key: 'min_power', label: `Power ≥ ${filters.min_power}` });
  if (filters.min_seating !== undefined) chips.push({ key: 'min_seating', label: `Seating ≥ ${filters.min_seating}` });
  if (filters.min_wfc !== undefined) chips.push({ key: 'min_wfc', label: `WFC ≥ ${filters.min_wfc}` });
  if (filters.price && filters.price.length > 0) {
    chips.push({ key: 'price', label: filters.price.map(p => PRICE_RANGE_LABELS[p as keyof typeof PRICE_RANGE_LABELS]).join(' ') });
  }
  if (!filters.hide_closed) chips.push({ key: 'hide_closed', label: 'Show Closed' });
  if (filters.verified) chips.push({ key: 'verified', label: 'Verified Only' });
  if (filters.min_reviews > 0) chips.push({ key: 'min_reviews', label: `${filters.min_reviews}+ Reviews` });
  if (!filters.include_unregistered) chips.push({ key: 'include_unregistered', label: 'Registered Only' });
  return chips;
}
