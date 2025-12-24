/**
 * Utility functions for visit-related data formatting
 */

import { VISIT_TIME_LABELS } from '../config/constants';

/**
 * Formats a visit time number (1, 2, or 3) into a readable label
 * @param visitTime - The visit time value (1 = Morning, 2 = Afternoon, 3 = Evening)
 * @returns Formatted visit time label or 'Not specified' if invalid/null
 */
export const formatVisitTime = (visitTime: number | null | undefined): string => {
  if (visitTime === null || visitTime === undefined) {
    return 'Not specified';
  }

  const numValue = typeof visitTime === 'string' ? parseInt(visitTime) : visitTime;

  if (isNaN(numValue) || ![1, 2, 3].includes(numValue)) {
    return 'Not specified';
  }

  return VISIT_TIME_LABELS[numValue as 1 | 2 | 3] || 'Not specified';
};
