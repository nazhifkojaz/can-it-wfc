import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useMapFilters } from '../useMapFilters';
import { DEFAULT_FILTERS } from '../../types/filters';

function createWrapper(initialEntries: string[] = ['/']) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  };
}

describe('useMapFilters', () => {
  it('initializes filters and appliedFilters from URL params', () => {
    const { result } = renderHook(() => useMapFilters(), {
      wrapper: createWrapper(['/?min_wifi=4&min_reviews=3']),
    });
    expect(result.current.filters.min_wifi).toBe(4);
    expect(result.current.filters.min_reviews).toBe(3);
    expect(result.current.appliedFilters.min_wifi).toBe(4);
    expect(result.current.appliedFilters.min_reviews).toBe(3);
  });

  it('falls back to defaults when no URL params present', () => {
    const { result } = renderHook(() => useMapFilters(), {
      wrapper: createWrapper(['/']),
    });
    expect(result.current.filters).toEqual(DEFAULT_FILTERS);
    expect(result.current.appliedFilters).toEqual(DEFAULT_FILTERS);
  });

  it('setFilter updates pending filters without affecting appliedFilters', () => {
    const { result } = renderHook(() => useMapFilters(), {
      wrapper: createWrapper(['/']),
    });
    act(() => { result.current.setFilter('min_wifi', 5); });
    expect(result.current.filters.min_wifi).toBe(5);
    expect(result.current.appliedFilters.min_wifi).toBeUndefined();
  });

  it('resetAll resets pending filters to defaults', () => {
    const { result } = renderHook(() => useMapFilters(), {
      wrapper: createWrapper(['/']),
    });
    act(() => {
      result.current.setFilter('min_wifi', 5);
      result.current.setFilter('max_noise', 1);
    });
    expect(result.current.filters.min_wifi).toBe(5);

    act(() => { result.current.resetAll(); });
    expect(result.current.filters).toEqual(DEFAULT_FILTERS);
  });

  it('applyFilters sets both filters and appliedFilters', () => {
    const { result } = renderHook(() => useMapFilters(), {
      wrapper: createWrapper(['/']),
    });
    const newFilters = { ...DEFAULT_FILTERS, min_wifi: 3, min_reviews: 1 };
    act(() => { result.current.applyFilters(newFilters); });
    expect(result.current.appliedFilters.min_wifi).toBe(3);
    expect(result.current.appliedFilters.min_reviews).toBe(1);
  });

  it('applyFilters syncs appliedFilters state', () => {
    const { result } = renderHook(() => useMapFilters(), {
      wrapper: createWrapper(['/']),
    });
    const newFilters = { ...DEFAULT_FILTERS, verified: true, min_wifi: 4 };
    act(() => { result.current.applyFilters(newFilters); });
    expect(result.current.appliedFilters.verified).toBe(true);
    expect(result.current.appliedFilters.min_wifi).toBe(4);
  });

  it('clearOne resets a single filter to its default', () => {
    const { result } = renderHook(() => useMapFilters(), {
      wrapper: createWrapper(['/?min_wifi=4&min_reviews=3']),
    });
    act(() => { result.current.clearOne('min_wifi'); });
    expect(result.current.appliedFilters.min_wifi).toBeUndefined();
    expect(result.current.filters.min_wifi).toBeUndefined();
    expect(result.current.appliedFilters.min_reviews).toBe(3); // unchanged
  });

  it('clearOne for verified sets it to false (default)', () => {
    const { result } = renderHook(() => useMapFilters(), {
      wrapper: createWrapper(['/?verified=true']),
    });
    expect(result.current.appliedFilters.verified).toBe(true);
    act(() => { result.current.clearOne('verified'); });
    expect(result.current.appliedFilters.verified).toBe(false);
  });

  it('clearOne for hide_closed sets it to true (default)', () => {
    const { result } = renderHook(() => useMapFilters(), {
      wrapper: createWrapper(['/?hide_closed=false']),
    });
    expect(result.current.appliedFilters.hide_closed).toBe(false);
    act(() => { result.current.clearOne('hide_closed'); });
    expect(result.current.appliedFilters.hide_closed).toBe(true);
  });

  it('clearOne resets both pending and applied state', () => {
    const { result } = renderHook(() => useMapFilters(), {
      wrapper: createWrapper(['/?min_wifi=4&min_reviews=3']),
    });
    act(() => { result.current.clearOne('min_wifi'); });
    expect(result.current.appliedFilters.min_wifi).toBeUndefined();
    expect(result.current.filters.min_wifi).toBeUndefined();
    expect(result.current.appliedFilters.min_reviews).toBe(3);
  });

  it('syncPending copies appliedFilters to filters', () => {
    const { result } = renderHook(() => useMapFilters(), {
      wrapper: createWrapper(['/?min_wifi=4']),
    });
    act(() => { result.current.setFilter('min_wifi', 5); });
    expect(result.current.filters.min_wifi).toBe(5);
    act(() => { result.current.syncPending(); });
    expect(result.current.filters.min_wifi).toBe(4);
  });

  it('applyFilters with defaults clears active filters', () => {
    const { result } = renderHook(() => useMapFilters(), {
      wrapper: createWrapper(['/?min_wifi=4']),
    });
    act(() => { result.current.applyFilters({ ...DEFAULT_FILTERS }); });
    expect(result.current.appliedFilters.min_wifi).toBeUndefined();
  });
});
