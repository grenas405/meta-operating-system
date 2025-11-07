import type { ILogger } from "../interfaces/ILogger.ts";
import { finalizeResponse } from "../utils/context.ts";
import type { Context, Handler, Middleware } from "../utils/context.ts";
import {
  createErrorMiddleware,
  type ErrorConfig,
  ErrorHandlerPresets,
} from "./errorHandlerMiddleware.ts";
import {
  createHealthCheckMiddleware,
  type HealthCheckConfig,
  HealthCheckPresets,
} from "./healthCheckMiddlware.ts";
import {
  createLoggingMiddleware,
  Logger,
  type LoggingConfig,
} from "./loggingMiddleware.ts";
import {
  createSecurityMiddleware,
  type SecurityConfig,
  SecurityPresets,
} from "./securityMiddleware.ts";
import {
  StaticFileHandler,
  StaticFilePresets,
  type StaticFileConfig,
} from "./staticHandlerMiddleware.ts";
import { PerformanceMonitor } from "./performanceMonitor.ts";
import {
  createCorsMiddleware,
  CorsPresets,
  type CorsOptions,
} from "./corsMiddleware.ts";

/**
 * Compose multiple middleware functions into a single handler.
 */
export function compose(
  middleware: Middleware[],
  finalHandler: Handler,
): Handler {
  return async (ctx: Context): Promise<Response> => {
    let index = -1;

    const dispatch = async (i: number): Promise<Response> => {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;

      if (i === middleware.length) {
        const result = await finalHandler(ctx);
        return result ? result : finalizeResponse(ctx);
      }

      const fn = middleware[i];
      const result = await fn(ctx, () => dispatch(i + 1));
      return result ? result : finalizeResponse(ctx);
    };

    const response = await dispatch(0);
    return response ?? finalizeResponse(ctx);
  };
}

/**
 * Logger middleware - comprehensive request/response logging
 *
 * DEPRECATED: This function is maintained for backward compatibility.
 * New code should use logging() which provides comprehensive logging features.
 *
 * @deprecated Use logging() instead for full-featured logging with security, debug modes, etc.
 */
export function logger(logger: ILogger): Middleware {
  // Delegate to the comprehensive logging middleware
  return logging({
    environment: Deno.env.get("DENO_ENV") || "development",
    logLevel: "info",
    logRequests: true,
    logResponses: false,
  });
}

/**
 * CORS middleware - adds CORS headers using the staging pattern
 *
 * @example
 * // Development (allow all)
 * app.use(cors());
 *
 * @example
 * // Production (specific origins)
 * app.use(cors({
 *   origin: ["https://myapp.com", "https://admin.myapp.com"],
 *   credentials: true,
 * }));
 *
 * @example
 * // Using presets
 * app.use(cors(CorsPresets.PRODUCTION(["https://myapp.com"])));
 */
export function cors(options?: CorsOptions): Middleware {
  const environment = Deno.env.get("DENO_ENV") || Deno.env.get("ENV") || "development";

  // Auto-detect safe defaults based on environment
  let middleware: Middleware;
  if (!options) {
    if (environment === "production") {
      const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") ?? [];
      if (allowedOrigins.length === 0) {
        throw new Error(
          "CORS: Production environment requires ALLOWED_ORIGINS environment variable"
        );
      }
      middleware = createCorsMiddleware(CorsPresets.PRODUCTION(allowedOrigins));
    } else {
      middleware = createCorsMiddleware(CorsPresets.DEVELOPMENT);
    }
  } else {
    middleware = createCorsMiddleware(options);
  }

  Object.defineProperty(middleware, "name", { value: "cors" });
  return middleware;
}

/**
 * Error handling middleware with enhanced logging
 * Uses the comprehensive error handler from errorHandler.ts
 *
 * @param config - Optional error configuration. If not provided, uses environment-based defaults
 */
export function errorHandler(config?: ErrorConfig): Middleware {
  // Auto-detect environment if not provided
  const environment = Deno.env.get("DENO_ENV") || Deno.env.get("ENV") ||
    "development";

  // Use preset based on environment
  const defaultConfig = environment === "production"
    ? ErrorHandlerPresets.PRODUCTION
    : ErrorHandlerPresets.DEVELOPMENT;

  const finalConfig = config || defaultConfig;

  const middleware = createErrorMiddleware(finalConfig);
  Object.defineProperty(middleware, "name", { value: "errorHandler" });
  return middleware;
}

/**
 * Timing middleware - adds X-Response-Time header
 */
export function timing(): Middleware {
  const middleware = async (ctx: Context, next: () => Promise<Response>) => {
    const start = Date.now();
    const response = await next();
    const duration = Date.now() - start;

    const headers = new Headers(response.headers);
    headers.set("X-Response-Time", `${duration}ms`);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };

  Object.defineProperty(middleware, "name", { value: "timing" });
  return middleware;
}

/**
 * Request ID middleware - adds unique request ID
 */
export function requestId(): Middleware {
  const middleware = async (ctx: Context, next: () => Promise<Response>) => {
    const id = crypto.randomUUID();
    ctx.state.requestId = id;

    const response = await next();

    const headers = new Headers(response.headers);
    headers.set("X-Request-ID", id);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };

  Object.defineProperty(middleware, "name", { value: "requestId" });
  return middleware;
}

/**
 * Health check middleware - adds health check endpoint
 *
 * @param performanceMonitor - Performance monitoring instance
 * @param config - Optional health check configuration
 */
export function healthCheck(
  performanceMonitor?: PerformanceMonitor,
  config?: HealthCheckConfig,
): Middleware {
  const environment = Deno.env.get("DENO_ENV") || Deno.env.get("ENV") ||
    "development";

  const defaultConfig: HealthCheckConfig = environment === "production"
    ? HealthCheckPresets.PRODUCTION
    : HealthCheckPresets.DEVELOPMENT;

  const finalConfig = { ...defaultConfig, ...config };

  const healthMiddleware = createHealthCheckMiddleware(
    performanceMonitor,
    finalConfig,
  );

  const middleware = (ctx: Context, next: () => Promise<Response>) =>
    healthMiddleware(ctx, next);

  Object.defineProperty(middleware, "name", { value: "healthCheck" });
  return middleware;
}

/**
 * Logging middleware - comprehensive request/response logging
 *
 * @param config - Optional logging configuration
 */
export function logging(config?: LoggingConfig): Middleware {
  const environment = Deno.env.get("DENO_ENV") || Deno.env.get("ENV") ||
    "development";

  const defaultConfig: LoggingConfig = {
    environment,
    logLevel: environment === "production" ? "info" : "debug",
    logRequests: true,
    logResponses: environment === "production",
  };

  const finalConfig = { ...defaultConfig, ...config };

  const loggingMiddleware = createLoggingMiddleware(finalConfig);

  const middleware = (ctx: Context, next: () => Promise<Response>) =>
    loggingMiddleware(ctx, next);

  Object.defineProperty(middleware, "name", { value: "logging" });
  return middleware;
}

/**
 * Security middleware - adds security headers and protections
 *
 * @param config - Optional security configuration
 */
export function security(config?: SecurityConfig): Middleware {
  const environment = Deno.env.get("DENO_ENV") || Deno.env.get("ENV") ||
    "development";

  const defaultConfig: SecurityConfig = environment === "production"
    ? { environment, ...SecurityPresets.BALANCED }
    : { environment, ...SecurityPresets.DEVELOPMENT };

  const finalConfig = { ...defaultConfig, ...config };

  const securityMiddleware = createSecurityMiddleware(finalConfig);

  const middleware = (ctx: Context, next: () => Promise<Response>) =>
    securityMiddleware(ctx, next);

  Object.defineProperty(middleware, "name", { value: "security" });
  return middleware;
}

/**
 * Static file middleware - serves assets with sane defaults
 *
 * @param config - Optional overrides merged with environment defaults
 */
export function staticHandler(
  config?: Partial<StaticFileConfig>,
): Middleware {
  const environment = Deno.env.get("DENO_ENV") || Deno.env.get("ENV") ||
    "development";

  const defaultConfig = environment === "production"
    ? StaticFilePresets.PRODUCTION
    : StaticFilePresets.DEVELOPMENT;

  const finalConfig: StaticFileConfig = {
    ...defaultConfig,
    ...config,
  };

  const middleware = StaticFileHandler.createMiddleware(finalConfig);
  Object.defineProperty(middleware, "name", { value: "staticHandler" });
  return middleware;
}

// ================================================================================
// 🌐 CORS MIDDLEWARE
// ================================================================================

/**
 * CORS middleware types and presets
 * Re-exported for convenience when configuring CORS
 */
export { CorsPresets, type CorsOptions } from "./corsMiddleware.ts";

// ================================================================================
// 📦 BODY PARSING MIDDLEWARE
// ================================================================================

/**
 * Body parser middleware exports
 * Parse and validate request bodies (JSON, form-data, multipart, text)
 */
export {
  json,
  urlencoded,
  multipart,
  text,
  bodyParser,
} from "./parsers.ts";

// ================================================================================
// ✅ VALIDATION MIDDLEWARE
// ================================================================================

/**
 * Request validation middleware and utilities
 * Schema-based validation with comprehensive error handling
 */
export {
  // Main validation middleware
  validator,
  validate,

  // Error class
  ValidationError,

  // Helper functions for creating validation schemas
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

  // Types
  type ValidationRule,
  type ValidationSchema,
  type Schema,
} from "./validation.ts";

// ================================================================================
// 🔄 RE-EXPORTS FROM UTILITIES
// ================================================================================

/**
 * Re-export commonly used utilities from @core/utils
 * Makes it convenient to import everything from middleware module
 */
export {
  createContext,
  finalizeResponse,
  commitResponse,
  type Context,
  type Handler,
  type Middleware,
  type ResponseState,
} from "../utils/context.ts";

export {
  json as jsonResponse,
  text as textResponse,
  html as htmlResponse,
  redirect,
  notFound,
  badRequest,
  internalError,
  forbidden,
  unauthorized,
  noContent,
  status,
  type ResponseOptions,
} from "../utils/response.ts";
