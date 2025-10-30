/**
 * Unit tests for calculation utilities
 */

import {
  calculateDistance,
  toRadians,
  toDegrees,
  calculateAverage,
  getRatingColor,
  clamp,
  calculatePercentage,
  roundToDecimal,
} from '../calculations';
import { colors } from '../../config/theme';

describe('calculations', () => {
  describe('toRadians', () => {
    it('should convert degrees to radians', () => {
      expect(toRadians(0)).toBe(0);
      expect(toRadians(180)).toBeCloseTo(Math.PI);
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2);
    });
  });

  describe('toDegrees', () => {
    it('should convert radians to degrees', () => {
      expect(toDegrees(0)).toBe(0);
      expect(toDegrees(Math.PI)).toBeCloseTo(180);
      expect(toDegrees(Math.PI / 2)).toBeCloseTo(90);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between coordinates', () => {
      // Distance from New York to Los Angeles (approx 3944 km)
      const distance = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(0, 0, 0, 0);
      expect(distance).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const distance = calculateDistance(-33.8688, 151.2093, 51.5074, -0.1278);
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('calculateAverage', () => {
    it('should calculate average of numbers', () => {
      expect(calculateAverage([1, 2, 3, 4, 5])).toBe(3);
      expect(calculateAverage([10, 20, 30])).toBe(20);
    });

    it('should handle empty array', () => {
      expect(calculateAverage([])).toBe(0);
    });

    it('should handle single value', () => {
      expect(calculateAverage([5])).toBe(5);
    });
  });

  describe('getRatingColor', () => {
    it('should return correct colors for ratings', () => {
      expect(getRatingColor(5)).toBe(colors.rating.excellent);
      expect(getRatingColor(4.5)).toBe(colors.rating.excellent);
      expect(getRatingColor(4)).toBe(colors.rating.good);
      expect(getRatingColor(3.5)).toBe(colors.rating.good);
      expect(getRatingColor(3)).toBe(colors.rating.average);
      expect(getRatingColor(2)).toBe(colors.rating.poor);
      expect(getRatingColor(1)).toBe(colors.rating.poor);
    });

    it('should handle null/undefined', () => {
      expect(getRatingColor(null)).toBe(colors.gray[400]);
      expect(getRatingColor(undefined)).toBe(colors.gray[400]);
    });
  });

  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle edge cases', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentages', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(1, 4)).toBe(25);
      expect(calculatePercentage(3, 4)).toBe(75);
    });

    it('should handle zero total', () => {
      expect(calculatePercentage(5, 0)).toBe(0);
    });
  });

  describe('roundToDecimal', () => {
    it('should round to specified decimals', () => {
      expect(roundToDecimal(1.2345, 2)).toBe(1.23);
      expect(roundToDecimal(1.2355, 2)).toBe(1.24);
      expect(roundToDecimal(1.2345, 3)).toBe(1.235);
    });

    it('should use default 2 decimals', () => {
      expect(roundToDecimal(1.2345)).toBe(1.23);
    });

    it('should handle whole numbers', () => {
      expect(roundToDecimal(5, 2)).toBe(5);
    });
  });
});
