export const queryKeys = {
  cafes: ['cafes'] as const,
  cafesList: (filters?: any) => [...queryKeys.cafes, 'list', filters] as const,
  cafesNearby: (lat: number, lng: number, radius?: number) =>
    [...queryKeys.cafes, 'nearby', { lat, lng, radius }] as const,
  cafeDetail: (id: number) => [...queryKeys.cafes, 'detail', id] as const,

  favorites: ['favorites'] as const,
  favoritesList: () => [...queryKeys.favorites, 'list'] as const,

  visits: ['visits'] as const,
  visitsList: () => [...queryKeys.visits, 'list'] as const,
  visitDetail: (id: number) => [...queryKeys.visits, 'detail', id] as const,

  reviews: ['reviews'] as const,
  reviewsList: (cafeId?: number) =>
    [...queryKeys.reviews, 'list', { cafeId }] as const,
  reviewDetail: (id: number) => [...queryKeys.reviews, 'detail', id] as const,
  myReviews: () => [...queryKeys.reviews, 'my'] as const,

  user: ['user'] as const,
  userProfile: () => [...queryKeys.user, 'profile'] as const,
};
