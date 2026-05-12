import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRecentReviews, useFeaturedLists, useTrendingCafes } from '../useDiscover';
import type { DiscoverReview, DiscoverFeaturedList, DiscoverTrendingCafe } from '../../types/discover';

const mockGetRecentReviews = vi.fn();
const mockGetFeaturedLists = vi.fn();
const mockGetTrendingCafes = vi.fn();

vi.mock('../../api/client', () => ({
  discoverApi: {
    getRecentReviews: (...args: unknown[]) => mockGetRecentReviews(...args),
    getFeaturedLists: (...args: unknown[]) => mockGetFeaturedLists(...args),
    getTrendingCafes: (...args: unknown[]) => mockGetTrendingCafes(...args),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const review = (overrides?: Partial<DiscoverReview>): DiscoverReview => ({
  id: 1,
  cafe: { id: 1, name: 'Coffee Lab', address_short: 'Jl. Senopati' },
  user: { username: 'alice', display_name: 'Alice', avatar_url: null },
  wfc_rating: 4.5,
  comment: 'Great wifi',
  visit_time_label: 'afternoon',
  created_at: '2026-05-11T10:30:00Z',
  ...overrides,
});

const featuredList = (overrides?: Partial<DiscoverFeaturedList>): DiscoverFeaturedList => ({
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
  ...overrides,
});

const trendingCafe = (overrides?: Partial<DiscoverTrendingCafe>): DiscoverTrendingCafe => ({
  id: 1,
  name: 'Coffee Lab',
  address_short: 'Jl. Senopati',
  average_wfc_rating: 4.6,
  recent_review_count: 3,
  recent_visit_count: 12,
  score: 21,
  ...overrides,
});

describe('useRecentReviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    mockGetRecentReviews.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useRecentReviews(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.reviews).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.hasMore).toBe(false);
  });

  it('returns reviews on success', async () => {
    const page = {
      count: 1,
      next: null,
      previous: null,
      results: [review()],
    };
    mockGetRecentReviews.mockResolvedValue(page);
    const { result } = renderHook(() => useRecentReviews(), { wrapper: createWrapper() });
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(result.current.reviews).toEqual(page.results);
    expect(result.current.error).toBeNull();
    expect(result.current.hasMore).toBe(false);
  });

  it('reports hasMore=true when next URL exists', async () => {
    const page = {
      count: 40,
      next: 'http://localhost/api/discover/recent-reviews/?limit=20&offset=20',
      previous: null,
      results: [review()],
    };
    mockGetRecentReviews.mockResolvedValue(page);
    const { result } = renderHook(() => useRecentReviews(), { wrapper: createWrapper() });
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(result.current.hasMore).toBe(true);
  });

  it('extracts error message on failure', async () => {
    mockGetRecentReviews.mockRejectedValue({
      response: { data: { detail: 'Server error' }, status: 500 },
    });
    const { result } = renderHook(() => useRecentReviews(), { wrapper: createWrapper() });
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(result.current.error).toBe('Server error');
    expect(result.current.reviews).toEqual([]);
  });

  it('loads more pages via loadMore', async () => {
    const page1 = {
      count: 2,
      next: 'http://localhost/api/discover/recent-reviews/?limit=1&offset=1',
      previous: null,
      results: [review({ id: 1 })],
    };
    const page2 = {
      count: 2,
      next: null,
      previous: 'http://localhost/api/discover/recent-reviews/?limit=1&offset=0',
      results: [review({ id: 2 })],
    };
    mockGetRecentReviews
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);
    const { result } = renderHook(() => useRecentReviews({ limit: 1 }), { wrapper: createWrapper() });
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(result.current.reviews).toHaveLength(1);

    await act(async () => { result.current.loadMore(); });
    await waitFor(() => { expect(result.current.reviews).toHaveLength(2); });
    expect(mockGetRecentReviews).toHaveBeenCalledTimes(2);
    expect(mockGetRecentReviews).toHaveBeenLastCalledWith(1, 1);
  });

  it('hard-caps reviews at 100', async () => {
    const reviews = Array.from({ length: 101 }, (_, i) => review({ id: i + 1 }));
    const page = {
      count: 101,
      next: null,
      previous: null,
      results: reviews,
    };
    mockGetRecentReviews.mockResolvedValue(page);
    const { result } = renderHook(() => useRecentReviews({ limit: 101 }), { wrapper: createWrapper() });
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(result.current.reviews).toHaveLength(100);
  });

  it('guards refetch while fetching', async () => {
    let resolve: (v: typeof page) => void;
    const deferred = new Promise<typeof page>(r => { resolve = r; });
    const page = { count: 0, next: null, previous: null, results: [] };

    mockGetRecentReviews.mockReturnValue(deferred);
    const { result } = renderHook(() => useRecentReviews(), { wrapper: createWrapper() });

    act(() => { result.current.refetch(); });
    act(() => { result.current.refetch(); });

    resolve!(page);
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(mockGetRecentReviews).toHaveBeenCalledTimes(1);
  });
});

describe('useFeaturedLists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    mockGetFeaturedLists.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFeaturedLists(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.lists).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns lists on success', async () => {
    mockGetFeaturedLists.mockResolvedValue({ lists: [featuredList()] });
    const { result } = renderHook(() => useFeaturedLists(), { wrapper: createWrapper() });
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(result.current.lists).toEqual([featuredList()]);
    expect(result.current.error).toBeNull();
  });

  it('returns empty lists when none featured', async () => {
    mockGetFeaturedLists.mockResolvedValue({ lists: [] });
    const { result } = renderHook(() => useFeaturedLists(), { wrapper: createWrapper() });
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(result.current.lists).toEqual([]);
  });

  it('extracts error message on failure', async () => {
    mockGetFeaturedLists.mockRejectedValue({
      response: { data: { detail: 'Server error' }, status: 500 },
    });
    const { result } = renderHook(() => useFeaturedLists(), { wrapper: createWrapper() });
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(result.current.error).toBe('Server error');
  });

  it('guards refetch while fetching', async () => {
    let resolve: (v: { lists: DiscoverFeaturedList[] }) => void;
    const deferred = new Promise<{ lists: DiscoverFeaturedList[] }>(r => { resolve = r; });

    mockGetFeaturedLists.mockReturnValue(deferred);
    const { result } = renderHook(() => useFeaturedLists(), { wrapper: createWrapper() });

    act(() => { result.current.refetch(); });
    act(() => { result.current.refetch(); });

    resolve!({ lists: [] });
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(mockGetFeaturedLists).toHaveBeenCalledTimes(1);
  });
});

describe('useTrendingCafes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    mockGetTrendingCafes.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTrendingCafes(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.cafes).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns cafes on success', async () => {
    mockGetTrendingCafes.mockResolvedValue({
      window_days: 7,
      generated_at: '2026-05-11T12:00:00Z',
      cafes: [trendingCafe()],
    });
    const { result } = renderHook(() => useTrendingCafes(), { wrapper: createWrapper() });
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(result.current.cafes).toEqual([trendingCafe()]);
    expect(result.current.error).toBeNull();
  });

  it('returns empty cafes when no activity', async () => {
    mockGetTrendingCafes.mockResolvedValue({
      window_days: 7,
      generated_at: '2026-05-11T12:00:00Z',
      cafes: [],
    });
    const { result } = renderHook(() => useTrendingCafes(), { wrapper: createWrapper() });
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(result.current.cafes).toEqual([]);
  });

  it('passes days and limit through', async () => {
    mockGetTrendingCafes.mockResolvedValue({
      window_days: 14,
      generated_at: '2026-05-11T12:00:00Z',
      cafes: [],
    });
    renderHook(() => useTrendingCafes({ days: 14, limit: 8 }), { wrapper: createWrapper() });
    await waitFor(() => { expect(mockGetTrendingCafes).toHaveBeenCalledWith(14, 8); });
  });

  it('extracts error message on failure', async () => {
    mockGetTrendingCafes.mockRejectedValue({
      response: { data: { detail: 'Server error' }, status: 500 },
    });
    const { result } = renderHook(() => useTrendingCafes(), { wrapper: createWrapper() });
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(result.current.error).toBe('Server error');
  });

  it('guards refetch while fetching', async () => {
    let resolve: (v: { window_days: number; generated_at: string; cafes: DiscoverTrendingCafe[] }) => void;
    const deferred = new Promise<{ window_days: number; generated_at: string; cafes: DiscoverTrendingCafe[] }>(r => { resolve = r; });

    mockGetTrendingCafes.mockReturnValue(deferred);
    const { result } = renderHook(() => useTrendingCafes(), { wrapper: createWrapper() });

    act(() => { result.current.refetch(); });
    act(() => { result.current.refetch(); });

    resolve!({ window_days: 7, generated_at: '', cafes: [] });
    await waitFor(() => { expect(result.current.isLoading).toBe(false); });
    expect(mockGetTrendingCafes).toHaveBeenCalledTimes(1);
  });
});
