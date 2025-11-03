/**
 * Unit tests for formatter utilities
 */

import { describe, it, expect } from 'vitest';
import {
  formatPriceRange,
  formatDistance,
  parseDistance,
  formatRating,
  formatVisitTime,
  formatUsername,
  formatCount,
  truncateText,
} from '../formatters';
import { VISIT_TIME } from '../../config/constants';

describe('formatters', () => {
  describe('formatPriceRange', () => {
    it('should format valid price ranges', () => {
      expect(formatPriceRange(1)).toBe('$');
      expect(formatPriceRange(2)).toBe('$$');
      expect(formatPriceRange(3)).toBe('$$$');
      expect(formatPriceRange(4)).toBe('$$$$');
    });

    it('should handle invalid inputs', () => {
      expect(formatPriceRange(null)).toBe('N/A');
      expect(formatPriceRange(undefined)).toBe('N/A');
      expect(formatPriceRange(0)).toBe('N/A');
      expect(formatPriceRange(5)).toBe('N/A');
    });
  });

  describe('formatDistance', () => {
    it('should format distances in km', () => {
      expect(formatDistance(1.5)).toBe('1.5km');
      expect(formatDistance(10)).toBe('10.0km');
    });

    it('should format small distances in meters', () => {
      expect(formatDistance(0.5)).toBe('500m');
      expect(formatDistance(0.25)).toBe('250m');
    });

    it('should handle string inputs', () => {
      expect(formatDistance('1.5 km')).toBe('1.5km');
      expect(formatDistance('0.5km')).toBe('500m');
    });

    it('should handle invalid inputs', () => {
      expect(formatDistance(null)).toBe('N/A');
      expect(formatDistance(undefined)).toBe('N/A');
      expect(formatDistance('invalid')).toBe('N/A');
    });
  });

  describe('parseDistance', () => {
    it('should parse distance strings', () => {
      expect(parseDistance('1.5 km')).toBe(1.5);
      expect(parseDistance('10km')).toBe(10);
    });

    it('should handle number inputs', () => {
      expect(parseDistance(5)).toBe(5);
      expect(parseDistance(10.5)).toBe(10.5);
    });

    it('should return default for invalid inputs', () => {
      expect(parseDistance(null)).toBe(999);
      expect(parseDistance(undefined)).toBe(999);
      expect(parseDistance('invalid')).toBe(999);
    });
  });

  describe('formatRating', () => {
    it('should format ratings with one decimal', () => {
      expect(formatRating(4.5)).toBe('4.5');
      expect(formatRating(3)).toBe('3.0');
      expect(formatRating(4.567)).toBe('4.6');
    });

    it('should handle invalid inputs', () => {
      expect(formatRating(null)).toBe('N/A');
      expect(formatRating(undefined)).toBe('N/A');
    });
  });

  describe('formatVisitTime', () => {
    it('should format visit time labels', () => {
      expect(formatVisitTime(VISIT_TIME.MORNING)).toContain('Morning');
      expect(formatVisitTime(VISIT_TIME.AFTERNOON)).toContain('Afternoon');
      expect(formatVisitTime(VISIT_TIME.EVENING)).toContain('Evening');
    });

    it('should handle invalid inputs', () => {
      expect(formatVisitTime(999)).toBe('Unknown');
    });
  });

  describe('formatUsername', () => {
    it('should mask anonymous usernames', () => {
      expect(formatUsername('johndoe', true)).toBe('joh****');
      expect(formatUsername('alice', true)).toBe('ali**');
    });

    it('should not mask short usernames', () => {
      expect(formatUsername('bob', true)).toBe('bob');
      expect(formatUsername('ab', true)).toBe('ab');
    });

    it('should not mask when not anonymous', () => {
      expect(formatUsername('johndoe', false)).toBe('johndoe');
      expect(formatUsername('alice')).toBe('alice');
    });
  });

  describe('formatCount', () => {
    it('should format small numbers as-is', () => {
      expect(formatCount(5)).toBe('5');
      expect(formatCount(999)).toBe('999');
    });

    it('should format thousands with k', () => {
      expect(formatCount(1000)).toBe('1.0k');
      expect(formatCount(1500)).toBe('1.5k');
      expect(formatCount(999999)).toBe('1000.0k');
    });

    it('should format millions with M', () => {
      expect(formatCount(1000000)).toBe('1.0M');
      expect(formatCount(2500000)).toBe('2.5M');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const longText = 'This is a very long text that should be truncated';
      expect(truncateText(longText, 20)).toBe('This is a very long...');
    });

    it('should not truncate short text', () => {
      const shortText = 'Short text';
      expect(truncateText(shortText, 20)).toBe('Short text');
    });

    it('should use default length', () => {
      const text = 'a'.repeat(150);
      const result = truncateText(text);
      expect(result.length).toBeLessThan(150);
      expect(result.endsWith('...')).toBe(true);
    });
  });
});
