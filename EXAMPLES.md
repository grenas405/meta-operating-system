# Meta Operating System - API Examples

This document explains how to use the `example.ts` file to learn the Meta OS public API.

## Overview

The `example.ts` file demonstrates the key features of the Meta OS public API exported from `mod.ts`:

- **Routing**: Creating routes with URL parameters
- **Middleware**: Using built-in and custom middleware
- **Validation**: Request body validation with schemas
- **Response helpers**: JSON, HTML, text responses with proper status codes
- **Composition**: Combining middleware into pipelines

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

## Example Breakdown

### Example 1: Simple Router with Routes

Demonstrates:
- Creating a router with `createRouter(logger)`
- Defining routes with `router.get()`, `router.post()`, etc.
- Accessing URL parameters via `ctx.params`
- Using response helpers (`html()`, `json()`)
- Request body validation

**Key Concepts:**
- All routers require an `ILogger` instance (use `defaultLogger` from the public API)
- Routes can have middleware applied inline: `router.get("/path", middleware1, middleware2, handler)`
- Response helpers return `Response` objects that can be returned from handlers

### Example 2: Middleware Usage

Demonstrates:
- Applying global middleware with `router.use()`
- Built-in middleware: `errorHandler()`, `cors()`, `security()`
- Creating custom middleware functions
- Route-specific middleware (authentication example)

**Key Concepts:**
- Middleware signature: `(ctx: Context, next: () => Promise<Response>) => Promise<Response>`
- Middleware can inspect/modify requests before calling `next()`
- Middleware can inspect/modify responses after calling `next()`
- Order matters: middleware executes in the order it's registered

### Example 3: RESTful Todo API

Demonstrates:
- Complete CRUD operations (Create, Read, Update, Delete)
- HTTP verb methods: `GET`, `POST`, `PUT`, `DELETE`
- URL parameter extraction
- Request validation with validation schemas
- Error handling with `notFound()`, `badRequest()`

**Key Concepts:**
- RESTful routing patterns
- Validation schemas with `requiredString()`, `requiredNumber()`, `optionalString()`, etc.
- Proper HTTP status codes (201 for created, 404 for not found, etc.)
- In-memory data store pattern

### Example 4: Composing Middleware

Demonstrates:
- Creating reusable middleware functions
- Combining multiple middleware with `compose()`
- Understanding middleware execution order

**Key Concepts:**
- Middleware executes in "onion" pattern: outer → inner → handler → inner → outer
- `compose()` takes an array of middleware and a final handler
- Composed middleware can be reused across multiple routes

## Public API Reference

The following are exported from `mod.ts`:

### Core Components
- `Kernel` - Process orchestration kernel
- `HTTPServer` - HTTP server (standalone)
- `createRouter(logger)` - Create a new router
- `Router` - Router class

### Types
- `Context` - Request context with `request`, `response`, `params`, `url`
- `RouteHandler` - Route handler function type
- `Middleware` - Middleware function type
- `ILogger` - Logger interface
- `ServerConfig`, `KernelConfig` - Configuration types

### Middleware
- `cors(options?)` - CORS middleware
- `security(config)` - Security headers middleware
- `errorHandler()` - Error handling middleware
- `healthCheck()` - Health check middleware
- `bodyParser()` - Body parsing middleware
- `logger(logger)` - Request logging middleware
- `compose(middleware[], handler)` - Compose middleware pipeline

### Validation
- `validate(data, schema)` - Validate data against schema
- `requiredString(options?)` - String validation rule
- `requiredEmail()` - Email validation rule
- `requiredNumber(options?)` - Number validation rule
- `requiredBoolean()` - Boolean validation rule
- `optionalString(options?)` - Optional string validation rule
- `optionalNumber(options?)` - Optional number validation rule

### Response Helpers
- `json(data, options?)` - JSON response
- `html(content, options?)` - HTML response
- `text(content, options?)` - Text response
- `notFound(message?)` - 404 response
- `badRequest(message?)` - 400 response
- `internalError(message?)` - 500 response
- `forbidden(message?)` - 403 response
- `unauthorized(message?)` - 401 response
- `redirect(url, status?)` - Redirect response

### Utilities
- `defaultLogger` - Default console logger implementation
- `env` - Environment configuration utilities

## Usage Patterns

### Creating a Custom Service

```typescript
import {
  createRouter,
  defaultLogger,
  json,
  cors,
  errorHandler,
  type Context,
} from "./mod.ts";

// Create router
const router = createRouter(defaultLogger);

// Add middleware
router.use(errorHandler());
router.use(cors({ origin: "*" }));

// Define routes
router.get("/api/status", (ctx: Context) => {
  return json({ status: "ok", timestamp: new Date().toISOString() });
});

// The router can now be integrated with the HTTP server
```

### Custom Middleware Pattern

```typescript
import type { Context, Middleware } from "./mod.ts";

const myMiddleware: Middleware = async (ctx, next) => {
  // Before handler
  console.log(`Request: ${ctx.request.method} ${ctx.url.pathname}`);

  // Call next middleware/handler
  const response = await next();

  // After handler
  console.log(`Response: ${response.status}`);

  return response;
};

router.use(myMiddleware);
```

### Validation Pattern

```typescript
import {
  validate,
  requiredString,
  requiredEmail,
  badRequest,
  json,
} from "./mod.ts";

router.post("/api/users", async (ctx) => {
  const body = await ctx.request.json();

  const validation = validate(body, {
    name: requiredString({ minLength: 2, maxLength: 50 }),
    email: requiredEmail(),
  });

  if (!validation.isValid) {
    return badRequest(`Validation failed: ${JSON.stringify(validation.errors)}`);
  }

  // Use validated data
  const user = {
    id: crypto.randomUUID(),
    name: body.name,
    email: body.email,
  };

  return json(user, { status: 201 });
});
```

## Integration with Meta OS Kernel

The examples show router usage in isolation. To integrate with the full Meta OS Kernel:

```bash
# Run the full kernel with HTTP server
deno run --allow-all kernel.ts
```

The kernel will:
1. Start process management
2. Launch heartbeat monitor
3. Start HTTP server on port 9000
4. Provide REPL for process management

## Type Safety

All examples are fully type-checked. Run type checking with:

```bash
deno check example.ts
```

## Next Steps

1. Review each example individually
2. Experiment by modifying routes and middleware
3. Create your own custom services using the patterns shown
4. Integrate with the Kernel for full process orchestration

## Additional Resources

- [Deno Manual](https://deno.land/manual)
- [HTTP Server Documentation](./docs/)
- [Middleware Guide](./docs/middleware.md) (if available)
