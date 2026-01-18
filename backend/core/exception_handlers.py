"""
Custom exception handler for Django REST Framework.
Standardizes all API error responses and adds centralized logging.
"""
import logging
from django.core.exceptions import PermissionDenied
from django.http import Http404
from rest_framework import exceptions
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.response import Response
from django.utils import timezone

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that standardizes all error responses.

    Returns a consistent error format:
    {
        "error": {
            "code": "error_code",
            "message": "Human-readable message",
            "details": {} or null
        },
        "timestamp": "ISO-8601 timestamp",
        "path": "/api/endpoint/"
    }
    """
    # Get the standard DRF error response
    response = drf_exception_handler(exc, context)

    # Get request for logging and path
    request = context.get('request')
    path = request.path if request else None

    # If DRF didn't handle it, handle Django exceptions
    if response is None:
        if isinstance(exc, Http404):
            response = Response(
                status=404,
                data={'detail': 'Not found'}
            )
        elif isinstance(exc, PermissionDenied):
            response = Response(
                status=403,
                data={'detail': 'Permission denied'}
            )
        else:
            # Unexpected exception - log and return 500
            logger.error(
                f"Unhandled exception: {exc}",
                exc_info=True,
                extra={'path': path}
            )
            return None  # Let Django handle 500 errors

    # Determine error code
    error_code = _get_error_code(exc)

    # Extract error message and details
    if isinstance(response.data, dict):
        message = _get_error_message(response.data)
        details = _get_error_details(response.data)
    else:
        message = str(response.data)
        details = None

    # Standardize response format
    standardized_data = {
        'error': {
            'code': error_code,
            'message': message,
            'details': details
        },
        'timestamp': timezone.now().isoformat(),
        'path': path
    }

    response.data = standardized_data

    # Log the error
    _log_error(exc, response.status_code, path, message)

    return response


def _get_error_code(exc):
    """Determine error code based on exception type."""
    # Check for custom exception code first
    if hasattr(exc, 'default_code') and exc.default_code:
        return exc.default_code

    if isinstance(exc, exceptions.ValidationError):
        return 'validation_error'
    elif isinstance(exc, exceptions.AuthenticationFailed):
        return 'authentication_failed'
    elif isinstance(exc, exceptions.NotAuthenticated):
        return 'not_authenticated'
    elif isinstance(exc, exceptions.PermissionDenied):
        return 'permission_denied'
    elif isinstance(exc, exceptions.NotFound):
        return 'not_found'
    elif isinstance(exc, exceptions.MethodNotAllowed):
        return 'method_not_allowed'
    elif isinstance(exc, exceptions.Throttled):
        return 'rate_limit_exceeded'
    elif isinstance(exc, Http404):
        return 'not_found'
    elif isinstance(exc, PermissionDenied):
        return 'permission_denied'
    else:
        return 'api_error'


def _get_error_message(data):
    """Extract human-readable error message from response data."""
    if isinstance(data, dict):
        # DRF uses 'detail' for most errors
        if 'detail' in data:
            detail = data['detail']
            # Handle ErrorDetail objects
            return str(detail)

        # Validation errors might have 'non_field_errors'
        if 'non_field_errors' in data:
            errors = data['non_field_errors']
            if isinstance(errors, list) and errors:
                return str(errors[0])
            return str(errors)

        # Field-level validation errors - return first field's first error
        for field, errors in data.items():
            if isinstance(errors, list) and errors:
                return f"{field}: {errors[0]}"
            elif errors:
                return f"{field}: {errors}"

    return "Request failed"


def _get_error_details(data):
    """Extract detailed field-level errors if present."""
    if isinstance(data, dict):
        # If it's just a detail message, no details needed
        if 'detail' in data and len(data) == 1:
            return None

        # Return field-level errors as details
        details = {k: v for k, v in data.items() if k != 'detail'}
        return details if details else None

    return None


def _log_error(exc, status_code, path, message):
    """Log error with appropriate level based on status code."""
    log_data = {
        'status_code': status_code,
        'path': path,
        'error_type': type(exc).__name__,
        'error_message': message  # Renamed to avoid conflict with LogRecord.message
    }

    if status_code >= 500:
        logger.error(f"Server error ({status_code}): {message}", extra=log_data)
    elif status_code >= 400:
        logger.warning(f"Client error ({status_code}): {message}", extra=log_data)
    else:
        logger.info(f"Error ({status_code}): {message}", extra=log_data)
