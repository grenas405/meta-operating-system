# Middleware Examples

Comprehensive examples for using the DenoGenesis middleware system. Each middleware can be used individually or composed together in a stack.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Individual Middleware](#individual-middleware)
   - [Logger](#logger)
   - [CORS](#cors)
   - [Error Handler](#error-handler)
   - [Timing](#timing)
   - [Request ID](#request-id)
   - [Health Check](#health-check)
   - [Logging](#logging)
   - [Security](#security)
   - [Static Files](#static-files)
   - [Performance Monitoring](#performance-monitoring)
3. [Full Stack Examples](#full-stack-examples)
   - [Development Setup](#development-setup)
   - [Production Setup](#production-setup)
   - [Minimal API](#minimal-api)
   - [Full-Featured Application](#full-featured-application)

---

## Quick Start

```typescript
import { compose, logger, errorHandler } from "./middleware/index.ts";
import type { Context } from "./utils/context.ts";

// Define your handler
const handler = (ctx: Context): Response => {
  return new Response("Hello World!");
};

// Compose middleware
const app = compose(
  [logger(), errorHandler()],
  handler
);

// Use it
const response = await app(ctx);
```

---

## Individual Middleware

### Logger

Simple, colorful request logging for development.

```typescript
import { logger } from "./middleware/index.ts";

// Basic usage
const middleware = logger();

// Logs output:
// GET /api/users 200 OK 45ms 1.2KB
// POST /api/posts 201 Created 123ms 3.5KB
```

**Features:**
- Method, path, status code
- Response duration and size
- Color-coded status (green for 2xx, yellow for 3xx, red for 4xx/5xx)

---

### CORS

Cross-Origin Resource Sharing configuration.

```typescript
import { cors } from "./middleware/index.ts";

// Default configuration (permissive)
const middleware1 = cors();
// Allows: origin: *, methods: GET/POST/PUT/DELETE/OPTIONS
// Headers: Content-Type, Authorization

// Custom configuration
const middleware2 = cors({
  origin: "https://example.com",
  methods: ["GET", "POST"],
  headers: ["Content-Type", "X-Custom-Header"],
});

// Multiple origins (use a custom implementation)
const middleware3 = cors({
  origin: "*", // Or implement custom logic in your handler
});
```

**Use Cases:**
- Public APIs: Use default permissive settings
- Private APIs: Restrict to specific origins
- Development: Allow localhost origins

---

### Error Handler

Comprehensive error handling with environment-aware responses.

```typescript
import { errorHandler, ErrorHandlerPresets } from "./middleware/index.ts";

// Auto-detect environment (checks DENO_ENV or ENV)
const middleware1 = errorHandler();

// Development mode (detailed errors with stack traces)
const middleware2 = errorHandler(ErrorHandlerPresets.DEVELOPMENT);

// Production mode (sanitized errors, no stack traces)
const middleware3 = errorHandler(ErrorHandlerPresets.PRODUCTION);

// Custom configuration
const middleware4 = errorHandler({
  environment: "staging",
  enableStackTrace: true,
  enableRequestLogging: true,
  enableResponseTiming: true,
  sanitizeSensitiveData: true,
  maxStackTraceDepth: 10,
});
```

**Error Handling in Routes:**

```typescript
import { NotFoundError, ValidationError, AuthorizationError } from "./middleware/errorHandlerMiddleware.ts";

// Throw specific errors
const handler = (ctx: Context): Response => {
  const userId = ctx.params.id;

  if (!userId) {
    throw new ValidationError("User ID is required", ctx.state.requestId);
  }

  const user = await findUser(userId);

  if (!user) {
    throw new NotFoundError("User", ctx.state.requestId);
  }

  if (!ctx.state.user.isAdmin) {
    throw new AuthorizationError("Admin access required", ctx.state.requestId);
  }

  return new Response(JSON.stringify(user));
};
```

**Available Error Classes:**
- `ValidationError` - Invalid input (400)
- `AuthenticationError` - Missing/invalid auth (401)
- `AuthorizationError` - Insufficient permissions (403)
- `NotFoundError` - Resource not found (404)
- `ConflictError` - Resource conflict (409)
- `RateLimitError` - Too many requests (429)

---

### Timing

Adds `X-Response-Time` header to responses.

```typescript
import { timing } from "./middleware/index.ts";

const middleware = timing();

// Response headers will include:
// X-Response-Time: 45ms
```

**Use Cases:**
- Performance monitoring
- Debugging slow endpoints
- Client-side performance tracking

---

### Request ID

Adds unique request identifier for tracing.

```typescript
import { requestId } from "./middleware/index.ts";

const middleware = requestId();

// Adds to context:
// ctx.state.requestId = "550e8400-e29b-41d4-a716-446655440000"

// Adds response header:
// X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
```

**Use Cases:**
- Distributed tracing
- Log correlation
- Debugging specific requests

**Usage in Handlers:**

```typescript
const handler = (ctx: Context): Response => {
  const requestId = ctx.state.requestId;

  console.log(`Processing request ${requestId}`);

  return new Response(JSON.stringify({ requestId }));
};
```

---

### Health Check

System health monitoring with dependency checks.

```typescript
import { healthCheck, HealthCheckPresets } from "./middleware/index.ts";
import { PerformanceMonitor } from "./middleware/performanceMonitor.ts";

// Basic health check
const middleware1 = healthCheck();

// With performance monitoring
const monitor = new PerformanceMonitor();
const middleware2 = healthCheck(monitor);

// Development configuration (verbose)
const middleware3 = healthCheck(monitor, HealthCheckPresets.DEVELOPMENT);

// Production configuration (minimal info)
const middleware4 = healthCheck(monitor, HealthCheckPresets.PRODUCTION);

// Custom configuration
const middleware5 = healthCheck(monitor, {
  endpoint: "/health",
  includeSystemInfo: true,
  includeMemoryInfo: true,
  includeUptime: true,
  includeDependencies: true,
  cacheTimeout: 5000, // Cache results for 5 seconds
  customChecks: [
    async () => {
      // Check database connection
      const dbOk = await checkDatabase();
      return {
        name: "database",
        status: dbOk ? "healthy" : "unhealthy",
        message: dbOk ? "Connected" : "Connection failed",
      };
    },
    async () => {
      // Check external API
      const apiOk = await checkExternalAPI();
      return {
        name: "external-api",
        status: apiOk ? "healthy" : "degraded",
        message: apiOk ? "Responding" : "Slow response",
      };
    },
  ],
});
```

**Health Check Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-11-04T12:34:56.789Z",
  "uptime": 86400,
  "system": {
    "memory": {
      "used": 45678912,
      "total": 134217728,
      "percentage": 34.02
    },
    "cpu": {
      "usage": 12.5
    }
  },
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "message": "Connected"
    },
    {
      "name": "external-api",
      "status": "healthy",
      "message": "Responding"
    }
  ]
}
```

**Status Codes:**
- `200 OK` - All checks healthy
- `207 Multi-Status` - Some checks degraded
- `503 Service Unavailable` - Critical checks failed

---

### Logging

Comprehensive request/response logging with security.

```typescript
import { logging } from "./middleware/index.ts";

// Auto-detect environment
const middleware1 = logging();

// Custom configuration
const middleware2 = logging({
  environment: "production",
  logLevel: "info", // debug, info, warn, error
  logRequests: true,
  logResponses: false, // Avoid logging response bodies in production
  logHeaders: false, // Sensitive data
  logBody: false, // Sensitive data
  sanitizeSensitiveData: true,
  colorize: true,
});
```

**Standalone Logger Usage:**

```typescript
import { Logger } from "./middleware/loggingMiddleware.ts";

const logger = new Logger({
  environment: "production",
  logLevel: "info",
});

// Log levels
logger.debug("Debugging info", { userId: 123 });
logger.info("User logged in", { userId: 123 });
logger.warn("Slow query detected", { duration: 5000 });
logger.error("Database connection failed", { error: err.message });

// Structured logging
logger.info("Payment processed", {
  userId: 123,
  amount: 99.99,
  currency: "USD",
  transactionId: "txn_123",
});
```

**Security Features:**
- Automatically sanitizes `Authorization` headers
- Redacts `password`, `token`, `secret` fields
- Filters sensitive query parameters
- Respects log levels (production uses higher thresholds)

---

### Security

Comprehensive security headers and protections.

```typescript
import { security, SecurityPresets } from "./middleware/index.ts";

// Auto-detect environment
const middleware1 = security();

// Development preset (relaxed CSP for easier debugging)
const middleware2 = security(SecurityPresets.DEVELOPMENT);

// Balanced preset (good for most production apps)
const middleware3 = security(SecurityPresets.BALANCED);

// Strict preset (maximum security)
const middleware4 = security(SecurityPresets.STRICT);

// Custom configuration
const middleware5 = security({
  environment: "production",

  // Content Security Policy
  enableCSP: true,
  cspDirectives: {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "cdn.example.com"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "https:"],
    "connect-src": ["'self'", "api.example.com"],
    "font-src": ["'self'", "fonts.googleapis.com"],
    "frame-ancestors": ["'none'"],
  },

  // HTTP Strict Transport Security
  enableHSTS: true,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubDomains: true,
  hstsPreload: true,

  // Other headers
  enableXFrameOptions: true,
  xFrameOptions: "DENY",
  enableXContentTypeOptions: true,
  enableReferrerPolicy: true,
  referrerPolicy: "strict-origin-when-cross-origin",

  // Permissions Policy
  enablePermissionsPolicy: true,
  permissionsPolicy: {
    camera: ["none"],
    microphone: ["none"],
    geolocation: ["self"],
    payment: ["self"],
  },

  // Security checks
  enablePathTraversalCheck: true,
  enableMaliciousPatternCheck: true,
});
```

**Security Headers Applied:**

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
```

**Protection Against:**
- Cross-Site Scripting (XSS)
- Clickjacking
- MIME type sniffing
- Man-in-the-Middle (MITM)
- Path traversal attacks
- Protocol downgrade attacks

---

### Static Files

Efficient static file serving with caching and compression.

```typescript
import { createStaticFileMiddleware, StaticFilePresets } from "./middleware/staticHandlerMiddleware.ts";

// Basic usage
const middleware1 = createStaticFileMiddleware({
  root: "./public",
});

// Development preset
const middleware2 = createStaticFileMiddleware({
  ...StaticFilePresets.DEVELOPMENT,
  root: "./public",
});

// Production preset (with caching and compression)
const middleware3 = createStaticFileMiddleware({
  ...StaticFilePresets.PRODUCTION,
  root: "./public",
});

// Custom configuration
const middleware4 = createStaticFileMiddleware({
  root: "./public",
  prefix: "/static", // Serve files under /static/*
  index: "index.html",
  enableCaching: true,
  maxAge: 31536000, // 1 year for immutable assets
  enableCompression: true,
  compressionThreshold: 1024, // Compress files > 1KB
  enableETag: true,
  enableLastModified: true,
  enableDotFiles: false, // Block hidden files
  enableDirectoryListing: false,
  customMimeTypes: {
    ".foo": "application/x-foo",
  },
});
```

**Directory Structure:**

```
public/
├── index.html
├── styles/
│   ├── app.css
│   └── theme.css
├── scripts/
│   ├── app.js
│   └── vendor.js
└── images/
    ├── logo.png
    └── banner.jpg
```

**URL Mappings:**

```
GET /index.html       → public/index.html
GET /styles/app.css   → public/styles/app.css
GET /images/logo.png  → public/images/logo.png
GET /                 → public/index.html (if index enabled)
```

**Caching Strategy:**

```typescript
// Long-term caching for versioned assets
const versionedAssets = createStaticFileMiddleware({
  root: "./public/assets",
  prefix: "/assets",
  maxAge: 31536000, // 1 year
  enableETag: true,
});

// Short caching for HTML (frequently updated)
const htmlFiles = createStaticFileMiddleware({
  root: "./public",
  maxAge: 300, // 5 minutes
  enableETag: true,
});
```

---

### Performance Monitoring

Track request performance and system metrics.

```typescript
import { PerformanceMonitor, createPerformanceMiddleware } from "./middleware/performanceMonitor.ts";

const monitor = new PerformanceMonitor();

// Add to middleware stack
const perfMiddleware = createPerformanceMiddleware(monitor, true); // true = development mode

// Access metrics
const metrics = monitor.getMetrics();
console.log(metrics);
```

**Metrics Output:**

```json
{
  "totalRequests": 1523,
  "averageResponseTime": 45.3,
  "requestsPerSecond": 12.7,
  "errorRate": 0.02,
  "uptime": 86400,
  "memory": {
    "used": 45678912,
    "total": 134217728,
    "percentage": 34.02
  },
  "endpoints": {
    "/api/users": {
      "count": 523,
      "averageTime": 23.4,
      "errors": 2
    },
    "/api/posts": {
      "count": 1000,
      "averageTime": 56.2,
      "errors": 28
    }
  },
  "recentRequests": [
    {
      "method": "GET",
      "path": "/api/users",
      "status": 200,
      "duration": 23
    }
  ]
}
```

**Expose Metrics Endpoint:**

```typescript
// In your router
router.get("/admin/metrics", async (ctx) => {
  // Add authentication here!
  const metrics = monitor.getMetrics();
  return new Response(JSON.stringify(metrics, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
```

---

## Full Stack Examples

### Development Setup

Optimized for debugging with verbose logging and relaxed security.

```typescript
import {
  compose,
  logger,
  cors,
  errorHandler,
  timing,
  requestId,
  healthCheck,
  security,
  ErrorHandlerPresets,
  SecurityPresets,
  HealthCheckPresets,
} from "./middleware/index.ts";
import { PerformanceMonitor } from "./middleware/performanceMonitor.ts";
import type { Context, Handler } from "./utils/context.ts";

// Create performance monitor
const monitor = new PerformanceMonitor();

// Your application handler
const appHandler: Handler = (ctx: Context): Response => {
  return new Response("Development Server Running!");
};

// Compose middleware stack
const app = compose(
  [
    // Security (relaxed for development)
    security(SecurityPresets.DEVELOPMENT),

    // Request tracking
    requestId(),
    timing(),

    // Logging (verbose)
    logger(),

    // CORS (permissive)
    cors(),

    // Health check (detailed)
    healthCheck(monitor, HealthCheckPresets.DEVELOPMENT),

    // Error handling (with stack traces)
    errorHandler(ErrorHandlerPresets.DEVELOPMENT),
  ],
  appHandler
);

// Start server (example)
Deno.serve({ port: 8000 }, app);
```

**Features:**
- Detailed error messages with stack traces
- Verbose logging
- Permissive CORS
- Comprehensive health checks
- Request timing and IDs

---

### Production Setup

Optimized for performance and security.

```typescript
import {
  compose,
  cors,
  errorHandler,
  timing,
  requestId,
  healthCheck,
  logging,
  security,
  ErrorHandlerPresets,
  SecurityPresets,
  HealthCheckPresets,
} from "./middleware/index.ts";
import { PerformanceMonitor } from "./middleware/performanceMonitor.ts";
import type { Context, Handler } from "./utils/context.ts";

// Create performance monitor
const monitor = new PerformanceMonitor();

// Your application handler
const appHandler: Handler = (ctx: Context): Response => {
  return new Response("Production Server Running!");
};

// Compose middleware stack
const app = compose(
  [
    // Security (strict)
    security(SecurityPresets.STRICT),

    // Request tracking
    requestId(),
    timing(),

    // Logging (production-safe)
    logging({
      environment: "production",
      logLevel: "info",
      logRequests: true,
      logResponses: false, // Don't log response bodies
      sanitizeSensitiveData: true,
    }),

    // CORS (restrictive)
    cors({
      origin: "https://yourdomain.com",
      methods: ["GET", "POST", "PUT", "DELETE"],
      headers: ["Content-Type", "Authorization"],
    }),

    // Health check (minimal info)
    healthCheck(monitor, HealthCheckPresets.PRODUCTION),

    // Error handling (sanitized)
    errorHandler(ErrorHandlerPresets.PRODUCTION),
  ],
  appHandler
);

// Start server
Deno.serve({ port: 8000 }, app);
```

**Features:**
- Sanitized error messages (no stack traces)
- Minimal logging (no sensitive data)
- Strict CORS policy
- Comprehensive security headers
- Efficient caching

---

### Minimal API

Bare minimum for a simple API.

```typescript
import { compose, errorHandler, cors } from "./middleware/index.ts";
import type { Context, Handler } from "./utils/context.ts";

const apiHandler: Handler = (ctx: Context): Response => {
  return new Response(JSON.stringify({ message: "Hello API!" }), {
    headers: { "Content-Type": "application/json" },
  });
};

const app = compose(
  [
    cors(), // Allow cross-origin requests
    errorHandler(), // Handle errors gracefully
  ],
  apiHandler
);

Deno.serve({ port: 8000 }, app);
```

---

### Full-Featured Application

Complete setup with all middleware.

```typescript
import {
  compose,
  cors,
  errorHandler,
  timing,
  requestId,
  healthCheck,
  logging,
  security,
  ErrorHandlerPresets,
  SecurityPresets,
  HealthCheckPresets,
} from "./middleware/index.ts";
import {
  createStaticFileMiddleware,
  StaticFilePresets,
} from "./middleware/staticHandlerMiddleware.ts";
import { PerformanceMonitor } from "./middleware/performanceMonitor.ts";
import type { Context, Handler } from "./utils/context.ts";

// Environment detection
const isDev = Deno.env.get("DENO_ENV") === "development";
const monitor = new PerformanceMonitor();

// Static file serving
const staticMiddleware = createStaticFileMiddleware({
  ...(isDev ? StaticFilePresets.DEVELOPMENT : StaticFilePresets.PRODUCTION),
  root: "./public",
  prefix: "/static",
});

// API handler
const apiHandler: Handler = (ctx: Context): Response => {
  // Your routing logic here
  if (ctx.url.pathname === "/api/hello") {
    return new Response(JSON.stringify({ message: "Hello!" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Serve static files
  return staticMiddleware(ctx, async () => {
    return new Response("Not Found", { status: 404 });
  });
};

// Compose full stack
const app = compose(
  [
    // Security first
    security(isDev ? SecurityPresets.DEVELOPMENT : SecurityPresets.STRICT),

    // Request tracking
    requestId(),
    timing(),

    // Logging
    logging({
      environment: isDev ? "development" : "production",
      logLevel: isDev ? "debug" : "info",
      logRequests: true,
      logResponses: isDev,
      sanitizeSensitiveData: !isDev,
    }),

    // CORS
    cors({
      origin: isDev ? "*" : "https://yourdomain.com",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      headers: ["Content-Type", "Authorization"],
    }),

    // Health monitoring
    healthCheck(
      monitor,
      isDev ? HealthCheckPresets.DEVELOPMENT : HealthCheckPresets.PRODUCTION
    ),

    // Error handling (last)
    errorHandler(
      isDev ? ErrorHandlerPresets.DEVELOPMENT : ErrorHandlerPresets.PRODUCTION
    ),
  ],
  apiHandler
);

// Start server
console.log(`Server running on http://localhost:8000`);
Deno.serve({ port: 8000 }, app);
```

**Features:**
- Environment-aware configuration
- Static file serving
- Health monitoring
- Performance tracking
- Comprehensive security
- Request/response logging
- Error handling
- CORS support

---

## Advanced Patterns

### Conditional Middleware

Apply middleware only to specific routes.

```typescript
import { compose } from "./middleware/index.ts";
import type { Context, Handler, Middleware } from "./utils/context.ts";

function conditionalMiddleware(
  condition: (ctx: Context) => boolean,
  middleware: Middleware
): Middleware {
  return async (ctx, next) => {
    if (condition(ctx)) {
      return await middleware(ctx, next);
    }
    return await next();
  };
}

// Use it
const apiOnlyLogger = conditionalMiddleware(
  (ctx) => ctx.url.pathname.startsWith("/api"),
  logger()
);

const app = compose([apiOnlyLogger, errorHandler()], handler);
```

### Custom Health Checks

Add database and external service checks.

```typescript
import { healthCheck } from "./middleware/index.ts";

const middleware = healthCheck(monitor, {
  endpoint: "/health",
  customChecks: [
    // Database check
    async () => {
      try {
        await db.query("SELECT 1");
        return {
          name: "database",
          status: "healthy" as const,
          message: "Connected to PostgreSQL",
        };
      } catch (err) {
        return {
          name: "database",
          status: "unhealthy" as const,
          message: `Database error: ${err.message}`,
        };
      }
    },

    // Redis check
    async () => {
      try {
        await redis.ping();
        return {
          name: "redis",
          status: "healthy" as const,
          message: "Redis responding",
        };
      } catch (err) {
        return {
          name: "redis",
          status: "degraded" as const,
          message: "Redis unavailable (using fallback)",
        };
      }
    },

    // External API check
    async () => {
      try {
        const response = await fetch("https://api.example.com/health", {
          signal: AbortSignal.timeout(2000),
        });
        return {
          name: "external-api",
          status: response.ok ? "healthy" as const : "degraded" as const,
          message: `API status: ${response.status}`,
        };
      } catch (err) {
        return {
          name: "external-api",
          status: "unhealthy" as const,
          message: "API unreachable",
        };
      }
    },
  ],
});
```

### Metrics Dashboard

Expose performance metrics with authentication.

```typescript
import { PerformanceMonitor } from "./middleware/performanceMonitor.ts";

const monitor = new PerformanceMonitor();

// In your router
const metricsHandler = (ctx: Context): Response => {
  // Check authentication
  const authHeader = ctx.request.headers.get("Authorization");
  if (authHeader !== "Bearer your-secret-token") {
    return new Response("Unauthorized", { status: 401 });
  }

  // Return metrics
  const metrics = monitor.getMetrics();
  return new Response(JSON.stringify(metrics, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
};
```

---

## Best Practices

1. **Order Matters**: Place middleware in the correct order:
   - Security first
   - Request tracking (ID, timing)
   - Logging
   - CORS
   - Health checks
   - Error handling (last)

2. **Environment Awareness**: Use different configurations for dev/prod:
   ```typescript
   const isDev = Deno.env.get("DENO_ENV") === "development";
   errorHandler(isDev ? ErrorHandlerPresets.DEVELOPMENT : ErrorHandlerPresets.PRODUCTION)
   ```

3. **Secure by Default**: Use strict security presets in production:
   ```typescript
   security(SecurityPresets.STRICT)
   ```

4. **Monitor Performance**: Always use PerformanceMonitor in production:
   ```typescript
   const monitor = new PerformanceMonitor();
   healthCheck(monitor)
   ```

5. **Sanitize Logs**: Never log sensitive data in production:
   ```typescript
   logging({ sanitizeSensitiveData: true, logResponses: false })
   ```

6. **Health Checks**: Add custom checks for critical dependencies:
   ```typescript
   healthCheck(monitor, { customChecks: [dbCheck, cacheCheck] })
   ```

7. **Error Handling**: Use specific error classes for better error handling:
   ```typescript
   throw new NotFoundError("User", requestId);
   ```

---

## Troubleshooting

### CORS Issues

**Problem**: Requests blocked by CORS

**Solution**: Configure CORS properly

```typescript
cors({
  origin: "https://your-frontend.com",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  headers: ["Content-Type", "Authorization"],
})
```

### Health Check Not Responding

**Problem**: `/health` endpoint returns 404

**Solution**: Ensure health check middleware is in the stack and check endpoint configuration

```typescript
healthCheck(monitor, {
  endpoint: "/health", // Make sure this matches your request
})
```

### Static Files Not Found

**Problem**: Static files return 404

**Solution**: Check root path and prefix configuration

```typescript
createStaticFileMiddleware({
  root: "./public", // Relative to working directory
  prefix: "/static", // URL prefix
})
```

### Performance Issues

**Problem**: Slow requests

**Solution**: Use PerformanceMonitor to identify bottlenecks

```typescript
const monitor = new PerformanceMonitor();
// Check metrics at /admin/metrics
// Look for endpoints with high averageTime
```

---

## Further Reading

- [Framework Philosophy](../../docs/02-framework/philosophy.md)
- [Middleware Architecture](../../docs/04-api-reference/core/middleware.md)
- [Security Best Practices](../../docs/02-framework/security.md)
- [Performance Optimization](../../docs/02-framework/performance.md)
