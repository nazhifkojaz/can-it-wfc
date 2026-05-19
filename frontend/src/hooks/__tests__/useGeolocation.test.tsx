import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGeolocation } from '../useGeolocation';

vi.mock('../../lib/analytics', () => ({
  trackLocationPermissionResponded: vi.fn(),
}));

const position = (latitude: number, longitude: number): GeolocationPosition => ({
  coords: {
    latitude,
    longitude,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
} as GeolocationPosition);

describe('useGeolocation', () => {
  const getCurrentPosition = vi.fn();
  const watchPosition = vi.fn();
  const clearWatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    watchPosition.mockReturnValue(123);

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition,
        watchPosition,
        clearWatch,
      },
    });
  });

  it('uses a one-time location lookup when watch is false', async () => {
    const { result, unmount } = renderHook(() => useGeolocation({ watch: false }));

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(watchPosition).not.toHaveBeenCalled();

    const onSuccess = getCurrentPosition.mock.calls[0][0] as PositionCallback;
    act(() => {
      onSuccess(position(-6.2088, 106.8456));
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.location).toEqual({ lat: -6.2088, lng: 106.8456 });

    unmount();
    expect(clearWatch).not.toHaveBeenCalled();
  });

  it('ignores watched movement below the configured threshold', async () => {
    const { result, unmount } = renderHook(() => useGeolocation({
      watch: true,
      movementThresholdMeters: 100,
    }));

    expect(watchPosition).toHaveBeenCalledTimes(1);

    const onSuccess = watchPosition.mock.calls[0][0] as PositionCallback;
    act(() => {
      onSuccess(position(-6.2088, 106.8456));
    });

    await waitFor(() => {
      expect(result.current.location).toEqual({ lat: -6.2088, lng: 106.8456 });
    });

    act(() => {
      onSuccess(position(-6.20835, 106.8456));
    });

    expect(result.current.location).toEqual({ lat: -6.2088, lng: 106.8456 });

    unmount();
    expect(clearWatch).toHaveBeenCalledWith(123);
  });

  it('refetch resolves with new location on success', async () => {
    const { result, unmount } = renderHook(() => useGeolocation({ watch: false }));

    const initialSuccess = getCurrentPosition.mock.calls[0][0] as PositionCallback;
    act(() => {
      initialSuccess(position(-6.2088, 106.8456));
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.refetch();
    });

    expect(result.current.loading).toBe(true);

    const refetchSuccess = getCurrentPosition.mock.calls[1][0] as PositionCallback;
    act(() => {
      refetchSuccess(position(-6.1754, 106.8272));
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.location).toEqual({ lat: -6.1754, lng: 106.8272 });

    unmount();
  });

  it('refetch handles permission denied error', async () => {
    const { result, unmount } = renderHook(() => useGeolocation({ watch: false }));

    const initialSuccess = getCurrentPosition.mock.calls[0][0] as PositionCallback;
    act(() => {
      initialSuccess(position(-6.2088, 106.8456));
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.refetch();
    });

    expect(result.current.loading).toBe(true);

    const refetchError = getCurrentPosition.mock.calls[1][1] as PositionErrorCallback;
    act(() => {
      refetchError({
        code: 1,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: 'User denied',
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('permission denied');

    unmount();
  });

  it('refetch handles timeout error', async () => {
    const { result, unmount } = renderHook(() => useGeolocation({ watch: false }));

    const initialSuccess = getCurrentPosition.mock.calls[0][0] as PositionCallback;
    act(() => {
      initialSuccess(position(-6.2088, 106.8456));
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.refetch();
    });

    expect(result.current.loading).toBe(true);

    const refetchError = getCurrentPosition.mock.calls[1][1] as PositionErrorCallback;
    act(() => {
      refetchError({
        code: 3,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: 'Timeout expired',
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toContain('timed out');

    unmount();
  });

  it('refetch fires safety timeout when callbacks never fire', async () => {
    vi.useFakeTimers();

    const { result, unmount } = renderHook(() => useGeolocation({ watch: false }));

    const initialSuccess = getCurrentPosition.mock.calls[0][0] as PositionCallback;
    act(() => {
      initialSuccess(position(-6.2088, 106.8456));
    });

    expect(result.current.loading).toBe(false);

    act(() => {
      result.current.refetch();
    });

    expect(result.current.loading).toBe(true);

    act(() => {
      vi.advanceTimersByTime(31000);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toContain('blocking location access');

    vi.useRealTimers();
    unmount();
  });
});
