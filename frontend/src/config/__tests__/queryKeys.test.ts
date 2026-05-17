import { describe, expect, it } from 'vitest';
import { normalizeNearbyCoordinate, queryKeys } from '../queryKeys';

describe('queryKeys', () => {
  it('includes user coordinates in nearby cafe cache keys, including zero values', () => {
    const withoutUserLocation = queryKeys.cafesNearby(1, 2, 1);
    const withZeroUserLocation = queryKeys.cafesNearby(1, 2, 1, undefined, 0, 0);

    expect(withZeroUserLocation).not.toEqual(withoutUserLocation);
    expect(withZeroUserLocation[2]).toMatchObject({
      userLat: 0,
      userLng: 0,
    });
  });

  it('normalizes tiny nearby coordinate jitter to the same cache key', () => {
    const firstReading = queryKeys.cafesNearby(-6.208812, 106.845612, 1);
    const jitteredReading = queryKeys.cafesNearby(-6.208798, 106.845598, 1);

    expect(jitteredReading).toEqual(firstReading);
    expect(firstReading[2]).toMatchObject({ lat: -6.209, lng: 106.846 });
  });

  it('keeps roughly 100m coordinate changes distinguishable', () => {
    expect(normalizeNearbyCoordinate(-6.2088)).not.toBe(normalizeNearbyCoordinate(-6.2077));
  });
});
