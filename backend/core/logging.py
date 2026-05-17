"""
Centralized logging utilities for the backend.
Provides structured logging with consistent formatting.

Usage:
    from core.logging import get_logger

    logger = get_logger(__name__)
    logger.info('User logged in', extra={'extra_data': {'user_id': 123}})
"""
import logging
import json
from collections.abc import Callable
from functools import wraps
from typing import ParamSpec, Protocol, TypeVar, cast


P = ParamSpec('P')
R = TypeVar('R')


class RequestUserLike(Protocol):
    is_authenticated: bool


class RequestLike(Protocol):
    user: RequestUserLike
    method: str
    path: str


class StructuredFormatter(logging.Formatter):
    """
    JSON formatter for structured logging in production.
    Outputs logs as JSON for easier parsing by log aggregation tools.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }

        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)

        # Add extra fields if provided via extra={'extra_data': {...}}
        if hasattr(record, 'extra_data'):
            log_data['data'] = record.extra_data

        return json.dumps(log_data)


def get_logger(name: str) -> logging.Logger:
    """Get a configured logger instance."""
    return logging.getLogger(name)


def log_request(logger: logging.Logger) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """
    Decorator to log API request details.

    Args:
        logger: Logger instance to use for logging.

    Usage:
        from core.logging import get_logger, log_request

        logger = get_logger(__name__)

        class MyView(APIView):
            @log_request(logger)
            def get(self, request):
                return Response(...)
    """
    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            request_obj = args[1] if len(args) > 1 else kwargs.get('request')
            request = cast(RequestLike, request_obj)
            user_str = str(request.user) if request.user.is_authenticated else 'anonymous'
            logger.info(
                f'{request.method} {request.path}',
                extra={'extra_data': {
                    'method': request.method,
                    'path': request.path,
                    'user': user_str,
                }}
            )
            return func(*args, **kwargs)
        return wrapper
    return decorator


def log_service_call(logger: logging.Logger, service_name: str) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """
    Decorator to log service method calls with timing.

    Args:
        logger: Logger instance to use for logging.
        service_name: Name of the service for log context.

    Usage:
        from core.logging import get_logger, log_service_call

        logger = get_logger(__name__)

        class MyService:
            @classmethod
            @log_service_call(logger, 'MyService')
            def do_something(cls, param):
                return result
    """
    import time

    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        @wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                elapsed = time.time() - start_time
                logger.debug(
                    f'{service_name}.{func.__name__} completed',
                    extra={'extra_data': {
                        'service': service_name,
                        'method': func.__name__,
                        'elapsed_ms': round(elapsed * 1000, 2),
                    }}
                )
                return result
            except Exception as e:
                elapsed = time.time() - start_time
                logger.error(
                    f'{service_name}.{func.__name__} failed: {str(e)}',
                    extra={'extra_data': {
                        'service': service_name,
                        'method': func.__name__,
                        'elapsed_ms': round(elapsed * 1000, 2),
                        'error': str(e),
                    }},
                    exc_info=True
                )
                raise
        return wrapper
    return decorator
