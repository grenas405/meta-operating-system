/**
 * CORS Middleware for DenoGenesis Framework
 * 
 * Implements Cross-Origin Resource Sharing headers using the staging pattern.
 * This middleware properly uses ctx.response to stage headers instead of
 * cloning Response objects, following the framework's Unix Philosophy principles.
 */

import type { Context, Middleware } from "../utils/context.ts";
import { commitResponse, finalizeResponse } from "../utils/context.ts";

export interface CorsOptions {
  /**
   * Which origins can access your API.
   * - string: Single origin (e.g., "https://example.com")
   * - string[]: Multiple origins (e.g., ["https://app.com", "https://admin.app.com"])
   * - function: Dynamic validation (e.g., (origin) => allowedOrigins.includes(origin))
   * - "*": Allow all origins (use with caution)
   */
  origin?: string | string[] | ((origin: string) => boolean);
  
  /**
   * Which HTTP methods are allowed in cross-origin requests.
   * Default: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"]
   */
  methods?: string[];
  
  /**
   * Which headers the client can send in cross-origin requests.
   * Default: ["*"]
   */
  allowedHeaders?: string[];
  
  /**
   * Which headers the browser can access from the response.
   * Default: []
   */
  exposedHeaders?: string[];
  
  /**
   * Whether to allow credentials (cookies, authorization headers).
   * When true, origin cannot be "*".
   * Default: false
   */
  credentials?: boolean;
  
  /**
   * How long browsers can cache preflight responses (in seconds).
   * Default: 86400 (24 hours)
   */
  maxAge?: number;
}

/**
 * Determines if the request origin is allowed based on configuration.
 * 
 * @param requestOrigin - The Origin header from the request
 * @param configOrigin - The origin configuration (string, array, function, or wildcard)
 * @returns The allowed origin string, or null if not allowed
 */
function determineAllowedOrigin(
  requestOrigin: string | null,
  configOrigin: string | string[] | ((origin: string) => boolean)
): string | null {
  // No Origin header means same-origin request (or non-browser client)
  if (!requestOrigin) return null;
  
  // Wildcard allows all origins
  if (configOrigin === "*") return "*";
  
  // Single origin string
  if (typeof configOrigin === "string") {
    return configOrigin === requestOrigin ? requestOrigin : null;
  }
  
  // Array of allowed origins
  if (Array.isArray(configOrigin)) {
    return configOrigin.includes(requestOrigin) ? requestOrigin : null;
  }
  
  // Function for dynamic validation
  if (typeof configOrigin === "function") {
    return configOrigin(requestOrigin) ? requestOrigin : null;
  }
  
  return null;
}

/**
 * Sets CORS headers on the staged response context.
 * 
 * @param ctx - The request context
 * @param allowedOrigin - The origin to allow
 * @param config - The complete CORS configuration
 */
function setCorsHeaders(
  ctx: Context,
  allowedOrigin: string,
  config: Required<CorsOptions>
): void {
  const { headers } = ctx.response;
  
  // Primary CORS header - tells browser which origin is allowed
  headers.set("Access-Control-Allow-Origin", allowedOrigin);
  
  // If credentials are enabled, must use specific origin (not *)
  if (config.credentials) {
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  
  // Tell browser which HTTP methods are allowed
  if (config.methods.length > 0) {
    headers.set("Access-Control-Allow-Methods", config.methods.join(", "));
  }
  
  // Tell browser which request headers are allowed
  if (config.allowedHeaders.length > 0) {
    headers.set("Access-Control-Allow-Headers", config.allowedHeaders.join(", "));
  }
  
  // Tell browser which response headers JavaScript can access
  if (config.exposedHeaders.length > 0) {
    headers.set("Access-Control-Expose-Headers", config.exposedHeaders.join(", "));
  }
  
  // Tell browser how long to cache preflight response
  if (config.maxAge > 0) {
    headers.set("Access-Control-Max-Age", config.maxAge.toString());
  }
}

/**
 * Creates CORS middleware using the staging pattern.
 * 
 * For preflight requests (OPTIONS), this middleware:
 * 1. Sets CORS headers on ctx.response
 * 2. Commits the response with status 204
 * 3. Returns immediately without calling next()
 * 
 * For actual requests, this middleware:
 * 1. Sets CORS headers on ctx.response
 * 2. Calls next() to continue the middleware chain
 * 3. Merges staged headers into the final response
 * 
 * @param options - CORS configuration options
 * @returns Middleware function
 * 
 * @example
 * // Allow all origins (development)
 * const middleware = createCorsMiddleware();
 * 
 * @example
 * // Production configuration with specific origins
 * const middleware = createCorsMiddleware({
 *   origin: ["https://myapp.com", "https://admin.myapp.com"],
 *   credentials: true,
 *   methods: ["GET", "POST", "PUT", "DELETE"],
 *   allowedHeaders: ["Content-Type", "Authorization"],
 *   exposedHeaders: ["X-Request-ID"],
 * });
 * 
 * @example
 * // Dynamic origin validation
 * const middleware = createCorsMiddleware({
 *   origin: (origin) => {
 *     const allowed = Deno.env.get("ALLOWED_ORIGINS")?.split(",") ?? [];
 *     return allowed.includes(origin);
 *   },
 *   credentials: true,
 * });
 */
export function createCorsMiddleware(options: CorsOptions = {}): Middleware {
  // Merge provided options with secure defaults
  const config: Required<CorsOptions> = {
    origin: options.origin ?? "*",
    methods: options.methods ?? ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allowedHeaders: options.allowedHeaders ?? ["*"],
    exposedHeaders: options.exposedHeaders ?? [],
    credentials: options.credentials ?? false,
    maxAge: options.maxAge ?? 86400,
  };

  // Validate configuration
  if (config.credentials && config.origin === "*") {
    throw new Error(
      "CORS: Cannot use wildcard origin (*) with credentials enabled. " +
      "Specify explicit origins for security."
    );
  }

  return async (ctx: Context, next: () => Promise<Response>) => {
    // Extract the Origin header from the request
    const requestOrigin = ctx.request.headers.get("Origin");
    
    // Determine if this origin is allowed
    const allowedOrigin = determineAllowedOrigin(requestOrigin, config.origin);

    // If origin is allowed, stage CORS headers
    if (allowedOrigin) {
      setCorsHeaders(ctx, allowedOrigin, config);
    }

    // Handle preflight OPTIONS requests immediately
    // These are sent by browsers before the actual request to check permissions
    if (ctx.request.method === "OPTIONS") {
      commitResponse(ctx, { status: 204 });
      return finalizeResponse(ctx);
    }

    // For non-preflight requests, continue the middleware chain
    const response = await next();
    
    // If next() returned a response, merge staged CORS headers into it
    if (response) {
      const mergedHeaders = new Headers(response.headers);
      
      // Copy all staged headers into the final response
      for (const [key, value] of ctx.response.headers.entries()) {
        mergedHeaders.set(key, value);
      }
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: mergedHeaders,
      });
    }
    
    // If next() returned nothing, finalize using staged response
    return finalizeResponse(ctx);
  };
}

/**
 * Preset configurations for common CORS scenarios
 */
export const CorsPresets = {
  /**
   * Development preset - allows all origins
   * Use only in local development
   */
  DEVELOPMENT: {
    origin: "*",
    credentials: false,
  } as CorsOptions,

  /**
   * Production preset - requires explicit origin configuration
   * Enables credentials and restricts headers
   */
  PRODUCTION: (allowedOrigins: string[]): CorsOptions => ({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-Request-ID", "X-RateLimit-Remaining"],
    maxAge: 3600, // 1 hour
  }),

  /**
   * API preset - for public APIs without credentials
   */
  PUBLIC_API: {
    origin: "*",
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "X-API-Key"],
    exposedHeaders: ["X-Request-ID", "X-RateLimit-Remaining"],
  } as CorsOptions,

  /**
   * Strict preset - maximum security for sensitive APIs
   */
  STRICT: (allowedOrigins: string[]): CorsOptions => ({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-Request-ID"],
    maxAge: 600, // 10 minutes
  }),
};
