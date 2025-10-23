/**
 * Validation utilities
 */

import { REVIEW_CONFIG } from '../config/constants';

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * At least 8 characters, one uppercase, one lowercase, one number
 */
export const isValidPassword = (password: string): boolean => {
  if (password.length < 8) {
    return false;
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasUppercase && hasLowercase && hasNumber;
};

/**
 * Get password strength validation errors
 */
export const getPasswordErrors = (password: string): string[] => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return errors;
};

/**
 * Validate username
 * 3-30 characters, alphanumeric and underscores only
 */
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
export const isRequired = (value: any): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return true;
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
