/**
 * Analytics tests for PostHog event tracking
 *
 * Tests the 8 behavioral events that the database cannot answer.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { posthog } from '../posthog';

vi.mock('../posthog', () => ({
  posthog: {
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    init: vi.fn(),
  },
}));

import {
  trackUserSignedUp,
  trackVisitLogged,
  trackReviewCreated,
  trackCafeViewed,
  trackSearchPerformed,
  trackDirectionsClicked,
  trackShareLinkCopied,
  trackLocationPermissionResponded,
} from '../analytics';

const mockCapture = posthog.capture as ReturnType<typeof vi.fn>;

describe('Analytics - user_signed_up', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should capture with email method', () => {
    trackUserSignedUp('email');
    expect(mockCapture).toHaveBeenCalledWith('user_signed_up', { method: 'email' });
  });

  it('should capture with google method', () => {
    trackUserSignedUp('google');
    expect(mockCapture).toHaveBeenCalledWith('user_signed_up', { method: 'google' });
  });
});

describe('Analytics - visit_logged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should capture visit with review', () => {
    trackVisitLogged({ cafeId: 42, includesReview: true });
    expect(mockCapture).toHaveBeenCalledWith('visit_logged', {
      cafe_id: 42,
      includes_review: true,
    });
  });

  it('should capture visit without review', () => {
    trackVisitLogged({ cafeId: 42, includesReview: false });
    expect(mockCapture).toHaveBeenCalledWith('visit_logged', {
      cafe_id: 42,
      includes_review: false,
    });
  });
});

describe('Analytics - review_created', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should capture from visit_modal', () => {
    trackReviewCreated({ cafeId: 42, wfcRating: 4, source: 'visit_modal' });
    expect(mockCapture).toHaveBeenCalledWith('review_created', {
      cafe_id: 42,
      wfc_rating: 4,
      source: 'visit_modal',
    });
  });

  it('should capture from standalone', () => {
    trackReviewCreated({ cafeId: 42, wfcRating: 5, source: 'standalone' });
    expect(mockCapture).toHaveBeenCalledWith('review_created', {
      cafe_id: 42,
      wfc_rating: 5,
      source: 'standalone',
    });
  });
});

describe('Analytics - cafe_viewed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should capture with source', () => {
    trackCafeViewed({ cafeId: 42, source: 'map_marker' });
    expect(mockCapture).toHaveBeenCalledWith('cafe_viewed', {
      cafe_id: 42,
      source: 'map_marker',
    });
  });

  it('should capture all valid sources', () => {
    const sources = ['map_marker', 'list_item', 'search_result', 'favorite', 'direct', 'discover'] as const;
    sources.forEach((source) => {
      trackCafeViewed({ cafeId: 42, source });
    });
    expect(mockCapture).toHaveBeenCalledTimes(sources.length);
  });
});

describe('Analytics - search_performed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should capture query and result count', () => {
    trackSearchPerformed({ query: 'starbucks menteng', resultCount: 7 });
    expect(mockCapture).toHaveBeenCalledWith('search_performed', {
      query: 'starbucks menteng',
      result_count: 7,
    });
  });

  it('should capture zero results', () => {
    trackSearchPerformed({ query: 'xyz', resultCount: 0 });
    expect(mockCapture).toHaveBeenCalledWith('search_performed', {
      query: 'xyz',
      result_count: 0,
    });
  });
});

describe('Analytics - directions_clicked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should capture cafe id', () => {
    trackDirectionsClicked({ cafeId: 42 });
    expect(mockCapture).toHaveBeenCalledWith('directions_clicked', {
      cafe_id: 42,
    });
  });
});

describe('Analytics - share_link_copied', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should capture list id', () => {
    trackShareLinkCopied({ listId: 10 });
    expect(mockCapture).toHaveBeenCalledWith('share_link_copied', {
      list_id: 10,
    });
  });
});

describe('Analytics - location_permission_responded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should capture when granted', () => {
    trackLocationPermissionResponded({ granted: true });
    expect(mockCapture).toHaveBeenCalledWith('location_permission_responded', {
      granted: true,
      error_code: null,
    });
  });

  it('should capture when denied with error code', () => {
    trackLocationPermissionResponded({ granted: false, errorCode: 'PERMISSION_DENIED' });
    expect(mockCapture).toHaveBeenCalledWith('location_permission_responded', {
      granted: false,
      error_code: 'PERMISSION_DENIED',
    });
  });
});
