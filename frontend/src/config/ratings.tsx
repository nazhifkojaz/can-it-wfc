import React from 'react';
import { Wifi, Zap, Armchair, Volume2, Coffee, Cigarette, Home, Building2, TreePine } from 'lucide-react';

export interface RatingDimension {
  key: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
}

export interface FacilityDefinition {
  key: string;
  label: string;
  icon: React.ReactNode;
}

export const RATING_DIMENSIONS: RatingDimension[] = [
  { key: 'wifi_quality', label: 'WiFi Quality', icon: <Wifi size={18} />, description: 'Speed and reliability' },
  { key: 'power_outlets_rating', label: 'Power Outlets', icon: <Zap size={18} />, description: 'Availability and access' },
  { key: 'seating_comfort', label: 'Seat/Desk Comfort', icon: <Armchair size={18} />, description: 'Comfort for long work sessions' },
  { key: 'noise_level', label: 'Audio Comfort', icon: <Volume2 size={18} />, description: 'How comfortable is the audio environment for work' },
  { key: 'wfc_rating', label: 'Overall WFC Score', icon: <Coffee size={18} /> },
];

export const FACILITY_CONFIG: FacilityDefinition[] = [
  { key: 'smoking_area', label: 'Smoking area', icon: <Cigarette size={18} /> },
  { key: 'prayer_room', label: 'Prayer room', icon: <Home size={18} /> },
  { key: 'indoor_seating', label: 'Indoor seating', icon: <Building2 size={18} /> },
  { key: 'outdoor_seating', label: 'Outdoor seating', icon: <TreePine size={18} /> },
];
