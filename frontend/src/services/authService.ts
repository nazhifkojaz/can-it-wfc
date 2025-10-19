import api from './api';
import {
  User,
  UserRegistration,
  UserLogin,
  AuthTokens,
  UserUpdate,
} from '../types';

export const authService = {
  // Register new user
  register: async (data: UserRegistration): Promise<{ user: User; message: string }> => {
    const response = await api.post('/auth/register/', data);
    return response.data;
  },

  // Login and get JWT tokens
  login: async (credentials: UserLogin): Promise<AuthTokens> => {
    const response = await api.post('/auth/login/', credentials);
    const tokens = response.data;
    
    // Store tokens in localStorage
    localStorage.setItem('accessToken', tokens.access);
    localStorage.setItem('refreshToken', tokens.refresh);
    
    return tokens;
  },

  // Logout
  logout: (): void => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  // Get current user profile
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me/');
    return response.data;
  },

  // Update user profile
  updateProfile: async (data: UserUpdate): Promise<User> => {
    const response = await api.patch('/auth/me/', data);
    return response.data;
  },

  // Change password
  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },

  // Get public user profile
  getUserProfile: async (userId: number): Promise<User> => {
    const response = await api.get(`/auth/users/${userId}/`);
    return response.data;
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('accessToken');
  },

  // Refresh access token
  refreshToken: async (): Promise<string> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await api.post('/auth/refresh/', {
      refresh: refreshToken,
    });

    const { access } = response.data;
    localStorage.setItem('accessToken', access);
    
    return access;
  },
};