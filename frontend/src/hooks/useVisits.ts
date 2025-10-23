/**
 * Custom hook for managing visits
 */

import { useState, useEffect, useCallback } from 'react';
import { visitApi } from '../api/client';
import { Visit, VisitCreate } from '../types';

export const useVisits = () => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await visitApi.getMyVisits();
      setVisits(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch visits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  const createVisit = useCallback(async (visitData: VisitCreate) => {
    setLoading(true);
    setError(null);

    try {
      const newVisit = await visitApi.create(visitData);
      setVisits(prev => [newVisit, ...prev]);
      return newVisit;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create visit';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteVisit = useCallback(async (visitId: string) => {
    setLoading(true);
    setError(null);

    try {
      await visitApi.delete(visitId);
      setVisits(prev => prev.filter(visit => visit.id !== visitId));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete visit';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchVisits();
  }, [fetchVisits]);

  return {
    visits,
    loading,
    error,
    refetch,
    createVisit,
    deleteVisit,
  };
};
