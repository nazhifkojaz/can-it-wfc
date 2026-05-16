import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { trackLocationPermissionResponded } from '../lib/analytics';

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

  // Track if we've already logged permission to avoid duplicate events
  const permissionTrackedRef = useRef(false);

  const onSuccess = useCallback((position: GeolocationPosition) => {
    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      error: null,
      loading: false,
    });

    // Track permission granted (only once per session)
    if (!permissionTrackedRef.current) {
      trackLocationPermissionResponded({ granted: true });
      permissionTrackedRef.current = true;
    }
  }, []);

  const onError = useCallback((error: GeolocationPositionError) => {
    if (error.code === error.PERMISSION_DENIED) {
      setState({
        latitude: null,
        longitude: null,
        error: 'Location permission denied. Please enable location access in your browser settings.',
        loading: false,
      });

      // Track permission denied (only once per session)
      if (!permissionTrackedRef.current) {
        trackLocationPermissionResponded({
          granted: false,
          errorCode: 'PERMISSION_DENIED',
        });
        permissionTrackedRef.current = true;
      }
    } else if (error.code === error.TIMEOUT) {
      setState({
        latitude: null,
        longitude: null,
        error: 'Location request timed out. Please try again.',
        loading: false,
      });

      if (!permissionTrackedRef.current) {
        trackLocationPermissionResponded({
          granted: false,
          errorCode: 'TIMEOUT',
        });
        permissionTrackedRef.current = true;
      }
    }
    // For POSITION_UNAVAILABLE, keep loading state - watchPosition will keep trying
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
      timeout: 30000, // 30 second timeout to avoid permanently blocking on some browsers
    };

    // Safety timeout: browsers with tracker/ad blocking can silently
    // suppress the Geolocation API so neither callback ever fires.
    // This timeout detects that case without waiting forever.
    let resolved = false;
    const safetyTimeoutId = setTimeout(() => {
      if (!resolved) {
        setState({
          latitude: null,
          longitude: null,
          error: 'Location not available. Your browser may be blocking location access. Check your tracker/ad-blocker settings.',
          loading: false,
        });
      }
    }, 12000);

    const onResolved = () => {
      resolved = true;
      clearTimeout(safetyTimeoutId);
    };

    const wrappedOnSuccess = (position: GeolocationPosition) => {
      onResolved();
      onSuccess(position);
    };

    const wrappedOnError = (error: GeolocationPositionError) => {
      onResolved();
      onError(error);
    };

    // Use watchPosition to automatically handle late permission grants
    // This solves the problem where users click "Allow" after a delay
    const watchId = navigator.geolocation.watchPosition(
      wrappedOnSuccess,
      wrappedOnError,
      geoOptions
    );

    // Cleanup - clear watch and safety timeout on unmount
    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(safetyTimeoutId);
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
    return state.latitude != null && state.longitude != null
      ? { lat: state.latitude, lng: state.longitude }
      : null;
  }, [state.latitude, state.longitude]);

  return {
    ...state,
    refetch,
    location,
  };
};
