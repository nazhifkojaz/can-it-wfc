import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserLogin, UserRegistration } from '../types';
import { authApi, userApi } from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: UserLogin | { user: User; access: string; refresh: string }) => Promise<void>;
  register: (data: UserRegistration) => Promise<void>;
  logout: () => void;
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
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      setError(null);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('Auth check failed:', err);
      }
      // Token is invalid, clear it
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
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

  const logout = () => {
    authApi.logout();
    setUser(null);
    setError(null);
    
    // Redirect to login page
    window.location.href = '/login';
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
      window.location.href = '/login';
      return null;
    }

    return <Component {...props} />;
  };
};