import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserLogin, UserRegistration } from '../types';
import { authApi, userApi } from '../api/client';
import { buildAppPath } from '../utils/url';
import { extractApiError } from '../utils/errorUtils';
import { createLogger } from '../utils/logger';
import { identifyUser, resetPostHog } from '../lib/posthog';

const log = createLogger('AuthContext');

const AUTH_METHOD_KEY = 'analytics_auth_method';
type AuthMethod = 'google' | 'email';

function getStoredAuthMethod(): AuthMethod | null {
  try {
    const stored = localStorage.getItem(AUTH_METHOD_KEY);
    return stored === 'google' || stored === 'email' ? stored : null;
  } catch {
    return null;
  }
}

function setStoredAuthMethod(method: AuthMethod) {
  try {
    localStorage.setItem(AUTH_METHOD_KEY, method);
  } catch {
    // Ignore localStorage errors
  }
}

function clearStoredAuthMethod() {
  try {
    localStorage.removeItem(AUTH_METHOD_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Identify the current user in PostHog with their properties.
 * Called after successful login, registration, or session restore.
 */
function identifyUserInPostHog(user: User, authMethod?: AuthMethod) {
  // Use stored auth_method if not provided (session restore case)
  const method = authMethod || getStoredAuthMethod();

  identifyUser(user.id, {
    username: user.username,
    email: user.email,
    auth_method: method || undefined,
    created_at: user.date_joined,
    is_private_profile: user.is_anonymous_display,
    total_reviews: user.total_reviews,
    total_visits: user.total_visits,
    followers_count: user.followers_count,
  });
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: UserLogin | { user: User; access: string; refresh: string }) => Promise<void>;
  register: (data: UserRegistration) => Promise<void>;
  logout: () => Promise<void>;  // Changed to async
  updateUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // With cookie-based auth, we don't check localStorage
    // Instead, we try to fetch user data - cookies are sent automatically
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      setError(null);

      // Identify user in PostHog on session restore
      identifyUserInPostHog(userData);
    } catch (err) {
      log.debug('Auth check failed - user not authenticated', { error: String(err) });
      // User not authenticated (cookies expired/invalid)
      setUser(null);

      // Clean up any old localStorage tokens and auth method
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      clearStoredAuthMethod();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: UserLogin | { user: User; access: string; refresh: string }) => {
    setLoading(true);
    setError(null);

    try {
      // Check if this is a Google login (with user data already provided)
      if ('user' in credentials) {
        // Google OAuth login - tokens already stored by authApi.googleLogin
        setUser(credentials.user);

        // Store auth method for analytics and identify user
        setStoredAuthMethod('google');
        identifyUserInPostHog(credentials.user, 'google');
      } else {
        // Regular email login
        await authApi.login(credentials);

        // Get user data
        const userData = await authApi.getCurrentUser();
        setUser(userData);

        // Store auth method for analytics and identify user
        setStoredAuthMethod('email');
        identifyUserInPostHog(userData, 'email');
      }
    } catch (err: any) {
      const apiError = extractApiError(err);
      setError(apiError.message);
      throw new Error(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: UserRegistration) => {
    setLoading(true);
    setError(null);

    try {
      // Validate passwords match
      if (data.password !== data.password2) {
        throw new Error('Passwords do not match');
      }

      // Register user
      await authApi.register(data);

      // Store auth method before login (login will overwrite it, so we need to be careful)
      // Registration is always email auth
      setStoredAuthMethod('email');

      // Auto-login after registration
      await login({
        username: data.username,
        password: data.password,
      });
    } catch (err: any) {
      const apiError = extractApiError(err);
      setError(apiError.message);
      throw new Error(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Reset PostHog session before clearing user state
      resetPostHog();

      // Wait for backend to clear cookies
      await authApi.logout();
      setUser(null);
      setError(null);

      // Clear stored auth method
      clearStoredAuthMethod();

      // Redirect to home page after cookies are cleared
      window.location.href = buildAppPath('/');
    } catch (error) {
      log.error('Logout failed', error);
      // Reset PostHog and clear local state even if API call fails
      resetPostHog();
      setUser(null);
      setError(null);
      clearStoredAuthMethod();
      window.location.href = buildAppPath('/');
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    try {
      const userData = await userApi.getProfile();
      setUser(userData);
    } catch (err) {
      log.error('Failed to refresh user', err);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// HOC to protect routes
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => {
    const { user, loading } = useAuth();

    if (loading) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
        }}>
          <div>Loading...</div>
        </div>
      );
    }

    if (!user) {
      window.location.href = buildAppPath('/');
      return null;
    }

    return <Component {...props} />;
  };
};
