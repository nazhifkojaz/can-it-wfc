/**
 * Utility functions for visit-related data formatting
 */

import { VISIT_TIME_LABELS } from '../config/constants';
import { Visit } from '../types';
import { format } from 'date-fns';
import { formatCurrency } from './currency';

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

/**
 * Groups visits by date (Month Year format)
 * @param visits - Array of visits to group
 * @returns Record with date keys and arrays of visits
 */
export const groupVisitsByDate = (visits: Visit[]): Record<string, Visit[]> => {
  const grouped: Record<string, Visit[]> = {};
  visits.forEach(visit => {
    const date = format(new Date(visit.visit_date), 'MMMM yyyy');
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(visit);
  });
  return grouped;
};

/**
 * Gets formatted amount spent label for a visit
 * @param visit - Visit object
 * @returns Formatted string like "$25.50" or "Not specified"
 */
export const getAmountSpentLabel = (visit: Visit): string => {
  if (!visit.amount_spent) return 'Not specified';
  return formatCurrency(visit.amount_spent, visit.currency || 'USD');
};
