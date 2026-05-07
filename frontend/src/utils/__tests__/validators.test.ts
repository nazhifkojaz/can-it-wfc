import {
  isValidUsername,
  isValidRating,
  isValidReviewComment,
  isValidLatitude,
  isValidLongitude,
  isValidCoordinates,
  isRequired,
} from '../validators';

describe('validators', () => {
  describe('isValidUsername', () => {
    it('should validate correct usernames', () => {
      expect(isValidUsername('johndoe')).toBe(true);
      expect(isValidUsername('user_123')).toBe(true);
      expect(isValidUsername('Alice')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(isValidUsername('ab')).toBe(false);
      expect(isValidUsername('a'.repeat(31))).toBe(false);
      expect(isValidUsername('user-name')).toBe(false);
      expect(isValidUsername('user name')).toBe(false);
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
});
