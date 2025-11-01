/**
 * HTTP Module
 * Modular HTTP server framework for Deno-Genesis
 * No external dependencies - uses only Deno built-in APIs
 */

// Server
export { Server, createServer } from "../server.ts";
export type { ServerConfig } from "../server.ts";

// Router
export { Router, createRouter } from "../router.ts";
export type { RouteHandler } from "../router.ts";

// Middleware
export {
  compose,
  logger,
  cors,
  errorHandler,
  timing,
  requestId,
  healthCheck,
  logging,
  security,
} from "../middleware/index.ts";
export { createContext } from "./context.ts";
export type { Context, Handler, Middleware } from "./context.ts";

// Performance Monitoring
export {
  PerformanceMonitor,
  createPerformanceMiddleware,
  PerformanceAnalyzer,
} from "../middleware/performanceMonitor.ts";

// Response helpers
export {
  json,
  text,
  html,
  redirect,
  notFound,
  badRequest,
  internalError,
  forbidden,
  unauthorized,
  noContent,
  status,
} from "./response.ts";
export type { ResponseOptions } from "./response.ts";

// Body parsers
export {
  json as jsonParser,
  urlencoded,
  multipart,
  text as textParser,
  bodyParser,
} from "./parsers.ts";

// Validation
export {
  validate,
  validator,
  ValidationError,
  requiredString,
  optionalString,
  requiredNumber,
  optionalNumber,
  requiredBoolean,
  optionalBoolean,
  requiredEmail,
  requiredUrl,
  requiredEnum,
  requiredArray,
} from "./validator.ts";
export type { ValidationRule, ValidationSchema, Schema } from "./validator.ts";

// Error Handling
export {
  ErrorHandler,
  AppError,
  ValidationError as AppValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  DatabaseError,
  createErrorMiddleware,
  ErrorAnalytics,
  ErrorHandlerPresets,
  ErrorUtils,
} from "../middleware/errorHandlerMiddleware.ts";
export type { ErrorConfig } from "../middleware/errorHandlerMiddleware.ts";

// Health Check
export {
  createHealthCheckMiddleware,
  HealthChecker,
  HealthCheckUtils,
  HealthMonitor,
  HealthCheckPresets,
} from "../middleware/healthCheckMiddlware.ts";
export type {
  HealthCheckConfig,
  HealthCheckResult,
  SystemHealth,
  DependencyHealth,
  ResourceHealth,
} from "../middleware/healthCheckMiddlware.ts";

// Logging
export {
  Logger,
  createLoggingMiddleware,
  LoggingUtils,
  HeaderSanitizer,
} from "../middleware/loggingMiddleware.ts";
export type { LoggingConfig } from "../middleware/loggingMiddleware.ts";

// Security
export {
  createSecurityMiddleware,
  SecurityValidator,
  SecurityMonitor,
  SecurityPresets,
} from "../middleware/securityMiddleware.ts";
export type { SecurityConfig } from "../middleware/securityMiddleware.ts";
