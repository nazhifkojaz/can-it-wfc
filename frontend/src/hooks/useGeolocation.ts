import { useState, useEffect, useCallback, useMemo } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean; // Only watch position if explicitly enabled
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
    let errorMessage = 'Failed to get your location';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
    }

    setState({
      latitude: null,
      longitude: null,
      error: errorMessage,
      loading: false,
    });
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
      timeout: options?.timeout ?? 10000,
      maximumAge: options?.maximumAge ?? 0,
    };

    // Get current position
    navigator.geolocation.getCurrentPosition(onSuccess, onError, geoOptions);

    // Only watch position if explicitly enabled (to prevent battery drain)
    let watchId: number | undefined;
    if (options?.watch) {
      watchId = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        geoOptions
      );
    }

    // Cleanup - clear watch if it was set
    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [
    options?.enableHighAccuracy,
    options?.timeout,
    options?.maximumAge,
    options?.watch,
    onSuccess,
    onError,
  ]);

  const refetch = useCallback(() => {
    setState(prev => ({ ...prev, loading: true }));

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
        setState(prev => ({
          ...prev,
          error: error.message,
          loading: false,
        }));
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 0,
      }
    );
  }, [options?.enableHighAccuracy, options?.timeout, options?.maximumAge]);

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