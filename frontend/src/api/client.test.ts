/**
 * API Client Tests
 * Tests for HTTP helper functions and API module exports
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleApiError,
  getApiError,
} from './client';

// We need to mock axios before importing the client
// so we'll use dynamic imports in the tests
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

describe('ApiClient - Error Handling Utilities', () => {
  it('handleApiError should return error message', () => {
    const error = {
      response: {
        data: {
          error: {
            message: 'Test error message',
          },
        },
      },
    };

    const result = handleApiError(error);

    expect(result).toBe('Test error message');
  });

  it('getApiError should return full error object', () => {
    const error = {
      response: {
        status: 400,
        data: {
          error: {
            code: 'invalid',
            message: 'Validation failed',
            details: { field: ['error'] },
          },
        },
      },
    };

    const result = getApiError(error);

    expect(result).toEqual({
      status: 400,
      code: 'invalid',
      message: 'Validation failed',
      details: { field: ['error'] },
    });
  });
});
