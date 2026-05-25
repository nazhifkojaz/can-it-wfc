import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { trackLocationPermissionResponded } from '../lib/analytics';
import { calculateDistance } from '../utils/calculations';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  watch?: boolean;
  movementThresholdMeters?: number;
}

export const useGeolocation = (options?: GeolocationOptions) => {
  const shouldWatch = options?.watch ?? false;
  const movementThresholdMeters = options?.movementThresholdMeters ?? 100;

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });

  // Track if we've already logged permission to avoid duplicate events
  const permissionTrackedRef = useRef(false);

  const onSuccess = useCallback((position: GeolocationPosition) => {
    const nextLatitude = position.coords.latitude;
    const nextLongitude = position.coords.longitude;

    setState(prev => {
      if (shouldWatch && prev.latitude != null && prev.longitude != null) {
        const movedMeters = calculateDistance(
          prev.latitude,
          prev.longitude,
          nextLatitude,
          nextLongitude,
        ) * 1000;

        if (movedMeters < movementThresholdMeters && !prev.loading && !prev.error) {
          return prev;
        }
      }

      return {
        latitude: nextLatitude,
        longitude: nextLongitude,
        error: null,
        loading: false,
      };
    });

    // Track permission granted (only once per session)
    if (!permissionTrackedRef.current) {
      trackLocationPermissionResponded({ granted: true });
      permissionTrackedRef.current = true;
    }
  }, [movementThresholdMeters, shouldWatch]);

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
    } else if (error.code === error.POSITION_UNAVAILABLE && !shouldWatch) {
      setState({
        latitude: null,
        longitude: null,
        error: 'Location unavailable. Please try again.',
        loading: false,
      });
    }
    // For watched POSITION_UNAVAILABLE, keep loading state so watchPosition can keep trying.
  }, [shouldWatch]);

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
    let cancelled = false;
    const safetyTimeoutId = setTimeout(() => {
      if (!resolved && !cancelled) {
        setState({
          latitude: null,
          longitude: null,
          error: 'Location not available. Your browser may be blocking location access. Check your tracker/ad-blocker settings.',
          loading: false,
        });
      }
    }, 30000);

    const onResolved = () => {
      resolved = true;
      clearTimeout(safetyTimeoutId);
    };

    const wrappedOnSuccess = (position: GeolocationPosition) => {
      if (cancelled) return;
      onResolved();
      onSuccess(position);
    };

    const wrappedOnError = (error: GeolocationPositionError) => {
      if (cancelled) return;
      onResolved();
      onError(error);
    };

    let watchId: number | undefined;

    if (shouldWatch) {
      watchId = navigator.geolocation.watchPosition(
        wrappedOnSuccess,
        wrappedOnError,
        geoOptions
      );
    } else {
      navigator.geolocation.getCurrentPosition(
        wrappedOnSuccess,
        wrappedOnError,
        geoOptions
      );
    }

    // Cleanup - clear watch and safety timeout on unmount
    return () => {
      cancelled = true;
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearTimeout(safetyTimeoutId);
    };
  }, [
    options?.enableHighAccuracy,
    options?.maximumAge,
    onSuccess,
    onError,
    shouldWatch,
  ]);

  const refetch = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    let resolved = false;
    const safetyTimeoutId = window.setTimeout(() => {
      if (!resolved) {
        setState(prev => ({
          ...prev,
          error: 'Location not available. Your browser may be blocking location access. Check your tracker/ad-blocker settings.',
          loading: false,
        }));
      }
    }, 30000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolved = true;
        clearTimeout(safetyTimeoutId);
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
      },
      (error) => {
        resolved = true;
        clearTimeout(safetyTimeoutId);
        if (error.code === error.PERMISSION_DENIED) {
          setState(prev => ({
            ...prev,
            error: 'Location permission denied. Please enable location access in your browser settings.',
            loading: false,
          }));
        } else if (error.code === error.TIMEOUT) {
          setState(prev => ({
            ...prev,
            error: 'Location request timed out. Please try again.',
            loading: false,
          }));
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setState(prev => ({
            ...prev,
            error: 'Location unavailable. Please try again.',
            loading: false,
          }));
        }
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        maximumAge: 0,
        timeout: 30000,
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
