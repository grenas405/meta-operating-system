/**
 * HTTP Module
 * Modular HTTP server framework for Deno-Genesis
 * No external dependencies - uses only Deno built-in APIs
 */

// Server
export { HTTPServer } from "./server.ts";
export type { ServerConfig } from "./server.ts";
// Router

export { createRouter, Router } from "./router.ts";
export type { RouteHandler } from "./router.ts";

// Middleware
export {
  compose,
  cors,
  errorHandler,
  healthCheck,
  logger,
  logging,
  requestId,
  security,
  timing,
} from "./middleware/index.ts";
export { createContext } from "./utils/context.ts";
export type { Context, Handler, Middleware } from "./utils/context.ts";

// Performance Monitoring
export {
  createPerformanceMiddleware,
  PerformanceAnalyzer,
  PerformanceMonitor,
} from "./middleware/performanceMonitor.ts";

// Response helpers
export {
  badRequest,
  forbidden,
  html,
  internalError,
  json,
  noContent,
  notFound,
  redirect,
  status,
  text,
  unauthorized,
} from "./utils/response.ts";
export type { ResponseOptions } from "./utils/response.ts";

// Body parsers
export {
  bodyParser,
  json as jsonParser,
  multipart,
  text as textParser,
  urlencoded,
} from "./middleware/parsers.ts";

// Validation
export {
  optionalBoolean,
  optionalNumber,
  optionalString,
  requiredArray,
  requiredBoolean,
  requiredEmail,
  requiredEnum,
  requiredNumber,
  requiredString,
  requiredUrl,
  validate,
  ValidationError,
  validator,
} from "./middleware/validation.ts";
export type { Schema, ValidationRule, ValidationSchema } from "./middleware/validation.ts";

// Error Handling
export {
  AppError,
  AuthenticationError,
  AuthorizationError,
  createErrorMiddleware,
  DatabaseError,
  ErrorAnalytics,
  ErrorHandler,
  ErrorHandlerPresets,
  ErrorUtils,
  NotFoundError,
  RateLimitError,
  ValidationError as AppValidationError,
} from "./middleware/errorHandlerMiddleware.ts";
export type { ErrorConfig } from "./middleware/errorHandlerMiddleware.ts";

// Health Check
export {
  createHealthCheckMiddleware,
  HealthChecker,
  HealthCheckPresets,
  HealthCheckUtils,
  HealthMonitor,
} from "./middleware/healthCheckMiddlware.ts";
export type {
  DependencyHealth,
  HealthCheckConfig,
  HealthCheckResult,
  ResourceHealth,
  SystemHealth,
} from "./middleware/healthCheckMiddlware.ts";

// Logging
export {
  createLoggingMiddleware,
  HeaderSanitizer,
  Logger,
  LoggingUtils,
} from "./middleware/loggingMiddleware.ts";
export type { LoggingConfig } from "./middleware/loggingMiddleware.ts";

// Security
export {
  createSecurityMiddleware,
  SecurityMonitor,
  SecurityPresets,
  SecurityValidator,
} from "./middleware/securityMiddleware.ts";
export type { SecurityConfig } from "./middleware/securityMiddleware.ts";
