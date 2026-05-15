import { CafeFilters } from '../types/filters';

export const queryKeys = {
  cafes: ['cafes'] as const,
  cafesNearby: (
    lat: number,
    lng: number,
    radius?: number,
    cafeFilters?: CafeFilters,
    userLat?: number,
    userLng?: number,
  ) => [...queryKeys.cafes, 'nearby', { lat, lng, radius, userLat, userLng, ...cafeFilters }] as const,
  cafeDetail: (id: number) => [...queryKeys.cafes, 'detail', id] as const,
  cafeMemberships: (cafeId: number) => [...queryKeys.cafes, cafeId, 'my-lists'] as const,
  cafeInsights: (cafeId: number) => [...queryKeys.cafes, cafeId, 'insights'] as const,

  lists: ['lists'] as const,
  listsList: () => [...queryKeys.lists, 'list'] as const,
  listDetail: (id: number) => [...queryKeys.lists, 'detail', id] as const,

  visits: ['visits'] as const,
  visitsList: (filters?: { ordering?: string; visit_date__gte?: string; visit_date__lte?: string }) =>
    [...queryKeys.visits, 'list', filters ?? {}] as const,
  visitDetail: (id: number) => [...queryKeys.visits, 'detail', id] as const,

  reviews: ['reviews'] as const,
  reviewsList: (cafeId?: number) =>
    [...queryKeys.reviews, 'list', { cafeId }] as const,
  reviewDetail: (id: number) => [...queryKeys.reviews, 'detail', id] as const,
  myReviews: () => [...queryKeys.reviews, 'my'] as const,
  userReviews: (username: string) => [...queryKeys.reviews, 'user', username] as const,

  user: ['user'] as const,
  userProfile: () => [...queryKeys.user, 'profile'] as const,

  discover: ['discover'] as const,
  discoverRecentReviews: (limit?: number) =>
    [...queryKeys.discover, 'recent-reviews', { limit }] as const,
  discoverFeaturedLists: (limit?: number) =>
    [...queryKeys.discover, 'featured-lists', { limit }] as const,
  discoverTrending: (days: number, limit: number) =>
    [...queryKeys.discover, 'trending', { days, limit }] as const,
  discoverTrendingLists: (days: number, limit: number) =>
    [...queryKeys.discover, 'trending-lists', { days, limit }] as const,
  savedLists: (limit?: number) =>
    [...queryKeys.user, 'saved-lists', { limit }] as const,
};
