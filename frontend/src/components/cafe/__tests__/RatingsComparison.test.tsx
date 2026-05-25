/**
 * Tests for RatingsComparison component
 *
 * Covers:
 * - Google rating display with various data types (string, number, null, undefined)
 * - WFC rating display for registered/unregistered cafes
 * - Staleness indicator and freshness text
 * - Refresh button visibility and behavior
 * - CTA messages for different cafe states
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import RatingsComparison from '../RatingsComparison';

describe('RatingsComparison', () => {
  const defaultProps = {
    googleRating: 4.5,
    googleCount: 100,
    googleRatingUpdatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    googlePlaceId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    isRefreshingRating: false,
    wfcRating: '4.2',
    wfcCount: 15,
    isRegistered: true,
    onRefreshRating: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Google Rating Display', () => {
    it('should render Google rating when provided as number', () => {
      render(<RatingsComparison {...defaultProps} />);
      expect(screen.getByText('4.5')).toBeInTheDocument();
    });

    it('should render Google rating when provided as string (type conversion)', () => {
      // Testing runtime type coercion - component handles string input gracefully
      // This ensures if API returns a string instead of number, UI still works
      const props = { ...defaultProps, googleRating: '4.3' };
      render(<RatingsComparison {...props} />);
      expect(screen.getByText('4.3')).toBeInTheDocument();
    });

    it('should display dash when Google rating is null', () => {
      render(<RatingsComparison {...defaultProps} googleRating={null} />);
      expect(screen.getByText('—')).toBeInTheDocument();
      expect(screen.getByText('No rating available')).toBeInTheDocument();
    });

    it('should display dash when Google rating is undefined', () => {
      render(<RatingsComparison {...defaultProps} googleRating={undefined} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('should display review count with singular form when count is 1', () => {
      render(<RatingsComparison {...defaultProps} googleCount={1} />);
      expect(screen.getByText('1 review')).toBeInTheDocument();
    });

    it('should display review count with plural form when count is greater than 1', () => {
      render(<RatingsComparison {...defaultProps} googleCount={100} />);
      expect(screen.getByText('100 reviews')).toBeInTheDocument();
    });

    it('should display review count with plural form when count is 0', () => {
      render(<RatingsComparison {...defaultProps} googleCount={0} />);
      expect(screen.getByText('0 reviews')).toBeInTheDocument();
    });

    it('should handle null googleCount gracefully', () => {
      render(<RatingsComparison {...defaultProps} googleCount={null} googleRating={4.5} />);
      expect(screen.getByText('0 reviews')).toBeInTheDocument();
    });

    it('should format large review counts with locale string', () => {
      render(<RatingsComparison {...defaultProps} googleCount={1500} />);
      expect(screen.getByText('1,500 reviews')).toBeInTheDocument();
    });
  });

  describe('WFC Rating Display', () => {
    it('should render WFC rating for registered cafes', () => {
      render(<RatingsComparison {...defaultProps} />);
      expect(screen.getByText('4.2')).toBeInTheDocument();
      expect(screen.getByText('15 reviews')).toBeInTheDocument();
    });

    it('should display dash when WFC rating is null for registered cafe', () => {
      render(<RatingsComparison {...defaultProps} wfcRating={null} />);
      const wfcCard = screen.getByTestId('wfc-card');
      expect(wfcCard.textContent).toContain('—');
    });

    it('should display "Not registered yet" for unregistered cafes', () => {
      render(<RatingsComparison {...defaultProps} isRegistered={false} />);
      expect(screen.getByText('Not registered yet')).toBeInTheDocument();
    });

    it('should not show CTA for registered cafes with reviews', () => {
      render(<RatingsComparison {...defaultProps} />);
      expect(screen.queryByText(/Log a visit to add this cafe/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Be the first to review/)).not.toBeInTheDocument();
    });

    it('should show CTA for unregistered cafes', () => {
      render(<RatingsComparison {...defaultProps} isRegistered={false} />);
      expect(screen.getByText(/Log a visit to add this cafe/)).toBeInTheDocument();
    });

    it('should show CTA for registered cafes with no reviews', () => {
      render(<RatingsComparison {...defaultProps} wfcCount={0} />);
      expect(screen.getByText(/Be the first to review/)).toBeInTheDocument();
    });
  });

  describe('Staleness Indicator', () => {
    it('should not show staleness indicator for fresh ratings (< 1 hour)', () => {
      const freshTimestamp = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 minutes ago
      render(
        <RatingsComparison {...defaultProps} googleRatingUpdatedAt={freshTimestamp} />
      );
      expect(screen.queryByTestId('freshness-indicator')).not.toBeInTheDocument();
    });

    it('should show staleness text for ratings updated hours ago (< 24 hours)', () => {
      const hoursAgo = 5;
      const timestamp = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
      render(<RatingsComparison {...defaultProps} googleRatingUpdatedAt={timestamp} />);
      expect(screen.getByText(`Updated ${hoursAgo}h ago`)).toBeInTheDocument();
    });

    it('should show "Updated yesterday" for ratings 24-48 hours old', () => {
      const yesterday = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(); // 30 hours ago
      render(<RatingsComparison {...defaultProps} googleRatingUpdatedAt={yesterday} />);
      expect(screen.getByText('Updated yesterday')).toBeInTheDocument();
    });

    it('should show days ago for older ratings', () => {
      const daysAgo = 5;
      const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
      render(<RatingsComparison {...defaultProps} googleRatingUpdatedAt={timestamp} />);
      expect(screen.getByText(`Updated ${daysAgo}d ago`)).toBeInTheDocument();
    });

    it('should show stale dot for ratings older than 24 hours', () => {
      const staleTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      render(
        <RatingsComparison {...defaultProps} googleRatingUpdatedAt={staleTimestamp} />
      );
      expect(screen.getByTestId('stale-dot')).toBeInTheDocument();
    });

    it('should not show staleness indicator when googleRatingUpdatedAt is null', () => {
      render(
        <RatingsComparison {...defaultProps} googleRatingUpdatedAt={null} />
      );
      expect(screen.queryByTestId('freshness-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Refresh Button', () => {
    it('should show refresh button when googlePlaceId, googleRating, and onRefreshRating exist', () => {
      render(<RatingsComparison {...defaultProps} />);
      expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
    });

    it('should not show refresh button when googlePlaceId is missing', () => {
      render(
        <RatingsComparison {...defaultProps} googlePlaceId={null} />
      );
      expect(screen.queryByTestId('refresh-button')).not.toBeInTheDocument();
    });

    it('should not show refresh button when googleRating is missing', () => {
      render(
        <RatingsComparison {...defaultProps} googleRating={null} />
      );
      expect(screen.queryByTestId('refresh-button')).not.toBeInTheDocument();
    });

    it('should not show refresh button when onRefreshRating is not provided', () => {
      render(
        <RatingsComparison {...defaultProps} onRefreshRating={undefined} />
      );
      expect(screen.queryByTestId('refresh-button')).not.toBeInTheDocument();
    });

    it('should call onRefreshRating when button is clicked', () => {
      const mockRefresh = vi.fn();
      render(
        <RatingsComparison {...defaultProps} onRefreshRating={mockRefresh} />
      );
      const button = screen.getByTestId('refresh-button');
      fireEvent.click(button);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('should disable button when isRefreshingRating is true', () => {
      render(
        <RatingsComparison {...defaultProps} isRefreshingRating={true} />
      );
      const button = screen.getByTestId('refresh-button');
      expect(button).toBeDisabled();
    });

    it('should show spinning icon when refreshing', () => {
      render(
        <RatingsComparison {...defaultProps} isRefreshingRating={true} />
      );
      const spinningIcon = screen.getByTestId('refresh-icon');
      expect(spinningIcon.getAttribute('class')).toContain('spinning');
    });

    it('should show "Updating..." text when refreshing', () => {
      const timestamp = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
      render(
        <RatingsComparison
          {...defaultProps}
          googleRatingUpdatedAt={timestamp}
          isRefreshingRating={true}
        />
      );
      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });
  });

  describe('Section Title', () => {
    it('should display "Ratings at a Glance" title', () => {
      render(<RatingsComparison {...defaultProps} />);
      expect(screen.getByText('Ratings at a Glance')).toBeInTheDocument();
    });
  });

  describe('Card Headers', () => {
    it('should display Google Maps title', () => {
      render(<RatingsComparison {...defaultProps} />);
      expect(screen.getByText('Google Maps')).toBeInTheDocument();
    });

    it('should display Can-It-WFC title', () => {
      render(<RatingsComparison {...defaultProps} />);
      expect(screen.getByText('Can-It-WFC')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle string googleRating with decimal', () => {
      // Testing runtime type coercion - component handles string input gracefully
      // This ensures if API returns a string instead of number, UI still works
      const props = { ...defaultProps, googleRating: '3.7' };
      render(<RatingsComparison {...props} />);
      expect(screen.getByText('3.7')).toBeInTheDocument();
    });

    it('should handle zero googleCount', () => {
      render(<RatingsComparison {...defaultProps} googleCount={0} />);
      expect(screen.getByText('0 reviews')).toBeInTheDocument();
    });

    it('should handle undefined googleCount', () => {
      render(<RatingsComparison {...defaultProps} googleCount={undefined} />);
      expect(screen.getByText('0 reviews')).toBeInTheDocument();
    });

    it('should handle registered cafe with zero reviews', () => {
      render(<RatingsComparison {...defaultProps} wfcCount={0} />);
      expect(screen.getByText('0 reviews')).toBeInTheDocument(); // WFC review count
      expect(screen.getByText(/Be the first to review/)).toBeInTheDocument();
    });

    it('should render both cards for unregistered cafe with Google rating', () => {
      render(
        <RatingsComparison {...defaultProps} isRegistered={false} />
      );
      expect(screen.getByTestId('google-card')).toBeInTheDocument();
      expect(screen.getByTestId('wfc-card')).toBeInTheDocument();
    });
  });
});
