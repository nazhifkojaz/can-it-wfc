/**
 * Validation utilities
 */

import { REVIEW_CONFIG } from '../config/constants';

export const isValidUsername = (username: string): boolean => {
  if (username.length < 3 || username.length > 30) {
    return false;
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  return usernameRegex.test(username);
};

/**
 * Validate rating (1-5)
 */
export const isValidRating = (rating: number): boolean => {
  return rating >= REVIEW_CONFIG.RATING_MIN && rating <= REVIEW_CONFIG.RATING_MAX;
};

/**
 * Validate review comment length
 */
export const isValidReviewComment = (comment: string): boolean => {
  return comment.length <= REVIEW_CONFIG.MAX_COMMENT_LENGTH;
};

/**
 * Validate latitude
 */
export const isValidLatitude = (lat: number): boolean => {
  return lat >= -90 && lat <= 90;
};

/**
 * Validate longitude
 */
export const isValidLongitude = (lng: number): boolean => {
  return lng >= -180 && lng <= 180;
};

/**
 * Validate coordinates
 */
export const isValidCoordinates = (lat: number, lng: number): boolean => {
  return isValidLatitude(lat) && isValidLongitude(lng);
};

/**
 * Validate required field
 */
export const isRequired = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return true;
};
