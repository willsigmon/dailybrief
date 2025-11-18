/**
 * Structured logging with Winston
 */
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(colors);

// PII Redaction
const SENSITIVE_KEYS = [
  'password', 'token', 'key', 'secret', 'authorization', 'cookie',
  'gmailMessages', 'calendarEvents', 'limitlessRecordings', // Large data blobs
  'content', 'snippet', 'transcript', 'body' // Message content
];

function redactPII(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => redactPII(item));
  }

  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some(k => lowerKey.includes(k.toLowerCase()))) {
        if (Array.isArray(obj[key])) {
             newObj[key] = `[REDACTED ARRAY len=${obj[key].length}]`;
        } else if (typeof obj[key] === 'string') {
             newObj[key] = '[REDACTED]';
        } else {
             newObj[key] = '[REDACTED]';
        }
      } else if (typeof obj[key] === 'object') {
        newObj[key] = redactPII(obj[key]);
      } else {
        newObj[key] = obj[key];
      }
    }
  }
  return newObj;
}

// Custom format to redact PII from metadata
const piiRedactor = winston.format((info) => {
  const { level, message, timestamp, ...meta } = info;
  const redactedMeta = redactPII(meta);
  return { level, message, timestamp, ...redactedMeta };
});

// Create log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  piiRedactor(),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  piiRedactor(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create transports
const transports: winston.transport[] = [
  // Console transport
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    level: process.env.LOG_LEVEL || 'info',
  }),
];

// File transports for production
if (process.env.NODE_ENV === 'production') {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create logger instance
export const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

// Request ID tracking
let requestIdCounter = 0;

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${++requestIdCounter}`;
}

/**
 * Create a child logger with request ID context
 */
export function createRequestLogger(requestId: string): winston.Logger {
  return logger.child({ requestId });
}

/**
 * Log performance metrics
 */
export function logPerformance(
  operation: string,
  durationMs: number,
  metadata?: Record<string, unknown>
): void {
  logger.info('Performance metric', {
    operation,
    durationMs,
    ...metadata,
  });
}

/**
 * Log error with context
 */
export function logError(
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  if (error instanceof Error) {
    logger.error(error.message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    });
  } else {
    logger.error('Unknown error', {
      error: String(error),
      ...context,
    });
  }
}
