import { describe, expect, it } from 'vitest';
import { queryKeys } from '../queryKeys';

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
});
