/**
 * Centralized logging utility.
 * Environment-aware: full output in dev, errors/warnings only in prod.
 * Automatically redacts sensitive data (passwords, tokens, etc.).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogData {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: LogData;
  component?: string;
}

const isDev = import.meta.env.DEV;

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Only show warnings and errors in production
const MIN_LEVEL: LogLevel = isDev ? 'debug' : 'warn';

/**
 * Format the log message with optional component prefix.
 */
const formatMessage = (entry: LogEntry): string => {
  const prefix = entry.component ? `[${entry.component}]` : '';
  return `${prefix} ${entry.message}`.trim();
};

/**
 * Check if a log level should be output based on environment.
 */
const shouldLog = (level: LogLevel): boolean => {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
};

/**
 * Create a log entry with timestamp and metadata.
 */
const createLogEntry = (
  level: LogLevel,
  message: string,
  data?: LogData,
  component?: string
): LogEntry => ({
  timestamp: new Date().toISOString(),
  level,
  message,
  data,
  component,
});

/**
 * Sanitize data to remove sensitive fields before logging.
 * Redacts common sensitive field names like password, token, secret, etc.
 */
const sanitizeData = (data?: LogData): LogData | undefined => {
  if (!data) return undefined;

  const sensitiveKeys = [
    'password',
    'token',
    'secret',
    'authorization',
    'credential',
    'apikey',
    'api_key',
  ];
  const sanitized: LogData = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((k) => lowerKey.includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeData(value as LogData);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Extract error information safely.
 */
const extractErrorData = (error?: Error | unknown): LogData => {
  const errorData: LogData = {};

  if (error instanceof Error) {
    errorData.errorName = error.name;
    errorData.errorMessage = error.message;
    if (isDev && error.stack) {
      errorData.stack = error.stack;
    }
  } else if (error !== undefined && error !== null) {
    errorData.error = String(error);
  }

  return errorData;
};

/**
 * Global logger instance.
 * Use this for general logging or when component context isn't needed.
 */
export const logger = {
  /**
   * Log debug-level message (dev only).
   */
  debug: (message: string, data?: LogData, component?: string): void => {
    if (!shouldLog('debug')) return;
    const entry = createLogEntry('debug', message, sanitizeData(data), component);
    console.debug(formatMessage(entry), entry.data ?? '');
  },

  /**
   * Log info-level message (dev only).
   */
  info: (message: string, data?: LogData, component?: string): void => {
    if (!shouldLog('info')) return;
    const entry = createLogEntry('info', message, sanitizeData(data), component);
    console.info(formatMessage(entry), entry.data ?? '');
  },

  /**
   * Log warning-level message.
   */
  warn: (message: string, data?: LogData, component?: string): void => {
    if (!shouldLog('warn')) return;
    const entry = createLogEntry('warn', message, sanitizeData(data), component);
    console.warn(formatMessage(entry), entry.data ?? '');
  },

  /**
   * Log error-level message with optional error object.
   */
  error: (message: string, error?: Error | unknown, component?: string): void => {
    if (!shouldLog('error')) return;
    const errorData = extractErrorData(error);
    const entry = createLogEntry('error', message, errorData, component);
    console.error(formatMessage(entry), entry.data ?? '');
  },
};

/**
 * Create a scoped logger for a specific component or module.
 * Automatically prefixes all log messages with the component name.
 *
 * Usage:
 *   const log = createLogger('AuthContext');
 *   log.info('User logged in');  // Output: [AuthContext] User logged in
 */
export const createLogger = (component: string) => ({
  debug: (message: string, data?: LogData) => logger.debug(message, data, component),
  info: (message: string, data?: LogData) => logger.info(message, data, component),
  warn: (message: string, data?: LogData) => logger.warn(message, data, component),
  error: (message: string, error?: Error | unknown) => logger.error(message, error, component),
});


