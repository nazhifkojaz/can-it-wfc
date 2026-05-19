import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchResult } from '../../../types';
import { SearchOverlay } from '../SearchOverlay';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('../../../api/client', () => ({
  default: {
    get: mockGet,
  },
}));

vi.mock('../../../lib/analytics', () => ({
  trackSearchPerformed: vi.fn(),
  trackSearchResultSelected: vi.fn(),
}));

vi.mock('../../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

function makeResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    google_place_id: 'place_1',
    is_registered: false,
    name: 'Coffee Place',
    address: 'Jl. Test',
    latitude: '-6.2088',
    longitude: '106.8456',
    distance: 1.5,
    rating: 4.5,
    source: 'google',
    result_type: 'cafe',
    ...overrides,
  };
}

describe('SearchOverlay', () => {
  const onClose = vi.fn();
  const onSelectResult = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockGet.mockResolvedValue({
      data: {
        query: 'coffee',
        total_results: 0,
        results: [],
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function typeAndWait(queryText: string) {
    const input = screen.getByPlaceholderText('Search cafes or locations...');
    fireEvent.change(input, { target: { value: queryText } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
  }

  it('cancels pending searches when the overlay closes', () => {
    const { rerender } = render(
      <SearchOverlay
        isOpen={true}
        onClose={onClose}
        onSelectResult={onSelectResult}
        userLocation={{ lat: -6.2088, lon: 106.8456 }}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search cafes or locations...'), {
      target: { value: 'coffee' },
    });

    rerender(
      <SearchOverlay
        isOpen={false}
        onClose={onClose}
        onSelectResult={onSelectResult}
        userLocation={{ lat: -6.2088, lon: 106.8456 }}
      />
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockGet).not.toHaveBeenCalled();
  });

  it('uses the location captured when the overlay opened', async () => {
    const { rerender } = render(
      <SearchOverlay
        isOpen={true}
        onClose={onClose}
        onSelectResult={onSelectResult}
        userLocation={{ lat: -6.2088, lon: 106.8456 }}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search cafes or locations...'), {
      target: { value: 'coffee' },
    });

    rerender(
      <SearchOverlay
        isOpen={true}
        onClose={onClose}
        onSelectResult={onSelectResult}
        userLocation={{ lat: -6.2077, lon: 106.8445 }}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(mockGet).toHaveBeenCalledTimes(1);

    expect(mockGet).toHaveBeenCalledWith('/cafes/search/', expect.objectContaining({
      params: expect.objectContaining({
        q: 'coffee',
        lat: -6.2088,
        lon: 106.8456,
      }),
    }));
  });

  describe('result rendering', () => {
    it('renders results in relevance order with registration badges', async () => {
      mockGet.mockResolvedValue({
        data: {
          query: 'cafe',
          total_results: 3,
          results: [
            makeResult({
              google_place_id: 'reg_1',
              name: 'Registered Cafe',
              is_registered: true,
              result_type: 'cafe',
              source: 'database',
            }),
            makeResult({
              google_place_id: 'new_1',
              name: 'New Cafe',
              is_registered: false,
              result_type: 'cafe',
              source: 'google',
            }),
            makeResult({
              google_place_id: 'loc_1',
              name: 'City Center',
              is_registered: false,
              result_type: 'location',
              place_category_label: undefined,
              place_category: null,
            }),
          ],
        },
      });

      render(
        <SearchOverlay
          isOpen={true}
          onClose={onClose}
          onSelectResult={onSelectResult}
          userLocation={{ lat: -6.2088, lon: 106.8456 }}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('Search cafes or locations...'), {
        target: { value: 'cafe' },
      });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('Registered Cafe')).toBeDefined();
      expect(screen.getByText('New Cafe')).toBeDefined();
      expect(screen.getByText('City Center')).toBeDefined();
      expect(screen.getByText('Locations (1)')).toBeDefined();
    });
  });

  describe('escape closes overlay', () => {
    it('calls onClose when Escape is pressed', () => {
      render(
        <SearchOverlay
          isOpen={true}
          onClose={onClose}
          onSelectResult={onSelectResult}
          userLocation={{ lat: -6.2088, lon: 106.8456 }}
        />
      );

      const input = screen.getByPlaceholderText('Search cafes or locations...');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(() => {
      mockGet.mockResolvedValue({
        data: {
          query: 'cafe',
          total_results: 2,
          results: [
            makeResult({
              google_place_id: 'first',
              name: 'First Cafe',
              is_registered: true,
              result_type: 'cafe',
            }),
            makeResult({
              google_place_id: 'second',
              name: 'Second Cafe',
              is_registered: false,
              result_type: 'cafe',
            }),
          ],
        },
      });
    });

    async function setup() {
      render(
        <SearchOverlay
          isOpen={true}
          onClose={onClose}
          onSelectResult={onSelectResult}
          userLocation={{ lat: -6.2088, lon: 106.8456 }}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('Search cafes or locations...'), {
        target: { value: 'cafe' },
      });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });
    }

    it('navigates down with ArrowDown and selects with Enter', async () => {
      await setup();
      const input = screen.getByPlaceholderText('Search cafes or locations...');

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSelectResult).toHaveBeenCalledWith(
        expect.objectContaining({ google_place_id: 'first' })
      );
    });

    it('navigates up and down with arrow keys', async () => {
      await setup();
      const input = screen.getByPlaceholderText('Search cafes or locations...');

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSelectResult).toHaveBeenCalledWith(
        expect.objectContaining({ google_place_id: 'first' })
      );
    });

    it('uses visible result order for keyboard selection', async () => {
      mockGet.mockResolvedValue({
        data: {
          query: 'cafe',
          total_results: 2,
          results: [
            makeResult({
              google_place_id: 'location_first',
              name: 'City Center',
              result_type: 'location',
            }),
            makeResult({
              google_place_id: 'visible_first',
              name: 'Visible First Cafe',
              result_type: 'cafe',
            }),
          ],
        },
      });

      await setup();
      const input = screen.getByPlaceholderText('Search cafes or locations...');

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSelectResult).toHaveBeenCalledWith(
        expect.objectContaining({ google_place_id: 'visible_first' })
      );
    });
  });

  describe('google toggle', () => {
    it('renders include google toggle', () => {
      render(
        <SearchOverlay
          isOpen={true}
          onClose={onClose}
          onSelectResult={onSelectResult}
          userLocation={{ lat: -6.2088, lon: 106.8456 }}
        />
      );

      expect(screen.getByText('Include Google Maps results')).toBeDefined();
    });

    it('sends include_unregistered=false when toggle is off', async () => {
      mockGet.mockResolvedValue({
        data: {
          query: 'coffee',
          total_results: 1,
          results: [makeResult()],
        },
      });

      render(
        <SearchOverlay
          isOpen={true}
          onClose={onClose}
          onSelectResult={onSelectResult}
          userLocation={{ lat: -6.2088, lon: 106.8456 }}
        />
      );

      const toggle = screen.getByText('Include Google Maps results');
      fireEvent.click(toggle);

      fireEvent.change(screen.getByPlaceholderText('Search cafes or locations...'), {
        target: { value: 'coffee' },
      });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(mockGet).toHaveBeenCalledWith('/cafes/search/', expect.objectContaining({
        params: expect.objectContaining({ include_unregistered: false }),
      }));
    });
  });

  describe('match score badge', () => {
    it('shows match percentage for DB results', async () => {
      mockGet.mockResolvedValue({
        data: {
          query: 'coffee',
          total_results: 1,
          results: [
            makeResult({
              google_place_id: 'db_1',
              name: 'Coffee Lab',
              is_registered: true,
              source: 'database',
              match_score: 0.85,
            }),
          ],
        },
      });

      render(
        <SearchOverlay
          isOpen={true}
          onClose={onClose}
          onSelectResult={onSelectResult}
          userLocation={{ lat: -6.2088, lon: 106.8456 }}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('Search cafes or locations...'), {
        target: { value: 'coffee' },
      });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('85% match')).toBeDefined();
    });

    it('hides match percentage for Google results', async () => {
      mockGet.mockResolvedValue({
        data: {
          query: 'coffee',
          total_results: 1,
          results: [
            makeResult({
              google_place_id: 'goog_1',
              name: 'Coffee Place',
              is_registered: false,
              source: 'google',
              match_score: null,
            }),
          ],
        },
      });

      render(
        <SearchOverlay
          isOpen={true}
          onClose={onClose}
          onSelectResult={onSelectResult}
          userLocation={{ lat: -6.2088, lon: 106.8456 }}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('Search cafes or locations...'), {
        target: { value: 'coffee' },
      });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.queryByText(/% match/)).toBeNull();
    });
  });

  describe('distance display', () => {
    it('shows distance when userLocation is provided', async () => {
      mockGet.mockResolvedValue({
        data: {
          query: 'coffee',
          total_results: 1,
          results: [
            makeResult({
              google_place_id: 'dist_1',
              name: 'Coffee Place',
              result_type: 'cafe',
              distance: 1.5,
            }),
          ],
        },
      });

      render(
        <SearchOverlay
          isOpen={true}
          onClose={onClose}
          onSelectResult={onSelectResult}
          userLocation={{ lat: -6.2088, lon: 106.8456 }}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('Search cafes or locations...'), {
        target: { value: 'coffee' },
      });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.getByText('1.5km')).toBeDefined();
    });

    it('hides distance when userLocation is not provided', async () => {
      mockGet.mockResolvedValue({
        data: {
          query: 'coffee',
          total_results: 1,
          results: [
            makeResult({
              google_place_id: 'dist_2',
              name: 'Coffee Place',
              result_type: 'cafe',
              distance: 1.5,
            }),
          ],
        },
      });

      render(
        <SearchOverlay
          isOpen={true}
          onClose={onClose}
          onSelectResult={onSelectResult}
          searchCenter={{ lat: -6.2088, lng: 106.8456 }}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('Search cafes or locations...'), {
        target: { value: 'coffee' },
      });

      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
      });

      expect(screen.queryByText('1.5km')).toBeNull();
    });
  });

  describe('query and results clear on close', () => {
    it('clears query when overlay closes', () => {
      const { rerender } = render(
        <SearchOverlay
          isOpen={true}
          onClose={onClose}
          onSelectResult={onSelectResult}
          userLocation={{ lat: -6.2088, lon: 106.8456 }}
        />
      );

      fireEvent.change(screen.getByPlaceholderText('Search cafes or locations...'), {
        target: { value: 'coffee' },
      });

      rerender(
        <SearchOverlay
          isOpen={false}
          onClose={onClose}
          onSelectResult={onSelectResult}
        />
      );

      rerender(
        <SearchOverlay
          isOpen={true}
          onClose={onClose}
          onSelectResult={onSelectResult}
          userLocation={{ lat: -6.2088, lon: 106.8456 }}
        />
      );

      const input = screen.getByPlaceholderText('Search cafes or locations...') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });
});
