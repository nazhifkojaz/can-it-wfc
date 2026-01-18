/**
 * Centralized error extraction utility.
 * Handles both new standardized format and legacy formats for backward compatibility.
 */

export interface ApiError {
  code: string | null;
  message: string;
  details: Record<string, string[]> | null;
  status: number | null;
}

/**
 * Extract error information from API response.
 * Supports new standardized format and legacy formats.
 */
export function extractApiError(error: any): ApiError {
  const response = error?.response;
  const data = response?.data;
  const status = response?.status || null;

  // New standardized format: { error: { code, message, details } }
  if (data?.error?.message) {
    return {
      code: data.error.code || null,
      message: data.error.message,
      details: data.error.details || null,
      status,
    };
  }

  // Legacy formats (backward compatibility)
  let message = 'An unexpected error occurred';
  let details: Record<string, string[]> | null = null;

  if (data) {
    // Legacy: { detail: "message" }
    if (typeof data.detail === 'string') {
      message = data.detail;
    }
    // Legacy: { message: "message" }
    else if (typeof data.message === 'string') {
      message = data.message;
    }
    // Legacy: { non_field_errors: ["message"] }
    else if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
      message = data.non_field_errors[0];
    }
    // Legacy: Field-level errors { fieldName: ["error"] }
    else if (typeof data === 'object') {
      const fieldErrors: Record<string, string[]> = {};
      let firstError: string | null = null;

      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value) && value.length > 0) {
          fieldErrors[key] = value as string[];
          if (!firstError) {
            firstError = `${key}: ${value[0]}`;
          }
        } else if (typeof value === 'string') {
          fieldErrors[key] = [value];
          if (!firstError) {
            firstError = `${key}: ${value}`;
          }
        }
      }

      if (firstError) {
        message = firstError;
        details = fieldErrors;
      }
    }
  }

  // Network errors
  if (!response && error?.message) {
    message = error.message === 'Network Error'
      ? 'Network error. Please check your connection.'
      : error.message;
  }

  return {
    code: null,
    message,
    details,
    status,
  };
}

/**
 * Get field-specific error message.
 */
export function getFieldError(error: any, fieldName: string): string | null {
  const apiError = extractApiError(error);

  // New format: check details
  if (apiError.details?.[fieldName]) {
    const fieldErrors = apiError.details[fieldName];
    return Array.isArray(fieldErrors) ? fieldErrors[0] : fieldErrors;
  }

  // Legacy format: check direct field access
  const data = error?.response?.data;
  if (data?.[fieldName]) {
    const fieldError = data[fieldName];
    return Array.isArray(fieldError) ? fieldError[0] : fieldError;
  }

  return null;
}

/**
 * Check if error matches a specific error code.
 */
export function isErrorCode(error: any, code: string): boolean {
  const apiError = extractApiError(error);
  return apiError.code === code;
}

/**
 * Get human-readable message for common error codes.
 */
export function getErrorMessageByCode(code: string): string {
  const errorMessages: Record<string, string> = {
    // Cafe errors
    'cafe_not_found': 'Cafe not found',
    'already_favorited': 'This cafe is already in your favorites',
    'not_favorited': 'This cafe is not in your favorites',

    // User errors
    'user_not_found': 'User not found',
    'self_follow_not_allowed': 'You cannot follow yourself',
    'already_following': 'You are already following this user',
    'not_following': 'You are not following this user',

    // Auth errors
    'google_auth_error': 'Google authentication failed',
    'google_token_required': 'Google access token is required',
    'google_email_not_provided': 'Email not provided by Google',
    'not_authenticated': 'Please log in to continue',
    'authentication_failed': 'Authentication failed',

    // Review errors
    'review_not_found': 'Review not found',
    'self_helpful_not_allowed': 'You cannot mark your own review as helpful',
    'invalid_cafe_ids': 'Invalid cafe IDs provided',
    'too_many_cafe_ids': 'Too many cafe IDs requested',

    // Generic errors
    'validation_error': 'Please check your input',
    'rate_limit_exceeded': 'Too many requests. Please try again later.',
    'permission_denied': 'You do not have permission to perform this action',
    'not_found': 'Resource not found',
  };

  return errorMessages[code] || code;
}
