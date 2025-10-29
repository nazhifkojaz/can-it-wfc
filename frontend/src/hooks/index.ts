/**
 * Centralized hook exports
 */

export * from './useGeolocation';
export { useCafes, useCafe } from './useCafes'; // Only export these, not useNearbyCafes (old version)
export * from './useNearbyCafes'; // New React Query version
export * from './useReviews';
export * from './useVisits';
export * from './useFavorites';
