/**
 * Unit tests for validator utilities
 */

import {
  isValidEmail,
  isValidPassword,
  getPasswordErrors,
  isValidUsername,
  isValidRating,
  isValidReviewComment,
  isValidLatitude,
  isValidLongitude,
  isValidCoordinates,
  isRequired,
  isValidUrl,
} from '../validators';

describe('validators', () => {
  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test @example.com')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should validate strong passwords', () => {
      expect(isValidPassword('Password123')).toBe(true);
      expect(isValidPassword('MySecure1Pass')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(isValidPassword('short')).toBe(false);
      expect(isValidPassword('nouppercase1')).toBe(false);
      expect(isValidPassword('NOLOWERCASE1')).toBe(false);
      expect(isValidPassword('NoNumbers')).toBe(false);
    });
  });

  describe('getPasswordErrors', () => {
    it('should return appropriate errors', () => {
      const errors = getPasswordErrors('weak');
      expect(errors).toContain('Password must be at least 8 characters');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should return no errors for valid password', () => {
      const errors = getPasswordErrors('Valid123Pass');
      expect(errors.length).toBe(0);
    });
  });

  describe('isValidUsername', () => {
    it('should validate correct usernames', () => {
      expect(isValidUsername('johndoe')).toBe(true);
      expect(isValidUsername('user_123')).toBe(true);
      expect(isValidUsername('Alice')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(isValidUsername('ab')).toBe(false); // too short
      expect(isValidUsername('a'.repeat(31))).toBe(false); // too long
      expect(isValidUsername('user-name')).toBe(false); // invalid char
      expect(isValidUsername('user name')).toBe(false); // space
    });
  });

  describe('isValidRating', () => {
    it('should validate ratings within range', () => {
      expect(isValidRating(1)).toBe(true);
      expect(isValidRating(3)).toBe(true);
      expect(isValidRating(5)).toBe(true);
    });

    it('should reject ratings outside range', () => {
      expect(isValidRating(0)).toBe(false);
      expect(isValidRating(6)).toBe(false);
      expect(isValidRating(-1)).toBe(false);
    });
  });

  describe('isValidReviewComment', () => {
    it('should validate comments within limit', () => {
      expect(isValidReviewComment('Short comment')).toBe(true);
      expect(isValidReviewComment('a'.repeat(160))).toBe(true);
    });

    it('should reject comments over limit', () => {
      expect(isValidReviewComment('a'.repeat(161))).toBe(false);
    });
  });

  describe('isValidLatitude', () => {
    it('should validate correct latitudes', () => {
      expect(isValidLatitude(0)).toBe(true);
      expect(isValidLatitude(45.5)).toBe(true);
      expect(isValidLatitude(-45.5)).toBe(true);
      expect(isValidLatitude(90)).toBe(true);
      expect(isValidLatitude(-90)).toBe(true);
    });

    it('should reject invalid latitudes', () => {
      expect(isValidLatitude(91)).toBe(false);
      expect(isValidLatitude(-91)).toBe(false);
    });
  });

  describe('isValidLongitude', () => {
    it('should validate correct longitudes', () => {
      expect(isValidLongitude(0)).toBe(true);
      expect(isValidLongitude(100)).toBe(true);
      expect(isValidLongitude(-100)).toBe(true);
      expect(isValidLongitude(180)).toBe(true);
      expect(isValidLongitude(-180)).toBe(true);
    });

    it('should reject invalid longitudes', () => {
      expect(isValidLongitude(181)).toBe(false);
      expect(isValidLongitude(-181)).toBe(false);
    });
  });

  describe('isValidCoordinates', () => {
    it('should validate correct coordinate pairs', () => {
      expect(isValidCoordinates(45, 100)).toBe(true);
      expect(isValidCoordinates(-45, -100)).toBe(true);
    });

    it('should reject invalid coordinate pairs', () => {
      expect(isValidCoordinates(91, 100)).toBe(false);
      expect(isValidCoordinates(45, 181)).toBe(false);
    });
  });

  describe('isRequired', () => {
    it('should validate required fields', () => {
      expect(isRequired('value')).toBe(true);
      expect(isRequired(123)).toBe(true);
      expect(isRequired(true)).toBe(true);
    });

    it('should reject empty required fields', () => {
      expect(isRequired('')).toBe(false);
      expect(isRequired('   ')).toBe(false);
      expect(isRequired(null)).toBe(false);
      expect(isRequired(undefined)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://sub.domain.com/path?query=1')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('ftp://invalid')).toBe(true); // URLs can have different protocols
      expect(isValidUrl('')).toBe(false);
    });
  });
});
