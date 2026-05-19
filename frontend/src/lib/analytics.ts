/**
 * PostHog Analytics Event Tracking
 *
 * Only tracks behavioral events that the database cannot answer.
 * If the DB can answer it, PostHog doesn't track it.
 *
 * Event naming convention: snake_case with object_action pattern
 */

import { posthog } from './posthog';

export const trackUserSignedUp = (method: 'email' | 'google') => {
  posthog.capture('user_signed_up', { method });
};

export const trackVisitLogged = (props: {
  cafeId: number;
  includesReview: boolean;
}) => {
  posthog.capture('visit_logged', {
    cafe_id: props.cafeId,
    includes_review: props.includesReview,
  });
};

export const trackReviewCreated = (props: {
  cafeId: number;
  wfcRating: number;
  source: 'visit_modal' | 'standalone';
}) => {
  posthog.capture('review_created', {
    cafe_id: props.cafeId,
    wfc_rating: props.wfcRating,
    source: props.source,
  });
};

type CafeViewSource =
  | 'map_marker'
  | 'list_item'
  | 'search_result'
  | 'favorite'
  | 'direct'
  | 'discover';

export const trackCafeViewed = (props: {
  cafeId: number;
  source: CafeViewSource;
}) => {
  posthog.capture('cafe_viewed', {
    cafe_id: props.cafeId,
    source: props.source,
  });
};

export const trackSearchPerformed = (props: {
  queryLength: number;
  resultCount: number;
  registeredCount: number;
  providerCount: number;
  locationCount: number;
}) => {
  posthog.capture('search_performed', {
    query_length: props.queryLength,
    result_count: props.resultCount,
    registered_count: props.registeredCount,
    provider_count: props.providerCount,
    location_count: props.locationCount,
  });
};

export const trackSearchResultSelected = (props: {
  source: string;
  resultType: string;
  isRegistered: boolean;
}) => {
  posthog.capture('search_result_selected', {
    source: props.source,
    result_type: props.resultType,
    is_registered: props.isRegistered,
  });
};

export const trackDirectionsClicked = (props: {
  cafeId: number;
}) => {
  posthog.capture('directions_clicked', {
    cafe_id: props.cafeId,
  });
};

export const trackShareLinkCopied = (props: {
  listId: number;
}) => {
  posthog.capture('share_link_copied', {
    list_id: props.listId,
  });
};

export const trackLocationPermissionResponded = (props: {
  granted: boolean;
  errorCode?: string;
}) => {
  posthog.capture('location_permission_responded', {
    granted: props.granted,
    error_code: props.errorCode || null,
  });
};
