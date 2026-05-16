import {
  isValidReviewComment,
} from '../validators';

describe('validators', () => {
  describe('isValidReviewComment', () => {
    it('should validate comments within limit', () => {
      expect(isValidReviewComment('Short comment')).toBe(true);
      expect(isValidReviewComment('a'.repeat(160))).toBe(true);
    });

    it('should reject comments over limit', () => {
      expect(isValidReviewComment('a'.repeat(161))).toBe(false);
    });
  });
});
