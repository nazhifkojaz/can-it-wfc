import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecentReviewsSection from '../sections/RecentReviewsSection';
import type { DiscoverReview } from '../../../types/discover';

vi.mock('../../../utils/formatters', () => ({
  formatRelativeTime: () => '2h ago',
}));

const review: DiscoverReview = {
  id: 1,
  cafe: { id: 88, name: 'Coffee Lab', address_short: 'Jl. Senopati' },
  user: { username: 'alice', display_name: 'Alice', avatar_url: null },
  wfc_rating: 4.5,
  comment: 'Great wifi',
  visit_time_label: 'afternoon',
  created_at: '2026-05-11T10:30:00Z',
};

const defaultProps = {
  reviews: [],
  isLoading: false,
  isLoadingMore: false,
  error: null,
  hasMore: false,
  onLoadMore: vi.fn(),
  onReviewClick: vi.fn(),
  onUserClick: vi.fn(),
  onRefetch: vi.fn(),
  onFindCafe: vi.fn(),
};

describe('RecentReviewsSection', () => {
  it('renders skeleton cards in loading state', () => {
    const { container } = render(<RecentReviewsSection {...defaultProps} isLoading={true} />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    const skeletons = container.querySelectorAll('[aria-hidden="true"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state with CTA', () => {
    render(<RecentReviewsSection {...defaultProps} />);
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
    expect(screen.getByText(/Be the first/)).toBeInTheDocument();
    expect(screen.getByText('Find a cafe →')).toBeInTheDocument();
  });

  it('fires onFindCafe when CTA is clicked', () => {
    const onFindCafe = vi.fn();
    render(<RecentReviewsSection {...defaultProps} onFindCafe={onFindCafe} />);
    fireEvent.click(screen.getByText('Find a cafe →'));
    expect(onFindCafe).toHaveBeenCalledTimes(1);
  });

  it('renders error state with retry button', () => {
    render(<RecentReviewsSection {...defaultProps} error="Server error" />);
    expect(screen.getByText("Couldn't load reviews.")).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('fires onRefetch when retry is clicked', () => {
    const onRefetch = vi.fn();
    render(<RecentReviewsSection {...defaultProps} error="Server error" onRefetch={onRefetch} />);
    fireEvent.click(screen.getByText('Retry'));
    expect(onRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders heading and review cards in loaded state', () => {
    render(
      <RecentReviewsSection
        {...defaultProps}
        reviews={[review, { ...review, id: 2 }]}
      />
    );
    expect(screen.getByText('Recent Reviews')).toBeInTheDocument();
    const articles = screen.getAllByRole('button', { name: /reviewed/ });
    expect(articles).toHaveLength(2);
  });

  it('renders Load more button when hasMore is true', () => {
    render(
      <RecentReviewsSection
        {...defaultProps}
        reviews={[review]}
        hasMore={true}
      />
    );
    expect(screen.getByText('Load more')).toBeInTheDocument();
  });

  it('hides Load more button when hasMore is false', () => {
    render(
      <RecentReviewsSection
        {...defaultProps}
        reviews={[review]}
        hasMore={false}
      />
    );
    expect(screen.queryByText('Load more')).not.toBeInTheDocument();
  });

  it('fires onLoadMore when Load more is clicked', () => {
    const onLoadMore = vi.fn();
    render(
      <RecentReviewsSection
        {...defaultProps}
        reviews={[review]}
        hasMore={true}
        onLoadMore={onLoadMore}
      />
    );
    fireEvent.click(screen.getByText('Load more'));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('shows spinner instead of Load more when isLoadingMore', () => {
    render(
      <RecentReviewsSection
        {...defaultProps}
        reviews={[review]}
        hasMore={true}
        isLoadingMore={true}
      />
    );
    expect(screen.getByTestId('loading-container')).toBeInTheDocument();
    expect(screen.queryByText('Load more')).not.toBeInTheDocument();
  });

  it('fires onReviewClick with correct review when card is clicked', () => {
    const onReviewClick = vi.fn();
    render(
      <RecentReviewsSection
        {...defaultProps}
        reviews={[review]}
        onReviewClick={onReviewClick}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /@alice.*reviewed/i }));
    expect(onReviewClick).toHaveBeenCalledWith(review);
  });

  it('fires onUserClick with correct username when username is clicked', () => {
    const onUserClick = vi.fn();
    render(
      <RecentReviewsSection
        {...defaultProps}
        reviews={[review]}
        onUserClick={onUserClick}
      />
    );
    fireEvent.click(screen.getByText('@alice'));
    expect(onUserClick).toHaveBeenCalledWith('alice');
  });
});
