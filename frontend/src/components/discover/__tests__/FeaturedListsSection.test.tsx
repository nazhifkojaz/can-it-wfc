import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FeaturedListsSection from '../sections/FeaturedListsSection';
import type { DiscoverFeaturedList } from '../../../types/discover';

const baseList: DiscoverFeaturedList = {
  id: 1,
  name: 'Best Cafes',
  description: 'Handpicked spots',
  owner: { username: 'founder', display_name: 'Founder', avatar_url: null },
  item_count: 8,
  preview_cafes: [
    { id: 1, name: 'Coffee Lab' },
    { id: 2, name: 'Common Grounds' },
    { id: 3, name: 'Anomali' },
  ],
  featured_at: '2026-05-01T00:00:00Z',
  icon: 'star',
};

const defaultProps = {
  lists: [] as DiscoverFeaturedList[],
  isLoading: false,
  error: null,
  onListClick: vi.fn(),
  onRefetch: vi.fn(),
};

describe('FeaturedListsSection', () => {
  it('renders skeleton cards in loading state', () => {
    const { container } = render(<FeaturedListsSection {...defaultProps} isLoading={true} />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-roledescription="carousel"]')).toBeInTheDocument();
  });

  it('returns null when empty and not loading', () => {
    const { container } = render(<FeaturedListsSection {...defaultProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null on error', () => {
    const { container } = render(
      <FeaturedListsSection {...defaultProps} error="Server error" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders heading and carousel with cards in loaded state', () => {
    render(
      <FeaturedListsSection
        {...defaultProps}
        lists={[baseList, { ...baseList, id: 2 }]}
      />
    );
    expect(screen.getByText('Featured Lists')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /FEATURED/ })).toHaveLength(2);
  });

  it('fires onListClick when a list card is clicked', () => {
    const onListClick = vi.fn();
    render(
      <FeaturedListsSection
        {...defaultProps}
        lists={[baseList]}
        onListClick={onListClick}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /FEATURED/ }));
    expect(onListClick).toHaveBeenCalledWith(baseList);
  });
});
