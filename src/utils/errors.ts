/**
 * Professional Error Handling for DecentrAgri AI Agent
 * Provides structured, contextual error types for better debugging and monitoring
 */

export interface ErrorContext {
  [key: string]: unknown;
}

/**
 * Base error class for all DecentrAgri errors
 */
export abstract class DecentrAgriError extends Error {
  public readonly code: string;
  public readonly context: ErrorContext;
  public readonly timestamp: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    context: ErrorContext = {},
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error for logging and API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      isOperational: this.isOperational,
      stack: this.stack
    };
  }
}

/**
 * Validation errors for invalid input data
 */
export class ValidationError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'VALIDATION_ERROR', context);
  }
}

/**
 * Authentication and authorization errors
 */
export class AuthenticationError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'AUTH_ERROR', context);
  }
}

/**
 * Database operation errors
 */
export class DatabaseError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'DATABASE_ERROR', context);
  }
}

/**
 * External API call errors
 */
export class ExternalServiceError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'EXTERNAL_SERVICE_ERROR', context);
  }
}

/**
 * AI/ML processing errors
 */
export class AIProcessingError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'AI_PROCESSING_ERROR', context);
  }
}

/**
 * Crop planning specific errors
 */
export class CropPlanningError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'CROP_PLANNING_ERROR', context);
  }
}

/**
 * Yield prediction specific errors
 */
export class YieldPredictionError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'YIELD_PREDICTION_ERROR', context);
  }
}

/**
 * Farm report generation errors
 */
export class FarmReportError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'FARM_REPORT_ERROR', context);
  }
}

/**
 * Pest analysis errors
 */
export class PestAnalysisError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'PEST_ANALYSIS_ERROR', context);
  }
}

/**
 * Plant analysis errors
 */
export class PlantAnalysisError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'PLANT_ANALYSIS_ERROR', context);
  }
}

/**
 * Soil analysis errors
 */
export class SoilAnalysisError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'SOIL_ANALYSIS_ERROR', context);
  }
}

/**
 * Blockchain/Web3 operation errors
 */
export class BlockchainError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'BLOCKCHAIN_ERROR', context);
  }
}

/**
 * File upload/processing errors
 */
export class FileProcessingError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'FILE_PROCESSING_ERROR', context);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'CONFIGURATION_ERROR', context, false); // Not operational
  }
}

/**
 * Network/connectivity errors
 */
export class NetworkError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'NETWORK_ERROR', context);
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'NOT_FOUND_ERROR', context);
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'RATE_LIMIT_ERROR', context);
  }
}

/**
 * Permission denied errors
 */
export class PermissionError extends DecentrAgriError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'PERMISSION_ERROR', context);
  }
}

/**
 * Error handler utility functions
 */
export class ErrorHandler {
  /**
   * Check if error is operational (expected) vs programming error
   */
  static isOperationalError(error: Error): boolean {
    if (error instanceof DecentrAgriError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Extract safe error information for API responses
   */
  static toApiResponse(error: Error): Record<string, unknown> {
    if (error instanceof DecentrAgriError) {
      return {
        error: true,
        code: error.code,
        message: error.message,
        timestamp: error.timestamp
      };
    }

    // For unknown errors, don't expose internal details
    return {
      error: true,
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create error context from request/operation info
   */
  static createContext(data: Record<string, unknown>): ErrorContext {
    return {
      ...data,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = DecentrAgriError> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

/**
 * Create a successful result
 */
export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Create a failed result
 */
export function failure<E extends DecentrAgriError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Wrap async operations with error handling
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  context: ErrorContext = {}
): Promise<Result<T, DecentrAgriError>> {
  try {
    const result = await operation();
    return success(result);
  } catch (error) {
    if (error instanceof DecentrAgriError) {
      return failure(error);
    }
    
    // Convert unknown errors to our error type
    const wrappedError = new ValidationError(
      errorMessage,
      { ...context, originalError: error instanceof Error ? error.message : String(error) }
    );
    
    return failure(wrappedError);
  }
}
