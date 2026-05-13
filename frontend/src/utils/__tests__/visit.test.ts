/**
 * Unit tests for visit utility functions
 */

import { describe, it, expect } from 'vitest';
import { formatVisitTime, groupVisitsByDate, getAmountSpentLabel } from '../visit';
import { VISIT_TIME } from '../../config/constants';
import { Visit, Cafe, User } from '../../types';

// Mock data for testing
const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  display_name: 'Test User',
  effective_display_name: 'Test User',
  bio: '',
  total_reviews: 0,
  total_visits: 0,
  date_joined: '2024-01-01T00:00:00Z',
};

const mockCafe: Cafe = {
  id: 1,
  name: 'Test Cafe',
  address: '123 Test St',
  latitude: '0',
  longitude: '0',
  price_range: 2,
  total_visits: 10,
  unique_visitors: 5,
  total_reviews: 3,
  is_closed: false,
  is_verified: false,
  is_registered: true,
  source: 'database',
};

const createMockVisit = (id: number, date: string): Visit => ({
  id,
  cafe: mockCafe,
  user: mockUser,
  visit_date: date,
  amount_spent: null,
  currency: null,
  visit_time: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
});

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

  describe('groupVisitsByDate', () => {
    it('should group visits by month and year', () => {
      const visits: Visit[] = [
        createMockVisit(1, '2024-01-15'),
        createMockVisit(2, '2024-01-20'),
        createMockVisit(3, '2024-02-10'),
        createMockVisit(4, '2023-12-05'),
      ];
      const result = groupVisitsByDate(visits);

      expect(Object.keys(result)).toEqual(['January 2024', 'February 2024', 'December 2023']);
      expect(result['January 2024']).toHaveLength(2);
      expect(result['February 2024']).toHaveLength(1);
      expect(result['December 2023']).toHaveLength(1);
    });

    it('should handle empty array', () => {
      expect(groupVisitsByDate([])).toEqual({});
    });

    it('should preserve visit objects in groups', () => {
      const visits: Visit[] = [
        createMockVisit(1, '2024-01-15'),
        createMockVisit(2, '2024-01-20'),
      ];
      const result = groupVisitsByDate(visits);

      expect(result['January 2024'][0].id).toBe(1);
      expect(result['January 2024'][1].id).toBe(2);
    });
  });

  describe('getAmountSpentLabel', () => {
    it('should format amount with USD currency', () => {
      const visit: Visit = {
        ...createMockVisit(1, '2024-01-15'),
        amount_spent: 25.50,
        currency: 'USD',
      };
      expect(getAmountSpentLabel(visit)).toBe('$25.50');
    });

    it('should format amount with IDR currency', () => {
      const visit: Visit = {
        ...createMockVisit(1, '2024-01-15'),
        amount_spent: 50000,
        currency: 'IDR',
      };
      expect(getAmountSpentLabel(visit)).toBe('Rp 50,000');
    });

    it('should return Not specified for null amount', () => {
      const visit: Visit = createMockVisit(1, '2024-01-15');
      visit.amount_spent = null;
      expect(getAmountSpentLabel(visit)).toBe('Not specified');
    });

    it('should return Not specified for undefined amount', () => {
      const visit: Visit = createMockVisit(1, '2024-01-15');
      visit.amount_spent = undefined;
      expect(getAmountSpentLabel(visit)).toBe('Not specified');
    });

    it('should default to USD when currency is null', () => {
      const visit: Visit = {
        ...createMockVisit(1, '2024-01-15'),
        amount_spent: 100,
        currency: null,
      };
      expect(getAmountSpentLabel(visit)).toBe('$100.00');
    });

    it('should default to USD when currency is undefined', () => {
      const visit: Visit = {
        ...createMockVisit(1, '2024-01-15'),
        amount_spent: 100,
        currency: undefined,
      };
      expect(getAmountSpentLabel(visit)).toBe('$100.00');
    });
  });
});
