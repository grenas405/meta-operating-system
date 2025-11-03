// ================================================================================
// 🛡️ Deno Genesis Meta Operating System
// ================================================================================
// middleware/errorHandler.ts

import type { Context } from "../utils/context.ts";
import { finalizeResponse } from "../utils/context.ts";
import { ConsoleStyler } from "../utils/console-styler/mod.ts";
// --------------------------------------------------------------------------------
// TODO:
// 1. Test examples in meta documentation
// 2. Remove redundant meta documentation
//
// UNIX PHILOSOPHY IMPLEMENTATION:
// --------------------------------
// 1. DO ONE THING WELL:
//    - This module ONLY handles error management and recovery
//    - Does NOT handle logging, routing, authentication, or business logic
//    - Single, focused responsibility: catch, categorize, and respond to errors
//
// 2. COMPOSABILITY:
//    - Designed as middleware that integrates with Oak framework
//    - Can be combined with performance monitoring, security, and logging
//    - Error classes can be used independently in any part of the application
//
// 3. TEXT-BASED:
//    - All errors serialized as human-readable JSON
//    - Configuration via simple objects
//    - Logs written in structured, parseable text format
//
// 4. EXPLICIT:
//    - Clear error hierarchies and types
//    - No hidden error transformations
//    - Every error has a specific, documented purpose
//
// ARCHITECTURE:
// -------------
// Error Flow:
//   1. Error occurs in application code
//   2. Middleware catches error
//   3. Error is classified (operational vs programming)
//   4. Response is determined based on error type
//   5. Error is logged (console, file, monitoring service)
//   6. Sanitized response sent to client
//   7. Analytics updated for pattern detection
//
// ERROR CLASSIFICATION:
// ---------------------
// - Operational Errors: Expected errors (validation, auth, not found)
//   → Client can recover, send helpful response
// - Programming Errors: Bugs in code (null reference, type errors)
//   → Log for debugging, send generic 500 response
//
// SECURITY:
// ---------
// - Stack traces only in development mode
// - Sensitive data (passwords, tokens) sanitized from logs
// - Error messages sanitized in production
// - Request headers filtered (authorization, cookies)
// - Database queries redacted from error responses
//
// MEMORY MANAGEMENT:
// ------------------
// - Circular buffer for recent errors (fixed at 100)
// - Error counts stored in Map (grows with error types)
// - No unbounded data structures
// - Typical footprint: ~5-10KB
//
//
// USAGE:
// ------
// ```typescript
// import { createErrorMiddleware, ErrorHandlerPresets } from "./middleware/errorHandler.ts";
//
// const app = new Application();
//
// // Add error middleware LAST in the stack
// app.use(createErrorMiddleware(ErrorHandlerPresets.DEVELOPMENT));
//
// // Use custom error classes in your code
// if (!user) {
//   throw new NotFoundError('User', requestId);
// }
//
// if (!hasPermission) {
//   throw new AuthorizationError('Admin access required', requestId);
// }
// ```
//
// RELATED DOCUMENTATION:
// ----------------------
// - Framework Philosophy: docs/02-framework/philosophy.md
// - Middleware Architecture: docs/04-api-reference/core/middleware.md
// - Security Patterns: docs/02-framework/security.md
// - Performance Monitoring: middleware/performanceMonitor.ts
//
// ================================================================================

// ================================================================================
// 📦 TYPE DEFINITIONS
// ================================================================================

/**
 * Error handler configuration object
 *
 * DESIGN PHILOSOPHY:
 * - Different settings for development vs production
 * - Fail-safe defaults (never crash on misconfiguration)
 * - Optional features can be toggled independently
 *
 * CONFIGURATION STRATEGY:
 * - Development: Verbose, show everything for debugging
 * - Production: Secure, hide internals, log everything
 * - Testing: Minimal logging, fast failures
 *
 * @interface ErrorConfig
 */
export interface ErrorConfig {
  /**
   * Runtime environment (development, production, testing)
   * Determines default behavior for other settings
   * @type {string}
   */
  environment: string;

  /**
   * Enable console error logging
   * @default true
   * @type {boolean}
   */
  logErrors: boolean;

  /**
   * Write errors to log files
   * Requires logErrors to be true
   * @default false in development, true in production
   * @type {boolean}
   */
  logToFile: boolean;

  /**
   * Include stack traces in error responses
   * SECURITY: Should be false in production
   * @default false in production, true in development
   * @type {boolean}
   */
  showStackTrace: boolean;

  /**
   * Include request details (method, path, headers) in logs
   * Useful for debugging but increases log size
   * @default true
   * @type {boolean}
   */
  includeRequestInfo?: boolean;

  /**
   * Custom error messages for specific error types
   * Allows branding and localization of error responses
   * @example { 'ValidationError': 'Invalid input provided' }
   * @type {Record<string, string>}
   */
  customErrorMessages?: Record<string, string>;

  /**
   * Send errors to external monitoring service (Sentry, DataDog)
   * Requires ERROR_REPORTING_URL environment variable
   * @default false
   * @type {boolean}
   */
  enableErrorReporting?: boolean;

  /**
   * Remove sensitive data from error messages
   * Replaces actual values with [REDACTED]
   * @default true in production
   * @type {boolean}
   */
  sanitizeErrors?: boolean;
}

// ================================================================================
// 🚨 ENHANCED ERROR CLASSES
// ================================================================================

/**
 * Base application error class
 *
 * DESIGN PRINCIPLES:
 * - Extends native Error for stack trace capture
 * - Includes HTTP status code for web context
 * - Distinguishes operational vs programming errors
 * - Carries request ID for distributed tracing
 *
 * OPERATIONAL vs PROGRAMMING ERRORS:
 *
 * Operational Error (isOperational = true):
 * - Expected, recoverable errors
 * - Examples: validation failure, not found, unauthorized
 * - Client can take action to fix
 * - Should be handled gracefully
 *
 * Programming Error (isOperational = false):
 * - Unexpected bugs in code
 * - Examples: null reference, undefined variable
 * - Indicates code defect
 * - Should be logged and investigated
 *
 * @class AppError
 * @extends Error
 *
 * @example
 * ```typescript
 * // Operational error - user can fix
 * throw new AppError('Invalid email format', 400, true, requestId);
 *
 * // Programming error - developer must fix
 * throw new AppError('Null reference in user.profile', 500, false, requestId);
 * ```
 */
export class AppError extends Error {
  /**
   * HTTP status code for this error
   * Standard codes: 400 (client), 500 (server)
   * @public
   * @readonly
   * @type {number}
   */
  public readonly statusCode: number;

  /**
   * Whether this is an operational (expected) error
   * true = operational, false = programming error
   * @public
   * @readonly
   * @type {boolean}
   */
  public readonly isOperational: boolean;

  /**
   * ISO 8601 timestamp when error was created
   * Used for error rate analysis and debugging
   * @public
   * @readonly
   * @type {string}
   */
  public readonly timestamp: string;

  /**
   * Optional request ID for tracing
   * Correlates errors with specific requests
   * @public
   * @readonly
   * @type {string | undefined}
   */
  public readonly requestId?: string;

  /**
   * Create a new application error
   *
   * @param {string} message - Human-readable error description
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {boolean} isOperational - Is this an expected error? (default: true)
   * @param {string} requestId - Optional request ID for tracing
   */
  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    requestId?: string,
  ) {
    // Call parent Error constructor
    super(message);

    // Set error name to class name for identification
    // "AppError", "ValidationError", "AuthenticationError", etc.
    this.name = this.constructor.name;

    // Store error metadata
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;

    // Capture stack trace for debugging
    // Excludes constructor call from stack trace
    // This makes stack traces cleaner and more useful
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error for invalid input data
 *
 * USE CASES:
 * - Invalid email format
 * - Missing required field
 * - Value out of range
 * - Type mismatch
 *
 * ALWAYS HTTP 400 (Bad Request)
 *
 * @class ValidationError
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Email validation
 * if (!isValidEmail(email)) {
 *   throw new ValidationError('Invalid email format', 'email', email, requestId);
 * }
 *
 * // Age range validation
 * if (age < 0 || age > 120) {
 *   throw new ValidationError('Age must be between 0 and 120', 'age', age, requestId);
 * }
 * ```
 */
export class ValidationError extends AppError {
  /**
   * Name of the field that failed validation
   * @public
   * @readonly
   * @type {string}
   */
  public readonly field: string;

  /**
   * The invalid value that was provided
   * SECURITY: May be redacted in production
   * @public
   * @readonly
   * @type {any}
   */
  public readonly value: any;

  /**
   * Create a validation error
   *
   * @param {string} message - Description of validation failure
   * @param {string} field - Name of invalid field
   * @param {any} value - The invalid value provided
   * @param {string} requestId - Optional request ID
   */
  constructor(message: string, field: string, value: any, requestId?: string) {
    // Always 400 Bad Request, always operational
    super(message, 400, true, requestId);
    this.field = field;
    this.value = value;
  }
}

/**
 * Authentication error for missing or invalid credentials
 *
 * USE CASES:
 * - Missing authorization header
 * - Invalid JWT token
 * - Expired session
 * - Invalid credentials
 *
 * ALWAYS HTTP 401 (Unauthorized)
 *
 * SECURITY NOTE:
 * Don't reveal WHY authentication failed (security by obscurity)
 * Generic messages prevent credential enumeration attacks
 *
 * @class AuthenticationError
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Missing token
 * if (!token) {
 *   throw new AuthenticationError('Authentication required', requestId);
 * }
 *
 * // Invalid token (don't say WHY it's invalid)
 * if (!isValidToken(token)) {
 *   throw new AuthenticationError('Invalid credentials', requestId);
 * }
 * ```
 */
export class AuthenticationError extends AppError {
  /**
   * Create an authentication error
   *
   * @param {string} message - Generic auth error message (default: 'Authentication required')
   * @param {string} requestId - Optional request ID
   */
  constructor(message: string = "Authentication required", requestId?: string) {
    // Always 401 Unauthorized, always operational
    super(message, 401, true, requestId);
  }
}

/**
 * Authorization error for insufficient permissions
 *
 * USE CASES:
 * - User lacks required role
 * - Action not permitted for user's account
 * - Resource belongs to different user
 * - Feature not enabled for user's plan
 *
 * ALWAYS HTTP 403 (Forbidden)
 *
 * DIFFERENCE FROM AuthenticationError:
 * - 401: "Who are you?" (identity unknown)
 * - 403: "I know who you are, but you can't do that" (known, but not allowed)
 *
 * @class AuthorizationError
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Admin-only action
 * if (!user.isAdmin) {
 *   throw new AuthorizationError('Admin access required', requestId);
 * }
 *
 * // Resource ownership check
 * if (document.ownerId !== user.id) {
 *   throw new AuthorizationError('Access denied', requestId);
 * }
 * ```
 */
export class AuthorizationError extends AppError {
  /**
   * Create an authorization error
   *
   * @param {string} message - Permission error message (default: 'Insufficient permissions')
   * @param {string} requestId - Optional request ID
   */
  constructor(
    message: string = "Insufficient permissions",
    requestId?: string,
  ) {
    // Always 403 Forbidden, always operational
    super(message, 403, true, requestId);
  }
}

/**
 * Not found error for missing resources
 *
 * USE CASES:
 * - Database record not found
 * - File doesn't exist
 * - API endpoint doesn't exist
 * - Deleted resource
 *
 * ALWAYS HTTP 404 (Not Found)
 *
 * @class NotFoundError
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Database lookup
 * const user = await findUserById(userId);
 * if (!user) {
 *   throw new NotFoundError('User', requestId);
 *   // Error message: "User not found"
 * }
 *
 * // File access
 * if (!await fileExists(path)) {
 *   throw new NotFoundError('File', requestId);
 *   // Error message: "File not found"
 * }
 * ```
 */
export class NotFoundError extends AppError {
  /**
   * Type of resource that wasn't found
   * Used to generate message: "{resource} not found"
   * @public
   * @readonly
   * @type {string}
   */
  public readonly resource: string;

  /**
   * Create a not found error
   *
   * @param {string} resource - Type of resource (e.g., 'User', 'Product', 'File')
   * @param {string} requestId - Optional request ID
   */
  constructor(resource: string, requestId?: string) {
    // Automatically generate message: "{resource} not found"
    super(`${resource} not found`, 404, true, requestId);
    this.resource = resource;
  }
}

/**
 * Rate limit error for too many requests
 *
 * USE CASES:
 * - API rate limit exceeded
 * - Login attempt throttling
 * - DDoS protection triggered
 * - Resource quota exceeded
 *
 * ALWAYS HTTP 429 (Too Many Requests)
 *
 * STANDARDS:
 * - Includes Retry-After header
 * - Client should wait before retrying
 *
 * @class RateLimitError
 * @extends AppError
 *
 * @example
 * ```typescript
 * // API rate limiting
 * if (requestCount > maxRequests) {
 *   throw new RateLimitError(60, requestId);  // Retry after 60 seconds
 * }
 *
 * // Login throttling
 * if (failedAttempts > 5) {
 *   throw new RateLimitError(300, requestId); // Retry after 5 minutes
 * }
 * ```
 */
export class RateLimitError extends AppError {
  /**
   * Seconds to wait before retrying
   * Used in Retry-After header
   * @public
   * @readonly
   * @type {number}
   */
  public readonly retryAfter: number;

  /**
   * Create a rate limit error
   *
   * @param {number} retryAfter - Seconds until client can retry
   * @param {string} requestId - Optional request ID
   */
  constructor(retryAfter: number, requestId?: string) {
    // Always 429 Too Many Requests, always operational
    super("Rate limit exceeded", 429, true, requestId);
    this.retryAfter = retryAfter;
  }
}

/**
 * Database error for data layer failures
 *
 * USE CASES:
 * - Connection failure
 * - Query timeout
 * - Constraint violation
 * - Deadlock detection
 *
 * ALWAYS HTTP 500 (Internal Server Error)
 *
 * SECURITY:
 * - Query details hidden from client
 * - Full details in server logs only
 *
 * @class DatabaseError
 * @extends AppError
 *
 * @example
 * ```typescript
 * // Connection failure
 * try {
 *   await db.connect();
 * } catch (err) {
 *   throw new DatabaseError(
 *     'Failed to connect to database',
 *     'connect',
 *     undefined,
 *     requestId
 *   );
 * }
 *
 * // Query error
 * try {
 *   await db.query(sql, params);
 * } catch (err) {
 *   throw new DatabaseError(
 *     'Query execution failed',
 *     'query',
 *     sql,  // Logged but not sent to client
 *     requestId
 *   );
 * }
 * ```
 */
export class DatabaseError extends AppError {
  /**
   * SQL query that failed (if applicable)
   * SECURITY: Not included in client response
   * @public
   * @readonly
   * @type {string | undefined}
   */
  public readonly query?: string;

  /**
   * Database operation type
   * Examples: 'connect', 'query', 'transaction', 'migration'
   * @public
   * @readonly
   * @type {string}
   */
  public readonly operation: string;

  /**
   * Create a database error
   *
   * @param {string} message - Error description
   * @param {string} operation - Type of operation that failed
   * @param {string} query - Optional SQL query (not sent to client)
   * @param {string} requestId - Optional request ID
   */
  constructor(
    message: string,
    operation: string,
    query?: string,
    requestId?: string,
  ) {
    // Always 500 Internal Server Error, always operational (expected in distributed systems)
    super(message, 500, true, requestId);
    this.operation = operation;
    this.query = query;
  }
}

// ================================================================================
// 🛡️ MAIN ERROR HANDLER CLASS
// ================================================================================

/**
 * Global error handler with analytics and reporting
 *
 * RESPONSIBILITY:
 * ---------------
 * - Track error statistics (counts, types, trends)
 * - Handle uncaught exceptions and promise rejections
 * - Log errors to files and external services
 * - Provide error analytics and insights
 *
 * DESIGN PRINCIPLES:
 * ------------------
 * - Static class (singleton pattern)
 * - Shared state across all requests
 * - Thread-safe (JavaScript is single-threaded)
 * - Graceful degradation (logging failures don't crash app)
 *
 * MEMORY MANAGEMENT:
 * ------------------
 * - Error counts: Map grows with unique error types (~5-20 entries typical)
 * - Recent errors: Fixed at 100 entries (circular buffer)
 * - Typical footprint: ~5-8KB
 *
 * @class ErrorHandler
 * @static
 *
 * @example
 * ```typescript
 * // Setup global error handlers
 * globalThis.addEventListener('error', (event) => {
 *   ErrorHandler.handleUncaughtError(event.error, 'production');
 * });
 *
 * globalThis.addEventListener('unhandledrejection', (event) => {
 *   ErrorHandler.handleUnhandledRejection(event.reason);
 * });
 *
 * // Get error statistics
 * const stats = ErrorHandler.getErrorStats();
 * console.log(`Total errors: ${stats.totalErrors}`);
 * ```
 */
export class ErrorHandler {
  /**
   * Count of errors by type
   *
   * KEY: Error class name (e.g., "ValidationError")
   * VALUE: Number of times this error occurred
   *
   * Example:
   * Map {
   *   "ValidationError" => 45,
   *   "AuthenticationError" => 12,
   *   "DatabaseError" => 3
   * }
   *
   * @private
   * @static
   * @type {Map<string, number>}
   */
  private static errorCounts = new Map<string, number>();

  /**
   * Circular buffer of recent errors
   *
   * CIRCULAR BUFFER STRATEGY:
   * - Push new errors to end
   * - When length > 100, shift() removes oldest
   * - Maintains fixed memory footprint
   *
   * Used for:
   * - Error trend analysis
   * - Debugging recent issues
   * - Pattern detection
   *
   * @private
   * @static
   * @type {Array}
   */
  private static recentErrors: Array<{
    error: string;
    timestamp: number;
    requestId?: string;
    ip?: string;
  }> = [];

  // ============================================================================
  // GLOBAL ERROR HANDLERS
  // ============================================================================

  /**
   * Handle uncaught exceptions (global errors)
   *
   * WHEN THIS IS CALLED:
   * - Unhandled errors in async code
   * - Errors in event handlers
   * - Errors in timers (setTimeout, setInterval)
   * - Synchronous code that throws without try-catch
   *
   * BEHAVIOR:
   * 1. Log error to console with stack trace
   * 2. Track error in analytics
   * 3. Write to log file in production
   * 4. Send to monitoring service if configured
   * 5. Exit process (uncaught exceptions are fatal)
   *
   * WHY EXIT?
   * - Uncaught exceptions leave application in unknown state
   * - Continuing may cause data corruption or security issues
   * - Better to crash and restart cleanly
   * - Process manager (systemd, PM2) will restart automatically
   *
   * @public
   * @static
   * @async
   * @param {Error} error - The uncaught error
   * @param {string} environment - Runtime environment
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * // Setup in main.ts
   * globalThis.addEventListener('error', (event) => {
   *   event.preventDefault(); // Prevent default handler
   *   ErrorHandler.handleUncaughtError(event.error, Deno.env.get('ENV') || 'production');
   * });
   * ```
   */
  static async handleUncaughtError(
    error: Error,
    environment: string,
  ): Promise<void> {
    // Log to console immediately (most reliable)
    ConsoleStyler.logError("Uncaught Exception", { message: error.message, stack: error.stack });

    // Track error for analytics
    // Continue even if this fails
    try {
      this.trackError(error);
    } catch {
      // Ignore tracking failures
    }

    // Log to file in production
    // File logging is important for post-mortem analysis
    if (environment === "production") {
      try {
        await this.logErrorToFile(error, "UNCAUGHT_EXCEPTION");
      } catch (logError: any) {
        // Log failure to log is bad, but not fatal
        ConsoleStyler.logError("Failed to log uncaught exception", { error: logError.message });
      }
    }

    // Send to external monitoring service
    // Best-effort, don't wait for completion
    try {
      await this.reportError(error, {
        type: "uncaught_exception",
        environment,
      });
    } catch {
      // Ignore reporting failures
    }

    // Announce graceful shutdown
    ConsoleStyler.logInfo("Initiating graceful shutdown due to uncaught exception...");

    // TODO: In production, you might want to:
    // 1. Close database connections
    // 2. Finish in-flight requests (with timeout)
    // 3. Notify monitoring service
    // 4. Wait for process manager to restart

    // Exit with error code
    // Process manager (systemd, PM2) will restart the process
    Deno.exit(1);
  }

  /**
   * Handle unhandled promise rejections
   *
   * WHEN THIS IS CALLED:
   * - Promise rejection without .catch() handler
   * - await in async function without try-catch
   * - throw in Promise executor function
   *
   * BEHAVIOR:
   * 1. Convert reason to Error if needed
   * 2. Log to console
   * 3. Track error in analytics
   * 4. Write to log file
   * 5. Send to monitoring service
   * 6. Continue running (less severe than uncaught exceptions)
   *
   * WHY NOT EXIT?
   * - Promise rejections are more isolated than uncaught exceptions
   * - Application state may still be valid
   * - Modern practice is to log and continue
   * - Can be promoted to fatal if desired
   *
   * @public
   * @static
   * @async
   * @param {any} reason - Rejection reason (might not be Error)
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * // Setup in main.ts
   * globalThis.addEventListener('unhandledrejection', (event) => {
   *   event.preventDefault(); // Prevent default handler
   *   ErrorHandler.handleUnhandledRejection(event.reason);
   * });
   * ```
   */
  static async handleUnhandledRejection(reason: any): Promise<void> {
    // Normalize reason to Error object
    // Promise rejections can be anything (string, number, object)
    const error = reason instanceof Error ? reason : new Error(String(reason));

    // Log to console
    ConsoleStyler.logError("Unhandled Promise Rejection", { message: error.message });

    // Track error for analytics
    try {
      this.trackError(error);
    } catch {
      // Ignore tracking failures
    }

    // Log to file (but don't exit)
    // Rejections are less critical than uncaught exceptions
    try {
      await this.logErrorToFile(error, "UNHANDLED_REJECTION");
    } catch (logError: any) {
      ConsoleStyler.logError("Failed to log unhandled rejection", { error: logError.message });
    }

    // Report to monitoring service
    try {
      await this.reportError(error, { type: "unhandled_rejection" });
    } catch {
      // Ignore reporting failures
    }
  }

  // ============================================================================
  // PRIVATE UTILITY METHODS
  // ============================================================================

  /**
   * Track error in analytics
   *
   * WHAT IT DOES:
   * 1. Increment count for this error type
   * 2. Add to recent errors circular buffer
   * 3. Enforce buffer size limit (100 max)
   *
   * THREAD SAFETY:
   * - All operations are synchronous
   * - Map and Array operations are atomic
   * - Safe to call from any async context
   *
   * @private
   * @static
   * @param {Error} error - Error to track
   * @returns {void}
   */
  private static trackError(error: Error): void {
    // Get error type (class name)
    const errorType = error.constructor.name;

    // Increment count for this error type
    // Map.get() returns undefined if key doesn't exist
    // The || operator provides default value of 0
    const current = this.errorCounts.get(errorType) || 0;
    this.errorCounts.set(errorType, current + 1);

    // Add to recent errors buffer (circular buffer pattern)
    this.recentErrors.push({
      error: error.message,
      timestamp: Date.now(),
      requestId: (error as any).requestId, // May not exist, that's OK
      ip: "global", // Global errors don't have request context
    });

    // Enforce buffer size limit
    // Keep only last 100 errors
    if (this.recentErrors.length > 100) {
      this.recentErrors.shift(); // Remove oldest
    }
  }

  /**
   * Write error to log file with structured format
   *
   * LOG FORMAT:
   * - One error per line (makes parsing easier)
   * - JSON format for structured logging
   * - Includes timestamp, type, message, stack trace
   * - AppError metadata included if available
   *
   * FILE LOCATIONS:
   * - ./logs/errors.log - All errors
   * - Rotated by external tool (logrotate)
   *
   * ERROR HANDLING:
   * - Creates logs directory if missing
   * - Fails gracefully (logs to console instead)
   * - Never throws (logging errors shouldn't crash app)
   *
   * @private
   * @static
   * @async
   * @param {Error} error - Error to log
   * @param {string} type - Error category (UNCAUGHT_EXCEPTION, UNHANDLED_REJECTION, etc.)
   * @returns {Promise<void>}
   */
  private static async logErrorToFile(
    error: Error,
    type: string,
  ): Promise<void> {
    try {
      // Ensure logs directory exists
      // recursive: true = create parent directories if needed
      await Deno.mkdir("./logs", { recursive: true });

      // Build structured log entry
      const errorLog = {
        timestamp: new Date().toISOString(),
        type,
        name: error.name,
        message: error.message,
        stack: error.stack,

        // Include AppError metadata if available
        // Spread operator only includes properties if error is AppError
        ...(error instanceof AppError && {
          statusCode: error.statusCode,
          isOperational: error.isOperational,
          requestId: error.requestId,
        }),
      };

      // Serialize to JSON and add newline
      // Each log entry is one line (makes grepping easier)
      const logEntry = JSON.stringify(errorLog) + "\n";

      // Append to log file
      // append: true = don't overwrite existing content
      await Deno.writeTextFile("./logs/errors.log", logEntry, { append: true });
    } catch (fileError: any) {
      // Logging failure is not fatal
      // Fall back to console logging
      ConsoleStyler.logError("Failed to write error log", { error: fileError.message });
    }
  }

  /**
   * Report error to external monitoring service
   *
   * MONITORING SERVICES:
   * - Sentry: Error tracking and performance monitoring
   * - DataDog: Application performance monitoring
   * - New Relic: Full-stack observability
   * - Custom: Your own error aggregation service
   *
   * CONFIGURATION:
   * - Requires ERROR_REPORTING_URL environment variable
   * - Optional: ERROR_REPORTING_API_KEY for authentication
   *
   * BEHAVIOR:
   * - Best-effort delivery (fire and forget)
   * - Failures don't crash application
   * - Logs attempt for debugging
   *
   * IMPLEMENTATION NOTE:
   * This is a placeholder. In production, integrate with:
   * - Sentry SDK: import * as Sentry from "@sentry/deno"
   * - DataDog API: HTTP POST to DataDog endpoint
   * - Custom service: HTTP POST to your endpoint
   *
   * @private
   * @static
   * @async
   * @param {Error} error - Error to report
   * @param {any} context - Additional context (environment, request info, etc.)
   * @returns {Promise<void>}
   *
   * @example
   * ```typescript
   * // Sentry integration example:
   * private static async reportError(error: Error, context: any): Promise<void> {
   *   try {
   *     Sentry.captureException(error, {
   *       tags: {
   *         environment: context.environment,
   *         type: context.type
   *       },
   *       extra: context
   *     });
   *   } catch {
   *     console.error('Failed to report error to Sentry');
   *   }
   * }
   * ```
   */
  private static async reportError(error: Error, context: any): Promise<void> {
    try {
      // Check if error reporting is configured
      const reportingUrl = Deno.env.get("ERROR_REPORTING_URL");

      if (reportingUrl) {
        // TODO: Implement actual reporting
        // For now, just log that we would report
        ConsoleStyler.logInfo("Error reported to monitoring service");

        // Real implementation would look like:
        // await fetch(reportingUrl, {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //     'Authorization': `Bearer ${Deno.env.get('ERROR_REPORTING_API_KEY')}`
        //   },
        //   body: JSON.stringify({
        //     error: {
        //       name: error.name,
        //       message: error.message,
        //       stack: error.stack
        //     },
        //     context,
        //     timestamp: new Date().toISOString()
        //   })
        // });
      }
    } catch (reportError: any) {
      // Reporting failure is not fatal
      ConsoleStyler.logError("Failed to report error to monitoring service", {
        error: reportError.message,
      });
    }
  }

  // ============================================================================
  // PUBLIC API - STATISTICS AND ANALYTICS
  // ============================================================================

  /**
   * Get comprehensive error statistics
   *
   * WHAT IT RETURNS:
   * - Total error count (all time)
   * - Recent errors (last 24 hours)
   * - Error types breakdown
   * - Top 5 most common errors
   * - Sample of recent errors
   *
   * USE CASES:
   * - Health dashboards
   * - Monitoring alerts
   * - Trend analysis
   * - Capacity planning
   *
   * PERFORMANCE:
   * - Fast retrieval (O(n) where n = error type count)
   * - Sorting is O(n log n) but n is typically small (5-20)
   * - Typical execution time: <1ms
   *
   * @public
   * @static
   * @returns {Object} Error statistics
   *
   * @example
   * ```typescript
   * const stats = ErrorHandler.getErrorStats();
   *
   * console.log(`Total Errors: ${stats.totalErrors}`);
   * console.log(`Recent Errors (24h): ${stats.recentErrors}`);
   *
   * console.log('Top Errors:');
   * stats.topErrors.forEach(({ type, count }) => {
   *   console.log(`  ${type}: ${count}`);
   * });
   * ```
   */
  static getErrorStats() {
    // -------------------------------------------------------------------------
    // CALCULATE TOTAL ERRORS
    // -------------------------------------------------------------------------

    // Sum all error counts
    // Array.from() converts Map values to array
    // reduce() sums the values
    const totalErrors = Array.from(this.errorCounts.values()).reduce(
      (a, b) => a + b,
      0,
    );

    // -------------------------------------------------------------------------
    // CALCULATE RECENT ERRORS (Last 24 Hours)
    // -------------------------------------------------------------------------

    // Calculate cutoff timestamp
    // Current time - 24 hours (in milliseconds)
    const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);

    // Count errors newer than cutoff
    const recentErrorsCount = this.recentErrors.filter(
      (e) => e.timestamp > twentyFourHoursAgo,
    ).length;

    // -------------------------------------------------------------------------
    // BUILD STATISTICS OBJECT
    // -------------------------------------------------------------------------

    return {
      // Aggregate counts
      totalErrors,
      recentErrors: recentErrorsCount,

      // Error types breakdown
      // Convert Map to object for JSON serialization
      errorTypes: Object.fromEntries(this.errorCounts),

      // Top 5 most common errors
      topErrors: Array.from(this.errorCounts.entries())
        .sort(([, a], [, b]) => b - a) // Sort by count descending
        .slice(0, 5) // Take top 5
        .map(([type, count]) => ({ type, count })),

      // Sample of recent errors (last 10)
      recentErrorSample: this.recentErrors.slice(-10),

      // Timestamp when stats were collected
      timestamp: new Date().toISOString(),
    };
  }
}

// ================================================================================
// 🔄 ERROR MIDDLEWARE FACTORY
// ================================================================================

/**
 * Create Oak middleware for error handling
 *
 * MIDDLEWARE PATTERN:
 * This is an "error boundary" middleware that:
 * 1. Wraps all other middleware in try-catch
 * 2. Catches ANY error from downstream middleware
 * 3. Transforms error into proper HTTP response
 * 4. Logs error appropriately
 * 5. Updates error analytics
 *
 * PLACEMENT IN MIDDLEWARE STACK:
 * Should be added LAST (after all other middleware)
 * This ensures it catches errors from all other middleware
 *
 * ```typescript
 * app.use(corsMiddleware);        // First
 * app.use(loggingMiddleware);
 * app.use(performanceMiddleware);
 * app.use(authMiddleware);
 * app.use(router);
 * app.use(createErrorMiddleware(config)); // LAST!
 * ```
 *
 * WHAT IT DOES:
 * 1. Try to execute next middleware
 * 2. If error occurs, catch it
 * 3. Log error (console and/or file)
 * 4. Update error analytics
 * 5. Determine appropriate HTTP status code
 * 6. Sanitize error message (if configured)
 * 7. Send JSON error response
 * 8. Report critical errors to monitoring
 *
 * @public
 * @param {ErrorConfig} config - Error handling configuration
 * @returns {Function} Oak middleware function
 *
 * @example
 * ```typescript
 * import { Application } from "https://deno.land/x/oak@v12.6.1/mod.ts";
 * import { createErrorMiddleware, ErrorHandlerPresets } from "./middleware/errorHandler.ts";
 *
 * const app = new Application();
 *
 * // Add your routes and middleware
 * app.use(router.routes());
 *
 * // Add error middleware LAST
 * app.use(createErrorMiddleware(ErrorHandlerPresets.DEVELOPMENT));
 * ```
 */
export function createErrorMiddleware(config: ErrorConfig) {
  // Return the actual middleware function
  return async (
    ctx: Context,
    next: () => Promise<Response>,
  ): Promise<Response> => {
    try {
      // Try to execute next middleware/route handler
      const result = await next();
      return result ?? finalizeResponse(ctx);
    } catch (error) {
      // Catch ANY error from downstream
      return await handleRequestError(ctx, error, config);
    }
  };
}

/**
 * Handle errors that occur during HTTP request processing
 *
 * THIS IS THE CORE ERROR HANDLING LOGIC
 *
 * EXECUTION FLOW:
 * 1. Extract request metadata (ID, IP)
 * 2. Normalize error to Error instance
 * 3. Log error (if configured)
 * 4. Update error analytics
 * 5. Determine HTTP status and message
 * 6. Build error response object
 * 7. Add context (request info, stack trace)
 * 8. Set response headers and body
 * 9. Report critical errors
 *
 * SECURITY CONSIDERATIONS:
 * - Stack traces only in development
 * - Error messages sanitized in production
 * - Sensitive request headers redacted
 * - Database queries hidden from client
 * - User data removed from error responses
 *
 * @private
 * @async
 * @param {any} ctx - Context object
 * @param {any} error - The caught error
 * @param {ErrorConfig} config - Error handling configuration
 * @returns {Promise<Response>}
 */
async function handleRequestError(
  ctx: Context,
  error: any,
  config: ErrorConfig,
): Promise<Response> {
  // ===========================================================================
  // 1. EXTRACT REQUEST METADATA
  // ===========================================================================

  // Get request ID (set by performance middleware or generate default)
  const requestId = typeof ctx.state.requestId === "string"
    ? ctx.state.requestId
    : "unknown";

  // Get client IP address (may not exist in all environments)
  let ip = "unknown";

  try {
    // Try headers first — these are the most reliable in proxy setups
    ip = ctx.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      ctx.request.headers.get("x-real-ip") ??
      "unknown";
  } catch {
    // Fallback to unknown
    ip = "unknown";
  }

  // ===========================================================================
  // 2. NORMALIZE ERROR
  // ===========================================================================

  // Ensure error is an Error instance
  // Sometimes errors are strings or objects
  const err = error instanceof Error ? error : new Error(String(error));

  // ===========================================================================
  // 3. LOG ERROR
  // ===========================================================================

  if (config.logErrors) {
    // Console logging
    const logData: any = { message: err.message, requestId };

    // Stack trace only in development
    if (config.showStackTrace && config.environment === "development") {
      logData.stack = err.stack;
    }

    ConsoleStyler.logError("Request Error", logData);
  }

  // ===========================================================================
  // 4. FILE LOGGING
  // ===========================================================================

  if (config.logToFile) {
    try {
      await logRequestErrorToFile(err, ctx, requestId);
    } catch (logError: any) {
      ConsoleStyler.logError("Failed to log request error", { error: logError.message });
    }
  }

  // ===========================================================================
  // 5. UPDATE ANALYTICS
  // ===========================================================================

  // Track error in global statistics
  ErrorHandler["trackError"](err);

  // Add to recent errors with request context
  ErrorHandler["recentErrors"].push({
    error: err.message,
    timestamp: Date.now(),
    requestId,
    ip,
  });

  // ===========================================================================
  // 6. DETERMINE RESPONSE
  // ===========================================================================

  // Get appropriate status code and message based on error type
  const { status, message, details } = determineErrorResponse(err, config);

  // ===========================================================================
  // 7. BUILD ERROR RESPONSE
  // ===========================================================================

  // Build base error response
  const errorResponse: any = {
    error: {
      message,
      type: err.name,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  // ===========================================================================
  // 8. ADD OPTIONAL CONTEXT
  // ===========================================================================

  // Include request information if configured
  if (config.includeRequestInfo) {
    errorResponse.request = {
      method: ctx.request.method,
      path: ctx.url?.pathname || new URL(ctx.request.url).pathname,
      // Truncate user agent to prevent huge responses
      userAgent: ctx.request.headers.get("User-Agent")?.slice(0, 100),
    };
  }

  // Include stack trace in development
  if (config.showStackTrace && config.environment === "development") {
    errorResponse.error.stack = err.stack;
  }

  // Add error-specific details
  if (details) {
    errorResponse.error.details = details;
  }

  // ===========================================================================
  // 9. SPECIAL ERROR TYPE HANDLING
  // ===========================================================================

  // Build response headers
  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  // Rate limiting: Add Retry-After header
  if (err instanceof RateLimitError) {
    headers.set("Retry-After", String(err.retryAfter));
    errorResponse.retryAfter = err.retryAfter;
  }

  // Validation errors: Add field details
  if (err instanceof ValidationError) {
    errorResponse.validation = {
      field: err.field,
      // Redact actual value in production (security)
      value: config.sanitizeErrors ? "[REDACTED]" : err.value,
    };
  }

  // ===========================================================================
  // 10. REPORT CRITICAL ERRORS
  // ===========================================================================

  // Report server errors (5xx) to monitoring service
  if (status >= 500) {
    await ErrorHandler["reportError"](err, {
      type: "request_error",
      requestId,
      ip,
      method: ctx.request.method,
      path: ctx.url?.pathname || new URL(ctx.request.url).pathname,
    });
  }

  // ===========================================================================
  // 11. RETURN RESPONSE
  // ===========================================================================

  return new Response(
    JSON.stringify(errorResponse),
    {
      status,
      headers,
    },
  );
}

/**
 * Log request error to file with full context
 *
 * LOG FORMAT:
 * - JSON per line (structured logging)
 * - Includes error details
 * - Includes request context (method, URL, headers)
 * - Includes AppError metadata if available
 *
 * SECURITY:
 * - Sensitive headers redacted (Authorization, Cookie)
 * - Headers truncated to 200 chars
 * - Database queries included (for debugging, not sent to client)
 *
 * FILE LOCATION:
 * - ./logs/requests.log
 *
 * @private
 * @async
 * @param {Error} error - The error to log
 * @param {any} ctx - Oak context
 * @param {string} requestId - Request ID
 * @returns {Promise<void>}
 */
async function logRequestErrorToFile(
  error: Error,
  ctx: any,
  requestId: string,
): Promise<void> {
  try {
    // Ensure logs directory exists
    await Deno.mkdir("./logs", { recursive: true });

    // Build structured log entry
    const errorLog = {
      timestamp: new Date().toISOString(),
      type: "REQUEST_ERROR",
      requestId,

      // Error details
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },

      // Request context
      request: {
        method: ctx.request.method,
        url: ctx.url?.pathname || new URL(ctx.request.url).pathname,
        userAgent: ctx.request.headers.get("User-Agent"),
        ip: ctx.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          ctx.request.headers.get("x-real-ip") ??
          "unknown",
        headers: sanitizeHeaders(ctx.request.headers),
      },

      // AppError metadata (if available)
      ...(error instanceof AppError && {
        statusCode: error.statusCode,
        isOperational: error.isOperational,
      }),
    };

    // Write to log file
    const logEntry = JSON.stringify(errorLog) + "\n";
    await Deno.writeTextFile("./logs/requests.log", logEntry, { append: true });
  } catch (fileError: any) {
    ConsoleStyler.logError("Failed to write request error log", { error: fileError.message });
  }
}

/**
 * Determine appropriate HTTP response based on error type
 *
 * RESPONSE DETERMINATION STRATEGY:
 * 1. Check for custom error messages in config
 * 2. Handle AppError subclasses (use their status codes)
 * 3. Handle common Deno errors
 * 4. Handle database-related errors
 * 5. Default to 500 Internal Server Error
 *
 * SECURITY CONSIDERATIONS:
 * - Sanitize error messages in production (if configured)
 * - Generic messages for 5xx errors
 * - Don't leak implementation details
 * - Hide database queries and connection strings
 *
 * @private
 * @param {Error} error - The error to analyze
 * @param {ErrorConfig} config - Error handling configuration
 * @returns {Object} Response details (status, message, details)
 *
 * @example
 * ```typescript
 * // ValidationError → 400
 * const { status, message } = determineErrorResponse(
 *   new ValidationError('Invalid email', 'email', 'not-an-email'),
 *   config
 * );
 * // status: 400, message: 'Invalid email'
 *
 * // Generic Error → 500
 * const { status, message } = determineErrorResponse(
 *   new Error('Something broke'),
 *   { sanitizeErrors: true }
 * );
 * // status: 500, message: 'Internal server error' (sanitized)
 * ```
 */
function determineErrorResponse(error: Error, config: ErrorConfig): {
  status: number;
  message: string;
  details?: any;
} {
  // ===========================================================================
  // 1. CHECK CUSTOM ERROR MESSAGES
  // ===========================================================================

  // Allow configuration to override default messages
  if (config.customErrorMessages && config.customErrorMessages[error.name]) {
    return {
      status: error instanceof AppError ? error.statusCode : 500,
      message: config.customErrorMessages[error.name],
    };
  }

  // ===========================================================================
  // 2. HANDLE AppError SUBCLASSES
  // ===========================================================================

  if (error instanceof AppError) {
    // Use status code from error
    // Sanitize message for 5xx errors in production
    const shouldSanitize = config.sanitizeErrors && error.statusCode >= 500;

    return {
      status: error.statusCode,
      message: shouldSanitize ? "Internal server error" : error.message,
      details: error instanceof ValidationError
        ? {
          field: error.field,
          value: config.sanitizeErrors ? "[REDACTED]" : error.value,
        }
        : undefined,
    };
  }

  // ===========================================================================
  // 3. HANDLE COMMON DENO ERRORS
  // ===========================================================================

  // File/resource not found
  if (error.name === "NotFound") {
    return { status: 404, message: "Resource not found" };
  }

  // Permission denied (file system, network)
  if (error.name === "PermissionDenied") {
    return { status: 403, message: "Permission denied" };
  }

  // Network connection refused
  if (error.name === "ConnectionRefused") {
    return { status: 503, message: "Service temporarily unavailable" };
  }

  // Request timeout
  if (error.name === "TimedOut") {
    return { status: 408, message: "Request timeout" };
  }

  // ===========================================================================
  // 4. HANDLE DATABASE ERRORS
  // ===========================================================================

  // Detect database-related errors by message content
  if (
    error.message.includes("database") || error.message.includes("connection")
  ) {
    return {
      status: 503,
      message: config.sanitizeErrors
        ? "Service temporarily unavailable"
        : "Database connection error",
    };
  }

  // ===========================================================================
  // 5. DEFAULT: INTERNAL SERVER ERROR
  // ===========================================================================

  return {
    status: 500,
    message: config.sanitizeErrors || config.environment === "production"
      ? "Internal server error" // Generic message in production
      : error.message, // Actual message in development
  };
}

/**
 * Sanitize request headers for safe logging
 *
 * SECURITY STRATEGY:
 * - Redact sensitive authentication headers
 * - Truncate long header values
 * - Preserve useful debugging information
 *
 * SENSITIVE HEADERS (Redacted):
 * - Authorization (Bearer tokens, Basic auth)
 * - Cookie (Session IDs, auth tokens)
 * - X-API-Key (API keys)
 * - X-Auth-Token (Custom auth tokens)
 * - X-Access-Token (OAuth tokens)
 *
 * @private
 * @param {Headers} headers - Request headers
 * @returns {Record<string, string>} Sanitized headers object
 *
 * @example
 * ```typescript
 * const headers = new Headers({
 *   'Authorization': 'Bearer secret-token-here',
 *   'User-Agent': 'Mozilla/5.0...',
 *   'Content-Type': 'application/json'
 * });
 *
 * const sanitized = sanitizeHeaders(headers);
 * // {
 * //   'Authorization': '[REDACTED]',
 * //   'User-Agent': 'Mozilla/5.0...',
 * //   'Content-Type': 'application/json'
 * // }
 * ```
 */
function sanitizeHeaders(headers: Headers): Record<string, string> {
  // List of sensitive header names (case-insensitive)
  const sensitiveHeaders = new Set([
    "authorization",
    "cookie",
    "x-api-key",
    "x-auth-token",
    "x-access-token",
  ]);

  const result: Record<string, string> = {};

  // Iterate over all headers
  for (const [key, value] of headers.entries()) {
    // Check if header is sensitive
    if (sensitiveHeaders.has(key.toLowerCase())) {
      // Redact sensitive values
      result[key] = "[REDACTED]";
    } else {
      // Keep non-sensitive headers but truncate if too long
      // Prevents huge log entries from giant headers
      result[key] = value.length > 200
        ? value.substring(0, 200) + "..."
        : value;
    }
  }

  return result;
}

// ================================================================================
// 🔍 ERROR ANALYTICS
// ================================================================================

/**
 * Error pattern analysis and insights generation
 *
 * ANALYTICS CAPABILITIES:
 * - Error rate analysis (high/normal/low)
 * - Error type patterns (auth, validation, database)
 * - Trend detection (increasing/stable/decreasing)
 * - Actionable recommendations
 *
 * USE CASES:
 * - Health dashboards
 * - Alerting systems
 * - Performance optimization
 * - Capacity planning
 *
 * @class ErrorAnalytics
 * @static
 *
 * @example
 * ```typescript
 * const analysis = ErrorAnalytics.analyzeErrorPatterns();
 *
 * if (analysis.insights.length > 0) {
 *   console.log('⚠️ Error issues detected:');
 *   analysis.insights.forEach(insight => {
 *     console.log(`[${insight.severity}] ${insight.message}`);
 *     console.log(`Recommendation: ${insight.recommendation}`);
 *   });
 * }
 * ```
 */
export class ErrorAnalytics {
  /**
   * Analyze error patterns and generate insights
   *
   * ANALYSIS ALGORITHMS:
   * 1. High Error Rate Detection (>50 errors/24h)
   * 2. Authentication Pattern Analysis (>30% auth errors)
   * 3. Validation Pattern Analysis (>40% validation errors)
   * 4. Database Issues Detection (any database errors)
   *
   * THRESHOLDS:
   * - High error rate: 50+ errors in 24 hours
   * - High auth error rate: >30% of total errors
   * - High validation error rate: >40% of total errors
   * - Database issues: ANY database errors (should be zero)
   *
   * @public
   * @static
   * @returns {Object} Analysis results with insights and recommendations
   */
  static analyzeErrorPatterns() {
    // Get current error statistics
    const stats = ErrorHandler.getErrorStats();

    // Accumulator for insights
    const insights = [];

    // =========================================================================
    // ANALYSIS 1: HIGH ERROR RATE
    // =========================================================================

    // Threshold: 50 errors in 24 hours
    // Indicates systematic issues or increased traffic
    if (stats.recentErrors > 50) {
      insights.push({
        type: "high_error_rate",
        severity: "high",
        message:
          `High error rate: ${stats.recentErrors} errors in the last 24 hours`,
        recommendation: "Investigate error patterns and implement fixes",
      });
    }

    // =========================================================================
    // ANALYSIS 2: ERROR TYPE PATTERNS
    // =========================================================================

    // Extract counts for specific error types
    const authErrors = stats.errorTypes["AuthenticationError"] || 0;
    const validationErrors = stats.errorTypes["ValidationError"] || 0;
    const dbErrors = stats.errorTypes["DatabaseError"] || 0;

    // Authentication pattern (>30% of errors)
    // May indicate brute force attacks or auth system issues
    if (authErrors > stats.totalErrors * 0.3) {
      insights.push({
        type: "auth_issues",
        severity: "medium",
        message: "High rate of authentication errors",
        recommendation: "Review authentication flow and user guidance",
      });
    }

    // Validation pattern (>40% of errors)
    // Indicates poor user experience or unclear requirements
    if (validationErrors > stats.totalErrors * 0.4) {
      insights.push({
        type: "validation_issues",
        severity: "medium",
        message: "High rate of validation errors",
        recommendation: "Improve input validation and user feedback",
      });
    }

    // Database errors (ANY occurrences)
    // Database errors should be rare in healthy systems
    if (dbErrors > 0) {
      insights.push({
        type: "database_issues",
        severity: "high",
        message: "Database errors detected",
        recommendation: "Check database connectivity and performance",
      });
    }

    return {
      stats,
      insights,
      recommendations: this.generateRecommendations(stats),
    };
  }

  /**
   * Generate actionable recommendations based on error statistics
   *
   * RECOMMENDATION CATEGORIES:
   * - Monitoring: Set up alerts and tracking
   * - Performance: Optimize slow or failing operations
   * - Security: Address authentication and authorization issues
   *
   * PRIORITY LEVELS:
   * - high: Immediate action required
   * - medium: Should be addressed soon
   * - low: Nice to have
   *
   * @private
   * @static
   * @param {any} stats - Error statistics object
   * @returns {Array} List of recommendations
   */
  private static generateRecommendations(stats: any) {
    const recommendations = [];

    // =========================================================================
    // RECOMMENDATION 1: ERROR MONITORING
    // =========================================================================

    // If seeing significant errors, implement alerting
    if (stats.totalErrors > 100) {
      recommendations.push({
        category: "monitoring",
        priority: "medium",
        action: "Implement error rate alerting",
        description: "Set up alerts when error rates exceed normal thresholds",
      });
    }

    // =========================================================================
    // RECOMMENDATION 2: PERFORMANCE OPTIMIZATION
    // =========================================================================

    // Timeout errors indicate performance issues
    const timeoutErrors = stats.errorTypes["TimedOut"] || 0;
    if (timeoutErrors > 5) {
      recommendations.push({
        category: "performance",
        priority: "high",
        action: "Optimize request timeouts",
        description: "Review and optimize slow operations causing timeouts",
      });
    }

    // =========================================================================
    // RECOMMENDATION 3: SECURITY REVIEW
    // =========================================================================

    // High auth error rates may indicate:
    // - Brute force attacks
    // - Confusing authentication flow
    // - Expired credentials not being refreshed
    const authErrors = (stats.errorTypes["AuthenticationError"] || 0) +
      (stats.errorTypes["AuthorizationError"] || 0);
    if (authErrors > 20) {
      recommendations.push({
        category: "security",
        priority: "high",
        action: "Review authentication security",
        description: "High auth error rates may indicate security issues",
      });
    }

    return recommendations;
  }
}

// ================================================================================
// 🎯 ERROR HANDLER PRESETS
// ================================================================================

/**
 * Pre-configured error handling setups for common scenarios
 *
 * PHILOSOPHY:
 * - Convention over configuration
 * - Safe defaults for each environment
 * - Easy to customize after selecting preset
 *
 * AVAILABLE PRESETS:
 * - DEVELOPMENT: Verbose, show everything
 * - PRODUCTION: Secure, hide internals
 * - MINIMAL: Quiet, log to file only
 *
 * @example
 * ```typescript
 * // Use as-is
 * app.use(createErrorMiddleware(ErrorHandlerPresets.DEVELOPMENT));
 *
 * // Customize after selection
 * const config = {
 *   ...ErrorHandlerPresets.PRODUCTION,
 *   customErrorMessages: {
 *     'ValidationError': 'Oops! Check your input'
 *   }
 * };
 * app.use(createErrorMiddleware(config));
 * ```
 */
export const ErrorHandlerPresets = {
  /**
   * Development preset: Maximum visibility for debugging
   *
   * CHARACTERISTICS:
   * - Console logging enabled
   * - No file logging (faster development)
   * - Stack traces visible
   * - Full request information
   * - No sanitization (see actual errors)
   * - No external reporting (avoid noise)
   */
  DEVELOPMENT: {
    environment: "development",
    logErrors: true,
    logToFile: false,
    showStackTrace: true,
    includeRequestInfo: true,
    sanitizeErrors: false,
    enableErrorReporting: false,
    customErrorMessages: {},
  } as ErrorConfig,

  /**
   * Production preset: Secure and reliable
   *
   * CHARACTERISTICS:
   * - Console logging enabled (for container logs)
   * - File logging enabled (for analysis)
   * - No stack traces (security)
   * - No request info (privacy)
   * - Sanitized errors (don't leak internals)
   * - External reporting enabled (monitoring)
   * - Custom messages (user-friendly)
   */
  PRODUCTION: {
    environment: "production",
    logErrors: true,
    logToFile: true,
    showStackTrace: false,
    includeRequestInfo: false,
    sanitizeErrors: true,
    enableErrorReporting: true,
    customErrorMessages: {
      "DatabaseError": "Service temporarily unavailable",
      "ValidationError": "Invalid request data",
      "AuthenticationError": "Authentication required",
      "AuthorizationError": "Access denied",
    },
  } as ErrorConfig,

  /**
   * Minimal preset: Quiet operation
   *
   * CHARACTERISTICS:
   * - No console logging (quiet)
   * - File logging only (for audit trail)
   * - No stack traces
   * - No request info
   * - Sanitized errors
   * - No external reporting
   *
   * USE CASES:
   * - Background workers
   * - Batch processing
   * - Embedded systems
   */
  MINIMAL: {
    environment: "minimal",
    logErrors: false,
    logToFile: true,
    showStackTrace: false,
    includeRequestInfo: false,
    sanitizeErrors: true,
    enableErrorReporting: false,
    customErrorMessages: {},
  } as ErrorConfig,
};

// ================================================================================
// 🛠️ ERROR UTILITIES
// ================================================================================

/**
 * Utility functions for error handling
 *
 * PHILOSOPHY:
 * - Pure functions (no side effects)
 * - Composable (can be used independently)
 * - Defensive (handle edge cases gracefully)
 *
 * @class ErrorUtils
 * @static
 */
export class ErrorUtils {
  /**
   * Create a standardized error response
   *
   * RESPONSE FORMAT:
   * ```json
   * {
   *   "error": {
   *     "message": "Something went wrong",
   *     "type": "ApplicationError",
   *     "timestamp": "2025-10-21T10:30:00.000Z",
   *     "details": { ... }
   *   }
   * }
   * ```
   *
   * @public
   * @static
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {any} details - Optional additional details
   * @returns {Object} Standardized error response
   *
   * @example
   * ```typescript
   * ctx.response.status = 400;
   * ctx.response.body = ErrorUtils.createErrorResponse(
   *   'Invalid email format',
   *   400,
   *   { field: 'email', value: 'not-an-email' }
   * );
   * ```
   */
  static createErrorResponse(
    message: string,
    statusCode: number = 500,
    details?: any,
  ) {
    return {
      error: {
        message,
        type: "ApplicationError",
        timestamp: new Date().toISOString(),
        ...(details && { details }),
      },
    };
  }

  /**
   * Check if an error is operational (expected) vs programming error
   *
   * OPERATIONAL ERRORS:
   * - ValidationError, AuthenticationError, etc.
   * - Expected during normal operation
   * - Client can take action to resolve
   *
   * PROGRAMMING ERRORS:
   * - TypeError, ReferenceError, etc.
   * - Bugs in code
   * - Developer must fix
   *
   * @public
   * @static
   * @param {Error} error - Error to check
   * @returns {boolean} True if operational, false if programming error
   *
   * @example
   * ```typescript
   * try {
   *   await processRequest();
   * } catch (error) {
   *   if (ErrorUtils.isOperationalError(error)) {
   *     // Expected error, handle gracefully
   *     return errorResponse;
   *   } else {
   *     // Programming error, log and alert
   *     console.error('BUG:', error);
   *     alertDevelopers(error);
   *   }
   * }
   * ```
   */
  static isOperationalError(error: Error): boolean {
    // AppError subclasses have explicit flag
    if (error instanceof AppError) {
      return error.isOperational;
    }

    // Check against known operational error names
    const operationalErrors = [
      "ValidationError",
      "AuthenticationError",
      "AuthorizationError",
      "NotFoundError",
      "RateLimitError",
    ];

    return operationalErrors.includes(error.name);
  }

  /**
   * Extract useful error information for logging
   *
   * WHAT IT EXTRACTS:
   * - Error name and type
   * - Error message
   * - Stack trace
   * - Timestamp
   * - AppError metadata (if available)
   *
   * @public
   * @static
   * @param {Error} error - Error to extract info from
   * @returns {Object} Extracted error information
   *
   * @example
   * ```typescript
   * try {
   *   await riskyOperation();
   * } catch (error) {
   *   const errorInfo = ErrorUtils.extractErrorInfo(error);
   *   await logToDatabase(errorInfo);
   * }
   * ```
   */
  static extractErrorInfo(error: Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),

      // Include AppError metadata if available
      ...(error instanceof AppError && {
        statusCode: error.statusCode,
        isOperational: error.isOperational,
        requestId: error.requestId,
      }),
    };
  }

  /**
   * Create error from HTTP status code
   *
   * FACTORY METHOD:
   * - Converts status code to appropriate error class
   * - Uses default messages for common codes
   * - Allows message override
   *
   * SUPPORTED STATUS CODES:
   * - 400: Bad Request → AppError
   * - 401: Unauthorized → AuthenticationError
   * - 403: Forbidden → AuthorizationError
   * - 404: Not Found → NotFoundError
   * - 409: Conflict → AppError
   * - 429: Too Many Requests → RateLimitError
   * - 500+: Server errors → AppError
   *
   * @public
   * @static
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Optional custom message
   * @param {string} requestId - Optional request ID
   * @returns {AppError} Appropriate error instance
   *
   * @example
   * ```typescript
   * // From API response
   * const apiResponse = await fetch('/api/users');
   * if (!apiResponse.ok) {
   *   throw ErrorUtils.fromHttpStatus(apiResponse.status, undefined, requestId);
   * }
   *
   * // Custom message
   * throw ErrorUtils.fromHttpStatus(404, 'User not found', requestId);
   * ```
   */
  static fromHttpStatus(
    statusCode: number,
    message?: string,
    requestId?: string,
  ): AppError {
    // Default messages for common status codes
    const defaultMessages: Record<number, string> = {
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      409: "Conflict",
      429: "Too Many Requests",
      500: "Internal Server Error",
      502: "Bad Gateway",
      503: "Service Unavailable",
      504: "Gateway Timeout",
    };

    // Use custom message or default
    const errorMessage = message || defaultMessages[statusCode] ||
      "Unknown Error";

    // Create appropriate error class based on status code
    switch (statusCode) {
      case 401:
        return new AuthenticationError(errorMessage, requestId);

      case 403:
        return new AuthorizationError(errorMessage, requestId);

      case 404:
        // Remove " not found" from message since NotFoundError adds it
        return new NotFoundError(
          errorMessage.replace(" not found", ""),
          requestId,
        );

      case 429:
        return new RateLimitError(60, requestId); // Default 60 second retry

      default:
        return new AppError(errorMessage, statusCode, true, requestId);
    }
  }

  /**
   * Validate error handler configuration
   *
   * VALIDATION RULES:
   * 1. Environment must be specified
   * 2. If logToFile is true, logErrors must also be true
   * 3. Custom error messages must be non-empty strings
   *
   * USE CASE:
   * - Validate configuration at startup
   * - Fail fast with clear error messages
   * - Prevent runtime configuration errors
   *
   * @public
   * @static
   * @param {ErrorConfig} config - Configuration to validate
   * @returns {Object} Validation result with errors array
   *
   * @example
   * ```typescript
   * const config = {
   *   environment: 'production',
   *   logErrors: false,
   *   logToFile: true,  // Invalid: logToFile requires logErrors
   *   // ...
   * };
   *
   * const validation = ErrorUtils.validateConfig(config);
   * if (!validation.valid) {
   *   console.error('Invalid configuration:');
   *   validation.errors.forEach(err => console.error(`- ${err}`));
   *   Deno.exit(1);
   * }
   * ```
   */
  static validateConfig(
    config: ErrorConfig,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Rule 1: Environment is required
    if (!config.environment) {
      errors.push("Environment is required");
    }

    // Rule 2: logToFile requires logErrors
    if (config.logToFile && !config.logErrors) {
      errors.push("logErrors must be true when logToFile is enabled");
    }

    // Rule 3: Custom messages must be non-empty strings
    if (config.customErrorMessages) {
      for (
        const [errorType, message] of Object.entries(config.customErrorMessages)
      ) {
        if (typeof message !== "string" || message.trim().length === 0) {
          errors.push(
            `Custom error message for ${errorType} must be a non-empty string`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// ================================================================================
// 🚀 EXPORT ALL ERROR HANDLING COMPONENTS
// ================================================================================

/**
 * Default export for convenient importing
 *
 * @example
 * ```typescript
 * import errorHandler from "./middleware/errorHandler.ts";
 *
 * // Use classes
 * throw new errorHandler.ValidationError('Invalid email', 'email', email);
 *
 * // Use middleware
 * app.use(errorHandler.createErrorMiddleware(errorHandler.ErrorHandlerPresets.PRODUCTION));
 *
 * // Use analytics
 * const analysis = errorHandler.ErrorAnalytics.analyzeErrorPatterns();
 * ```
 */
export default {
  ErrorHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  DatabaseError,
  createErrorMiddleware,
  ErrorAnalytics,
  ErrorHandlerPresets,
  ErrorUtils,
};

// ================================================================================
// END OF FILE
// ================================================================================
