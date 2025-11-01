# Middleware Integration Guide

This document explains how the new middleware (errorHandler, healthCheck, logging, and security) have been integrated into the HTTP server framework.

## 📦 Integrated Middleware

The following enterprise-grade middleware have been integrated:

1. **Error Handler** (`errorHandler.ts`) - Comprehensive error management
2. **Health Check** (`healthCheck.ts`) - System health monitoring
3. **Logging** (`logging.ts`) - Advanced request/response logging
4. **Security** (`security.ts`) - Security headers and protections

## 🔧 Integration Points

### 1. Middleware Module (`middleware.ts`)

All middleware have been added to the main middleware module with convenience wrappers:

```typescript
// Import the middleware
import { security, logging, healthCheck, errorHandler } from "./middleware.ts";

// Use with sensible defaults (auto-detects environment)
app.use(security());           // Applies BALANCED or DEVELOPMENT preset
app.use(logging());            // Configures based on environment
app.use(healthCheck(monitor)); // Uses PRODUCTION or DEVELOPMENT preset
app.use(errorHandler());       // Uses PRODUCTION or DEVELOPMENT preset
```

### 2. Module Exports (`mod.ts`)

All new components are exported from the main module:

```typescript
// Health Check
export {
  createHealthCheckMiddleware,
  HealthChecker,
  HealthCheckUtils,
  HealthMonitor,
  HealthCheckPresets,
} from "./healthCheck.ts";

// Logging
export {
  Logger,
  createLoggingMiddleware,
  LoggingUtils,
  HeaderSanitizer,
} from "./logging.ts";

// Security
export {
  createSecurityMiddleware,
  SecurityValidator,
  SecurityMonitor,
  SecurityPresets,
} from "./security.ts";

// Error Handling (already integrated)
export {
  ErrorHandler,
  AppError,
  createErrorMiddleware,
  // ... etc
} from "./errorHandler.ts";
```

## 🎯 Correct Middleware Order

**CRITICAL**: Middleware must be applied in this order:

```typescript
const server = createServer();

// 1. SECURITY (First - protects everything)
server.use(security());

// 2. REQUEST ID (For tracing)
server.use(requestId());

// 3. LOGGING (After security, before routes)
server.use(logging());

// 4. PERFORMANCE (Monitor metrics)
server.use(createPerformanceMiddleware(monitor));

// 5. TIMING (Add response time headers)
server.use(timing());

// 6. HEALTH CHECK (Before CORS)
server.use(healthCheck(monitor));

// 7. CORS (If needed)
server.use(cors());

// 8. BODY PARSERS (Before routes)
server.use(bodyParser());

// 9. YOUR ROUTES
server.get('/api/users', handler);

// 10. ERROR HANDLER (Last - catches all errors)
server.use(errorHandler());
```

## 📚 Usage Examples

### Basic Setup (Development)

```typescript
import { createServer, security, logging, healthCheck, errorHandler } from "./mod.ts";

const server = createServer({ port: 8000 });

// Auto-detects development environment
server.use(security());      // Uses DEVELOPMENT preset
server.use(logging());       // Uses debug level
server.use(healthCheck());   // Basic health check
server.use(errorHandler());  // Shows stack traces

server.get('/', () => json({ message: 'Hello!' }));

await server.listen();
```

### Production Setup

```typescript
import {
  createServer,
  security,
  logging,
  healthCheck,
  errorHandler,
  PerformanceMonitor,
  SecurityPresets,
  HealthCheckUtils,
} from "./mod.ts";

// Set production environment
Deno.env.set("DENO_ENV", "production");

const monitor = new PerformanceMonitor();

const server = createServer({ port: 8000 });

// Production security (HSTS, strict CSP)
server.use(security({
  environment: 'production',
  ...SecurityPresets.MAXIMUM_SECURITY,
}));

// Production logging (info level, file logging)
server.use(logging({
  environment: 'production',
  logLevel: 'info',
  logRequests: true,
  logResponses: true,
}));

// Production health check (with dependencies)
server.use(healthCheck(monitor, {
  endpoint: '/health',
  includeMetrics: true,
  enableDetailedChecks: true,
  customChecks: [
    HealthCheckUtils.createDatabaseCheck(db, 'postgres'),
    HealthCheckUtils.createApiCheck('https://api.stripe.com/health', 'stripe'),
  ],
}));

// Production error handling (sanitized errors)
server.use(errorHandler({
  environment: 'production',
  logErrors: true,
  logToFile: true,
  showStackTrace: false,
  sanitizeErrors: true,
}));

await server.listen();
```

### Custom Configuration

```typescript
import {
  createServer,
  security,
  logging,
  healthCheck,
  errorHandler,
  SecurityConfig,
  LoggingConfig,
  HealthCheckConfig,
  ErrorConfig,
} from "./mod.ts";

// Custom security config
const securityConfig: SecurityConfig = {
  environment: 'production',
  enableHSTS: true,
  frameOptions: 'SAMEORIGIN',
  contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'",
};

// Custom logging config
const loggingConfig: LoggingConfig = {
  environment: 'production',
  logLevel: 'warn',
  logRequests: true,
  logResponses: false,
};

// Custom health check config
const healthConfig: HealthCheckConfig = {
  endpoint: '/healthz',
  includeMetrics: false,
  enableDetailedChecks: false,
  timeout: 1000,
  cacheResults: true,
  cacheTTL: 5000,
};

// Custom error config
const errorConfig: ErrorConfig = {
  environment: 'production',
  logErrors: true,
  logToFile: true,
  showStackTrace: false,
  sanitizeErrors: true,
  customErrorMessages: {
    'ValidationError': 'Invalid input provided',
    'AuthenticationError': 'Please log in',
  },
};

const server = createServer();
server.use(security(securityConfig));
server.use(logging(loggingConfig));
server.use(healthCheck(monitor, healthConfig));
server.use(errorHandler(errorConfig));

await server.listen();
```

## 🛡️ Security Features

The security middleware provides:

- **HSTS**: Force HTTPS in production
- **CSP**: Content Security Policy (prevent XSS)
- **X-Frame-Options**: Prevent clickjacking
- **X-Content-Type-Options**: Prevent MIME sniffing
- **Path Traversal Protection**: Block `../` attacks
- **Suspicious Request Detection**: Track attack tools
- **Automatic IP Blocking**: Block IPs with 10+ suspicious requests
- **Security Headers**: 15+ security headers set automatically

## 📊 Health Check Features

The health check middleware provides:

- **System Resources**: Memory, disk, network monitoring
- **Custom Checks**: Database, API, cache health checks
- **Performance Metrics**: Integration with PerformanceMonitor
- **Kubernetes Support**: Liveness and readiness probes
- **Caching**: Optional result caching for performance
- **Status Codes**: 200 (healthy), 207 (degraded), 503 (unhealthy)

## 📝 Logging Features

The logging middleware provides:

- **Colored Output**: Color-coded log levels and HTTP methods
- **Request/Response Logging**: Comprehensive HTTP logging
- **Header Sanitization**: Automatic redaction of sensitive headers
- **Performance Tracking**: Response time logging
- **Log Levels**: debug, info, warn, error
- **Slow Request Detection**: Automatic warnings for >1s requests

## ⚠️ Error Handling Features

The error handler middleware provides:

- **Error Classification**: Operational vs programming errors
- **Custom Error Classes**: ValidationError, AuthenticationError, etc.
- **Error Analytics**: Track error patterns and trends
- **File Logging**: Optional error log files
- **Sanitization**: Hide sensitive data in production
- **Error Reporting**: Integration with monitoring services

## 🧪 Testing

See `example-usage.ts` for a complete working example with all middleware integrated.

Run the example:

```bash
deno run --allow-net --allow-read --allow-write --allow-env example-usage.ts
```

Test endpoints:
- `http://localhost:8000/` - Home page with documentation
- `http://localhost:8000/health` - Health check
- `http://localhost:8000/metrics` - Performance metrics
- `http://localhost:8000/security/stats` - Security statistics
- `http://localhost:8000/error` - Test error handling

## 📖 Additional Documentation

Each middleware file contains extensive inline documentation:

- **errorHandler.ts**: 2300+ lines of documented error handling
- **healthCheck.ts**: 2500+ lines of health monitoring docs
- **logging.ts**: 1300+ lines of logging documentation
- **security.ts**: 1800+ lines of security documentation

## 🔗 Related Files

- `middleware.ts` - Main middleware module with convenience wrappers
- `mod.ts` - Module exports (all components exported here)
- `server.ts` - Server class (unchanged, uses middleware)
- `router.ts` - Router class (unchanged, uses middleware)
- `example-usage.ts` - Complete working example

## 🚀 Migration Guide

If you have existing code, migrate like this:

### Before:
```typescript
const server = createServer();
server.use(logger());
server.use(errorHandler());
server.get('/', handler);
await server.listen();
```

### After:
```typescript
const server = createServer();
server.use(security());      // Add security
server.use(requestId());     // Add request tracking
server.use(logging());       // Replace logger() with logging()
server.use(healthCheck());   // Add health check
server.use(errorHandler());  // Keep error handler (improved)
server.get('/', handler);
await server.listen();
```

## 🎓 Best Practices

1. **Always use security middleware first**
2. **Always use error handler middleware last**
3. **Use health checks for Kubernetes/Docker deployments**
4. **Enable file logging in production**
5. **Configure CSP based on your app's needs**
6. **Add custom health checks for your dependencies**
7. **Use appropriate log levels for each environment**
8. **Monitor SecurityMonitor stats for attacks**
9. **Set up error reporting (Sentry, etc.) in production**
10. **Test all middleware with `example-usage.ts`**

## 📞 Support

For questions or issues:
- Check inline documentation in each middleware file
- Review `example-usage.ts` for usage patterns
- See test endpoints in the example server
