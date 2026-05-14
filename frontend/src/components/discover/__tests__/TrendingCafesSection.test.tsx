import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TrendingCafesSection from '../sections/TrendingCafesSection';
import type { DiscoverTrendingCafe } from '../../../types/discover';

const baseCafe: DiscoverTrendingCafe = {
  id: 88,
  name: 'Coffee Lab',
  address_short: 'Jl. Senopati',
  average_wfc_rating: 4.6,
  recent_review_count: 3,
  recent_visit_count: 12,
  score: 21,
};

const defaultProps = {
  cafes: [] as DiscoverTrendingCafe[],
  isLoading: false,
  error: null,
  onCafeClick: vi.fn(),
  onRefetch: vi.fn(),
};

describe('TrendingCafesSection', () => {
  it('renders skeleton rows in loading state', () => {
    const { container } = render(<TrendingCafesSection {...defaultProps} isLoading={true} />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('returns null when empty and not loading', () => {
    const { container } = render(<TrendingCafesSection {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null on error', () => {
    const { container } = render(
      <TrendingCafesSection {...defaultProps} error="Server error" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders heading and rows in loaded state', () => {
    const cafes = [baseCafe, { ...baseCafe, id: 2, name: 'Common Grounds' }];
    render(<TrendingCafesSection {...defaultProps} cafes={cafes} />);
    expect(screen.getByText('Trending This Week')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('Coffee Lab')).toBeInTheDocument();
    expect(screen.getByText('Common Grounds')).toBeInTheDocument();
  });

  it('fires onCafeClick when a row is clicked', () => {
    const onCafeClick = vi.fn();
    render(
      <TrendingCafesSection
        {...defaultProps}
        cafes={[baseCafe]}
        onCafeClick={onCafeClick}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /#1/ }));
    expect(onCafeClick).toHaveBeenCalledWith(baseCafe);
  });

  it('renders correct rank numbers', () => {
    const cafes = [baseCafe, { ...baseCafe, id: 2 }, { ...baseCafe, id: 3 }];
    render(<TrendingCafesSection {...defaultProps} cafes={cafes} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
  });
});
