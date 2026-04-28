import { STORAGE_KEYS } from '../config/constants';
import { createLogger } from './logger';

const log = createLogger('Storage');

const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    log.error(`Failed to remove item from localStorage: ${key}`, error);
  }
};

export const tokenStorage = {
  clearTokens: (): void => {
    removeStorageItem(STORAGE_KEYS.ACCESS_TOKEN);
    removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN);
  },
};
