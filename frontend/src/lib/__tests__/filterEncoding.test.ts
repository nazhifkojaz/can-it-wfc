import { describe, it, expect } from 'vitest';
import {
  filtersToParams,
  paramsToFilters,
  filtersToApiParams,
  getActiveChips,
} from '../filterEncoding';
import { DEFAULT_FILTERS } from '../../types/filters';

describe('filtersToApiParams', () => {
  it('returns empty object for default filters', () => {
    expect(filtersToApiParams(DEFAULT_FILTERS)).toEqual({});
  });

  it('includes non-default rating filters', () => {
    const result = filtersToApiParams({ ...DEFAULT_FILTERS, min_wifi: 4 });
    expect(result).toEqual({ min_wifi: 4 });
  });

  it('excludes boolean default values', () => {
    expect(filtersToApiParams({ ...DEFAULT_FILTERS })).toEqual({});
    expect(filtersToApiParams({ ...DEFAULT_FILTERS, hide_closed: true })).toEqual({});
    expect(filtersToApiParams({ ...DEFAULT_FILTERS, verified: false })).toEqual({});
  });

  it('includes toggled boolean values', () => {
    expect(filtersToApiParams({ ...DEFAULT_FILTERS, hide_closed: false }).hide_closed).toBe(false);
    expect(filtersToApiParams({ ...DEFAULT_FILTERS, verified: true }).verified).toBe(true);
  });

  it('joins price array to comma-separated string', () => {
    const result = filtersToApiParams({ ...DEFAULT_FILTERS, price: [1, 2, 4] });
    expect(result.price).toBe('1,2,4');
  });

  it('skips empty price array', () => {
    const result = filtersToApiParams({ ...DEFAULT_FILTERS, price: [] });
    expect(result.price).toBeUndefined();
  });

  it('includes min_reviews when above 0', () => {
    expect(filtersToApiParams({ ...DEFAULT_FILTERS, min_reviews: 3 }).min_reviews).toBe(3);
    expect(filtersToApiParams({ ...DEFAULT_FILTERS, min_reviews: 0 }).min_reviews).toBeUndefined();
  });

  it('excludes include_unregistered when true (default)', () => {
    const result = filtersToApiParams({ ...DEFAULT_FILTERS, include_unregistered: true });
    expect(result.include_unregistered).toBeUndefined();
  });

  it('includes include_unregistered when false', () => {
    expect(
      filtersToApiParams({ ...DEFAULT_FILTERS, include_unregistered: false }).include_unregistered
    ).toBe(false);
  });

  it('handles multiple filters together', () => {
    const result = filtersToApiParams({
      ...DEFAULT_FILTERS,
      min_wifi: 4,
      max_noise: 2,
      min_reviews: 5,
      price: [1, 2],
    });
    expect(result).toEqual({
      min_wifi: 4,
      max_noise: 2,
      min_reviews: 5,
      price: '1,2',
    });
  });
});

describe('filtersToParams', () => {
  it('converts all values to strings', () => {
    const result = filtersToParams({ ...DEFAULT_FILTERS, min_wifi: 4, min_reviews: 3 });
    expect(result).toEqual({ min_wifi: '4', min_reviews: '3' });
  });

  it('returns empty object for defaults', () => {
    expect(filtersToParams(DEFAULT_FILTERS)).toEqual({});
  });
});

describe('paramsToFilters', () => {
  it('returns defaults for empty params', () => {
    expect(paramsToFilters(new URLSearchParams())).toEqual(DEFAULT_FILTERS);
  });

  it('parses numeric filter params', () => {
    const params = new URLSearchParams('min_wifi=4&max_noise=2&min_reviews=5');
    expect(paramsToFilters(params)).toEqual({
      ...DEFAULT_FILTERS,
      min_wifi: 4,
      max_noise: 2,
      min_reviews: 5,
    });
  });

  it('parses price comma-separated string', () => {
    const params = new URLSearchParams('price=1,3,4');
    expect(paramsToFilters(params).price).toEqual([1, 3, 4]);
  });

  it('filters out invalid price values', () => {
    const params = new URLSearchParams('price=0,2,5,9');
    expect(paramsToFilters(params).price).toEqual([2]);
  });

  it('treats empty price as undefined/default', () => {
    const params = new URLSearchParams('price=');
    expect(paramsToFilters(params).price).toBeUndefined();
  });

  it('handles boolean flags from string', () => {
    const params = new URLSearchParams('hide_closed=false&verified=true&include_unregistered=false');
    expect(paramsToFilters(params)).toEqual({
      ...DEFAULT_FILTERS,
      hide_closed: false,
      verified: true,
      include_unregistered: false,
    });
  });

  it('round-trips encode then decode correctly', () => {
    const original = { ...DEFAULT_FILTERS, min_wifi: 3, price: [1, 2], verified: true };
    const params = filtersToParams(original);
    const decoded = paramsToFilters(new URLSearchParams(params));
    expect(decoded).toEqual(original);
  });
});

describe('getActiveChips', () => {
  it('returns empty array for default filters', () => {
    expect(getActiveChips(DEFAULT_FILTERS)).toEqual([]);
  });

  it('returns chips for each non-default filter', () => {
    const filters = { ...DEFAULT_FILTERS, min_wifi: 4, max_noise: 2 };
    const chips = getActiveChips(filters);
    expect(chips).toHaveLength(2);
    expect(chips[0]).toEqual({ key: 'min_wifi', label: 'WiFi ≥ 4' });
    expect(chips[1]).toEqual({ key: 'max_noise', label: 'Noise ≤ 2' });
  });

  it('includes show-closed chip when hide_closed is false', () => {
    const chips = getActiveChips({ ...DEFAULT_FILTERS, hide_closed: false });
    expect(chips).toContainEqual({ key: 'hide_closed', label: 'Show Closed' });
  });

  it('includes verified-only chip when verified', () => {
    const chips = getActiveChips({ ...DEFAULT_FILTERS, verified: true });
    expect(chips).toContainEqual({ key: 'verified', label: 'Verified Only' });
  });

  it('includes registered-only chip when include_unregistered is false', () => {
    const chips = getActiveChips({ ...DEFAULT_FILTERS, include_unregistered: false });
    expect(chips).toContainEqual({ key: 'include_unregistered', label: 'Registered Only' });
  });

  it('maps price ranges to labels', () => {
    const chips = getActiveChips({ ...DEFAULT_FILTERS, price: [1, 3] });
    const priceChip = chips.find(c => c.key === 'price');
    expect(priceChip).toBeDefined();
    expect(priceChip!.label).toContain('$');
    expect(priceChip!.label).toContain('$$$');
  });

  it('includes all categories together', () => {
    const filters = {
      ...DEFAULT_FILTERS,
      min_wifi: 5,
      max_noise: 1,
      min_power: 3,
      min_seating: 2,
      min_wfc: 4,
      price: [1, 2, 3, 4],
      hide_closed: false,
      verified: true,
      min_reviews: 10,
      include_unregistered: false,
    };
    const chips = getActiveChips(filters);
    expect(chips).toHaveLength(10);
  });
});
