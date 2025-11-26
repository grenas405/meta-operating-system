/**
 * Meta Operating System - Public API
 * Modular HTTP server framework for Deno
 * No external dependencies - uses only Deno built-in APIs
 */

// Kernel
export { Kernel } from "./kernel.ts";
export type {
  KernelConfig,
  ManagedProcess,
  ProcessHealthCheck,
  SystemInfo,
} from "./interfaces/kernel.d.ts";

// Server
export { HTTPServer } from "./core/server.ts";
export type { ServerConfig } from "./core/server.ts";

// Router
export { createRouter, Router } from "./core/router.ts";
export type { RouteHandler } from "./core/router.ts";

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
} from "./core/middleware/index.ts";
export { createContext } from "./core/utils/context.ts";
export type { Context, Handler, Middleware } from "./core/utils/context.ts";

// Performance Monitoring
export {
  createPerformanceMiddleware,
  PerformanceAnalyzer,
  PerformanceMonitor,
} from "./core/middleware/performanceMonitor.ts";

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
} from "./core/utils/response.ts";
export type { ResponseOptions } from "./core/utils/response.ts";

// Body parsers
export {
  bodyParser,
  json as jsonParser,
  multipart,
  text as textParser,
  urlencoded,
} from "./core/middleware/parsers.ts";

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
} from "./core/middleware/validation.ts";
export type {
  Schema,
  ValidationRule,
  ValidationSchema,
} from "./core/middleware/validation.ts";

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
} from "./core/middleware/errorHandlerMiddleware.ts";
export type { ErrorConfig } from "./core/middleware/errorHandlerMiddleware.ts";

// Health Check
export {
  createHealthCheckMiddleware,
  HealthChecker,
  HealthCheckPresets,
  HealthCheckUtils,
  HealthMonitor,
} from "./core/middleware/healthCheckMiddlware.ts";
export type {
  DependencyHealth,
  HealthCheckConfig,
  HealthCheckResult,
  ResourceHealth,
  SystemHealth,
} from "./core/middleware/healthCheckMiddlware.ts";

// Logging
export {
  createLoggingMiddleware,
  HeaderSanitizer,
  Logger,
  LoggingUtils,
} from "./core/middleware/loggingMiddleware.ts";
export type { LoggingConfig } from "./core/middleware/loggingMiddleware.ts";

// Security
export {
  createSecurityMiddleware,
  SecurityMonitor,
  SecurityPresets,
  SecurityValidator,
} from "./core/middleware/securityMiddleware.ts";
export type { SecurityConfig } from "./core/middleware/securityMiddleware.ts";

// Core interfaces and adapters
export type { ILogger } from "./core/interfaces/mod.ts";
export { defaultLogger } from "./core/adapters/mod.ts";

// Configuration
export { env } from "./core/config/mod.ts";
