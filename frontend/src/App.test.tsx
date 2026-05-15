import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock contexts and providers the app depends on
vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock('./lib/posthog', () => ({
  posthog: { init: vi.fn(), capture: vi.fn(), identify: vi.fn(), reset: vi.fn() },
}));

vi.mock('./components/auth/GoogleLoginButton', () => ({
  default: () => <button>Continue with Google</button>,
}));

// Mock useGeolocation so MapPage doesn't fail
vi.mock('./hooks/useGeolocation', () => ({
  useGeolocation: () => ({ latitude: null, longitude: null, error: null, loading: false }),
}));

// Mock Google Maps
vi.mock('./hooks/useGoogleMap', () => ({
  useGoogleMap: () => ({ mapRef: { current: null }, isLoaded: false }),
}));

describe('App', () => {
  it('should render without crashing', () => {
    render(<App />);
    expect(screen.queryByText('Application Error')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CAN-IT-WFC' })).toBeInTheDocument();
  });
});
