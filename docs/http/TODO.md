# HTTP Server Framework - TODO & Implementation Guide

## Critical Issues (Blocking)

### 1. Middleware Adapter Pattern - Oak-style to Request/Response
**Priority:** HIGH
**Status:** ✅ Completed
**Location:** `http/context.ts`, `http/middleware.ts`, `http/security.ts`, `http/logging.ts`, `http/healthCheck.ts`

**Resolution:**
- Added `http/context.ts` to provide a native Request/Response context and response finalization helpers
- Rebuilt `security()`, `logging()`, and `healthCheck()` to operate on the internal context and return `Response` objects directly
- Removed Oak-specific adapters and imports across the middleware stack and supporting modules
- Updated static file handler to work with the new context helpers without Oak dependencies

**Follow-up:** Monitor for any middleware that still assumes Oak semantics and migrate them to the shared context utilities.

---

### 2. Health Check Middleware Registration
**Priority:** HIGH
**Status:** ✅ Completed
**Location:** `healthCheck.ts` createHealthCheckMiddleware(), `middleware.ts` healthCheck()

**Resolution:**
- `createHealthCheckMiddleware()` now returns a standard middleware that responds with a `Response` when the configured endpoint is requested
- The global `healthCheck()` helper simply composes the middleware without Oak adapters, allowing it to be used either globally or as a route handler

**Usage Notes:**
- Global use (`server.use(healthCheck(...))`) now intercepts `/health` requests reliably
- Developers can still register the middleware as a dedicated route handler if preferred for routing clarity

---

## Medium Priority Issues

### 3. Missing Request Context Properties
**Priority:** MEDIUM
**Status:** ⚠️ Incomplete
**Location:** `middleware.ts` Oak context adapters

**Problem:**
When creating Oak-style contexts, we manually copy Request properties:
```typescript
request: {
  url: ctx.url,
  headers: ctx.request.headers,
  method: ctx.request.method,
  body: ctx.request.body,
  bodyUsed: ctx.request.bodyUsed,
  json: ctx.request.json.bind(ctx.request),
  text: ctx.request.text.bind(ctx.request),
}
```

**Missing Properties:**
- `formData()`
- `blob()`
- `arrayBuffer()`
- `signal` (AbortSignal)
- `cache`, `credentials`, `destination`, `integrity`, `mode`, `redirect`, `referrer`, `referrerPolicy`

**Impact:** Oak-style middleware that tries to use these will fail.

**Solution:** Create a proper Request proxy or include all standard Request properties.

---

### 4. Error Reporting Integration
**Priority:** MEDIUM
**Status:** 🔨 Not Implemented
**Location:** `errorHandler.ts` lines 1030-1032

**TODO:**
```typescript
// TODO: Implement actual reporting
// For now, just log that we would report
console.log('📊 Error reported to monitoring service');
```

**Requirements:**
1. Integrate with error monitoring services (Sentry, DataDog, New Relic, etc.)
2. Support configurable reporting URLs
3. Batch errors to avoid overwhelming the service
4. Include context: stack traces, request info, user data
5. Rate limiting to prevent spam
6. Privacy controls (sanitize sensitive data)

**Implementation Approach:**
```typescript
interface ErrorReporter {
  report(error: Error, context: ErrorContext): Promise<void>;
}

class SentryReporter implements ErrorReporter {
  async report(error: Error, context: ErrorContext) {
    // Sentry SDK integration
  }
}

class DatadogReporter implements ErrorReporter {
  async report(error: Error, context: ErrorContext) {
    // Datadog SDK integration
  }
}

// In ErrorHandler config:
export interface ErrorConfig {
  // ...existing
  reporters?: ErrorReporter[];
}
```

---

### 5. Graceful Shutdown Hooks
**Priority:** MEDIUM
**Status:** 🔨 Not Implemented
**Location:** `errorHandler.ts` lines 787-789

**TODO:**
```typescript
// TODO: In production, you might want to:
// 1. Close database connections
// 2. Finish in-flight requests (with timeout)
// 3. Stop accepting new requests
// 4. Notify health check endpoints
```

**Requirements:**
1. Database connection cleanup
2. In-flight request completion (with timeout)
3. Stop accepting new connections
4. Update health check status to "shutting down"
5. Graceful worker thread termination
6. Flush logs and metrics

**Implementation Approach:**
```typescript
export interface ShutdownHandler {
  name: string;
  timeout: number; // ms
  handler: () => Promise<void>;
}

class GracefulShutdown {
  private handlers: ShutdownHandler[] = [];

  register(handler: ShutdownHandler) {
    this.handlers.push(handler);
  }

  async shutdown() {
    console.log('🔄 Starting graceful shutdown...');

    // Run handlers in parallel with individual timeouts
    const promises = this.handlers.map(h =>
      Promise.race([
        h.handler(),
        timeout(h.timeout, `${h.name} timeout`)
      ])
    );

    await Promise.allSettled(promises);
    console.log('✅ Shutdown complete');
  }
}

// Usage:
const shutdown = new GracefulShutdown();
shutdown.register({
  name: 'Database',
  timeout: 5000,
  handler: async () => await db.close()
});
```

---

## Low Priority / Future Enhancements

### 6. Performance Monitoring Integrations
**Priority:** LOW
**Status:** 💡 Future

**Description:** Integrate with APM tools
- New Relic APM
- DataDog APM
- Prometheus metrics export
- OpenTelemetry support

---

### 7. Static File Caching Improvements
**Priority:** LOW
**Status:** 💡 Future
**Location:** `staticFiles.ts`

**Enhancements:**
- ETag support for conditional requests
- Content negotiation (gzip, brotli)
- Range request support for video streaming
- Cache-Control header optimization
- Memory-based cache for frequently accessed files

---

### 8. WebSocket Support
**Priority:** LOW
**Status:** 💡 Future

**Description:** Add WebSocket server capabilities
- Upgrade HTTP connections to WebSocket
- Message broadcasting
- Room/channel support
- Authentication middleware for WebSocket
- Reconnection handling

---

### 9. Rate Limiting Middleware
**Priority:** LOW
**Status:** 💡 Future

**Features:**
- IP-based rate limiting
- Token bucket algorithm
- Sliding window
- Redis-backed distributed rate limiting
- Per-route limits
- User-based limits

---

### 10. Request Validation Middleware
**Priority:** LOW
**Status:** 💡 Future

**Features:**
- JSON Schema validation
- Query parameter validation
- Path parameter validation
- Custom validation rules
- Detailed error messages

---

## Documentation Needs

### 11. API Reference Documentation
**Priority:** MEDIUM
**Status:** 🔨 In Progress

**Needed:**
- Complete API documentation for all exported functions
- Type documentation
- Middleware ordering guide (already exists in MIDDLEWARE_INTEGRATION.md)
- Security best practices
- Performance tuning guide

---

### 12. Example Applications
**Priority:** LOW
**Status:** 💡 Future

**Examples Needed:**
- REST API with database
- Real-time chat application
- File upload service
- Authentication system (JWT, OAuth)
- Microservices architecture

---

### 13. Migration Guides
**Priority:** LOW
**Status:** 💡 Future

**Guides Needed:**
- Migrating from Oak
- Migrating from Express
- Migrating from Koa

---

## Testing

### 14. Integration Tests
**Priority:** HIGH
**Status:** ⚠️ Missing

**Coverage Needed:**
- Middleware chain execution
- Error handling paths
- Security middleware protections
- Performance monitoring
- Health check endpoints
- All HTTP methods (GET, POST, PUT, DELETE, PATCH)

---

### 15. Unit Tests
**Priority:** MEDIUM
**Status:** ⚠️ Partial

**Components Needing Tests:**
- Router path matching
- Request parsing
- Response helpers
- Validator functions
- Error classification

---

### 16. Performance Benchmarks
**Priority:** LOW
**Status:** 💡 Future

**Benchmarks:**
- Requests per second
- Latency percentiles (p50, p95, p99)
- Memory usage under load
- Middleware overhead
- Comparison with Oak, Express

---

## Known Bugs

### 17. Health Check Middleware Returns Void
**Priority:** HIGH
**Location:** `healthCheck.ts` line 706

**Problem:**
```typescript
// Don't call next() - we've handled the response
return;  // ❌ Returns void, but middleware expects Response
```

**Fix:**
```typescript
// Return early indicator response
return new Response(null, { status: 200 });
```

---

### 18. Security Middleware Doesn't Check for Blocked Response
**Priority:** MEDIUM
**Location:** `middleware.ts` security adapter

**Problem:**
If security middleware blocks a request early (path traversal, etc.), the adapter might still try to call next() because it doesn't properly detect the block.

**Current Check:**
```typescript
if (responseBody !== null && nextResponse === null) {
  return new Response(JSON.stringify(responseBody), {...});
}
```

**Issue:** Relies on nextResponse being null, but async timing might cause issues.

---

## Architecture Improvements

### 19. Separate Concerns: Router vs Server
**Priority:** LOW
**Status:** 💡 Future

**Description:**
Currently Server and Router are tightly coupled. Consider:
- Making Router completely independent
- Server composes Router
- Allows using Router in other contexts (CLI tools, tests)

---

### 20. Plugin System
**Priority:** LOW
**Status:** 💡 Future

**Description:**
Create a plugin architecture:
```typescript
interface Plugin {
  name: string;
  version: string;
  install(server: Server): void;
}

// Usage:
server.plugin(authPlugin);
server.plugin(metricsPlugin);
```

---

## Legend

- ⚠️ **Broken** - Currently not working, blocks functionality
- 🔨 **Not Implemented** - Planned but not started
- 💡 **Future** - Nice to have, not critical
- ✅ **Complete** - Implemented and working
- 🚧 **In Progress** - Currently being worked on

---

## Priority Ranking

1. **Fix Middleware Adapters** (#1) - Critical blocker
2. **Fix Health Check Route** (#2) - Critical blocker
3. **Add Integration Tests** (#14) - Prevent regressions
4. **Implement Error Reporting** (#4) - Production readiness
5. **Graceful Shutdown** (#5) - Production readiness
6. **API Documentation** (#11) - Developer experience
7. **Unit Tests** (#15) - Code quality
8. All other items - Future enhancements

---

## Getting Started (For Contributors)

### Quick Wins (Good First Issues)

1. **Add missing Request properties** (#3) - Clear scope, low risk
2. **Write unit tests for validators** (#15) - Independent, well-defined
3. **Create example applications** (#12) - Creative, showcase features

### Medium Complexity

1. **Implement error reporting** (#4) - Requires external service knowledge
2. **Add graceful shutdown hooks** (#5) - Async coordination
3. **Create migration guides** (#13) - Requires framework comparison knowledge

### High Complexity

1. **Fix middleware adapters** (#1) - Core architecture change
2. **Refactor Router/Server separation** (#19) - Major refactor
3. **WebSocket support** (#8) - New protocol support

---

## Contact & Questions

For questions about any of these TODOs, please:
1. Check existing documentation in `/http/MIDDLEWARE_INTEGRATION.md`
2. Review inline code comments
3. Open an issue on the project repository

---

*Last Updated: 2025-10-31*
*Framework Version: 0.1.0-alpha*
