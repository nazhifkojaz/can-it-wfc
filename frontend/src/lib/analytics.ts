/**
 * PostHog Analytics Event Tracking
 *
 * Centralized analytics event tracking for Can-It-WFC.
 * All PostHog event calls should go through these helpers
 * to ensure consistent property naming and types.
 *
 * Event naming convention: snake_case with object_action pattern
 */

import { posthog } from './posthog';

// ============================================================================
// AUTH EVENTS (Critical)
// ============================================================================

/**
 * Track when a user completes registration.
 * @param method - 'email' for email/password, 'google' for Google OAuth
 */
export const trackUserSignedUp = (method: 'email' | 'google') => {
  posthog.capture('user_signed_up', { method });
};

/**
 * Track when a user successfully logs in.
 * @param method - 'email' for email/password, 'google' for Google OAuth
 */
export const trackUserLoggedIn = (method: 'email' | 'google') => {
  posthog.capture('user_logged_in', { method });
};

/**
 * Track when a user explicitly logs out.
 */
export const trackUserLoggedOut = () => {
  posthog.capture('user_logged_out');
};

// ============================================================================
// CAFE EVENTS (Critical)
// ============================================================================

type CafeViewSource =
  | 'map_marker'
  | 'list_item'
  | 'search_result'
  | 'activity_feed'
  | 'favorite'
  | 'direct';

/**
 * Track when a user opens the Cafe Detail Sheet.
 * Core engagement metric - measures discovery to detail view conversion.
 */
export const trackCafeViewed = (props: {
  cafeId: number;
  cafeName: string;
  isRegistered: boolean;
  hasWfcRating: boolean;
  source: CafeViewSource;
  distanceKm: number | null;
}) => {
  posthog.capture('cafe_viewed', {
    cafe_id: props.cafeId,
    cafe_name: props.cafeName,
    is_registered: props.isRegistered,
    has_wfc_rating: props.hasWfcRating,
    source: props.source,
    distance_km: props.distanceKm,
  });
};

// ============================================================================
// VISIT EVENTS (Critical)
// ============================================================================

type VisitTimeLabel = 'morning' | 'afternoon' | 'evening';

/**
 * Track when a user successfully logs a visit.
 * Core conversion event - converts browser to active user.
 */
export const trackVisitLogged = (props: {
  cafeId: number;
  cafeName: string;
  includesReview: boolean;
  visitTime: VisitTimeLabel | null;
  amountSpent: number | null;
  currency: string | null;
  isDuplicateVisit: boolean;
}) => {
  posthog.capture('visit_logged', {
    cafe_id: props.cafeId,
    cafe_name: props.cafeName,
    includes_review: props.includesReview,
    visit_time: props.visitTime,
    amount_spent: props.amountSpent,
    currency: props.currency,
    is_duplicate_visit: props.isDuplicateVisit,
  });
};

/**
 * Track when a user deletes a visit.
 */
export const trackVisitDeleted = (props: {
  cafeId: number;
  cafeName: string;
}) => {
  posthog.capture('visit_deleted', {
    cafe_id: props.cafeId,
    cafe_name: props.cafeName,
  });
};

// ============================================================================
// REVIEW EVENTS (Critical)
// ============================================================================

type ReviewSource = 'visit_modal' | 'standalone';

/**
 * Track when a user submits a new review.
 * Reviews are core content - power WFC ratings that differentiate from Google Maps.
 */
export const trackReviewCreated = (props: {
  cafeId: number;
  cafeName: string;
  wfcRating: number;
  wifiQuality: number;
  hasComment: boolean;
  commentLength: number;
  source: ReviewSource;
  hasSmokingArea: 'yes' | 'no' | 'unknown';
  hasPrayerRoom: 'yes' | 'no' | 'unknown';
}) => {
  posthog.capture('review_created', {
    cafe_id: props.cafeId,
    cafe_name: props.cafeName,
    wfc_rating: props.wfcRating,
    wifi_quality: props.wifiQuality,
    has_comment: props.hasComment,
    comment_length: props.commentLength,
    source: props.source,
    has_smoking_area: props.hasSmokingArea,
    has_prayer_room: props.hasPrayerRoom,
  });
};

/**
 * Track when a user edits an existing review.
 */
export const trackReviewEdited = (props: {
  cafeId: number;
  cafeName: string;
  fieldsChanged: string[];
}) => {
  posthog.capture('review_edited', {
    cafe_id: props.cafeId,
    cafe_name: props.cafeName,
    fields_changed: props.fieldsChanged,
  });
};

/**
 * Track when a user deletes their review.
 */
export const trackReviewDeleted = (props: {
  cafeId: number;
  cafeName: string;
}) => {
  posthog.capture('review_deleted', {
    cafe_id: props.cafeId,
    cafe_name: props.cafeName,
  });
};

// ============================================================================
// SEARCH & DISCOVERY EVENTS (High Priority)
// ============================================================================

type SearchResultType = 'wfc' | 'google';

/**
 * Track when a user submits a search query.
 */
export const trackSearchPerformed = (props: {
  query: string;
  resultCountWfc: number;
  resultCountGoogle: number;
}) => {
  posthog.capture('search_performed', {
    query: props.query,
    result_count_wfc: props.resultCountWfc,
    result_count_google: props.resultCountGoogle,
    total_results: props.resultCountWfc + props.resultCountGoogle,
  });
};

/**
 * Track when a user clicks a search result.
 */
export const trackSearchResultClicked = (props: {
  query: string;
  resultType: SearchResultType;
  resultPosition: number;
  cafeName: string;
}) => {
  posthog.capture('search_result_clicked', {
    query: props.query,
    result_type: props.resultType,
    result_position: props.resultPosition,
    cafe_name: props.cafeName,
  });
};

/**
 * Track when a user clicks "Search This Area" on the map.
 */
export const trackMapAreaSearched = (props: {
  latitude: number;
  longitude: number;
}) => {
  posthog.capture('map_area_searched', {
    latitude: Math.round(props.latitude * 100) / 100,
    longitude: Math.round(props.longitude * 100) / 100,
  });
};

// ============================================================================
// FAVORITE EVENTS (High Priority)
// ============================================================================

type FavoriteSource = 'detail_sheet' | 'favorites_panel';

/**
 * Track when a user adds a cafe to favorites.
 * Strong intent signal - user wants to return.
 */
export const trackCafeFavorited = (props: {
  cafeId: number;
  cafeName: string;
}) => {
  posthog.capture('cafe_favorited', {
    cafe_id: props.cafeId,
    cafe_name: props.cafeName,
  });
};

/**
 * Track when a user removes a cafe from favorites.
 */
export const trackCafeUnfavorited = (props: {
  cafeId: number;
  source: FavoriteSource;
}) => {
  posthog.capture('cafe_unfavorited', {
    cafe_id: props.cafeId,
    source: props.source,
  });
};

// ============================================================================
// DIRECTIONS EVENTS (High Priority)
// ============================================================================

/**
 * Track when a user clicks "Get Directions" button.
 * Strongest real-world conversion signal - user intends to physically visit.
 */
export const trackDirectionsClicked = (props: {
  cafeId: number;
  cafeName: string;
  distanceKm: number | null;
}) => {
  posthog.capture('directions_clicked', {
    cafe_id: props.cafeId,
    cafe_name: props.cafeName,
    distance_km: props.distanceKm,
  });
};

// ============================================================================
// SOCIAL EVENTS (High Priority)
// ============================================================================

type FollowSource =
  | 'user_profile_modal'
  | 'user_profile_panel'
  | 'review_card'
  | 'followers_modal';

type ProfileViewSource =
  | 'review_card'
  | 'activity_feed'
  | 'followers_modal'
  | 'user_profile_panel';

/**
 * Track when a user follows another user.
 */
export const trackUserFollowed = (props: {
  targetUsername: string;
  source: FollowSource;
}) => {
  posthog.capture('user_followed', {
    target_username: props.targetUsername,
    source: props.source,
  });
};

/**
 * Track when a user unfollows another user.
 */
export const trackUserUnfollowed = (props: {
  targetUsername: string;
}) => {
  posthog.capture('user_unfollowed', {
    target_username: props.targetUsername,
  });
};

/**
 * Track when a user views another user's profile.
 */
export const trackUserProfileViewed = (props: {
  targetUsername: string;
  source: ProfileViewSource;
}) => {
  posthog.capture('user_profile_viewed', {
    target_username: props.targetUsername,
    source: props.source,
  });
};

// ============================================================================
// REVIEW HELPFUL EVENTS (High Priority)
// ============================================================================

/**
 * Track when a user marks a review as helpful/unhelpful.
 */
export const trackReviewMarkedHelpful = (props: {
  reviewId: number;
  cafeId: number;
  action: 'marked' | 'unmarked';
}) => {
  posthog.capture('review_marked_helpful', {
    review_id: props.reviewId,
    cafe_id: props.cafeId,
    action: props.action,
  });
};

/**
 * Track when a user flags a review as inappropriate.
 */
export const trackReviewFlagged = (props: {
  reviewId: number;
  cafeId: number;
  reason: string;
}) => {
  posthog.capture('review_flagged', {
    review_id: props.reviewId,
    cafe_id: props.cafeId,
    reason: props.reason,
  });
};

// ============================================================================
// UX EVENTS (Medium Priority)
// ============================================================================

export type ViewMode = 'map' | 'list';

/**
 * Track when a user switches between Map and List view.
 */
export const trackViewModeToggled = (props: {
  switchedTo: ViewMode;
}) => {
  posthog.capture('view_mode_toggled', {
    switched_to: props.switchedTo,
  });
};

type SortBy = 'nearest' | 'top_rated' | 'popular';

/**
 * Track when a user changes the sort order in List View.
 */
export const trackListSorted = (props: {
  sortBy: SortBy;
}) => {
  posthog.capture('list_sorted', {
    sort_by: props.sortBy,
  });
};

// ============================================================================
// PANEL EVENTS (Medium Priority)
// ============================================================================

type PanelType = 'activity' | 'profile' | 'user_profile';

/**
 * Track when a user opens a side panel.
 */
export const trackPanelOpened = (props: {
  panel: PanelType;
}) => {
  posthog.capture('panel_opened', {
    panel: props.panel,
  });
};

type ProfileTab = 'visits' | 'lists' | 'settings';

/**
 * Track when a user switches tabs in the Profile Panel.
 */
export const trackProfileTabViewed = (props: {
  tab: ProfileTab;
}) => {
  posthog.capture('profile_tab_viewed', {
    tab: props.tab,
  });
};

// ============================================================================
// ACTIVITY FEED EVENTS (Medium Priority)
// ============================================================================

type AnalyticsActivityCategory = 'review' | 'visit' | 'follow';
type ActivityAction = 'view_cafe' | 'view_profile';

export const trackActivityItemClicked = (props: {
  activityType: AnalyticsActivityCategory;
  actionTaken: ActivityAction;
}) => {
  posthog.capture('activity_item_clicked', {
    activity_type: props.activityType,
    action_taken: props.actionTaken,
  });
};

// ============================================================================
// CAFE FLAGGING EVENTS (Medium Priority)
// ============================================================================

type CafeFlagReason =
  | 'not_cafe'
  | 'wrong_location'
  | 'permanently_closed'
  | 'duplicate';

/**
 * Track when a user submits a cafe report.
 */
export const trackCafeFlagged = (props: {
  cafeId: number;
  reason: CafeFlagReason;
}) => {
  posthog.capture('cafe_flagged', {
    cafe_id: props.cafeId,
    reason: props.reason,
  });
};

// ============================================================================
// LOCATION PERMISSION EVENTS (Medium Priority)
// ============================================================================

/**
 * Track when a user responds to browser geolocation prompt.
 */
export const trackLocationPermissionResponded = (props: {
  granted: boolean;
  errorCode?: string;
}) => {
  posthog.capture('location_permission_responded', {
    granted: props.granted,
    error_code: props.errorCode || null,
  });
};

// ============================================================================
// USERNAME SETUP EVENTS (Low Priority)
// ============================================================================

type UsernameSetupAction = 'set_username' | 'skipped';

/**
 * Track when new Google user completes or skips username setup.
 */
export const trackUsernameSetupCompleted = (props: {
  action: UsernameSetupAction;
}) => {
  posthog.capture('username_setup_completed', {
    action: props.action,
  });
};

// ============================================================================
// SETTINGS EVENTS (Low Priority)
// ============================================================================

type PrivacySetting = 'profile_visibility' | 'anonymous_display' | 'activity_visibility';

/**
 * Track when a user changes a privacy setting.
 */
export const trackPrivacySettingsChanged = (props: {
  setting: PrivacySetting;
  newValue: string | boolean;
}) => {
  posthog.capture('privacy_settings_changed', {
    setting: props.setting,
    new_value: props.newValue,
  });
};

/**
 * Track when a user changes their password.
 */
export const trackPasswordChanged = () => {
  posthog.capture('password_changed');
};

// ============================================================================
// GOOGLE RATING EVENTS (Low Priority)
// ============================================================================

/**
 * Track when a user clicks "Refresh" on stale Google rating.
 */
export const trackGoogleRatingRefreshed = (props: {
  cafeId: number;
}) => {
  posthog.capture('google_rating_refreshed', {
    cafe_id: props.cafeId,
  });
};
