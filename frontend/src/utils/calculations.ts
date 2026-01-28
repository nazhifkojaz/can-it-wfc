/**
 * Calculation utilities
 */

import { colors } from '../config/theme';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers

  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Convert degrees to radians
 */
export const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Convert radians to degrees
 */
export const toDegrees = (radians: number): number => {
  return radians * (180 / Math.PI);
};

/**
 * Calculate average of an array of numbers
 */
export const calculateAverage = (numbers: number[]): number => {
  if (numbers.length === 0) {
    return 0;
  }
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return sum / numbers.length;
};

/**
 * Get rating color based on rating value
 */
export const getRatingColor = (rating: number | null | undefined): string => {
  if (rating === null || rating === undefined) {
    return colors.gray[400];
  }

  if (rating >= 4.5) {
    return colors.rating.excellent;
  }
  if (rating >= 3.5) {
    return colors.rating.good;
  }
  if (rating >= 2.5) {
    return colors.rating.average;
  }
  return colors.rating.poor;
};

/**
 * Clamp a number between min and max values
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) {
    return 0;
  }
  return (value / total) * 100;
};

/**
 * Round to specified decimal places
 */
export const roundToDecimal = (value: number, decimals: number = 2): number => {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
};

// ===========================
// Google Rating Staleness Detection (HP-08)
// ===========================

/**
 * Hours after which a Google rating is considered stale
 */
export const GOOGLE_RATING_STALE_HOURS = 24;

/**
 * Check if a Google rating is stale (older than 24 hours or never fetched)
 * @param updatedAt - ISO timestamp of when the rating was last updated
 * @returns true if the rating is stale
 */
export const isGoogleRatingStale = (updatedAt: string | null | undefined): boolean => {
  if (!updatedAt) {
    return true; // Never fetched is considered stale
  }

  const updatedTime = new Date(updatedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - updatedTime.getTime()) / (1000 * 60 * 60);

  return hoursDiff >= GOOGLE_RATING_STALE_HOURS;
};

/**
 * Get a human-readable description of how long ago the rating was updated
 * @param updatedAt - ISO timestamp of when the rating was last updated
 * @returns Human-readable string like "Updated 2 hours ago" or "Updated today"
 */
export const getRatingFreshnessText = (updatedAt: string | null | undefined): string | null => {
  if (!updatedAt) {
    return null;
  }

  const updatedTime = new Date(updatedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - updatedTime.getTime()) / (1000 * 60 * 60);

  if (hoursDiff < 1) {
    return 'Updated just now';
  } else if (hoursDiff < 24) {
    const hours = Math.floor(hoursDiff);
    return `Updated ${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (hoursDiff < 48) {
    return 'Updated yesterday';
  } else if (hoursDiff < 24 * 7) {
    const days = Math.floor(hoursDiff / 24);
    return `Updated ${days} day${days !== 1 ? 's' : ''} ago`;
  } else if (hoursDiff < 24 * 30) {
    const weeks = Math.floor(hoursDiff / (24 * 7));
    return `Updated ${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else {
    const months = Math.floor(hoursDiff / (24 * 30));
    return `Updated ${months} month${months !== 1 ? 's' : ''} ago`;
  }
};

/**
 * Get the freshness level for styling purposes
 * @param updatedAt - ISO timestamp of when the rating was last updated
 * @returns 'fresh', 'stale', or 'unknown'
 */
export const getRatingFreshnessLevel = (
  updatedAt: string | null | undefined
): 'fresh' | 'stale' | 'unknown' => {
  if (!updatedAt) {
    return 'unknown';
  }

  return isGoogleRatingStale(updatedAt) ? 'stale' : 'fresh';
};
