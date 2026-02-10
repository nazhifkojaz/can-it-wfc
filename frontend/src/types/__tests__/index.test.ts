/**
 * Type validation tests for shared types
 * These tests ensure type contracts match backend API responses
 */

import { describe, it, expect } from 'vitest';
import type { SearchResult, Cafe } from '../index';

describe('shared types', () => {
  describe('SearchResult', () => {
    it('should accept distance as number', () => {
      const result: SearchResult = {
        google_place_id: 'test123',
        is_registered: true,
        db_cafe_id: 1,
        name: 'Test Cafe',
        address: '123 Test St',
        latitude: '-6.200000',
        longitude: '106.816666',
        distance: 1.5,
        rating: 4.5,
        average_wfc_rating: 4.2,
        total_reviews: 10,
        total_visits: 20,
        source: 'google',
        result_type: 'cafe',
      };
      expect(result.distance).toBe(1.5);
    });

    it('should accept distance as string', () => {
      const result: SearchResult = {
        google_place_id: 'test123',
        is_registered: true,
        db_cafe_id: 1,
        name: 'Test Cafe',
        address: '123 Test St',
        latitude: '-6.200000',
        longitude: '106.816666',
        distance: '1.5km',
        rating: 4.5,
        average_wfc_rating: 4.2,
        total_reviews: 10,
        total_visits: 20,
        source: 'google',
        result_type: 'cafe',
      };
      expect(result.distance).toBe('1.5km');
    });

    it('should allow optional distance', () => {
      const result: SearchResult = {
        google_place_id: 'test123',
        is_registered: true,
        db_cafe_id: 1,
        name: 'Test Cafe',
        address: '123 Test St',
        latitude: '-6.200000',
        longitude: '106.816666',
        rating: 4.5,
        source: 'google',
        result_type: 'cafe',
      };
      expect(result.distance).toBeUndefined();
    });
  });

  describe('Cafe', () => {
    it('should accept null for google_rating', () => {
      const cafe: Cafe = {
        id: 1,
        name: 'Test Cafe',
        address: '123 Test St',
        latitude: '-6.200000',
        longitude: '106.816666',
        google_rating: null,
        google_ratings_count: null,
        google_rating_updated_at: null,
        total_visits: 0,
        unique_visitors: 0,
        total_reviews: 0,
        is_closed: false,
        is_verified: false,
        is_registered: true,
        source: 'database',
      };
      expect(cafe.google_rating).toBeNull();
    });

    it('should accept number for google_rating', () => {
      const cafe: Cafe = {
        id: 1,
        name: 'Test Cafe',
        address: '123 Test St',
        latitude: '-6.200000',
        longitude: '106.816666',
        google_rating: 4.5,
        google_ratings_count: 100,
        google_rating_updated_at: '2024-01-01T00:00:00Z',
        total_visits: 0,
        unique_visitors: 0,
        total_reviews: 0,
        is_closed: false,
        is_verified: false,
        is_registered: true,
        source: 'database',
      };
      expect(cafe.google_rating).toBe(4.5);
    });

    it('should accept undefined for optional google_rating', () => {
      const cafe: Cafe = {
        id: 1,
        name: 'Test Cafe',
        address: '123 Test St',
        latitude: '-6.200000',
        longitude: '106.816666',
        total_visits: 0,
        unique_visitors: 0,
        total_reviews: 0,
        is_closed: false,
        is_verified: false,
        is_registered: true,
        source: 'database',
      };
      expect(cafe.google_rating).toBeUndefined();
    });
  });
});
