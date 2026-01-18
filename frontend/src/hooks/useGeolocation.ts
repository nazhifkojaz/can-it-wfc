import { useState, useEffect, useCallback, useMemo } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  watch?: boolean; // Deprecated: watchPosition is now always used for automatic late permission handling
}

export const useGeolocation = (options?: GeolocationOptions) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });

  const onSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      error: null,
      loading: false,
    });
  }, []);

  const onError = useCallback((error: GeolocationPositionError) => {
    // Only set error for explicit permission denial
    // Ignore timeout/unavailable - watchPosition keeps trying
    if (error.code === error.PERMISSION_DENIED) {
      setState({
        latitude: null,
        longitude: null,
        error: 'Location permission denied. Please enable location access in your browser settings.',
        loading: false,
      });
    }
    // For other errors, keep loading state - watchPosition will keep trying
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        loading: false,
      }));
      return;
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      maximumAge: options?.maximumAge ?? 60000, // Accept cached location up to 1 minute old
      // No timeout - let watchPosition wait indefinitely for user permission
    };

    // Use watchPosition to automatically handle late permission grants
    // This solves the problem where users click "Allow" after a delay
    const watchId = navigator.geolocation.watchPosition(
      onSuccess,
      onError,
      geoOptions
    );

    // Cleanup - clear watch on unmount
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [
    options?.enableHighAccuracy,
    options?.maximumAge,
    onSuccess,
    onError,
  ]);

  const refetch = useCallback(() => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setState(prev => ({
            ...prev,
            error: 'Location permission denied. Please enable location access in your browser settings.',
            loading: false,
          }));
        }
        // For other errors, keep trying via the main watchPosition
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        maximumAge: 0, // Force fresh location on manual refetch
      }
    );
  }, [options?.enableHighAccuracy]);

  // Memoize location object to prevent unnecessary re-renders
  const location = useMemo(() => {
    return state.latitude && state.longitude
      ? { lat: state.latitude, lng: state.longitude }
      : null;
  }, [state.latitude, state.longitude]);

  return {
    ...state,
    refetch,
    location,
  };
};