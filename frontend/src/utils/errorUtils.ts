/**
 * Centralized error extraction utility.
 * Handles both the standardized custom format and DRF's default error formats.
 */

export interface ApiError {
  code: string | null;
  message: string;
  details: Record<string, string[]> | null;
  status: number | null;
}

/**
 * Extract error information from API response.
 * Supports the standardized custom format and DRF's default error formats.
 */
export function extractApiError(error: any): ApiError {
  const response = error?.response;
  const data = response?.data;
  const status = response?.status || null;

  // Standardized format: { error: { code, message, details } }
  if (data?.error?.message) {
    return {
      code: data.error.code || null,
      message: data.error.message,
      details: data.error.details || null,
      status,
    };
  }

  // DRF default formats (detail, message, non_field_errors, field-level errors)
  let message = 'An unexpected error occurred';
  let details: Record<string, string[]> | null = null;

  if (data) {
    // DRF: { detail: "message" }
    if (typeof data.detail === 'string') {
      message = data.detail;
    }
    // Custom: { message: "message" }
    else if (typeof data.message === 'string') {
      message = data.message;
    }
    // DRF: { non_field_errors: ["message"] }
    else if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
      message = data.non_field_errors[0];
    }
    // DRF: Field-level errors { fieldName: ["error"] }
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

  // Standardized format: check details
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


