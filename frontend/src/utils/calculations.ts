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

export const computeWfcRating = (
  wifiQuality: number,
  noiseLevel: number,
  seatingComfort: number,
  powerOutletsRating?: number | null,
): number => {
  const ratings = [wifiQuality, noiseLevel, seatingComfort];
  if (powerOutletsRating !== undefined && powerOutletsRating !== null) {
    ratings.push(powerOutletsRating);
  }
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return Math.min(5, Math.max(1, Math.round(avg)));
};

const GOOGLE_RATING_STALE_HOURS = 24;

export const isGoogleRatingStale = (updatedAt: string | null | undefined): boolean => {
  if (!updatedAt) {
    return true;
  }

  const updatedTime = new Date(updatedAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - updatedTime.getTime()) / (1000 * 60 * 60);

  return hoursDiff >= GOOGLE_RATING_STALE_HOURS;
};
