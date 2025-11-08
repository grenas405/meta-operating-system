# Meta Operating System - API Examples

**Unix Philosophy + Deno Convergence in Practice**

This document demonstrates how the Meta OS public API embodies Unix Philosophy principles while leveraging Deno's modern runtime capabilities. For architectural context, see:
- [Meta-Documentation](./docs/02-framework/meta-documentation.md) - Complete architectural guide
- [Philosophy](./docs/02-framework/philosophy.md) - Unix Philosophy + Deno convergence

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Running the Examples](#running-the-examples)
3. [Example Breakdown](#example-breakdown)
4. [Public API Reference](#public-api-reference)
5. [Unix Philosophy Patterns](#unix-philosophy-patterns)
6. [Integration with Meta OS Kernel](#integration-with-meta-os-kernel)

---

## Overview

The `example.ts` file demonstrates Meta OS's public API exported from `mod.ts`:

### Core Capabilities
- **Routing**: URL-based request handling with parameter extraction
- **Middleware**: Composable request/response processing pipeline
- **Validation**: Schema-based input validation with type safety
- **Response Helpers**: Semantic HTTP response builders
- **Security**: Defense-in-depth with explicit permissions
- **Performance**: Built-in monitoring and optimization

### Unix Philosophy Implementation
Every feature follows these principles:
- **Do One Thing Well**: Each module has a single, clear responsibility
- **Composability**: Functions combine naturally without hidden coupling
- **Explicit Over Implicit**: No magic, no auto-wiring, clear interfaces
- **Text-Based**: Configuration as code, not mysterious JSON
- **Security by Default**: Deno's explicit permissions at every layer

---

## Running the Examples

### View available examples:
```bash
deno run --allow-all example.ts
```

### Run a specific example:
```bash
# Example 1: Simple Router
deno run --allow-all example.ts 1
# or
deno run --allow-all example.ts router

# Example 2: Middleware Usage
deno run --allow-all example.ts 2
# or
deno run --allow-all example.ts middleware

# Example 3: RESTful Todo API
deno run --allow-all example.ts 3
# or
deno run --allow-all example.ts rest

# Example 4: Composing Middleware
deno run --allow-all example.ts 4
# or
deno run --allow-all example.ts compose

# Run all examples
deno run --allow-all example.ts all
```

### Type-check examples:
```bash
# Verify type safety (no runtime execution)
deno check example.ts
```

---

## Example Breakdown

### Example 1: Simple Router with Routes

**Demonstrates:**
- Creating a router with `createRouter(logger)`
- Defining routes with HTTP verb methods (`GET`, `POST`, etc.)
- Accessing URL parameters via `ctx.params`
- Using response helpers (`html()`, `json()`, `text()`)
- Request body validation with schemas

**Unix Philosophy Application:**
- **Single Responsibility**: Router only handles routing, not business logic
- **Explicit Dependencies**: Logger passed explicitly, no hidden globals
- **Composable**: Routes are pure functions that can be tested in isolation
- **Text-Based**: Routes defined in readable TypeScript

**Key Concepts:**
- All routers require an `ILogger` instance (use `defaultLogger` from public API)
- Routes can have inline middleware: `router.get("/path", middleware1, handler)`
- Response helpers return `Response` objects with proper status codes
- URL parameters are automatically extracted and type-safe

**Code Pattern:**
```typescript
const router = createRouter(defaultLogger);

router.get("/api/users/:id", (ctx: Context) => {
  const userId = ctx.params?.id; // Type-safe parameter access
  return json({ user: { id: userId, name: `User ${userId}` } });
});
```

---

### Example 2: Middleware Usage

**Demonstrates:**
- Applying global middleware with `router.use()`
- Built-in middleware: `errorHandler()`, `cors()`, `security()`
- Creating custom middleware functions
- Route-specific middleware (authentication pattern)
- Middleware execution order and composition

**Unix Philosophy Application:**
- **Do One Thing Well**: Each middleware handles one concern (CORS, security, logging)
- **Composability**: Middleware stack like Unix pipes - data flows through
- **Explicit Permissions**: Security headers explicit, not hidden
- **Minimal Interface**: Simple signature: `(ctx, next) => Response`

**Key Concepts:**
- Middleware signature: `(ctx: Context, next: () => Promise<Response>) => Promise<Response>`
- Middleware can inspect/modify requests before calling `next()`
- Middleware can inspect/modify responses after calling `next()`
- Execution order: Middleware runs in registration order ("onion" pattern)
- Environment-aware: Automatically adjusts behavior based on `DENO_ENV`

**Code Pattern:**
```typescript
// Custom middleware following Unix principles
const timingMiddleware = async (ctx: Context, next: () => Promise<Response>) => {
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
```

---

### Example 3: RESTful Todo API

**Demonstrates:**
- Complete CRUD operations (Create, Read, Update, Delete)
- HTTP verb methods: `GET`, `POST`, `PUT`, `DELETE`
- URL parameter extraction for resource identification
- Request validation with comprehensive schemas
- Error handling with semantic response helpers
- In-memory data store pattern

**Unix Philosophy Application:**
- **RESTful Resources**: Each endpoint does one thing (get, create, update, delete)
- **Explicit Validation**: Input validation explicit, not hidden in ORM
- **Composable Operations**: CRUD operations are independent, pure functions
- **Clear Error Handling**: Errors returned explicitly, not thrown mysteriously

**Key Concepts:**
- RESTful routing patterns (`/api/resource`, `/api/resource/:id`)
- Validation schemas: `requiredString()`, `requiredNumber()`, `optionalString()`
- Proper HTTP status codes (200, 201, 400, 404, 500)
- Resource identification via URL parameters
- Request body validation before processing

**Code Pattern:**
```typescript
// Validation at the boundary - Unix principle of explicit input handling
router.post("/api/todos", async (ctx: Context) => {
  const body = await ctx.request.json();

  const validation = validate(body, {
    title: requiredString({ minLength: 1, maxLength: 100 }),
    description: optionalString({ maxLength: 500 }),
  });

  if (!validation.isValid) {
    return badRequest(`Validation failed: ${JSON.stringify(validation.errors)}`);
  }

  // Only process validated data
  const todo = { id: crypto.randomUUID(), ...body };
  return json(todo, { status: 201 });
});
```

---

### Example 4: Composing Middleware

**Demonstrates:**
- Creating reusable middleware functions
- Combining multiple middleware with `compose()`
- Understanding middleware execution order
- The "onion" pattern in practice

**Unix Philosophy Application:**
- **Pipes and Filters**: Middleware composition mirrors Unix pipes
- **Composability**: Small functions combine to create complex behavior
- **No Hidden State**: Each middleware explicitly passes control via `next()`
- **Testability**: Each middleware can be tested independently

**Key Concepts:**
- Middleware executes in "onion" pattern: outer → inner → handler → inner → outer
- `compose()` takes an array of middleware and a final handler
- Composed middleware can be reused across multiple routes
- Execution order is explicit and predictable

**Execution Flow:**
```
Request
  ↓
Middleware 1: Before
  ↓
Middleware 2: Before
  ↓
Middleware 3: Before
  ↓
Final Handler
  ↓
Middleware 3: After
  ↓
Middleware 2: After
  ↓
Middleware 1: After
  ↓
Response
```

---

## Public API Reference

The following are exported from `mod.ts`:

### 🏗️ Core Components

#### Kernel & Server
```typescript
import { Kernel, HTTPServer, createRouter } from "./mod.ts";

// Process orchestration kernel
const kernel = new Kernel(config);

// Standalone HTTP server
const server = new HTTPServer(config);

// Router for request handling
const router = createRouter(logger);
```

#### Types
```typescript
import type {
  Context,           // Request context with request, params, state, response
  RouteHandler,      // Route handler function type
  Handler,           // Generic handler type
  Middleware,        // Middleware function type
  ILogger,           // Logger interface
  ServerConfig,      // HTTP server configuration
  KernelConfig,      // Kernel configuration
  ResponseOptions,   // Response helper options
} from "./mod.ts";
```

---

### 🔧 Middleware

#### Built-in Middleware
All middleware auto-detects environment and applies appropriate defaults:

```typescript
import {
  // Core middleware
  cors,              // CORS headers with environment-based defaults
  security,          // Security headers (HSTS, CSP, etc.)
  errorHandler,      // Error handling with stack traces (dev only)
  healthCheck,       // Health check endpoint
  logging,           // Comprehensive request/response logging
  timing,            // Response time tracking
  requestId,         // Unique request ID generation

  // Body parsing
  bodyParser,        // Auto-detect content type and parse
  jsonParser,        // Parse JSON bodies
  textParser,        // Parse text bodies
  urlencoded,        // Parse URL-encoded forms
  multipart,         // Parse multipart/form-data

  // Utilities
  compose,           // Compose middleware pipeline
} from "./mod.ts";
```

#### Middleware Configuration

**CORS Middleware:**
```typescript
// Development (allow all)
router.use(cors());

// Production (specific origins)
router.use(cors({
  origin: ["https://myapp.com", "https://api.myapp.com"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

// Using presets
import { CorsPresets } from "./mod.ts";
router.use(cors(CorsPresets.PRODUCTION(["https://myapp.com"])));
```

**Security Middleware:**
```typescript
// Auto-detects environment
router.use(security());

// Custom configuration
router.use(security({
  environment: "production",
  enableHSTS: true,
  enableXSSProtection: true,
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
  },
}));

// Using presets
import { SecurityPresets } from "./mod.ts";
router.use(security(SecurityPresets.BALANCED));
```

**Error Handler:**
```typescript
// Auto-detects environment (shows stack in dev, hides in prod)
router.use(errorHandler());

// Custom configuration
import { ErrorHandlerPresets } from "./mod.ts";
router.use(errorHandler(ErrorHandlerPresets.DEVELOPMENT));
```

**Health Check:**
```typescript
// Basic health check
router.use(healthCheck());

// With performance monitoring
import { PerformanceMonitor } from "./mod.ts";
const perfMonitor = new PerformanceMonitor();
router.use(healthCheck(perfMonitor));

// Custom configuration
import { HealthCheckPresets } from "./mod.ts";
router.use(healthCheck(perfMonitor, HealthCheckPresets.PRODUCTION));
```

**Logging:**
```typescript
// Auto-configured based on environment
router.use(logging());

// Custom configuration
router.use(logging({
  environment: "production",
  logLevel: "info",
  logRequests: true,
  logResponses: true,
  enableColors: false,
}));
```

---

### ✅ Validation

Schema-based validation with comprehensive error reporting:

```typescript
import {
  validate,           // Validate data against schema

  // String validators
  requiredString,     // Required string with length constraints
  optionalString,     // Optional string
  requiredEmail,      // Email format validation
  requiredUrl,        // URL format validation

  // Number validators
  requiredNumber,     // Required number with min/max
  optionalNumber,     // Optional number

  // Boolean validators
  requiredBoolean,    // Required boolean
  optionalBoolean,    // Optional boolean

  // Complex validators
  requiredArray,      // Array validation
  requiredEnum,       // Enum validation

  // Types
  ValidationError,    // Validation error class
  type Schema,        // Schema type definition
  type ValidationRule,// Validation rule type
} from "./mod.ts";
```

**Validation Pattern:**
```typescript
const validation = validate(data, {
  name: requiredString({ minLength: 2, maxLength: 50 }),
  email: requiredEmail(),
  age: requiredNumber({ min: 18, max: 120 }),
  role: requiredEnum(["admin", "user", "guest"]),
  bio: optionalString({ maxLength: 500 }),
  tags: requiredArray({ minItems: 1, maxItems: 10 }),
});

if (!validation.isValid) {
  return badRequest(`Validation failed: ${JSON.stringify(validation.errors)}`);
}
```

---

### 📤 Response Helpers

Semantic response builders that return proper HTTP responses:

```typescript
import {
  json,              // JSON response (default 200)
  html,              // HTML response
  text,              // Plain text response
  redirect,          // Redirect (301/302)

  // Error responses
  badRequest,        // 400 Bad Request
  unauthorized,      // 401 Unauthorized
  forbidden,         // 403 Forbidden
  notFound,          // 404 Not Found
  internalError,     // 500 Internal Server Error

  // Success responses
  noContent,         // 204 No Content
  status,            // Custom status code
} from "./mod.ts";
```

**Usage:**
```typescript
// JSON response
return json({ message: "Success", data: results });

// JSON with custom status
return json({ id: newId, ...data }, { status: 201 });

// HTML response
return html(`<h1>Hello World</h1>`);

// Error responses
return notFound("User not found");
return badRequest("Invalid input");
return unauthorized("Please log in");

// Redirect
return redirect("https://example.com", 301);
```

---

### 🔍 Performance Monitoring

Built-in performance analytics:

```typescript
import {
  PerformanceMonitor,        // Core monitoring class
  PerformanceAnalyzer,       // Analytics and insights
  createPerformanceMiddleware, // Middleware factory
} from "./mod.ts";

// Create monitor
const monitor = new PerformanceMonitor();

// Add to middleware stack
router.use(createPerformanceMiddleware(monitor));

// Query metrics
const metrics = monitor.getMetrics();
const insights = PerformanceAnalyzer.analyzeMetrics(metrics);
```

---

### 🛠️ Utilities

```typescript
import {
  defaultLogger,     // Default console logger
  env,               // Environment configuration utilities
  createContext,     // Create request context manually
} from "./mod.ts";
```

---

## Unix Philosophy Patterns

### Pattern 1: Single Responsibility

**Principle:** Each module does one thing well

```typescript
// ❌ ANTI-PATTERN: God function doing everything
async function handleUserRequest(req: Request): Promise<Response> {
  // Authenticate user
  // Validate input
  // Query database
  // Format response
  // Log result
  // Return response
}

// ✅ CORRECT: Each function has one job
const authMiddleware = async (ctx: Context, next: () => Promise<Response>) => {
  // Only handles authentication
  const token = ctx.request.headers.get("Authorization");
  if (!token) return unauthorized("Missing token");
  ctx.state.user = await verifyToken(token);
  return next();
};

const validateUser = (data: unknown) => {
  // Only validates user data
  return validate(data, {
    name: requiredString({ minLength: 2 }),
    email: requiredEmail(),
  });
};

router.post("/api/users", authMiddleware, async (ctx: Context) => {
  // Only handles user creation logic
  const body = await ctx.request.json();
  const validation = validateUser(body);
  if (!validation.isValid) return badRequest("Invalid input");

  const user = await createUser(body);
  return json(user, { status: 201 });
});
```

---

### Pattern 2: Composability Through Purity

**Principle:** Pure functions compose naturally

```typescript
// ❌ ANTI-PATTERN: Hidden side effects
let requestCount = 0;
function logRequest(ctx: Context) {
  requestCount++; // Hidden global state mutation
  console.log(`Request #${requestCount}`);
}

// ✅ CORRECT: Pure, composable middleware
const requestLogger = () => {
  let count = 0; // Closure, not global
  return async (ctx: Context, next: () => Promise<Response>) => {
    count++;
    console.log(`[${count}] ${ctx.request.method} ${ctx.url.pathname}`);
    return next();
  };
};

const timingLogger = async (ctx: Context, next: () => Promise<Response>) => {
  const start = Date.now();
  const response = await next();
  console.log(`Duration: ${Date.now() - start}ms`);
  return response;
};

// Compose naturally
router.use(requestLogger());
router.use(timingLogger);
```

---

### Pattern 3: Explicit Over Implicit

**Principle:** No magic, clear dependencies

```typescript
// ❌ ANTI-PATTERN: Magic dependency injection
class UserService {
  // Dependencies magically injected somehow
  constructor() {}
}

// ✅ CORRECT: Explicit dependencies
interface UserServiceDeps {
  logger: ILogger;
  validator: typeof validate;
}

class UserService {
  constructor(private deps: UserServiceDeps) {}

  async createUser(data: unknown) {
    this.deps.logger.info("Creating user");
    const validation = this.deps.validator(data, userSchema);
    // ...
  }
}

// Usage is explicit
const userService = new UserService({
  logger: defaultLogger,
  validator: validate,
});
```

---

### Pattern 4: Text-Based Configuration

**Principle:** Configuration as code, not mysterious JSON

```typescript
// ❌ ANTI-PATTERN: Complex JSON configuration
{
  "server": {
    "middleware": ["cors", "security"],
    "plugins": {
      "auth": { "type": "jwt", "secret": "???" }
    }
  }
}

// ✅ CORRECT: TypeScript configuration
export interface ServiceConfig {
  readonly cors: CorsOptions;
  readonly security: SecurityConfig;
  readonly auth: AuthConfig;
}

export const config: ServiceConfig = {
  cors: CorsPresets.PRODUCTION(["https://myapp.com"]),
  security: SecurityPresets.BALANCED,
  auth: {
    type: "jwt",
    secret: Deno.env.get("JWT_SECRET")!,
    expiresIn: "24h",
  },
};

// Self-documenting, type-safe, version-controlled
```

---

### Pattern 5: Security by Composition

**Principle:** Explicit permissions at every layer

```typescript
#!/usr/bin/env -S deno run --allow-read=./config --allow-net=localhost:3000

/**
 * Security boundaries are explicit:
 * CAN: Read config files, network on localhost:3000
 * CANNOT: Write files, access other network, run commands
 */

import { createRouter, defaultLogger, security, cors } from "./mod.ts";

const router = createRouter(defaultLogger);

// Layer 1: Runtime permissions (Deno)
// Layer 2: Security headers (middleware)
router.use(security({ environment: "production" }));

// Layer 3: CORS restrictions (middleware)
router.use(cors({ origin: ["https://myapp.com"] }));

// Layer 4: Input validation (application)
router.post("/api/data", async (ctx) => {
  const body = await ctx.request.json();
  const validation = validate(body, schema);
  if (!validation.isValid) return badRequest("Invalid");
  // ...
});

// Multiple explicit layers, no hidden security
```

---

## Integration with Meta OS Kernel

The examples show router usage in isolation. For full system integration:

### Running the Kernel

```bash
# Start the complete Meta OS kernel
deno run --allow-all kernel.ts
```

The kernel provides:
1. **Process Management**: Orchestrate multiple services
2. **Heartbeat Monitoring**: Track service health
3. **HTTP Server**: Built-in server on port 9000
4. **REPL**: Interactive process management shell

### Kernel Configuration

```typescript
import { Kernel } from "./mod.ts";
import type { KernelConfig } from "./mod.ts";

const config: KernelConfig = {
  // Configure your kernel
};

const kernel = new Kernel(config);
await kernel.start();
```

---

## Advanced Patterns

### Pattern: Multi-Service Architecture

```typescript
// Service 1: API Server
const apiRouter = createRouter(defaultLogger);
apiRouter.use(cors());
apiRouter.use(security());
apiRouter.get("/api/health", () => json({ status: "ok" }));

// Service 2: Admin Panel
const adminRouter = createRouter(defaultLogger);
adminRouter.use(authMiddleware);
adminRouter.get("/admin/dashboard", () => html("<h1>Dashboard</h1>"));

// Register with kernel
kernel.register("api", apiRouter);
kernel.register("admin", adminRouter);
```

### Pattern: Custom Error Handling

```typescript
import { AppError, createErrorMiddleware } from "./mod.ts";

// Define custom error types
class BusinessLogicError extends AppError {
  constructor(message: string) {
    super(message, 422, "BUSINESS_ERROR");
  }
}

// Custom error middleware
router.use(createErrorMiddleware({
  environment: "production",
  showStackTrace: false,
  logErrors: true,
  customHandlers: {
    BusinessLogicError: (error) => json({
      error: error.message,
      code: error.code,
    }, { status: error.statusCode }),
  },
}));
```

### Pattern: Performance Monitoring

```typescript
import { PerformanceMonitor, createPerformanceMiddleware } from "./mod.ts";

const perfMonitor = new PerformanceMonitor();

router.use(createPerformanceMiddleware(perfMonitor));

// Query metrics
setInterval(() => {
  const metrics = perfMonitor.getMetrics();
  console.log("P95 Response Time:", metrics.p95);
  console.log("Error Rate:", metrics.errorRate);
}, 60000);
```

---

## Type Safety

All examples are fully type-checked:

```bash
# Type-check examples
deno check example.ts

# Type-check with strict mode
deno check --strict example.ts

# Format code
deno fmt example.ts

# Lint code
deno lint example.ts
```

---

## Next Steps

1. **Review Examples**: Run each example individually to understand the patterns
2. **Experiment**: Modify routes, middleware, and validation
3. **Build Services**: Create custom services using these patterns
4. **Read Meta-Docs**: Study [meta-documentation.md](./docs/02-framework/meta-documentation.md) for architectural deep-dive
5. **Understand Philosophy**: Read [philosophy.md](./docs/02-framework/philosophy.md) for the "why" behind the design
6. **Integrate Kernel**: Use the full Kernel for production deployments

---

## Additional Resources

### Documentation
- [Meta-Documentation](./docs/02-framework/meta-documentation.md) - Comprehensive architectural guide
- [Philosophy](./docs/02-framework/philosophy.md) - Unix Philosophy + Deno convergence
- [Deno Manual](https://deno.land/manual) - Official Deno documentation

### Framework Principles
- **Do One Thing Well**: Single responsibility for all modules
- **Composability**: Functions that combine naturally
- **Explicit Over Implicit**: No magic, clear interfaces
- **Security by Default**: Multiple explicit layers
- **Text-Based**: Configuration as code

---

**The Meta Operating System demonstrates that individual developers can build enterprise-grade solutions when armed with Unix Philosophy principles, modern runtime capabilities, and AI-augmented development practices.**

*For architectural decisions, pattern rationale, and deep dives, consult the meta-documentation.*
