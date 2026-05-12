import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReviewCard from '../cards/ReviewCard';
import type { DiscoverReview } from '../../../types/discover';

vi.mock('../../../utils/formatters', () => ({
  formatRelativeTime: () => '2h ago',
}));

const baseReview: DiscoverReview = {
  id: 1,
  cafe: { id: 88, name: 'Coffee Lab', address_short: 'Jl. Senopati' },
  user: { username: 'alice', display_name: 'Alice', avatar_url: null },
  wfc_rating: 4.5,
  comment: 'Great wifi, dim lighting',
  visit_time_label: 'afternoon',
  created_at: '2026-05-11T10:30:00Z',
};

describe('ReviewCard', () => {
  it('renders all fields with comment and chip', () => {
    render(
      <ReviewCard
        review={baseReview}
        onCardClick={vi.fn()}
        onUserClick={vi.fn()}
      />
    );
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText('2h ago')).toBeInTheDocument();
    expect(screen.getByText('reviewed')).toBeInTheDocument();
    expect(screen.getByText('Coffee Lab')).toBeInTheDocument();
    expect(screen.getByText('afternoon')).toBeInTheDocument();
    expect(screen.getByText('4.5 / 5')).toBeInTheDocument();
    expect(screen.getByText('Great wifi, dim lighting')).toBeInTheDocument();
  });

  it('renders avatar fallback with initial when no avatar_url', () => {
    render(
      <ReviewCard
        review={baseReview}
        onCardClick={vi.fn()}
        onUserClick={vi.fn()}
      />
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders avatar image when avatar_url is present', () => {
    render(
      <ReviewCard
        review={{
          ...baseReview,
          user: { ...baseReview.user, avatar_url: 'https://example.com/avatar.jpg' },
        }}
        onCardClick={vi.fn()}
        onUserClick={vi.fn()}
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(img).toHaveAttribute('alt', 'Alice');
  });

  it('hides chip when visit_time_label is null', () => {
    render(
      <ReviewCard
        review={{ ...baseReview, visit_time_label: null }}
        onCardClick={vi.fn()}
        onUserClick={vi.fn()}
      />
    );
    expect(screen.queryByText('afternoon')).not.toBeInTheDocument();
  });

  it('hides comment block when comment is empty', () => {
    render(
      <ReviewCard
        review={{ ...baseReview, comment: '' }}
        onCardClick={vi.fn()}
        onUserClick={vi.fn()}
      />
    );
    expect(screen.queryByText('Great wifi, dim lighting')).not.toBeInTheDocument();
  });

  it('fires onCardClick when card body is clicked', () => {
    const onCardClick = vi.fn();
    render(
      <ReviewCard
        review={baseReview}
        onCardClick={onCardClick}
        onUserClick={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /@alice.*reviewed/i }));
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });

  it('fires onUserClick and not onCardClick when username is clicked', () => {
    const onCardClick = vi.fn();
    const onUserClick = vi.fn();
    render(
      <ReviewCard
        review={baseReview}
        onCardClick={onCardClick}
        onUserClick={onUserClick}
      />
    );
    fireEvent.click(screen.getByText('@alice'));
    expect(onUserClick).toHaveBeenCalledTimes(1);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it('fires onCardClick on keyboard Enter', () => {
    const onCardClick = vi.fn();
    render(
      <ReviewCard
        review={baseReview}
        onCardClick={onCardClick}
        onUserClick={vi.fn()}
      />
    );
    fireEvent.keyDown(screen.getByRole('button', { name: /@alice.*reviewed/i }), { key: 'Enter' });
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });

  it('fires onCardClick on keyboard Space', () => {
    const onCardClick = vi.fn();
    render(
      <ReviewCard
        review={baseReview}
        onCardClick={onCardClick}
        onUserClick={vi.fn()}
      />
    );
    fireEvent.keyDown(screen.getByRole('button', { name: /@alice.*reviewed/i }), { key: ' ' });
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });

  it('renders correct stars for rating 4.5', () => {
    render(
      <ReviewCard
        review={baseReview}
        onCardClick={vi.fn()}
        onUserClick={vi.fn()}
      />
    );
    expect(screen.getByText(/★★★★★/)).toBeInTheDocument();
  });

  it('renders correct stars for rating 1', () => {
    render(
      <ReviewCard
        review={{ ...baseReview, wfc_rating: 1 }}
        onCardClick={vi.fn()}
        onUserClick={vi.fn()}
      />
    );
    expect(screen.getByText(/★☆☆☆☆/)).toBeInTheDocument();
    expect(screen.getByText('1.0 / 5')).toBeInTheDocument();
  });
});
