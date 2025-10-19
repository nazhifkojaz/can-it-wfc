import { useState, useEffect } from 'react';
import { LocationCoords } from '../types';

interface GeolocationState {
  location: LocationCoords | null;
  error: string | null;
  isLoading: boolean;
}

export const useGeolocation = (requestOnMount: boolean = false): GeolocationState & { requestLocation: () => void } => {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (requestOnMount) {
      requestLocation();
    }
  }, [requestOnMount]);

  return { location, error, isLoading, requestLocation };
};