/**
 * Custom Application Exceptions
 *
 * Standardized error handling across the application.
 * All errors should extend AppException for consistent handling.
 */

export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Authentication/Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',

  // Payment errors
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_NOT_FOUND = 'PAYMENT_NOT_FOUND',
  PAYMENT_ALREADY_PROCESSED = 'PAYMENT_ALREADY_PROCESSED',
  INVALID_WEBHOOK_SIGNATURE = 'INVALID_WEBHOOK_SIGNATURE',

  // Blockchain errors
  BLOCKCHAIN_TRANSACTION_FAILED = 'BLOCKCHAIN_TRANSACTION_FAILED',
  BLOCKCHAIN_CONNECTION_ERROR = 'BLOCKCHAIN_CONNECTION_ERROR',
  INVALID_CONTRACT_ADDRESS = 'INVALID_CONTRACT_ADDRESS',
  INSUFFICIENT_GAS = 'INSUFFICIENT_GAS',

  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',

  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  ASAAS_API_ERROR = 'ASAAS_API_ERROR',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
}

export interface ErrorContext {
  code: ErrorCode;
  message: string;
  statusCode: number;
  context?: string;
  metadata?: Record<string, unknown>;
  originalError?: Error;
}

/**
 * Base application exception
 */
export class AppException extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly context?: string;
  readonly metadata?: Record<string, unknown>;
  readonly originalError?: Error;

  constructor(errorContext: ErrorContext) {
    super(errorContext.message);
    this.code = errorContext.code;
    this.statusCode = errorContext.statusCode;
    this.context = errorContext.context;
    this.metadata = errorContext.metadata;
    this.originalError = errorContext.originalError;

    // Maintain prototype chain
    Object.setPrototypeOf(this, AppException.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
      metadata: this.metadata,
    };
  }
}

// ============================================================================
// SPECIFIC EXCEPTIONS
// ============================================================================

/**
 * Validation error
 */
export class ValidationException extends AppException {
  constructor(message: string, metadata?: Record<string, unknown>) {
    super({
      code: ErrorCode.VALIDATION_ERROR,
      message,
      statusCode: 400,
      metadata,
    });
    Object.setPrototypeOf(this, ValidationException.prototype);
  }
}

/**
 * Invalid webhook signature
 */
export class InvalidWebhookSignatureException extends AppException {
  constructor(message: string = 'Invalid webhook signature') {
    super({
      code: ErrorCode.INVALID_WEBHOOK_SIGNATURE,
      message,
      statusCode: 401,
    });
    Object.setPrototypeOf(this, InvalidWebhookSignatureException.prototype);
  }
}

/**
 * Payment-related error
 */
export class PaymentException extends AppException {
  constructor(
    code: ErrorCode,
    message: string,
    metadata?: Record<string, unknown>,
    originalError?: Error
  ) {
    super({
      code,
      message,
      statusCode: 400,
      metadata,
      originalError,
    });
    Object.setPrototypeOf(this, PaymentException.prototype);
  }
}

/**
 * Blockchain-related error
 */
export class BlockchainException extends AppException {
  constructor(
    code: ErrorCode,
    message: string,
    metadata?: Record<string, unknown>,
    originalError?: Error
  ) {
    super({
      code,
      message,
      statusCode: 500,
      metadata,
      originalError,
    });
    Object.setPrototypeOf(this, BlockchainException.prototype);
  }
}

/**
 * Database-related error
 */
export class DatabaseException extends AppException {
  constructor(
    message: string,
    metadata?: Record<string, unknown>,
    originalError?: Error
  ) {
    super({
      code: ErrorCode.DATABASE_ERROR,
      message,
      statusCode: 500,
      metadata,
      originalError,
    });
    Object.setPrototypeOf(this, DatabaseException.prototype);
  }
}

/**
 * External service error (Asaas, etc)
 */
export class ExternalServiceException extends AppException {
  constructor(
    service: string,
    message: string,
    metadata?: Record<string, unknown>,
    originalError?: Error
  ) {
    super({
      code: ErrorCode.EXTERNAL_SERVICE_ERROR,
      message: `${service} error: ${message}`,
      statusCode: 503,
      metadata: {
        service,
        ...metadata,
      },
      originalError,
    });
    Object.setPrototypeOf(this, ExternalServiceException.prototype);
  }
}

/**
 * Resource not found error
 */
export class NotFoundException extends AppException {
  constructor(resource: string, identifier?: string) {
    const message =
      identifier ? `${resource} with id ${identifier} not found` : `${resource} not found`;
    super({
      code: ErrorCode.NOT_FOUND,
      message,
      statusCode: 404,
    });
    Object.setPrototypeOf(this, NotFoundException.prototype);
  }
}

/**
 * Internal server error
 */
export class InternalServerException extends AppException {
  constructor(message: string = 'Internal server error', originalError?: Error) {
    super({
      code: ErrorCode.INTERNAL_ERROR,
      message,
      statusCode: 500,
      originalError,
    });
    Object.setPrototypeOf(this, InternalServerException.prototype);
  }
}
