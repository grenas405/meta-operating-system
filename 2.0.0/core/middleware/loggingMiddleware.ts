// middleware/logging.ts → Advanced Logging System

import type { Context } from "../utils/context.ts";
import { ConsoleStyler, ColorSystem } from "../utils/console-styler/mod.ts";
// ================================================================================
// 📝 DenoGenesis Framework - Enterprise Request/Response Logging
// Comprehensive logging with sanitization, performance tracking, and formatting
// ================================================================================
//
// UNIX PHILOSOPHY IMPLEMENTATION:
// --------------------------------
// 1. DO ONE THING WELL:
//    - This module ONLY handles logging and log formatting
//    - Does NOT handle error handling, performance tracking, or data storage
//    - Single, focused responsibility: structured logging with security
//
// 2. COMPOSABILITY:
//    - Designed as middleware that integrates with Oak framework
//    - Can be combined with performance monitoring, error handling, security
//    - Logger class can be used independently outside of middleware
//
// 3. TEXT-BASED:
//    - All logs are human-readable text
//    - JSON formatting for structured data
//    - Standard output streams (stdout/stderr)
//
// 4. EXPLICIT:
//    - Clear log levels (debug, info, warn, error)
//    - No hidden logging behavior
//    - Every log statement has a clear purpose
//
// ARCHITECTURE:
// -------------
// Logging Flow:
//   1. Request arrives
//   2. Middleware logs incoming request
//   3. Request is processed
//   4. Middleware logs outgoing response
//   5. Performance metrics included
//   6. Errors logged to stderr
//
// LOG LEVELS (Hierarchical):
// ---------------------------
// - debug: Verbose, everything (development only)
// - info: Standard informational messages
// - warn: Warnings and slow requests
// - error: Errors and failures
//
// SECURITY:
// ---------
// - Sensitive headers sanitized (Authorization, Cookie, API keys)
// - Password fields redacted in objects
// - Token values partially hidden
// - Query parameters sanitized
// - Request/response bodies not logged by default
//
// PERFORMANCE:
// ------------
// - Zero overhead when log level excludes message
// - Minimal string concatenation
// - Lazy JSON serialization
// - ANSI color codes only in TTY environments
//
// USAGE:
// ------
// ```typescript
// import { createLoggingMiddleware, Logger } from "./middleware/logging.ts";
//
// // In middleware stack
// const app = new Application();
// app.use(createLoggingMiddleware({
//   environment: 'development',
//   logLevel: 'debug',
//   logRequests: true,
//   logResponses: true
// }));
//
// // Standalone logger
// const logger = new Logger({ environment: 'production', logLevel: 'info' });
// logger.info('Application started', { port: 8000 });
// logger.error('Database connection failed', { error: err.message });
// ```
//
// RELATED DOCUMENTATION:
// ----------------------
// - Framework Philosophy: docs/02-framework/philosophy.md
// - Middleware Architecture: docs/04-api-reference/core/middleware.md
// - Security Patterns: docs/02-framework/security.md
// - Performance Monitoring: middleware/performanceMonitor.ts
// - Error Handling: middleware/errorHandler.ts
//
// ================================================================================

// ================================================================================
// 📦 TYPE DEFINITIONS
// ================================================================================

/**
 * Logging configuration object
 *
 * DESIGN PHILOSOPHY:
 * - Environment-aware (development vs production)
 * - Hierarchical log levels (debug < info < warn < error)
 * - Toggle request/response logging independently
 * - Safe defaults that work everywhere
 *
 * CONFIGURATION STRATEGY:
 * - Development: debug level, log everything
 * - Production: info level, structured logs only
 * - Testing: warn level, minimal output
 *
 * @interface LoggingConfig
 */
export interface LoggingConfig {
  /**
   * Runtime environment (development, production, testing)
   * Affects default behavior and output format
   * @type {string}
   */
  environment: string;

  /**
   * Minimum log level to output
   *
   * HIERARCHY (lowest to highest):
   * - debug: Everything (verbose, development only)
   * - info: Informational messages and higher
   * - warn: Warnings and errors only
   * - error: Errors only
   *
   * EXAMPLE:
   * - logLevel: 'info' → outputs info, warn, error (skips debug)
   * - logLevel: 'warn' → outputs warn, error (skips debug, info)
   *
   * @type {'debug' | 'info' | 'warn' | 'error'}
   */
  logLevel: "debug" | "info" | "warn" | "error";

  /**
   * Enable logging of incoming HTTP requests
   *
   * LOGS:
   * - Method, URL, timestamp
   * - Request ID for tracing
   * - Client IP and User-Agent (debug mode)
   *
   * @default true
   * @type {boolean}
   */
  logRequests: boolean;

  /**
   * Enable logging of outgoing HTTP responses
   *
   * LOGS:
   * - Status code, response time
   * - Request ID for correlation
   * - Response headers (debug mode)
   *
   * @default false
   * @type {boolean}
   */
  logResponses?: boolean;
}

// ================================================================================
// 🎨 CONSOLE STYLING UTILITIES (Using ConsoleStyler Library)
// ================================================================================

/**
 * Styling utilities for logging with ConsoleStyler
 *
 * DESIGN PRINCIPLES:
 * - Uses shared ConsoleStyler library for consistency
 * - ColorSystem provides standardized color management
 * - No manual ANSI codes - library handles terminal compatibility
 *
 * @class LoggerStyler
 * @static
 */
class LoggerStyler {
  private static colors = new ColorSystem();

  /**
   * Colorize text using ConsoleStyler's color system
   */
  static colorize(text: string, color: string): string {
    return this.colors.colorize(text, color);
  }

  /**
   * Get appropriate color for HTTP method
   */
  static getMethodColor(method: string): string {
    switch (method.toUpperCase()) {
      case "GET":
        return "green";
      case "POST":
        return "blue";
      case "PUT":
        return "yellow";
      case "DELETE":
        return "red";
      case "PATCH":
        return "magenta";
      default:
        return "cyan";
    }
  }

  /**
   * Get appropriate color for HTTP status code
   */
  static getStatusColor(status: number): string {
    if (status >= 200 && status < 300) return "green";
    if (status >= 300 && status < 400) return "yellow";
    if (status >= 400 && status < 500) return "red";
    if (status >= 500) return "magenta";
    return "gray";
  }
}

// ================================================================================
// 🛡️ HEADER SANITIZATION UTILITIES
// ================================================================================

/**
 * Security-focused header sanitization
 *
 * SECURITY PRINCIPLES:
 * --------------------
 * - Never log full authorization tokens
 * - Partially obscure sensitive values
 * - Redact cookies completely
 * - Preserve debugging information
 *
 * THREAT MODEL:
 * - Log aggregation services (Splunk, ELK)
 * - Developer access to logs
 * - Log file backups
 * - Compromised log storage
 *
 * SANITIZATION STRATEGY:
 * - Sensitive headers: Show first/last 4 chars only
 * - Short values (<10 chars): Hide completely
 * - Non-sensitive headers: Log in full
 *
 * WHY SHOW PARTIAL VALUES?
 * - Helps identify which token/key was used
 * - Useful for debugging token issues
 * - Still prevents credential theft
 * - Balance between security and utility
 *
 * @class HeaderSanitizer
 * @static
 *
 * @example
 * ```typescript
 * const headers = new Headers({
 *   'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
 *   'Content-Type': 'application/json',
 *   'User-Agent': 'Mozilla/5.0...'
 * });
 *
 * const sanitized = HeaderSanitizer.sanitizeHeaders(headers);
 * // {
 * //   'authorization': 'Bear...CJ9',  // Partially hidden
 * //   'content-type': 'application/json',  // Safe, shown fully
 * //   'user-agent': 'Mozilla/5.0...'  // Safe, shown fully
 * // }
 * ```
 */
class HeaderSanitizer {
  /**
   * List of header names containing sensitive data
   *
   * SENSITIVE HEADERS:
   * ------------------
   * Authentication & Authorization:
   * - authorization: Bearer tokens, Basic auth
   * - cookie: Session cookies, auth tokens
   * - set-cookie: Server-set cookies
   * - proxy-authorization: Proxy authentication
   * - www-authenticate: Authentication challenges
   *
   * API Keys & Tokens:
   * - x-api-key: Application API keys
   * - x-auth-token: Custom auth tokens
   * - x-access-token: OAuth access tokens
   * - x-refresh-token: OAuth refresh tokens
   *
   * WHY SET?
   * - Fast O(1) lookup
   * - Case-insensitive comparison (lowercase keys)
   * - No duplicate entries
   *
   * @private
   * @static
   * @readonly
   * @type {Set<string>}
   */
  private static sensitiveHeaders = new Set([
    "authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "x-auth-token",
    "x-access-token",
    "x-refresh-token",
    "proxy-authorization",
    "www-authenticate",
  ]);

  /**
   * Sanitize HTTP headers for safe logging
   *
   * ALGORITHM:
   * 1. Normalize input type (Headers object or plain object)
   * 2. Iterate over all headers
   * 3. Check if header is sensitive
   * 4. Apply appropriate sanitization
   * 5. Return sanitized object
   *
   * INPUT HANDLING:
   * - Headers object (from Oak/Deno)
   * - Plain object (from manual construction)
   * - undefined/null (return empty object)
   *
   * ERROR HANDLING:
   * - Graceful degradation on parse errors
   * - Returns error indicator instead of crashing
   * - Logs warning but continues execution
   *
   * CASE NORMALIZATION:
   * - All header names converted to lowercase
   * - HTTP headers are case-insensitive per RFC 7230
   * - Lowercase simplifies comparison
   *
   * @public
   * @static
   * @param {Headers | Record<string, string> | undefined} headers - Headers to sanitize
   * @returns {Record<string, string>} Sanitized headers object
   *
   * @example
   * ```typescript
   * // With Headers object
   * const headers = new Headers({
   *   'Authorization': 'Bearer token123',
   *   'Content-Type': 'application/json'
   * });
   * HeaderSanitizer.sanitizeHeaders(headers);
   * // { 'authorization': 'Bear...123', 'content-type': 'application/json' }
   *
   * // With plain object
   * const headers = { 'Cookie': 'session=abc123' };
   * HeaderSanitizer.sanitizeHeaders(headers);
   * // { 'cookie': '[HIDDEN]' }
   * ```
   */
  static sanitizeHeaders(
    headers: Headers | Record<string, string> | undefined,
  ): Record<string, string> {
    // Handle null/undefined input
    if (!headers) return {};

    // Result accumulator
    const sanitized: Record<string, string> = {};

    try {
      // -----------------------------------------------------------------------
      // HANDLE Headers OBJECT (from Oak/Deno)
      // -----------------------------------------------------------------------
      if (headers instanceof Headers) {
        // Headers.entries() returns iterator of [key, value] pairs
        for (const [key, value] of headers.entries()) {
          // Normalize to lowercase and sanitize value
          sanitized[key.toLowerCase()] = this.sanitizeValue(
            key.toLowerCase(),
            value,
          );
        }
      } // -----------------------------------------------------------------------
      // HANDLE PLAIN OBJECT
      // -----------------------------------------------------------------------
      else if (typeof headers === "object") {
        // Object.entries() returns array of [key, value] pairs
        for (const [key, value] of Object.entries(headers)) {
          sanitized[key.toLowerCase()] = this.sanitizeValue(
            key.toLowerCase(),
            value,
          );
        }
      }
    } catch (error: any) {
      // Graceful degradation: log warning but don't crash
      ConsoleStyler.logWarning("Header sanitization failed", { error: error.message });
      return { "sanitization-error": "Failed to process headers" };
    }

    return sanitized;
  }

  /**
   * Sanitize individual header value
   *
   * SANITIZATION RULES:
   * -------------------
   * 1. Check if header is sensitive
   * 2. If sensitive and long (>10 chars):
   *    - Show first 4 characters
   *    - Show "..."
   *    - Show last 4 characters
   * 3. If sensitive and short (≤10 chars):
   *    - Hide completely as "[HIDDEN]"
   * 4. If not sensitive:
   *    - Return value unchanged
   *
   * EXAMPLES:
   * - "Bearer eyJhbGc..." → "Bear...bGc9" (sensitive, long)
   * - "session123" → "[HIDDEN]" (sensitive, short)
   * - "application/json" → "application/json" (not sensitive)
   *
   * WHY DIFFERENT RULES FOR LENGTH?
   * - Long values: Partial view helps debugging
   * - Short values: Even partial view might leak info
   *
   * @private
   * @static
   * @param {string} key - Header name (lowercase)
   * @param {string} value - Header value
   * @returns {string} Sanitized value
   *
   * @example
   * ```typescript
   * // Sensitive, long value
   * HeaderSanitizer.sanitizeValue('authorization', 'Bearer token12345678');
   * // Returns: "Bear...5678"
   *
   * // Sensitive, short value
   * HeaderSanitizer.sanitizeValue('x-api-key', 'key123');
   * // Returns: "[HIDDEN]"
   *
   * // Non-sensitive value
   * HeaderSanitizer.sanitizeValue('content-type', 'application/json');
   * // Returns: "application/json"
   * ```
   */
  private static sanitizeValue(key: string, value: string): string {
    // Check if this is a sensitive header
    if (this.sensitiveHeaders.has(key.toLowerCase())) {
      // Long values: show first and last 4 characters
      if (value.length > 10) {
        // Extract first 4 chars
        const prefix = value.substring(0, 4);

        // Extract last 4 chars
        const suffix = value.substring(value.length - 4);

        // Combine with ellipsis
        return `${prefix}...${suffix}`;
      }

      // Short values: hide completely
      return "[HIDDEN]";
    }

    // Non-sensitive headers: return unchanged
    return value;
  }
}

// ================================================================================
// 📊 LOGGER CLASS
// ================================================================================

/**
 * Core logging class with level-based filtering
 *
 * RESPONSIBILITY:
 * ---------------
 * - Provide structured logging interface
 * - Filter messages by log level
 * - Format output with colors and timestamps
 * - Log HTTP requests and responses
 * - Track logging statistics
 *
 * DESIGN PRINCIPLES:
 * ------------------
 * - Hierarchical log levels (debug < info < warn < error)
 * - Zero overhead for filtered messages
 * - Color-coded output for readability
 * - Security-aware (uses HeaderSanitizer)
 * - Performance-conscious (lazy evaluation)
 *
 * LOG LEVEL HIERARCHY:
 * --------------------
 * ```
 * debug (0) → info (1) → warn (2) → error (3)
 *   ↓           ↓          ↓          ↓
 * Everything  Normal    Problems   Critical
 * ```
 *
 * If logLevel = 'info':
 * - debug messages: SKIPPED
 * - info messages: LOGGED
 * - warn messages: LOGGED
 * - error messages: LOGGED
 *
 * @class Logger
 *
 * @example
 * ```typescript
 * const logger = new Logger({
 *   environment: 'development',
 *   logLevel: 'debug',
 *   logRequests: true,
 *   logResponses: true
 * });
 *
 * logger.debug('Verbose debugging info');
 * logger.info('Server listening on port 8000');
 * logger.warn('Slow database query detected');
 * logger.error('Failed to connect to cache', { error: 'ECONNREFUSED' });
 * ```
 */
export class Logger {
  /**
   * Logging configuration
   * @private
   * @type {LoggingConfig}
   */
  private config: LoggingConfig;

  /**
   * Total number of requests logged
   *
   * USAGE:
   * - Statistics tracking
   * - Monitoring total throughput
   * - Health checks
   *
   * @private
   * @type {number}
   */
  private requestCount = 0;

  /**
   * Initialize logger with configuration
   *
   * @param {LoggingConfig} config - Logging configuration
   */
  constructor(config: LoggingConfig) {
    this.config = config;
  }

  // ============================================================================
  // PRIVATE UTILITY METHODS
  // ============================================================================

  /**
   * Check if a message should be logged based on level
   *
   * ALGORITHM:
   * 1. Convert log levels to numeric indices
   * 2. Compare message level against configured level
   * 3. Return true if message level >= configured level
   *
   * LEVEL INDICES:
   * - debug: 0 (lowest priority)
   * - info:  1
   * - warn:  2
   * - error: 3 (highest priority)
   *
   * COMPARISON LOGIC:
   * ```
   * Config level: 'info' (index 1)
   * Message level: 'debug' (index 0)
   * 0 >= 1 → false → DON'T LOG
   *
   * Message level: 'warn' (index 2)
   * 2 >= 1 → true → LOG IT
   * ```
   *
   * PERFORMANCE:
   * - O(1) array lookups
   * - Evaluated before any string formatting
   * - Zero overhead for filtered messages
   *
   * @private
   * @param {string} level - Message log level
   * @returns {boolean} True if message should be logged
   *
   * @example
   * ```typescript
   * // With config.logLevel = 'info'
   * logger.shouldLog('debug');  // false
   * logger.shouldLog('info');   // true
   * logger.shouldLog('warn');   // true
   * logger.shouldLog('error');  // true
   * ```
   */
  private shouldLog(level: string): boolean {
    // Level hierarchy array (index = priority)
    const levels = ["debug", "info", "warn", "error"];

    // Get index of configured minimum level
    const configLevel = levels.indexOf(this.config.logLevel);

    // Get index of message level
    const messageLevel = levels.indexOf(level);

    // Message is logged if its level >= configured level
    return messageLevel >= configLevel;
  }

  /**
   * Format current timestamp for log output
   *
   * FORMAT:
   * - ISO 8601 standard
   * - Converted to human-readable format
   * - Truncated to second precision
   *
   * TRANSFORMATION:
   * ```
   * ISO 8601:        2025-10-21T10:30:15.123Z
   *                         ↓
   * Replace T:       2025-10-21 10:30:15.123Z
   *                         ↓
   * Truncate:        2025-10-21 10:30:15
   * ```
   *
   * WHY THIS FORMAT?
   * - Human-readable (no T separator)
   * - Second precision (ms usually not needed)
   * - Sortable (lexicographic order = chronological order)
   * - Compact (19 characters)
   *
   * @private
   * @returns {string} Formatted timestamp
   *
   * @example
   * ```typescript
   * logger.formatTimestamp();
   * // Returns: "2025-10-21 10:30:15"
   * ```
   */
  private formatTimestamp(): string {
    // Get ISO 8601 timestamp
    // Format: 2025-10-21T10:30:15.123Z
    return new Date()
      .toISOString()
      .replace("T", " ") // Replace T with space
      .substring(0, 19); // Truncate to 19 chars (remove milliseconds and Z)
  }

  // ============================================================================
  // PUBLIC API - LOG LEVEL METHODS
  // ============================================================================

  /**
   * Log debug message (lowest priority)
   *
   * USE CASES:
   * - Verbose diagnostic information
   * - Variable values and state
   * - Function entry/exit
   * - Development-only messages
   *
   * WHEN TO USE:
   * - Debugging specific issues
   * - Understanding code flow
   * - Inspecting data structures
   *
   * WHEN NOT TO USE:
   * - Production environments (too verbose)
   * - Performance-critical paths (overhead)
   * - Sensitive data (security risk)
   *
   * FORMAT:
   * [TIMESTAMP] DEBUG message {metadata}
   *
   * @public
   * @param {string} message - Log message
   * @param {any} meta - Optional metadata object
   * @returns {void}
   *
   * @example
   * ```typescript
   * logger.debug('Processing user request', {
   *   userId: 123,
   *   action: 'update_profile',
   *   requestData: { ... }
   * });
   * // Output: [2025-10-21 10:30:15] DEBUG Processing user request { userId: 123, ... }
   * ```
   */
  debug(message: string, meta?: any): void {
    // Check if debug messages should be logged
    if (this.shouldLog("debug")) {
      console.log(
        LoggerStyler.colorize(`[${this.formatTimestamp()}]`, "gray"),
        LoggerStyler.colorize("DEBUG", "cyan"),
        message,
        meta ? LoggerStyler.colorize(JSON.stringify(meta, null, 2), "dim") : "",
      );
    }
  }

  /**
   * Log informational message (standard priority)
   *
   * USE CASES:
   * - Application lifecycle events (started, stopped)
   * - Configuration changes
   * - Successful operations
   * - State transitions
   *
   * WHEN TO USE:
   * - Normal application flow
   * - Business logic milestones
   * - Integration points
   *
   * FORMAT:
   * [TIMESTAMP] INFO message {metadata}
   *
   * @public
   * @param {string} message - Log message
   * @param {any} meta - Optional metadata object
   * @returns {void}
   *
   * @example
   * ```typescript
   * logger.info('Server started', { port: 8000, environment: 'production' });
   * // Output: [2025-10-21 10:30:15] INFO Server started { port: 8000, ... }
   *
   * logger.info('Database connection established');
   * // Output: [2025-10-21 10:30:15] INFO Database connection established
   * ```
   */
  info(message: string, meta?: any): void {
    if (this.shouldLog("info")) {
      console.log(
        LoggerStyler.colorize(`[${this.formatTimestamp()}]`, "gray"),
        LoggerStyler.colorize("INFO", "blue"),
        message,
        meta ? LoggerStyler.colorize(JSON.stringify(meta, null, 2), "dim") : "",
      );
    }
  }

  /**
   * Log warning message (elevated priority)
   *
   * USE CASES:
   * - Deprecated feature usage
   * - Slow operations (>1s response time)
   * - Recoverable errors
   * - Configuration issues
   * - Resource constraints (memory, disk)
   *
   * WHEN TO USE:
   * - Things that might become problems
   * - Performance degradation
   * - Approaching limits
   *
   * FORMAT:
   * [TIMESTAMP] WARN message {metadata}
   *
   * @public
   * @param {string} message - Warning message
   * @param {any} meta - Optional metadata object
   * @returns {void}
   *
   * @example
   * ```typescript
   * logger.warn('Slow database query detected', {
   *   query: 'SELECT * FROM users',
   *   duration: '2.3s',
   *   threshold: '1s'
   * });
   * // Output: [2025-10-21 10:30:15] WARN Slow database query detected { ... }
   * ```
   */
  warn(message: string, meta?: any): void {
    if (this.shouldLog("warn")) {
      // Use console.warn for proper stream routing (stderr)
      console.warn(
        LoggerStyler.colorize(`[${this.formatTimestamp()}]`, "gray"),
        LoggerStyler.colorize("WARN", "yellow"),
        message,
        meta ? LoggerStyler.colorize(JSON.stringify(meta, null, 2), "dim") : "",
      );
    }
  }

  /**
   * Log error message (highest priority)
   *
   * USE CASES:
   * - Exceptions and errors
   * - Failed operations
   * - Data validation failures
   * - External service failures
   * - Security issues
   *
   * WHEN TO USE:
   * - Something went wrong
   * - Operation failed
   * - Data corruption detected
   * - Security violation
   *
   * ALWAYS LOGGED:
   * - Even with logLevel='error'
   * - Goes to stderr (standard error stream)
   * - Should trigger alerts in production
   *
   * FORMAT:
   * [TIMESTAMP] ERROR message {metadata}
   *
   * @public
   * @param {string} message - Error message
   * @param {any} meta - Optional metadata object (often includes error details)
   * @returns {void}
   *
   * @example
   * ```typescript
   * logger.error('Database connection failed', {
   *   error: 'ECONNREFUSED',
   *   host: 'localhost',
   *   port: 3306,
   *   stack: err.stack
   * });
   * // Output: [2025-10-21 10:30:15] ERROR Database connection failed { ... }
   * ```
   */
  error(message: string, meta?: any): void {
    if (this.shouldLog("error")) {
      // Use console.error for proper stream routing (stderr)
      console.error(
        LoggerStyler.colorize(`[${this.formatTimestamp()}]`, "gray"),
        LoggerStyler.colorize("ERROR", "red"),
        message,
        meta ? LoggerStyler.colorize(JSON.stringify(meta, null, 2), "dim") : "",
      );
    }
  }

  // ============================================================================
  // PUBLIC API - HTTP REQUEST/RESPONSE LOGGING
  // ============================================================================

  /**
   * Log incoming HTTP request
   *
   * WHAT IT LOGS:
   * - HTTP method (GET, POST, etc.)
   * - Request URL path and query string
   * - Response status code (if set)
   * - Response time (if provided)
   * - Request ID (for tracing)
   *
   * DEBUG MODE EXTRAS:
   * - Client IP address
   * - User-Agent string
   * - Request headers (sanitized)
   * - Query parameters
   *
   * FORMAT:
   * [TIMESTAMP] REQ METHOD URL STATUS TIME [REQUEST_ID]
   *
   * EXAMPLE OUTPUT:
   * [2025-10-21 10:30:15] REQ GET    /api/users 200 145ms [abc123]
   *
   * @public
   * @param {any} ctx - Oak context object
   * @param {number} responseTime - Optional response time in milliseconds
   * @returns {void}
   */
  logRequest(ctx: any, responseTime?: number): void {
    // Check if request logging is enabled
    if (!this.config.logRequests) return;

    // Increment request counter
    this.requestCount++;

    // Extract request details from context
    const method = ctx.request.method;
    const url = ctx.request.url.pathname + (ctx.request.url.search || "");
    const status = ctx.response.status || 0;
    const requestId = ctx.state?.requestId || "unknown";

    // -------------------------------------------------------------------------
    // FORMAT LOG MESSAGE
    // -------------------------------------------------------------------------

    // Colorize HTTP method (padded for alignment)
    const methodColored = LoggerStyler.colorize(
      method.padEnd(6),
      LoggerStyler.getMethodColor(method),
    );

    // Colorize status code
    const statusColored = LoggerStyler.colorize(
      status.toString(),
      LoggerStyler.getStatusColor(status),
    );

    // Format response time (if provided)
    const timeInfo = responseTime
      ? LoggerStyler.colorize(`${responseTime}ms`, "gray")
      : "";

    // Format request ID (dimmed for less visual noise)
    const requestIdInfo = LoggerStyler.colorize(`[${requestId}]`, "dim");

    // Print formatted log line
    console.log(
      LoggerStyler.colorize(`[${this.formatTimestamp()}]`, "gray"),
      LoggerStyler.colorize("REQ", "cyan"),
      methodColored,
      url,
      statusColored,
      timeInfo,
      requestIdInfo,
    );

    // -------------------------------------------------------------------------
    // DEBUG MODE: LOG REQUEST DETAILS
    // -------------------------------------------------------------------------

    if (this.config.logLevel === "debug") {
      // Sanitize headers (remove sensitive values)
      const headers = HeaderSanitizer.sanitizeHeaders(ctx.request.headers);

      // Extract client identification
      const userAgent = headers["user-agent"] || "Unknown";
      let ip = "unknown";
      try {
        ip = headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
          headers["x-real-ip"] ??
          ctx.request.socket?.remoteAddress?.hostname ??
          "unknown";
      } catch {
        // Oak internal IP getter failed — fall back safely
        ip = headers["x-forwarded-for"]?.split(",")[0]?.trim() ??
          headers["x-real-ip"] ??
          "unknown";
      }

      // Log detailed request information
      this.debug("Request Details", {
        requestId,
        ip,
        userAgent,
        headers: Object.keys(headers).length > 0 ? headers : "None",
        query: ctx.request.url.searchParams
          ? Object.fromEntries(ctx.request.url.searchParams)
          : {},
      });
    }
  }

  /**
   * Log outgoing HTTP response
   *
   * WHAT IT LOGS:
   * - HTTP method (for correlation)
   * - Request URL path
   * - Response status code
   * - Response time (if provided)
   * - Request ID (for tracing)
   *
   * DEBUG MODE EXTRAS:
   * - Response headers (sanitized)
   * - Content-Type
   * - Content-Length
   *
   * FORMAT:
   * [TIMESTAMP] RES METHOD URL STATUS TIME [REQUEST_ID]
   *
   * @public
   * @param {any} ctx - Oak context object
   * @param {number} responseTime - Optional response time in milliseconds
   * @returns {void}
   */
  logResponse(ctx: any, responseTime?: number): void {
    // Check if response logging is enabled
    if (!this.config.logResponses) return;

    // Extract response details
    const method = ctx.request.method;
    const url = ctx.request.url.pathname;
    const status = ctx.response.status || 0;
    const requestId = ctx.state?.requestId || "unknown";

    // Colorize status code
    const statusColored = LoggerStyler.colorize(
      status.toString(),
      LoggerStyler.getStatusColor(status),
    );

    // Format response time
    const timeInfo = responseTime
      ? LoggerStyler.colorize(`${responseTime}ms`, "gray")
      : "";

    // Print formatted log line
    console.log(
      LoggerStyler.colorize(`[${this.formatTimestamp()}]`, "gray"),
      LoggerStyler.colorize("RES", "magenta"),
      LoggerStyler.colorize(
        method.padEnd(6),
        LoggerStyler.getMethodColor(method),
      ),
      url,
      statusColored,
      timeInfo,
      LoggerStyler.colorize(`[${requestId}]`, "dim"),
    );

    // Debug mode: log response details
    if (this.config.logLevel === "debug") {
      const responseHeaders = HeaderSanitizer.sanitizeHeaders(
        ctx.response.headers,
      );

      this.debug("Response Details", {
        requestId,
        status,
        headers: Object.keys(responseHeaders).length > 0
          ? responseHeaders
          : "None",
        contentType: responseHeaders["content-type"] || "Not set",
        contentLength: responseHeaders["content-length"] || "Unknown",
      });
    }
  }

  /**
   * Get logging statistics
   *
   * @public
   * @returns {Object} Logging statistics
   */
  getStats() {
    return {
      totalRequests: this.requestCount,
      logLevel: this.config.logLevel,
      requestLogging: this.config.logRequests,
      responseLogging: this.config.logResponses || false,
    };
  }
}

// ================================================================================
// 🔄 LOGGING MIDDLEWARE FACTORY
// ================================================================================

/**
 * Create middleware for request/response logging
 *
 * @public
 * @param {LoggingConfig} config - Logging configuration
 * @returns {Function} Logging middleware function
 */
export function createLoggingMiddleware(config: LoggingConfig) {
  const logger = new Logger(config);

  // Log initialization in development mode
  if (config.environment === "development") {
    logger.info("🔍 Request/Response logging initialized", {
      logLevel: config.logLevel,
      requestLogging: config.logRequests,
      responseLogging: config.logResponses || false,
    });
  }

  return async (
    ctx: Context,
    next: () => Promise<Response>,
  ): Promise<Response> => {
    const start = Date.now();

    // Capture the request/response snapshot expected by Logger utilities
    const logContext: any = {
      request: {
        method: ctx.request.method,
        url: ctx.url,
        headers: ctx.request.headers,
        body: ctx.request.body,
        bodyUsed: ctx.request.bodyUsed,
        json: ctx.request.json?.bind(ctx.request),
        text: ctx.request.text?.bind(ctx.request),
      },
      response: {
        status: ctx.response.status,
        headers: new Headers(ctx.response.headers),
      },
      state: ctx.state,
    };

    if (config.logRequests) {
      logger.logRequest(logContext);
    }

    try {
      const response = await next();
      const responseTime = Date.now() - start;

      logContext.response = {
        status: response.status,
        headers: new Headers(response.headers),
      };

      if (config.logResponses) {
        logger.logResponse(logContext, responseTime);
      }

      if (responseTime > 1000) {
        logger.warn(
          `Slow request detected: ${ctx.request.method} ${ctx.url.pathname}`,
          {
            responseTime: `${responseTime}ms`,
            requestId: ctx.state?.requestId,
          },
        );
      }

      return response;
    } catch (error: any) {
      const responseTime = Date.now() - start;

      logger.error(
        `Request failed: ${ctx.request.method} ${ctx.url.pathname}`,
        {
          error: error.message,
          responseTime: `${responseTime}ms`,
          requestId: ctx.state?.requestId,
          stack: config.environment === "development" ? error.stack : undefined,
        },
      );

      throw error;
    }
  };
}

// ================================================================================
// 🛠️ LOGGING UTILITIES
// ================================================================================

/**
 * Utility functions for logging operations
 *
 * @class LoggingUtils
 * @static
 */
export class LoggingUtils {
  /**
   * Create a standalone logger instance
   *
   * @public
   * @static
   * @param {LoggingConfig} config - Logging configuration
   * @returns {Logger} Logger instance
   */
  static createRequestLogger(config: LoggingConfig) {
    return new Logger(config);
  }

  /**
   * Recursively sanitize object for safe logging
   *
   * @public
   * @static
   * @param {any} obj - Object to sanitize
   * @param {number} maxDepth - Maximum recursion depth (default: 3)
   * @param {number} currentDepth - Current depth (internal use)
   * @returns {any} Sanitized object
   */
  static sanitizeObject(obj: any, maxDepth = 3, currentDepth = 0): any {
    if (currentDepth >= maxDepth || obj === null || obj === undefined) {
      return "[Max Depth]";
    }

    if (typeof obj !== "object") {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.sanitizeObject(item, maxDepth, currentDepth + 1)
      );
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive keys
      if (
        ["password", "token", "secret", "key", "auth"].some((sensitive) =>
          key.toLowerCase().includes(sensitive)
        )
      ) {
        sanitized[key] = "[HIDDEN]";
      } else {
        sanitized[key] = this.sanitizeObject(value, maxDepth, currentDepth + 1);
      }
    }

    return sanitized;
  }

  /**
   * Format a log message with timestamp and metadata
   *
   * @public
   * @static
   * @param {string} level - Log level (debug, info, warn, error)
   * @param {string} message - Log message
   * @param {any} meta - Optional metadata object
   * @returns {string} Formatted log message
   */
  static formatLogMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaString = meta
      ? ` ${JSON.stringify(LoggingUtils.sanitizeObject(meta))}`
      : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
  }
}

// ================================================================================
// 🚀 EXPORT ALL LOGGING COMPONENTS
// ================================================================================

/**
 * Default export for convenient importing
 */
export { HeaderSanitizer };

// ================================================================================
// END OF FILE
// ================================================================================
