/**
 * Unit tests for visit utility functions
 */

import { describe, it, expect } from 'vitest';
import { formatVisitTime } from '../visit';
import { VISIT_TIME } from '../../config/constants';

describe('visit utilities', () => {
  describe('formatVisitTime', () => {
    it('should format morning visit time', () => {
      expect(formatVisitTime(VISIT_TIME.MORNING)).toContain('Morning');
    });

    it('should format afternoon visit time', () => {
      expect(formatVisitTime(VISIT_TIME.AFTERNOON)).toContain('Afternoon');
    });

    it('should format evening visit time', () => {
      expect(formatVisitTime(VISIT_TIME.EVENING)).toContain('Evening');
    });

    it('should handle invalid inputs', () => {
      expect(formatVisitTime(999)).toBe('Not specified');
    });

    it('should handle null input', () => {
      expect(formatVisitTime(null)).toBe('Not specified');
    });

    it('should handle undefined input', () => {
      expect(formatVisitTime(undefined)).toBe('Not specified');
    });

    it('should handle string input', () => {
      expect(formatVisitTime('1' as any)).toContain('Morning');
    });
  });
});
