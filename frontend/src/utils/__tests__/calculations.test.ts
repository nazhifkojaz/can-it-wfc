import {
  calculateDistance,
  toRadians,
  getRatingColor,
  clamp,
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

  describe('calculateDistance', () => {
    it('should calculate distance between coordinates', () => {
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
});
