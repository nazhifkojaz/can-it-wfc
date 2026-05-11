import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReviewForm } from '../useReviewForm';

describe('useReviewForm', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => useReviewForm());
    expect(result.current.wifi_quality).toBe(3);
    expect(result.current.noise_level).toBe(3);
    expect(result.current.seating_comfort).toBe(3);
    expect(result.current.power_outlets_rating).toBe(3);
    expect(result.current.comment).toBe('');
    expect(result.current.hasSmokingArea).toBe(false);
    expect(result.current.hasPrayerRoom).toBe(false);
    expect(result.current.hasIndoorSeating).toBe(false);
    expect(result.current.hasOutdoorSeating).toBe(false);
  });

  it('initializes with provided values', () => {
    const { result } = renderHook(() =>
      useReviewForm({
        initial: { wifi_quality: 5, comment: 'great place', hasIndoorSeating: true },
      })
    );
    expect(result.current.wifi_quality).toBe(5);
    expect(result.current.comment).toBe('great place');
    expect(result.current.hasIndoorSeating).toBe(true);
    expect(result.current.noise_level).toBe(3);
  });

  it('computes wfcRating from all four rating dimensions', () => {
    const { result } = renderHook(() => useReviewForm());
    const initialWfc = result.current.wfcRating;
    expect(initialWfc).toBeGreaterThanOrEqual(1);
    expect(initialWfc).toBeLessThanOrEqual(5);

    act(() => result.current.setWifiQuality(5));
    act(() => result.current.setNoiseLevel(5));
    act(() => result.current.setSeatingComfort(5));
    act(() => result.current.setPowerOutlets(5));
    const maxWfc = result.current.wfcRating;
    expect(maxWfc).toBeGreaterThanOrEqual(initialWfc);
  });

  it('ratingSetters update individual dimensions', () => {
    const { result } = renderHook(() => useReviewForm());
    act(() => { result.current.ratingSetters.wifi_quality(1); });
    expect(result.current.wifi_quality).toBe(1);

    act(() => { result.current.ratingSetters.noise_level(2); });
    expect(result.current.noise_level).toBe(2);

    act(() => { result.current.ratingSetters.seating_comfort(4); });
    expect(result.current.seating_comfort).toBe(4);

    act(() => { result.current.ratingSetters.power_outlets_rating(5); });
    expect(result.current.power_outlets_rating).toBe(5);
  });

  it('facilitySetters toggle boolean states', () => {
    const { result } = renderHook(() => useReviewForm());
    act(() => { result.current.facilitySetters.smoking_area(true); });
    expect(result.current.hasSmokingArea).toBe(true);

    act(() => { result.current.facilitySetters.smoking_area(false); });
    expect(result.current.hasSmokingArea).toBe(false);

    act(() => { result.current.facilitySetters.prayer_room(true); });
    expect(result.current.hasPrayerRoom).toBe(true);

    act(() => { result.current.facilitySetters.indoor_seating(true); });
    expect(result.current.hasIndoorSeating).toBe(true);

    act(() => { result.current.facilitySetters.outdoor_seating(true); });
    expect(result.current.hasOutdoorSeating).toBe(true);
  });

  it('facilityPayload returns true or null for each facility', () => {
    const { result } = renderHook(() => useReviewForm());
    let payload = result.current.facilityPayload();
    expect(payload.has_smoking_area).toBeNull();
    expect(payload.has_prayer_room).toBeNull();

    act(() => { result.current.facilitySetters.smoking_area(true); });
    payload = result.current.facilityPayload();
    expect(payload.has_smoking_area).toBe(true);
    expect(payload.has_prayer_room).toBeNull();
  });

  it('ratingPayload includes all rating values and computed wfc_rating', () => {
    const { result } = renderHook(() =>
      useReviewForm({ initial: { wifi_quality: 4, noise_level: 2, seating_comfort: 3, power_outlets_rating: 4 } })
    );
    const payload = result.current.ratingPayload();
    expect(payload.wifi_quality).toBe(4);
    expect(payload.noise_level).toBe(2);
    expect(payload.seating_comfort).toBe(3);
    expect(payload.power_outlets_rating).toBe(4);
    expect(payload.wfc_rating).toBeGreaterThanOrEqual(1);
    expect(payload.wfc_rating).toBeLessThanOrEqual(5);
  });

  it('truncates comment at MAX_COMMENT_LENGTH', () => {
    const { result } = renderHook(() => useReviewForm());
    const longComment = 'a'.repeat(300);
    act(() => { result.current.setComment(longComment); });
    expect(result.current.comment.length).toBeLessThanOrEqual(160);
  });
});
