/**
 * API Client Tests
 * Tests for HTTP helper functions and API module exports
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleApiError,
  getApiError,
} from './client';
// Note: tokenStorage is mocked below via vi.mock — use mockClearTokens in assertions

// Hoist mocks so they're available when vi.mock factories execute
const { responseInterceptorHandlers, mockClearTokens, mockAxiosInstance } = vi.hoisted(() => {
  const handlers: Array<(error: any) => any> = [];
  const clearTokens = vi.fn();
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: {
        use: vi.fn((_onSuccess: any, onError: any) => {
          handlers.push(onError);
        }),
      },
    },
  };
  return { responseInterceptorHandlers: handlers, mockClearTokens: clearTokens, mockAxiosInstance: instance };
});

vi.mock('axios', () => ({
  default: {
    create: () => mockAxiosInstance,
  },
}));

vi.mock('../utils/storage', () => ({
  tokenStorage: {
    clearTokens: mockClearTokens,
  },
}));

vi.mock('../utils/url', () => ({
  buildAppPath: (path: string) => `/app${path}`,
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

describe('ApiClient - 401 Interceptor', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    mockClearTokens.mockClear();
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  async function trigger401(pathname: string) {
    // @ts-expect-error - overriding readonly for test
    window.location.pathname = pathname;
    window.location.href = '';

    const handler = responseInterceptorHandlers[0];
    expect(handler).toBeDefined();
    const error = { response: { status: 401 } };
    // Handler re-rejects the error after processing — catch it
    await handler(error).catch(() => {});
  }

  it('clears tokens on every 401', async () => {
    await trigger401('/map');

    expect(mockClearTokens).toHaveBeenCalled();
  });

  it('clears tokens even on public pages', async () => {
    await trigger401('/');

    expect(mockClearTokens).toHaveBeenCalled();
  });

  it('redirects to landing page when on a protected page', async () => {
    await trigger401('/map');

    expect(window.location.href).toBe('/app/');
  });

  it('redirects to landing page when on a nested protected page', async () => {
    await trigger401('/cafes/123');

    expect(window.location.href).toBe('/app/');
  });

  it('does not redirect when already on landing page', async () => {
    await trigger401('/');

    expect(window.location.href).toBe('');
  });

  it('does not redirect on non-401 errors', async () => {
    const handler = responseInterceptorHandlers[0];
    // @ts-expect-error - overriding readonly for test
    window.location.pathname = '/map';
    window.location.href = '';

    const error = { response: { status: 500 } };
    await handler(error).catch(() => {});

    expect(window.location.href).toBe('');
  });
});
