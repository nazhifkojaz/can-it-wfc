import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserLogin, UserRegistration } from '../types';
import { authApi, userApi } from '../api/client';
import { buildAppPath } from '../utils/url';

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
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Auth check failed:', err);
      }
      // User not authenticated (cookies expired/invalid)
      setUser(null);

      // Clean up any old localStorage tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
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
      } else {
        // Regular login
        await authApi.login(credentials);

        // Get user data
        const userData = await authApi.getCurrentUser();
        setUser(userData);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
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
      
      // Auto-login after registration
      await login({
        username: data.username,
        password: data.password,
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Wait for backend to clear cookies
      await authApi.logout();
      setUser(null);
      setError(null);

      // Redirect to home page after cookies are cleared
      window.location.href = buildAppPath('/');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state and redirect even if API call fails
      setUser(null);
      setError(null);
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
      if (import.meta.env.DEV) {
        console.error('Failed to refresh user:', err);
      }
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
