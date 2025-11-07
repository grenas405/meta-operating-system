# Migrating Your CORS Middleware to the Staging Pattern

## Current Implementation (Problems)

Your current `cors()` function in `index.ts` has these issues:

1. **Response Cloning**: It clones the entire Response object to add headers, which is inefficient
2. **Lost Context**: It doesn't use `ctx.response` staging, so other middleware can't see or modify CORS headers
3. **Limited Configuration**: Only accepts simple `origin`, `methods`, and `headers` options
4. **No Origin Validation**: Doesn't properly validate origin against multiple allowed origins or functions

```typescript
// CURRENT IMPLEMENTATION - Has limitations
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

    // ❌ PROBLEM: Cloning entire response is inefficient
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
```

## Updated Implementation (Staging Pattern)

Replace your `cors()` function in `middleware/index.ts`:

```typescript
import { createCorsMiddleware, CorsPresets, type CorsOptions } from "./cors.ts";

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
  if (!options) {
    if (environment === "production") {
      const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") ?? [];
      if (allowedOrigins.length === 0) {
        throw new Error(
          "CORS: Production environment requires ALLOWED_ORIGINS environment variable"
        );
      }
      return createCorsMiddleware(CorsPresets.PRODUCTION(allowedOrigins));
    }
    return createCorsMiddleware(CorsPresets.DEVELOPMENT);
  }
  
  return createCorsMiddleware(options);
}

// Re-export types and presets for convenience
export { CorsPresets, type CorsOptions };
```

## Key Improvements

### 1. Proper Origin Validation

**Before:**
```typescript
const origin = options.origin ?? "*"; // Only supports single string
```

**After:**
```typescript
// Supports multiple patterns
origin: "*"                                    // Allow all
origin: "https://myapp.com"                   // Single origin
origin: ["https://app.com", "https://api.com"] // Multiple origins
origin: (origin) => allowList.includes(origin) // Dynamic validation
```

### 2. Uses Staging Pattern

**Before:**
```typescript
// Clones entire response
const headers_obj = new Headers(response.headers);
headers_obj.set("Access-Control-Allow-Origin", origin);
return new Response(response.body, { headers: headers_obj });
```

**After:**
```typescript
// Sets headers on ctx.response for staging
setCorsHeaders(ctx, allowedOrigin, config);

// Later, merges staged headers into final response
const mergedHeaders = new Headers(response.headers);
for (const [key, value] of ctx.response.headers.entries()) {
  mergedHeaders.set(key, value);
}
```

**Why this matters:**
- Other middleware can see and modify CORS headers
- Performance monitor can track header sizes
- Logging middleware can see all headers before they're sent
- Follows Unix Philosophy: do one thing (stage headers), do it well

### 3. Security Improvements

**Before:**
```typescript
// No validation that credentials + wildcard is insecure
origin: "*",
credentials: true // ❌ Browser will reject this
```

**After:**
```typescript
// Validates configuration at middleware creation
if (config.credentials && config.origin === "*") {
  throw new Error(
    "CORS: Cannot use wildcard origin (*) with credentials enabled. " +
    "Specify explicit origins for security."
  );
}
```

### 4. Complete CORS Implementation

**Before:** Only `Allow-Origin`, `Allow-Methods`, `Allow-Headers`

**After:** All CORS headers
- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Credentials`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`
- `Access-Control-Expose-Headers` (new)
- `Access-Control-Max-Age` (new)

## Migration Steps

### Step 1: Create the New File

Save the provided `cors.ts` file to your `middleware/` directory:

```
middleware/
├── index.ts           # Main middleware exports
├── cors.ts            # New CORS implementation
├── errorHandlerMiddleware.ts
├── healthCheckMiddleware.ts
└── ...
```

### Step 2: Update index.ts

Replace the old `cors()` function with the new implementation shown above.

### Step 3: Update Your Environment Configuration

For production deployments, add allowed origins:

```bash
# .env.production
ALLOWED_ORIGINS=https://myapp.com,https://admin.myapp.com
```

### Step 4: Update Server Setup

Your existing server code should work without changes:

```typescript
// server.ts
import { compose, cors, logger, errorHandler } from "./middleware/index.ts";

const handler = compose(
  [
    cors(), // Automatically uses ALLOWED_ORIGINS in production
    logger(new Logger()),
    errorHandler(),
  ],
  router.handler
);

Deno.serve({ port: 8000 }, handler);
```

Or use explicit configuration:

```typescript
const handler = compose(
  [
    cors({
      origin: ["https://myapp.com"],
      credentials: true,
      exposedHeaders: ["X-Request-ID"],
    }),
    logger(new Logger()),
    errorHandler(),
  ],
  router.handler
);
```

## Testing the Migration

### Test 1: Preflight Request

```bash
curl -X OPTIONS http://localhost:8000/api/users \
  -H "Origin: https://myapp.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Expected:**
- Status: 204 No Content
- Headers include: `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, etc.

### Test 2: Actual Request

```bash
curl -X GET http://localhost:8000/api/users \
  -H "Origin: https://myapp.com" \
  -v
```

**Expected:**
- Status: 200 OK (or whatever your endpoint returns)
- Headers include: `Access-Control-Allow-Origin`

### Test 3: Blocked Origin

```bash
curl -X GET http://localhost:8000/api/users \
  -H "Origin: https://evil.com" \
  -v
```

**Expected:**
- Response succeeds but NO `Access-Control-Allow-Origin` header
- Browser would block this (curl doesn't enforce CORS)

## Benefits of the New Implementation

1. **Philosophically Aligned**: Uses staging pattern, follows Unix Philosophy
2. **More Configurable**: Supports arrays, functions, and presets
3. **More Secure**: Validates dangerous configurations
4. **Better Performance**: No response cloning
5. **More Observable**: Other middleware can inspect CORS headers
6. **Production Ready**: Environment-aware defaults
7. **Type Safe**: Full TypeScript support with detailed types

## Common Usage Patterns

### Development (Allow Everything)

```typescript
app.use(cors()); // Uses CorsPresets.DEVELOPMENT
```

### Production (Environment Variable)

```bash
# .env
ALLOWED_ORIGINS=https://app.com,https://admin.app.com
```

```typescript
app.use(cors()); // Automatically reads ALLOWED_ORIGINS
```

### Production (Explicit Configuration)

```typescript
app.use(cors({
  origin: ["https://app.com", "https://admin.app.com"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
}));
```

### Dynamic Origin Validation

```typescript
app.use(cors({
  origin: (origin) => {
    // Query database, check allowlist, etc.
    return await db.isOriginAllowed(origin);
  },
  credentials: true,
}));
```

### Using Presets

```typescript
// Public API (no credentials)
app.use(cors(CorsPresets.PUBLIC_API));

// Strict security
app.use(cors(CorsPresets.STRICT(["https://app.com"])));
```

## Backwards Compatibility

If you need to maintain backwards compatibility temporarily:

```typescript
export function cors(options?: CorsOptions | {
  origin?: string;
  methods?: string[];
  headers?: string[];
}): Middleware {
  // Detect old-style options
  if (options && 'headers' in options && Array.isArray(options.headers)) {
    return createCorsMiddleware({
      origin: options.origin,
      methods: options.methods,
      allowedHeaders: options.headers,
    });
  }
  
  // Use new implementation
  return createCorsMiddleware(options as CorsOptions);
}
```

This allows existing code to work while encouraging migration to the new interface.
