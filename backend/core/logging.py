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
