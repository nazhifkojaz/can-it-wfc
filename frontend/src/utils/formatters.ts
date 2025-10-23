/**
 * Formatting utilities for displaying data
 */

import { PRICE_RANGE_LABELS, VISIT_TIME_LABELS } from '../config/constants';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Format price range as dollar signs
 */
export const formatPriceRange = (priceRange: number | null | undefined): string => {
  if (!priceRange || priceRange < 1 || priceRange > 4) {
    return 'N/A';
  }
  return PRICE_RANGE_LABELS[priceRange as keyof typeof PRICE_RANGE_LABELS];
};

/**
 * Format distance in kilometers
 */
export const formatDistance = (distanceKm: number | string | null | undefined): string => {
  if (distanceKm === null || distanceKm === undefined) {
    return 'N/A';
  }

  const distance = typeof distanceKm === 'string'
    ? parseFloat(distanceKm.replace(' km', '').replace('km', '').trim())
    : distanceKm;

  if (isNaN(distance)) {
    return 'N/A';
  }

  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }

  return `${distance.toFixed(1)}km`;
};

/**
 * Parse distance string to number
 */
export const parseDistance = (distance: string | number | null | undefined): number => {
  if (distance === null || distance === undefined) {
    return 999;
  }

  if (typeof distance === 'number') {
    return distance;
  }

  const parsed = parseFloat(distance.replace(' km', '').replace('km', '').trim());
  return isNaN(parsed) ? 999 : parsed;
};

/**
 * Format rating as string with one decimal
 */
export const formatRating = (rating: number | string | null | undefined): string => {
  if (rating === null || rating === undefined) {
    return 'N/A';
  }
  const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
  if (isNaN(numRating)) {
    return 'N/A';
  }
  return numRating.toFixed(1);
};

/**
 * Format visit time
 */
export const formatVisitTime = (visitTime: number): string => {
  return VISIT_TIME_LABELS[visitTime as keyof typeof VISIT_TIME_LABELS] || 'Unknown';
};

/**
 * Format date to readable string
 */
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d, yyyy');
};

/**
 * Format datetime to readable string
 */
export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d, yyyy h:mm a');
};

/**
 * Format date as relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
};

/**
 * Format username for display (handle anonymous)
 */
export const formatUsername = (username: string, isAnonymous: boolean = false): string => {
  if (!isAnonymous || username.length <= 3) {
    return username;
  }
  return `${username.substring(0, 3)}${'*'.repeat(username.length - 3)}`;
};

/**
 * Format count with abbreviations (1.2k, 1.2M, etc.)
 */
export const formatCount = (count: number): string => {
  if (count < 1000) {
    return count.toString();
  }
  if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return `${(count / 1000000).toFixed(1)}M`;
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.substring(0, maxLength).trim()}...`;
};
