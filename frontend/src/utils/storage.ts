/**
 * LocalStorage utilities with type safety
 */

import { STORAGE_KEYS } from '../config/constants';

/**
 * Get item from localStorage with type safety
 */
export const getStorageItem = <T = string>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return null;
    }

    // Try to parse as JSON, otherwise return as string
    try {
      return JSON.parse(item) as T;
    } catch {
      return item as T;
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`Error getting item from localStorage: ${key}`, error);
    }
    return null;
  }
};

/**
 * Set item in localStorage with type safety
 */
export const setStorageItem = <T>(key: string, value: T): void => {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stringValue);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`Error setting item in localStorage: ${key}`, error);
    }
  }
};

/**
 * Remove item from localStorage
 */
export const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`Error removing item from localStorage: ${key}`, error);
    }
  }
};

/**
 * Clear all items from localStorage
 */
export const clearStorage = (): void => {
  try {
    localStorage.clear();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Error clearing localStorage', error);
    }
  }
};

// Token-specific utilities
export const tokenStorage = {
  getAccessToken: (): string | null => {
    return getStorageItem<string>(STORAGE_KEYS.ACCESS_TOKEN);
  },

  setAccessToken: (token: string): void => {
    setStorageItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  },

  getRefreshToken: (): string | null => {
    return getStorageItem<string>(STORAGE_KEYS.REFRESH_TOKEN);
  },

  setRefreshToken: (token: string): void => {
    setStorageItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  },

  clearTokens: (): void => {
    removeStorageItem(STORAGE_KEYS.ACCESS_TOKEN);
    removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
  },

  hasTokens: (): boolean => {
    return !!(tokenStorage.getAccessToken() && tokenStorage.getRefreshToken());
  },
};
