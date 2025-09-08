/**
 * Professional Logging Utility for DecentrAgri AI Agent
 * Provides structured, contextual logging with different levels
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  context?: LogContext;
  error?: Record<string, unknown>;
}

export class Logger {
  private readonly serviceName: string;
  private readonly minLevel: LogLevel;

  constructor(serviceName: string, minLevel: LogLevel = LogLevel.INFO) {
    this.serviceName = serviceName;
    this.minLevel = minLevel;
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log general information
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error messages with optional error object
   */
  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Log fatal errors that cause system failure
   */
  fatal(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.FATAL, message, context, error);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      context,
      error: error ? this.serializeError(error) : undefined
    };

    // In production, this would send to logging service
    // For now, format and output to console with proper structure
    this.output(entry);
  }

  /**
   * Format and output log entry
   */
  private output(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp;
    const service = entry.service;
    
    // Structured log format for production parsing
    const logLine = JSON.stringify({
      '@timestamp': timestamp,
      level: levelName,
      service,
      message: entry.message,
      ...entry.context,
      ...(entry.error && { error: entry.error })
    });

    // Color coding for console output (development)
    if (process.env.NODE_ENV !== 'production') {
      const colors = {
        [LogLevel.DEBUG]: '\x1b[36m', // Cyan
        [LogLevel.INFO]: '\x1b[32m',  // Green
        [LogLevel.WARN]: '\x1b[33m',  // Yellow
        [LogLevel.ERROR]: '\x1b[31m', // Red
        [LogLevel.FATAL]: '\x1b[35m'  // Magenta
      };
      
      const color = colors[entry.level] || '\x1b[0m';
      const reset = '\x1b[0m';
      
      console.log(`${color}[${levelName}]${reset} ${timestamp} ${service}: ${entry.message}`, 
        entry.context ? entry.context : '', 
        entry.error ? entry.error : ''
      );
    } else {
      console.log(logLine);
    }
  }

  /**
   * Serialize error for structured logging
   */
  private serializeError(error: Error): Record<string, unknown> {
    const serialized: Record<string, unknown> = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
    
    if (error.cause) {
      serialized.cause = error.cause;
    }
    
    return serialized;
  }

  /**
   * Create child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.serviceName, this.minLevel);
    const originalLog = childLogger.log.bind(childLogger);
    
    childLogger['log'] = (level: LogLevel, message: string, context?: LogContext, error?: Error) => {
      const mergedContext = { ...additionalContext, ...context };
      originalLog(level, message, mergedContext, error);
    };

    return childLogger;
  }
}

/**
 * Create logger instance for a service
 */
export function createLogger(serviceName: string): Logger {
  const logLevel = process.env.LOG_LEVEL || 'INFO';
  const level = LogLevel[logLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
  return new Logger(serviceName, level);
}

/**
 * Performance timing utility
 */
export class PerformanceTimer {
  private startTime: number;
  private logger: Logger;
  private operation: string;

  constructor(logger: Logger, operation: string) {
    this.logger = logger;
    this.operation = operation;
    this.startTime = performance.now();
    this.logger.debug(`Starting ${operation}`);
  }

  end(context?: LogContext): void {
    const duration = performance.now() - this.startTime;
    this.logger.info(`Completed ${this.operation}`, {
      ...context,
      duration: `${duration.toFixed(2)}ms`
    });
  }
}
