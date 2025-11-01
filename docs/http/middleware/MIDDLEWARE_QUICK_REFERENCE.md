# Middleware Quick Reference Guide

## At a Glance

**Location:** `/home/grenas405/.local/src/meta-os/http/`
**Total Code:** 14,082 lines of TypeScript
**Dependencies:** None (Deno standard library only)
**Architecture:** Middleware composition pattern with native Request/Response context helpers

> **Update (2025-11):** Oak adapter content remains for historical reference. The active implementation no longer requires Oak compatibility layers.

---

## Core Middleware Stack

| Order | Component | Purpose | Key Features |
|-------|-----------|---------|--------------|
| 1 | Security | Attack prevention | 15+ headers, CSP, HSTS, path traversal protection |
| 2 | RequestID | Request tracing | UUID generation, context propagation |
| 3 | Logging | Activity logging | Colored output, header sanitization, slow request detection |
| 4 | Performance | Metrics collection | Endpoint stats, memory tracking, error rates |
| 5 | Timing | Response timing | X-Response-Time header |
| 6 | HealthCheck | System monitoring | Kubernetes probes, dependency checks, caching |
| 7 | CORS | Cross-origin | Configurable origins/methods/headers |
| 8 | BodyParsers | Request parsing | JSON, URL-encoded, multipart |
| 9 | Routes | Business logic | Your application handlers |
| 10 | ErrorHandler | Exception handling | Classification, sanitization, recovery |

---

## Middleware Type System

```typescript
// Context: request + metadata
interface Context {
  request: Request;
  url: URL;
  params: Record<string, string>;
  state: Record<string, unknown>;
}

// Middleware: (ctx, next) => response
type Middleware = (
  ctx: Context,
  next: () => Response | Promise<Response>
) => Response | Promise<Response>;

// Handler: (ctx) => response (no next)
type Handler = (ctx: Context) => Response | Promise<Response>;
```

---

## Key Components

### 1. errorHandler.ts (68KB)
**Error Management System**
- Classes: `ErrorHandler`, `AppError`, `ValidationError`, `AuthenticationError`, etc.
- Presets: PRODUCTION, DEVELOPMENT
- Features: Analytics, file logging, sanitization, pattern detection

### 2. healthCheck.ts (65KB)
**Health Monitoring**
- Classes: `HealthChecker`, `HealthMonitor`, `HealthCheckUtils`
- Presets: PRODUCTION, DEVELOPMENT
- Status codes: 200 (healthy), 207 (degraded), 503 (unhealthy)
- Supports: System resources, custom checks, Kubernetes probes, caching

### 3. logging.ts (40KB)
**Request/Response Logging**
- Classes: `Logger`, `HeaderSanitizer`, `LoggingUtils`
- Levels: debug, info, warn, error
- Features: Header sanitization, colored output, slow request detection

### 4. security.ts (58KB)
**Security Headers & Protection**
- Classes: `SecurityValidator`, `SecurityMonitor`
- Presets: DEVELOPMENT, BALANCED, MAXIMUM_SECURITY
- Protects: XSS, clickjacking, MIME sniffing, MITM, path traversal, bots

### 5. performanceMonitor.ts (53KB)
**Performance Metrics**
- Classes: `PerformanceMonitor`, `PerformanceAnalyzer`
- Tracks: Response times, error rates, memory usage, endpoints, slow queries

---

## Oak Adapter Pattern

Three middleware use Oak-style adapters (healthCheck, logging, security):

```typescript
// Our style (returns Response)
type OurMiddleware = (ctx, next) => Promise<Response>

// Oak style (sets ctx.response)
type OakMiddleware = (ctx, next) => Promise<void>

// Adapter bridges the gap with mock Oak context
const oakCtx = {
  ...ctx,
  response: { status, body, headers }  // Mock object
};
await oakMiddleware(oakCtx, next);
```

**Why?** These components were designed for Oak framework and need conversion.

---

## Composition Pattern

```typescript
// Core orchestration function
function compose(
  middleware: Middleware[],
  finalHandler: Handler
): Handler

// Usage
const middleware = [security(), logging(), errorHandler()];
const handler = compose(middleware, (ctx) => json({ ok: true }));
const response = await handler(context);
```

**Key traits:**
- Re-entrance protection (prevents multiple next() calls)
- Index tracking through middleware chain
- Response bubble-up through chain
- Express-style familiar pattern

---

## Configuration Patterns

### Environment Detection
```typescript
const env = Deno.env.get("DENO_ENV") || 
            Deno.env.get("ENV") || 
            "development";
```

### Preset-Based Configuration
```typescript
// Error handler auto-detects
server.use(errorHandler());  // Uses PRODUCTION or DEVELOPMENT preset

// Or override
server.use(errorHandler({
  environment: 'production',
  logErrors: true,
  showStackTrace: false,
}));
```

---

## Security Features

### By Default
- Sensitive headers sanitized (Authorization, Cookie, API keys)
- Error messages sanitized in production
- Stack traces hidden in production
- Request IDs use crypto.randomUUID()
- Path traversal protection enabled
- 15+ security headers set

### OWASP Coverage
1. Injection - CSP, input validation
2. Broken Auth - HSTS, secure headers
3. Sensitive Data - HSTS, secure cookies
4. XML External Entities - CSP
5. Broken Access Control - CORS, frame options
6. Misconfiguration - Secure defaults
7. XSS - CSP, X-XSS-Protection
8. Insecure Deserialization - Input validation
9. Known Vulnerabilities - Updated headers
10. Insufficient Logging - Security monitoring

---

## Memory Management

Fixed-size circular buffers prevent unbounded growth:
- Error handler: 100 recent errors
- Performance monitor: Configurable request buffer
- Typical footprint: 5-10KB per component

---

## File Locations

```
http/
├── middleware.ts              # Core composition & adapters
├── errorHandler.ts            # Error management
├── healthCheck.ts             # Health monitoring
├── logging.ts                 # Request logging
├── security.ts                # Security headers
├── performanceMonitor.ts      # Metrics collection
├── server.ts                  # HTTP server
├── router.ts                  # Route matching
├── mod.ts                     # Module exports
├── parsers.ts                 # Body parsing
├── validator.ts               # Request validation
├── response.ts                # Response helpers
├── staticFiles.ts             # Static serving
└── MIDDLEWARE_INTEGRATION.md  # Integration guide
```

---

## Common Patterns

### Basic Server
```typescript
import { createServer, json } from "./mod.ts";

const server = createServer({ port: 8000 });
server.get("/", () => json({ ok: true }));
await server.listen();
```

### With Middleware
```typescript
import { createServer, security, logging, errorHandler, json } from "./mod.ts";

const server = createServer({ port: 8000 });
server.use(security());
server.use(logging());
server.use(errorHandler());
server.get("/api/users", () => json(users));
await server.listen();
```

### Custom Error Handling
```typescript
import { NotFoundError, ValidationError } from "./mod.ts";

server.get("/users/:id", (ctx) => {
  const user = findUser(ctx.params.id);
  if (!user) {
    throw new NotFoundError('User', ctx.state.requestId);
  }
  return json(user);
});
```

### Custom Health Checks
```typescript
import { createServer, healthCheck, HealthCheckUtils } from "./mod.ts";

const monitor = new PerformanceMonitor();
server.use(healthCheck(monitor, {
  customChecks: [
    HealthCheckUtils.createDatabaseCheck(db, 'postgres'),
    HealthCheckUtils.createApiCheck('https://api.stripe.com', 'stripe'),
  ]
}));
```

---

## Status

### Working
- HTTP server with Deno.serve()
- Path routing with parameters
- Response helpers
- Body parsers
- Request validation
- Static file serving
- Basic middleware (logger, cors, timing, requestId)

### Known Issues
- Oak adapters have bugs
- Health check route not registered properly
- Example application doesn't run

See KNOWN_ISSUES.md for details and workarounds.

---

## Key Design Decisions

1. **Zero Dependencies** - Only Deno standard library for simplicity and control
2. **Unix Philosophy** - Each middleware does one thing well
3. **Composition Over Inheritance** - Middleware chain pattern
4. **Security by Default** - Sanitization and headers always applied
5. **Environment Aware** - Auto-detect development vs production
6. **Preset Configurations** - Sensible defaults, easy customization
7. **Oak Compatibility** - Adapters allow reusing Oak-designed components

---

## Documentation Files

- **MIDDLEWARE_ANALYSIS.md** - This comprehensive guide
- **MIDDLEWARE_INTEGRATION.md** - Integration guide with examples
- **KNOWN_ISSUES.md** - Bugs and workarounds
- **TODO.md** - Planned features
- **README.md** - Feature overview
- **CONTRIBUTING.md** - How to contribute
