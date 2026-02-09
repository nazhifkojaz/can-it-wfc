/**
 * Analytics tests for PostHog event tracking
 *
 * Tests that analytics events are called with correct properties
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { posthog } from '../posthog';

// Mock posthog
vi.mock('../posthog', () => ({
  posthog: {
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    init: vi.fn(),
  },
}));

// Import analytics after mocking posthog
import {
  trackUserSignedUp,
  trackUserLoggedIn,
  trackUserLoggedOut,
  trackCafeViewed,
  trackDirectionsClicked,
  trackCafeFavorited,
  trackCafeUnfavorited,
  trackVisitLogged,
  trackVisitDeleted,
  trackReviewCreated,
  trackReviewEdited,
  trackReviewDeleted,
  trackSearchPerformed,
  trackSearchResultClicked,
  trackMapAreaSearched,
  trackUserFollowed,
  trackUserUnfollowed,
  trackReviewMarkedHelpful,
  trackReviewFlagged,
  trackViewModeToggled,
  trackListSorted,
  trackProfileTabViewed,
  trackPanelOpened,
  trackActivityItemClicked,
  trackLocationPermissionResponded,
  trackUserProfileViewed,
  trackGoogleRatingRefreshed,
  trackCafeFlagged,
  trackUsernameSetupCompleted,
  trackPrivacySettingsChanged,
  trackPasswordChanged,
} from '../analytics';

const mockCapture = posthog.capture as ReturnType<typeof vi.fn>;

describe('Analytics - Auth Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackUserSignedUp', () => {
    it('should capture user_signed_up event with email method', () => {
      trackUserSignedUp('email');

      expect(mockCapture).toHaveBeenCalledWith('user_signed_up', { method: 'email' });
      expect(mockCapture).toHaveBeenCalledTimes(1);
    });

    it('should capture user_signed_up event with google method', () => {
      trackUserSignedUp('google');

      expect(mockCapture).toHaveBeenCalledWith('user_signed_up', { method: 'google' });
    });
  });

  describe('trackUserLoggedIn', () => {
    it('should capture user_logged_in event with email method', () => {
      trackUserLoggedIn('email');

      expect(mockCapture).toHaveBeenCalledWith('user_logged_in', { method: 'email' });
    });

    it('should capture user_logged_in event with google method', () => {
      trackUserLoggedIn('google');

      expect(mockCapture).toHaveBeenCalledWith('user_logged_in', { method: 'google' });
    });
  });

  describe('trackUserLoggedOut', () => {
    it('should capture user_logged_out event', () => {
      trackUserLoggedOut();

      expect(mockCapture).toHaveBeenCalledWith('user_logged_out');
      expect(mockCapture).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Analytics - Cafe Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackCafeViewed', () => {
    it('should capture cafe_viewed event with all properties', () => {
      trackCafeViewed({
        cafeId: 42,
        cafeName: 'Kopi Kenangan',
        isRegistered: true,
        hasWfcRating: true,
        source: 'map_marker',
        distanceKm: 0.5,
      });

      expect(mockCapture).toHaveBeenCalledWith('cafe_viewed', {
        cafe_id: 42,
        cafe_name: 'Kopi Kenangan',
        is_registered: true,
        has_wfc_rating: true,
        source: 'map_marker',
        distance_km: 0.5,
      });
    });

    it('should handle null distance_km', () => {
      trackCafeViewed({
        cafeId: 42,
        cafeName: 'Kopi Kenangan',
        isRegistered: false,
        hasWfcRating: false,
        source: 'search_result',
        distanceKm: null,
      });

      expect(mockCapture).toHaveBeenCalledWith(
        'cafe_viewed',
        expect.objectContaining({
          distance_km: null,
        })
      );
    });
  });

  describe('trackDirectionsClicked', () => {
    it('should capture directions_clicked event', () => {
      trackDirectionsClicked({
        cafeId: 42,
        cafeName: 'Kopi Kenangan',
        distanceKm: 1.2,
      });

      expect(mockCapture).toHaveBeenCalledWith('directions_clicked', {
        cafe_id: 42,
        cafe_name: 'Kopi Kenangan',
        distance_km: 1.2,
      });
    });
  });

  describe('trackCafeFavorited', () => {
    it('should capture cafe_favorited event', () => {
      trackCafeFavorited({
        cafeId: 42,
        cafeName: 'Kopi Kenangan',
      });

      expect(mockCapture).toHaveBeenCalledWith('cafe_favorited', {
        cafe_id: 42,
        cafe_name: 'Kopi Kenangan',
      });
    });
  });

  describe('trackCafeUnfavorited', () => {
    it('should capture cafe_unfavorited event with detail_sheet source', () => {
      trackCafeUnfavorited({
        cafeId: 42,
        source: 'detail_sheet',
      });

      expect(mockCapture).toHaveBeenCalledWith('cafe_unfavorited', {
        cafe_id: 42,
        source: 'detail_sheet',
      });
    });
  });
});

describe('Analytics - Visit Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackVisitLogged', () => {
    it('should capture visit_logged event with review', () => {
      trackVisitLogged({
        cafeId: 42,
        cafeName: 'Kopi Kenangan',
        includesReview: true,
        visitTime: 'morning',
        amountSpent: 45000,
        currency: 'IDR',
        isDuplicateVisit: false,
      });

      expect(mockCapture).toHaveBeenCalledWith('visit_logged', {
        cafe_id: 42,
        cafe_name: 'Kopi Kenangan',
        includes_review: true,
        visit_time: 'morning',
        amount_spent: 45000,
        currency: 'IDR',
        is_duplicate_visit: false,
      });
    });

    it('should capture visit_logged event without review', () => {
      trackVisitLogged({
        cafeId: 42,
        cafeName: 'Kopi Kenangan',
        includesReview: false,
        visitTime: null,
        amountSpent: null,
        currency: null,
        isDuplicateVisit: false,
      });

      expect(mockCapture).toHaveBeenCalledWith('visit_logged', {
        cafe_id: 42,
        cafe_name: 'Kopi Kenangan',
        includes_review: false,
        visit_time: null,
        amount_spent: null,
        currency: null,
        is_duplicate_visit: false,
      });
    });
  });

  describe('trackVisitDeleted', () => {
    it('should capture visit_deleted event', () => {
      trackVisitDeleted({
        cafeId: 42,
        cafeName: 'Kopi Kenangan',
      });

      expect(mockCapture).toHaveBeenCalledWith('visit_deleted', {
        cafe_id: 42,
        cafe_name: 'Kopi Kenangan',
      });
    });
  });
});

describe('Analytics - Review Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackReviewCreated', () => {
    it('should capture review_created event from visit modal', () => {
      trackReviewCreated({
        cafeId: 42,
        cafeName: 'Kopi Kenangan',
        wfcRating: 4,
        wifiQuality: 5,
        hasComment: true,
        commentLength: 89,
        source: 'visit_modal',
        hasSmokingArea: 'yes',
        hasPrayerRoom: 'unknown',
      });

      expect(mockCapture).toHaveBeenCalledWith('review_created', {
        cafe_id: 42,
        cafe_name: 'Kopi Kenangan',
        wfc_rating: 4,
        wifi_quality: 5,
        has_comment: true,
        comment_length: 89,
        source: 'visit_modal',
        has_smoking_area: 'yes',
        has_prayer_room: 'unknown',
      });
    });

    it('should capture review_created event from standalone form', () => {
      trackReviewCreated({
        cafeId: 42,
        cafeName: 'Kopi Kenangan',
        wfcRating: 5,
        wifiQuality: 5,
        hasComment: false,
        commentLength: 0,
        source: 'standalone',
        hasSmokingArea: 'no',
        hasPrayerRoom: 'yes',
      });

      expect(mockCapture).toHaveBeenCalledWith(
        'review_created',
        expect.objectContaining({
          source: 'standalone',
          has_comment: false,
        })
      );
    });
  });

  describe('trackReviewEdited', () => {
    it('should capture review_edited event', () => {
      trackReviewEdited({
        cafeId: 42,
        cafeName: 'Kopi Kenangan',
        fieldsChanged: ['wfc_rating', 'comment'],
      });

      expect(mockCapture).toHaveBeenCalledWith('review_edited', {
        cafe_id: 42,
        cafe_name: 'Kopi Kenangan',
        fields_changed: ['wfc_rating', 'comment'],
      });
    });
  });

  describe('trackReviewDeleted', () => {
    it('should capture review_deleted event', () => {
      trackReviewDeleted({
        cafeId: 42,
        cafeName: 'Kopi Kenangan',
      });

      expect(mockCapture).toHaveBeenCalledWith('review_deleted', {
        cafe_id: 42,
        cafe_name: 'Kopi Kenangan',
      });
    });
  });
});

describe('Analytics - Search Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackSearchPerformed', () => {
    it('should capture search_performed event', () => {
      trackSearchPerformed({
        query: 'starbucks menteng',
        resultCountWfc: 2,
        resultCountGoogle: 5,
      });

      expect(mockCapture).toHaveBeenCalledWith('search_performed', {
        query: 'starbucks menteng',
        result_count_wfc: 2,
        result_count_google: 5,
        total_results: 7,
      });
    });
  });

  describe('trackSearchResultClicked', () => {
    it('should capture search_result_clicked event for WFC result', () => {
      trackSearchResultClicked({
        query: 'starbucks',
        resultType: 'wfc',
        resultPosition: 0,
        cafeName: 'Starbucks Reserve',
      });

      expect(mockCapture).toHaveBeenCalledWith('search_result_clicked', {
        query: 'starbucks',
        result_type: 'wfc',
        result_position: 0,
        cafe_name: 'Starbucks Reserve',
      });
    });

    it('should capture search_result_clicked event for Google result', () => {
      trackSearchResultClicked({
        query: 'starbucks',
        resultType: 'google',
        resultPosition: 3,
        cafeName: 'Starbucks Coffee',
      });

      expect(mockCapture).toHaveBeenCalledWith(
        'search_result_clicked',
        expect.objectContaining({
          result_type: 'google',
          result_position: 3,
        })
      );
    });
  });
});

describe('Analytics - Social Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackUserFollowed', () => {
    it('should capture user_followed event from review card', () => {
      trackUserFollowed({
        targetUsername: 'coffeelover99',
        source: 'review_card',
      });

      expect(mockCapture).toHaveBeenCalledWith('user_followed', {
        target_username: 'coffeelover99',
        source: 'review_card',
      });
    });
  });

  describe('trackUserUnfollowed', () => {
    it('should capture user_unfollowed event', () => {
      trackUserUnfollowed({
        targetUsername: 'coffeelover99',
      });

      expect(mockCapture).toHaveBeenCalledWith('user_unfollowed', {
        target_username: 'coffeelover99',
      });
    });
  });

  describe('trackReviewMarkedHelpful', () => {
    it('should capture review_marked_helpful event when marked', () => {
      trackReviewMarkedHelpful({
        reviewId: 101,
        cafeId: 42,
        action: 'marked',
      });

      expect(mockCapture).toHaveBeenCalledWith('review_marked_helpful', {
        review_id: 101,
        cafe_id: 42,
        action: 'marked',
      });
    });

    it('should capture review_marked_helpful event when unmarked', () => {
      trackReviewMarkedHelpful({
        reviewId: 101,
        cafeId: 42,
        action: 'unmarked',
      });

      expect(mockCapture).toHaveBeenCalledWith(
        'review_marked_helpful',
        expect.objectContaining({
          action: 'unmarked',
        })
      );
    });
  });
});

describe('Analytics - UX Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackViewModeToggled', () => {
    it('should capture view_mode_toggled event to list', () => {
      trackViewModeToggled({ switchedTo: 'list' });

      expect(mockCapture).toHaveBeenCalledWith('view_mode_toggled', {
        switched_to: 'list',
      });
    });

    it('should capture view_mode_toggled event to map', () => {
      trackViewModeToggled({ switchedTo: 'map' });

      expect(mockCapture).toHaveBeenCalledWith('view_mode_toggled', {
        switched_to: 'map',
      });
    });
  });

  describe('trackListSorted', () => {
    it('should capture list_sorted event', () => {
      trackListSorted({ sortBy: 'nearest' });

      expect(mockCapture).toHaveBeenCalledWith('list_sorted', {
        sort_by: 'nearest',
      });
    });
  });

  describe('trackProfileTabViewed', () => {
    it('should capture profile_tab_viewed event for visits tab', () => {
      trackProfileTabViewed({ tab: 'visits' });

      expect(mockCapture).toHaveBeenCalledWith('profile_tab_viewed', {
        tab: 'visits',
      });
    });

    it('should capture profile_tab_viewed event for settings tab', () => {
      trackProfileTabViewed({ tab: 'settings' });

      expect(mockCapture).toHaveBeenCalledWith('profile_tab_viewed', {
        tab: 'settings',
      });
    });
  });
});

describe('Analytics - Panel Events (Phase 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackPanelOpened', () => {
    it('should capture panel_opened event for activity panel', () => {
      trackPanelOpened({ panel: 'activity' });

      expect(mockCapture).toHaveBeenCalledWith('panel_opened', {
        panel: 'activity',
      });
    });

    it('should capture panel_opened event for profile panel', () => {
      trackPanelOpened({ panel: 'profile' });

      expect(mockCapture).toHaveBeenCalledWith('panel_opened', {
        panel: 'profile',
      });
    });

    it('should capture panel_opened event for user profile panel', () => {
      trackPanelOpened({ panel: 'user_profile' });

      expect(mockCapture).toHaveBeenCalledWith('panel_opened', {
        panel: 'user_profile',
      });
    });
  });
});

describe('Analytics - Activity Feed Events (Phase 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackActivityItemClicked', () => {
    it('should capture activity_item_clicked event for review to cafe', () => {
      trackActivityItemClicked({
        activityType: 'review',
        actionTaken: 'view_cafe',
      });

      expect(mockCapture).toHaveBeenCalledWith('activity_item_clicked', {
        activity_type: 'review',
        action_taken: 'view_cafe',
      });
    });

    it('should capture activity_item_clicked event for visit to cafe', () => {
      trackActivityItemClicked({
        activityType: 'visit',
        actionTaken: 'view_cafe',
      });

      expect(mockCapture).toHaveBeenCalledWith('activity_item_clicked', {
        activity_type: 'visit',
        action_taken: 'view_cafe',
      });
    });

    it('should capture activity_item_clicked event for follow to profile', () => {
      trackActivityItemClicked({
        activityType: 'follow',
        actionTaken: 'view_profile',
      });

      expect(mockCapture).toHaveBeenCalledWith('activity_item_clicked', {
        activity_type: 'follow',
        action_taken: 'view_profile',
      });
    });
  });
});

describe('Analytics - Location Permission Events (Phase 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackLocationPermissionResponded', () => {
    it('should capture location_permission_responded event when granted', () => {
      trackLocationPermissionResponded({ granted: true });

      expect(mockCapture).toHaveBeenCalledWith('location_permission_responded', {
        granted: true,
        error_code: null,
      });
    });

    it('should capture location_permission_responded event when denied', () => {
      trackLocationPermissionResponded({
        granted: false,
        errorCode: 'PERMISSION_DENIED',
      });

      expect(mockCapture).toHaveBeenCalledWith('location_permission_responded', {
        granted: false,
        error_code: 'PERMISSION_DENIED',
      });
    });
  });
});

describe('Analytics - User Profile Events (Phase 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackUserProfileViewed', () => {
    it('should capture user_profile_viewed event from activity feed', () => {
      trackUserProfileViewed({
        targetUsername: 'coffeelover99',
        source: 'activity_feed',
      });

      expect(mockCapture).toHaveBeenCalledWith('user_profile_viewed', {
        target_username: 'coffeelover99',
        source: 'activity_feed',
      });
    });

    it('should capture user_profile_viewed event from followers modal', () => {
      trackUserProfileViewed({
        targetUsername: 'coffeeaddict',
        source: 'followers_modal',
      });

      expect(mockCapture).toHaveBeenCalledWith('user_profile_viewed', {
        target_username: 'coffeeaddict',
        source: 'followers_modal',
      });
    });

    it('should capture user_profile_viewed event from review card', () => {
      trackUserProfileViewed({
        targetUsername: 'barista joe',
        source: 'review_card',
      });

      expect(mockCapture).toHaveBeenCalledWith('user_profile_viewed', {
        target_username: 'barista joe',
        source: 'review_card',
      });
    });
  });
});

describe('Analytics - Google Rating Events (Phase 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackGoogleRatingRefreshed', () => {
    it('should capture google_rating_refreshed event', () => {
      trackGoogleRatingRefreshed({ cafeId: 42 });

      expect(mockCapture).toHaveBeenCalledWith('google_rating_refreshed', {
        cafe_id: 42,
      });
    });
  });
});

describe('Analytics - Cafe Flagging Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackCafeFlagged', () => {
    it('should capture cafe_flagged event', () => {
      trackCafeFlagged({
        cafeId: 42,
        reason: 'not_a_cafe',
      });

      expect(mockCapture).toHaveBeenCalledWith('cafe_flagged', {
        cafe_id: 42,
        reason: 'not_a_cafe',
      });
    });
  });

  describe('trackReviewFlagged', () => {
    it('should capture review_flagged event', () => {
      trackReviewFlagged({
        reviewId: 101,
        cafeId: 42,
        reason: 'spam',
      });

      expect(mockCapture).toHaveBeenCalledWith('review_flagged', {
        review_id: 101,
        cafe_id: 42,
        reason: 'spam',
      });
    });
  });
});

describe('Analytics - Username Setup Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackUsernameSetupCompleted', () => {
    it('should capture username_setup_completed event with set_username action', () => {
      trackUsernameSetupCompleted({ action: 'set_username' });

      expect(mockCapture).toHaveBeenCalledWith('username_setup_completed', {
        action: 'set_username',
      });
    });

    it('should capture username_setup_completed event with skipped action', () => {
      trackUsernameSetupCompleted({ action: 'skipped' });

      expect(mockCapture).toHaveBeenCalledWith('username_setup_completed', {
        action: 'skipped',
      });
    });
  });
});

describe('Analytics - Settings Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackPrivacySettingsChanged', () => {
    it('should capture privacy_settings_changed event', () => {
      trackPrivacySettingsChanged({
        setting: 'anonymous_display',
        newValue: true,
      });

      expect(mockCapture).toHaveBeenCalledWith('privacy_settings_changed', {
        setting: 'anonymous_display',
        new_value: true,
      });
    });
  });

  describe('trackPasswordChanged', () => {
    it('should capture password_changed event', () => {
      trackPasswordChanged();

      expect(mockCapture).toHaveBeenCalledWith('password_changed');
    });
  });
});

describe('Analytics - Search Events (Map Area)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackMapAreaSearched', () => {
    it('should capture map_area_searched event', () => {
      trackMapAreaSearched({
        latitude: -6.2088,
        longitude: 106.8456,
      });

      expect(mockCapture).toHaveBeenCalledWith('map_area_searched', {
        latitude: -6.2088,
        longitude: 106.8456,
      });
    });
  });
});
