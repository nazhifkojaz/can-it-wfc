import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TrendingCafeRow from '../cards/TrendingCafeRow';
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

describe('TrendingCafeRow', () => {
  it('renders rank, cafe name, rating, and full activity line', () => {
    render(<TrendingCafeRow cafe={baseCafe} rank={1} onClick={vi.fn()} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('Coffee Lab')).toBeInTheDocument();
    expect(screen.getByText('★ 4.6')).toBeInTheDocument();
    expect(screen.getByText('12 visits · 3 reviews this week')).toBeInTheDocument();
  });

  it('shows only reviews when visits are 0', () => {
    render(
      <TrendingCafeRow
        cafe={{ ...baseCafe, recent_visit_count: 0 }}
        rank={2}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText('3 reviews this week')).toBeInTheDocument();
    expect(screen.queryByText(/visits/)).not.toBeInTheDocument();
  });

  it('shows only visits when reviews are 0', () => {
    render(
      <TrendingCafeRow
        cafe={{ ...baseCafe, recent_review_count: 0 }}
        rank={3}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText('12 visits this week')).toBeInTheDocument();
    expect(screen.queryByText(/reviews/)).not.toBeInTheDocument();
  });

  it('shows singular form for 1 visit and 1 review', () => {
    const cafe: DiscoverTrendingCafe = {
      ...baseCafe,
      recent_visit_count: 1,
      recent_review_count: 1,
    };
    render(<TrendingCafeRow cafe={cafe} rank={1} onClick={vi.fn()} />);
    expect(screen.getByText('1 visits · 1 reviews this week')).toBeInTheDocument();
  });

  it('fires onClick when row is clicked', () => {
    const onClick = vi.fn();
    render(<TrendingCafeRow cafe={baseCafe} rank={1} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /#1/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('fires onClick on keyboard Enter', () => {
    const onClick = vi.fn();
    render(<TrendingCafeRow cafe={baseCafe} rank={1} onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button', { name: /#1/ }), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
