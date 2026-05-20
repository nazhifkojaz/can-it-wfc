/**
 * Validation utilities
 */

import { REVIEW_CONFIG } from '../config/constants';

export const isValidReviewComment = (comment: string): boolean => {
  return comment.length <= REVIEW_CONFIG.MAX_COMMENT_LENGTH;
};
