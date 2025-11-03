import { ConsoleStyler } from "../utils/console-styler/mod.ts";
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
import { PerformanceMonitor } from "./performanceMonitor.ts";

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
 * Logger middleware - logs request method and path with colors and emojis
 */
export function logger(): Middleware {
  return async (ctx, next) => {
    const start = Date.now();
    const response = await next();
    const duration = Date.now() - start;

    // Get response body size if available
    const contentLength = response.headers.get("content-length");
    const size = contentLength ? parseInt(contentLength, 10) : undefined;

    ConsoleStyler.logRequest(
      ctx.request.method,
      ctx.url.pathname,
      response.status,
      duration,
      size,
    );

    return response;
  };
}

/**
 * CORS middleware - adds CORS headers
 */
export function cors(options: {
  origin?: string;
  methods?: string[];
  headers?: string[];
} = {}): Middleware {
  const origin = options.origin ?? "*";
  const methods = options.methods?.join(", ") ??
    "GET, POST, PUT, DELETE, OPTIONS";
  const headers = options.headers?.join(", ") ?? "Content-Type, Authorization";

  return async (ctx, next) => {
    // Handle preflight
    if (ctx.request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": methods,
          "Access-Control-Allow-Headers": headers,
        },
      });
    }

    const response = await next();

    // Clone response to add headers
    const headers_obj = new Headers(response.headers);
    headers_obj.set("Access-Control-Allow-Origin", origin);
    headers_obj.set("Access-Control-Allow-Methods", methods);
    headers_obj.set("Access-Control-Allow-Headers", headers);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers_obj,
    });
  };
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

  return createErrorMiddleware(finalConfig);
}

/**
 * Timing middleware - adds X-Response-Time header
 */
export function timing(): Middleware {
  return async (ctx, next) => {
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
}

/**
 * Request ID middleware - adds unique request ID
 */
export function requestId(): Middleware {
  return async (ctx, next) => {
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

  return (ctx, next) => healthMiddleware(ctx, next);
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

  return (ctx, next) => loggingMiddleware(ctx, next);
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

  return (ctx, next) => securityMiddleware(ctx, next);
}
