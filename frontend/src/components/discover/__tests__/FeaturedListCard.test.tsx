import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FeaturedListCard from '../cards/FeaturedListCard';
import type { DiscoverFeaturedList } from '../../../types/discover';

const baseList: DiscoverFeaturedList = {
  id: 12,
  name: 'Best Cafes for Video Calls in Jakarta',
  description: 'Quiet rooms, fast wifi, private booths — handpicked for video-heavy days.',
  owner: { username: 'founder', display_name: 'WFC Team', avatar_url: null },
  item_count: 8,
  preview_cafes: [
    { id: 1, name: 'Coffee Lab' },
    { id: 2, name: 'Common Grounds' },
    { id: 3, name: 'Anomali Coffee' },
  ],
  featured_at: '2026-05-01T00:00:00Z',
  icon: 'video',
};

describe('FeaturedListCard', () => {
  it('renders FEATURED pill, title, description, chips, and footer', () => {
    render(<FeaturedListCard list={baseList} variant="featured" onClick={vi.fn()} />);
    expect(screen.getByText('FEATURED')).toBeInTheDocument();
    expect(screen.getByText(baseList.name)).toBeInTheDocument();
    expect(screen.getByText('Coffee Lab')).toBeInTheDocument();
    expect(screen.getByText('Common Grounds')).toBeInTheDocument();
    expect(screen.getByText('Anomali Coffee')).toBeInTheDocument();
    expect(screen.getByText('+5')).toBeInTheDocument();
    expect(screen.getByText(/@founder/)).toBeInTheDocument();
    expect(screen.getByText(/8 cafes/)).toBeInTheDocument();
  });

  it('fires onClick when card is clicked', () => {
    const onClick = vi.fn();
    render(<FeaturedListCard list={baseList} variant="featured" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /FEATURED/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('fires onClick on keyboard Enter', () => {
    const onClick = vi.fn();
    render(<FeaturedListCard list={baseList} variant="featured" onClick={onClick} />);
    fireEvent.keyDown(screen.getByRole('button', { name: /FEATURED/ }), { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not show more button for short description', () => {
    render(<FeaturedListCard list={baseList} variant="featured" onClick={vi.fn()} />);
    expect(screen.queryByText('more')).not.toBeInTheDocument();
  });

  it('shows more/less toggle for long description', () => {
    const longDesc = 'A'.repeat(200);
    render(
      <FeaturedListCard
        list={{ ...baseList, description: longDesc }}
        variant="featured"
        onClick={vi.fn()}
      />
    );
    const moreBtn = screen.getByText('more');
    expect(moreBtn).toBeInTheDocument();

    fireEvent.click(moreBtn);
    expect(screen.getByText('less')).toBeInTheDocument();
    expect(screen.getByText(longDesc)).toBeInTheDocument();

    fireEvent.click(screen.getByText('less'));
    expect(screen.getByText('more')).toBeInTheDocument();
  });

  it('more button click does not propagate to card', () => {
    const onClick = vi.fn();
    const longDesc = 'A'.repeat(200);
    render(
      <FeaturedListCard
        list={{ ...baseList, description: longDesc }}
        variant="featured"
        onClick={onClick}
      />
    );
    fireEvent.click(screen.getByText('more'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows +N overflow chip only when item_count > 3', () => {
    render(
      <FeaturedListCard
        list={{ ...baseList, item_count: 3 }}
        variant="featured"
        onClick={vi.fn()}
      />
    );
    expect(screen.queryByText('+0')).not.toBeInTheDocument();
  });

  it('handles empty preview_cafes gracefully', () => {
    render(
      <FeaturedListCard
        list={{ ...baseList, preview_cafes: [], item_count: 0 }}
        variant="featured"
        onClick={vi.fn()}
      />
    );
    expect(screen.queryByText('Coffee Lab')).not.toBeInTheDocument();
  });

  it('does not show +N when item_count equals 3', () => {
    render(
      <FeaturedListCard
        list={{ ...baseList, item_count: 3 }}
        variant="featured"
        onClick={vi.fn()}
      />
    );
    expect(screen.queryByText('+')).not.toBeInTheDocument();
  });
});
