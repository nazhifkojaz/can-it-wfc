/**
 * Custom hook for managing reviews
 */

import { useState, useEffect, useCallback } from 'react';
import { reviewApi } from '../api/client';
import { Review, ReviewCreate } from '../types';

export const useReviews = (cafeId?: number) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);

    try {
      const data = await reviewApi.getByCafe(id);
      setReviews(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cafeId) {
      fetchReviews(cafeId);
    }
  }, [cafeId, fetchReviews]);

  const refetch = useCallback(() => {
    if (cafeId) {
      fetchReviews(cafeId);
    }
  }, [cafeId, fetchReviews]);

  const createReview = useCallback(async (reviewData: ReviewCreate) => {
    setLoading(true);
    setError(null);

    try {
      const newReview = await reviewApi.create(reviewData);
      setReviews(prev => [newReview, ...prev]);
      return newReview;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create review';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteReview = useCallback(async (reviewId: number) => {
    setLoading(true);
    setError(null);

    try {
      await reviewApi.delete(reviewId);
      setReviews(prev => prev.filter(review => review.id !== reviewId));
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete review';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    reviews,
    loading,
    error,
    refetch,
    createReview,
    deleteReview,
  };
};

export const useMyReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyReviews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await reviewApi.getMyReviews();
      setReviews(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch your reviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyReviews();
  }, [fetchMyReviews]);

  return {
    reviews,
    loading,
    error,
    refetch: fetchMyReviews,
  };
};
