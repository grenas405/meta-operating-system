# DenoGenesis HTTP Server Framework

A lightweight, zero-dependency HTTP server framework for Deno with enterprise-grade middleware support.

> ⚠️ **Alpha Status:** This framework is under active development. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for current limitations.

## Features

✨ **Zero Dependencies** - Only uses Deno standard library
🚀 **TypeScript First** - Full type safety and IntelliSense support
🔒 **Security Focused** - Built-in security headers and protections
📊 **Performance Monitoring** - Comprehensive metrics and health checks
📝 **Extensive Logging** - Colored, structured request/response logging
⚡ **Fast Routing** - Efficient path matching with parameter support
🎯 **Middleware Composition** - Express-style middleware pattern

## Quick Start

### Basic Server

```typescript
import { createServer, json } from "./mod.ts";

const server = createServer({ port: 8000 });

server.get("/", () => {
  return json({ message: "Hello, World!" });
});

server.get("/users/:id", (ctx) => {
  return json({ userId: ctx.params.id });
});

await server.listen();
```

### With Middleware

```typescript
import {
  createServer,
  logger,
  cors,
  timing,
  errorHandler,
  json,
} from "./mod.ts";

const server = createServer({ port: 8000 });

// Add middleware
server.use(logger());
server.use(cors());
server.use(timing());

// Define routes
server.get("/api/users", async () => {
  const users = await db.getUsers();
  return json(users);
});

// Error handling (should be last)
server.use(errorHandler());

await server.listen();
```

## Current Status

### ✅ Working Features

- ✅ HTTP server with standard Request/Response
- ✅ Path-based routing with parameters (`/users/:id`)
- ✅ Response helpers (json, html, text, redirect)
- ✅ Body parsing (JSON, URL-encoded, multipart)
- ✅ Request validation
- ✅ Static file serving
- ✅ Basic middleware (logger, cors, timing, requestId)

### ⚠️ Known Issues

- ✅ Oak-style middleware has been refactored to the native Request/Response pipeline (see [KNOWN_ISSUES.md](KNOWN_ISSUES.md))
- ✅ Health check middleware responds directly without explicit route registration
- ⚠️ Example application still needs verification with the new middleware stack

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for complete list and workarounds.

## Installation

```bash
# Clone or copy the http/ directory
cd /path/to/your/project

# Import in your code
import { createServer } from "./http/mod.ts";
```

## Documentation

| Document | Description |
|----------|-------------|
| [MIDDLEWARE_INTEGRATION.md](middleware/MIDDLEWARE_INTEGRATION.md) | Complete middleware guide and usage |
| [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md) | Current integration status |
| [TODO.md](TODO.md) | Planned features and improvements |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | Current bugs and limitations |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |

## API Reference

### Server

```typescript
import { createServer, type ServerConfig } from "./mod.ts";

const server = createServer({
  port: 8000,
  hostname: "0.0.0.0",
  onListen: ({ hostname, port }) => {
    console.log(`Server running at http://${hostname}:${port}`);
  },
});
```

### Routing

```typescript
// HTTP Methods
server.get("/path", handler);
server.post("/path", handler);
server.put("/path", handler);
server.delete("/path", handler);
server.patch("/path", handler);

// Path Parameters
server.get("/users/:id", (ctx) => {
  const userId = ctx.params.id; // Extract parameter
  return json({ id: userId });
});

// Multiple parameters
server.get("/posts/:postId/comments/:commentId", (ctx) => {
  const { postId, commentId } = ctx.params;
  return json({ postId, commentId });
});
```

### Response Helpers

```typescript
import {
  json,
  html,
  text,
  redirect,
  notFound,
  badRequest,
  unauthorized,
  forbidden,
  internalError,
  noContent,
} from "./mod.ts";

// JSON response
server.get("/api/data", () => {
  return json({ key: "value" }, { status: 200 });
});

// HTML response
server.get("/", () => {
  return html("<h1>Hello</h1>");
});

// Plain text
server.get("/text", () => {
  return text("Plain text response");
});

// Redirect
server.get("/old", () => {
  return redirect("/new", 301);
});

// Error responses
server.get("/not-found", () => {
  return notFound("Resource not found");
});
```

### Middleware

```typescript
import { type Middleware, type Context } from "./mod.ts";

// Custom middleware
const myMiddleware: Middleware = async (ctx, next) => {
  console.log("Before handler");
  const response = await next();
  console.log("After handler");
  return response;
};

server.use(myMiddleware);

// Built-in middleware
import { logger, cors, timing, requestId } from "./mod.ts";

server.use(logger());       // Request logging
server.use(cors());         // CORS headers
server.use(timing());       // Response time header
server.use(requestId());    // Request tracking ID
```

### Body Parsing

```typescript
import { bodyParser } from "./mod.ts";

server.use(bodyParser());

server.post("/api/users", async (ctx) => {
  const body = await ctx.request.json();

  // Validate
  if (!body.name) {
    return badRequest("Name is required");
  }

  return json({ success: true });
});
```

### Request Validation

```typescript
import {
  validate,
  requiredString,
  requiredEmail,
  requiredNumber,
} from "./mod.ts";

const userSchema = {
  name: requiredString({ minLength: 2, maxLength: 50 }),
  email: requiredEmail(),
  age: requiredNumber({ min: 0, max: 120 }),
};

server.post("/api/users", async (ctx) => {
  const body = await ctx.request.json();

  const validation = validate(body, userSchema);

  if (!validation.valid) {
    return badRequest({ errors: validation.errors });
  }

  return json({ success: true });
});
```

### Error Handling

```typescript
import { errorHandler, AppError } from "./mod.ts";

// Custom error classes
import { ValidationError, NotFoundError } from "./mod.ts";

server.get("/users/:id", async (ctx) => {
  const user = await db.findUser(ctx.params.id);

  if (!user) {
    throw new NotFoundError(`User ${ctx.params.id} not found`);
  }

  return json(user);
});

// Global error handler (add last)
server.use(errorHandler({
  environment: "production",
  logErrors: true,
  showStackTrace: false,
  sanitizeErrors: true,
}));
```

### Static Files

```typescript
import { staticFiles } from "./mod.ts";

// Serve files from ./public directory
server.use(staticFiles({
  root: "./public",
  prefix: "/static",
  index: "index.html",
}));

// Now accessible at:
// http://localhost:8000/static/index.html
// http://localhost:8000/static/css/style.css
```

## Examples

### REST API

```typescript
import { createServer, json, bodyParser, errorHandler } from "./mod.ts";

const server = createServer({ port: 8000 });

server.use(bodyParser());

// GET all users
server.get("/api/users", async () => {
  const users = await db.getUsers();
  return json(users);
});

// GET single user
server.get("/api/users/:id", async (ctx) => {
  const user = await db.getUser(ctx.params.id);
  if (!user) {
    return notFound("User not found");
  }
  return json(user);
});

// CREATE user
server.post("/api/users", async (ctx) => {
  const body = await ctx.request.json();
  const user = await db.createUser(body);
  return json(user, { status: 201 });
});

// UPDATE user
server.put("/api/users/:id", async (ctx) => {
  const body = await ctx.request.json();
  const user = await db.updateUser(ctx.params.id, body);
  return json(user);
});

// DELETE user
server.delete("/api/users/:id", async (ctx) => {
  await db.deleteUser(ctx.params.id);
  return noContent();
});

server.use(errorHandler());

await server.listen();
```

### File Upload

```typescript
import { createServer, multipart } from "./mod.ts";

const server = createServer({ port: 8000 });

server.post("/upload", async (ctx) => {
  const formData = await multipart(ctx.request);

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return badRequest("File is required");
  }

  // Save file
  const bytes = await file.arrayBuffer();
  await Deno.writeFile(`./uploads/${file.name}`, new Uint8Array(bytes));

  return json({ filename: file.name, size: file.size });
});

await server.listen();
```

## Performance

### Benchmarks

> ⚠️ Benchmarks pending - framework is in alpha

Planned comparisons:
- DenoGenesis vs Oak
- DenoGenesis vs Express
- Request throughput
- Latency (p50, p95, p99)
- Memory usage

### Performance Tips

1. **Use streaming for large files**
2. **Enable compression middleware**
3. **Cache static assets**
4. **Limit request body size**
5. **Use connection pooling for databases**

## Security

Built-in security features:

- 🔒 **Security headers** (HSTS, CSP, X-Frame-Options)
- 🛡️ **Path traversal protection**
- 🚫 **Malicious user-agent detection**
- 🔐 **CSRF token generation**
- 📊 **Suspicious activity tracking**
- 🚷 **Automatic IP blocking**

See [security.ts](security.ts) for complete implementation.

## Testing

```typescript
import { assertEquals } from "https://deno.land/std/assert/mod.ts";
import { createServer } from "./mod.ts";

Deno.test("server should respond to GET requests", async () => {
  const server = createServer({ port: 8001 });

  server.get("/test", () => new Response("OK"));

  // Test implementation here
});
```

## Deployment

### Deno Deploy

```bash
deployctl deploy --project=my-project server.ts
```

### Docker

```dockerfile
FROM denoland/deno:latest

WORKDIR /app

COPY . .

RUN deno cache server.ts

EXPOSE 8000

CMD ["deno", "run", "--allow-net", "--allow-read", "server.ts"]
```

### Systemd Service

```ini
[Unit]
Description=DenoGenesis HTTP Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/app
ExecStart=/usr/local/bin/deno run --allow-net --allow-read server.ts
Restart=always

[Install]
WantedBy=multi-user.target
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup
- Code style guidelines
- Testing requirements
- Pull request process

### Priority Issues

1. 🔴 Fix middleware adapter pattern ([TODO.md #1](TODO.md))
2. 🔴 Fix health check route registration ([TODO.md #2](TODO.md))
3. 🟡 Add integration tests
4. 🟡 Implement error reporting
5. 🟡 Add graceful shutdown

## Roadmap

### v0.2.0
- ✅ Fix critical middleware issues
- ✅ Complete integration tests
- ✅ Production-ready error handling

### v0.3.0
- WebSocket support
- Rate limiting middleware
- Advanced caching

### v1.0.0
- Stable API
- Full documentation
- Performance benchmarks
- Security audit

See [TODO.md](TODO.md) for complete roadmap.

## FAQ

**Q: Why not use Oak?**
A: This framework aims for zero dependencies and uses standard Request/Response instead of Oak-style context mutation.

**Q: Is it production-ready?**
A: Not yet. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for current limitations.

**Q: What's the performance compared to Oak?**
A: Benchmarks pending. Expected to be comparable or better due to simpler middleware model.

**Q: Can I use this with Deno Deploy?**
A: Yes, once the critical issues are resolved.

**Q: How do I migrate from Oak?**
A: Migration guide pending. Main change is using standard Response objects instead of ctx.response.

## License

[Your License Here]

## Credits

Inspired by:
- [Oak](https://github.com/oakserver/oak) - Middleware pattern
- [Express](https://expressjs.com/) - API design
- [Koa](https://koajs.com/) - Async middleware

## Support

- 📖 [Documentation](middleware/MIDDLEWARE_INTEGRATION.md)
- 🐛 [Issues](KNOWN_ISSUES.md)
- 💬 [Discussions](TODO.md)

---

**Built with ❤️ for the Deno ecosystem**

*Current Version: 0.1.0-alpha*
*Last Updated: 2025-10-31*
