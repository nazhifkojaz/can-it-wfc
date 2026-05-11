import { useState, useMemo } from 'react';
import { computeWfcRating } from '../utils';
import { REVIEW_CONFIG } from '../config/constants';

export interface ReviewFormState {
  wifi_quality: number;
  power_outlets_rating: number;
  seating_comfort: number;
  noise_level: number;
  hasSmokingArea: boolean;
  hasPrayerRoom: boolean;
  hasIndoorSeating: boolean;
  hasOutdoorSeating: boolean;
  comment: string;
}

interface UseReviewFormOptions {
  initial?: Partial<ReviewFormState>;
}

export function useReviewForm(options: UseReviewFormOptions = {}) {
  const { initial } = options;

  const [wifi_quality, setWifiQuality] = useState(initial?.wifi_quality ?? 3);
  const [power_outlets_rating, setPowerOutlets] = useState(initial?.power_outlets_rating ?? 3);
  const [seating_comfort, setSeatingComfort] = useState(initial?.seating_comfort ?? 3);
  const [noise_level, setNoiseLevel] = useState(initial?.noise_level ?? 3);
  const [hasSmokingArea, setHasSmokingArea] = useState(initial?.hasSmokingArea ?? false);
  const [hasPrayerRoom, setHasPrayerRoom] = useState(initial?.hasPrayerRoom ?? false);
  const [hasIndoorSeating, setHasIndoorSeating] = useState(initial?.hasIndoorSeating ?? false);
  const [hasOutdoorSeating, setHasOutdoorSeating] = useState(initial?.hasOutdoorSeating ?? false);
  const [comment, setComment] = useState(initial?.comment ?? '');

  const wfcRating = useMemo(
    () => computeWfcRating(wifi_quality, noise_level, seating_comfort, power_outlets_rating),
    [wifi_quality, power_outlets_rating, seating_comfort, noise_level],
  );

  const ratingSetters: Record<string, (v: number) => void> = {
    wifi_quality: setWifiQuality,
    power_outlets_rating: setPowerOutlets,
    seating_comfort: setSeatingComfort,
    noise_level: setNoiseLevel,
  };

  const ratingValues: Record<string, number> = {
    wifi_quality,
    power_outlets_rating,
    seating_comfort,
    noise_level,
  };

  const facilitySetters: Record<string, (v: boolean) => void> = {
    smoking_area: setHasSmokingArea,
    prayer_room: setHasPrayerRoom,
    indoor_seating: setHasIndoorSeating,
    outdoor_seating: setHasOutdoorSeating,
  };

  const facilityValues: Record<string, boolean> = {
    smoking_area: hasSmokingArea,
    prayer_room: hasPrayerRoom,
    indoor_seating: hasIndoorSeating,
    outdoor_seating: hasOutdoorSeating,
  };

  const facilityPayload = () => ({
    has_smoking_area: hasSmokingArea ? true as const : null,
    has_prayer_room: hasPrayerRoom ? true as const : null,
    has_indoor_seating: hasIndoorSeating ? true as const : null,
    has_outdoor_seating: hasOutdoorSeating ? true as const : null,
  });

  const ratingPayload = () => ({
    wifi_quality,
    power_outlets_rating,
    seating_comfort,
    noise_level,
    wfc_rating: wfcRating,
  });

  const handleCommentChange = (value: string) => {
    if (value.length <= REVIEW_CONFIG.MAX_COMMENT_LENGTH) {
      setComment(value);
    }
  };

  return {
    wifi_quality,
    power_outlets_rating,
    seating_comfort,
    noise_level,
    wfcRating,
    comment,
    hasSmokingArea,
    hasPrayerRoom,
    hasIndoorSeating,
    hasOutdoorSeating,
    setWifiQuality,
    setPowerOutlets,
    setSeatingComfort,
    setNoiseLevel,
    setComment: handleCommentChange,
    setHasSmokingArea,
    setHasPrayerRoom,
    setHasIndoorSeating,
    setHasOutdoorSeating,
    ratingSetters,
    ratingValues,
    facilitySetters,
    facilityValues,
    facilityPayload,
    ratingPayload,
  };
}
