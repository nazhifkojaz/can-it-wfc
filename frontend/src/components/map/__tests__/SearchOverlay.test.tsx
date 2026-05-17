import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchOverlay } from '../SearchOverlay';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('../../../api/client', () => ({
  default: {
    get: mockGet,
  },
}));

vi.mock('../../../lib/analytics', () => ({
  trackSearchPerformed: vi.fn(),
}));

vi.mock('../../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

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
      params: {
        q: 'coffee',
        lat: -6.2088,
        lon: 106.8456,
      },
    }));
  });
});
