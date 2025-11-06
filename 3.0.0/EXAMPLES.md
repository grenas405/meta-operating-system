# Meta-OS Core Examples

Quick examples for using the core modules of Meta-OS: `kernel.ts`, `server.ts`, `router.ts`, and `console-styler`.

---

## Table of Contents

- [Kernel Examples](#kernel-examples)
- [Server Examples](#server-examples)
- [Router Examples](#router-examples)
- [Console Styler Examples](#console-styler-examples)

---

## Kernel Examples

The Kernel manages Deno processes with auto-restart and monitoring capabilities.

### Basic Kernel Usage

```typescript
import { Kernel } from "./kernel.ts";

// Create a kernel instance with custom config
const kernel = new Kernel({
  debug: true,
  serverPort: 8000,
  serverHostname: "localhost",
});

// Boot the kernel (starts HTTP server and enters REPL)
await kernel.boot();
```

### Spawning Managed Processes

```typescript
import { Kernel } from "./kernel.ts";

const kernel = new Kernel();

// Spawn a process with auto-restart
const process = await kernel.spawnProcess(
  "my-worker",                    // Process ID
  "Background Worker",            // Display name
  "./worker.ts",                  // Script path
  ["--arg1", "value"],           // Script arguments
  {
    env: { WORKER_MODE: "prod" }, // Environment variables
    autoRestart: true,            // Auto-restart on crash
    cwd: "/path/to/workdir",      // Working directory
    port: 3000,                   // Optional: monitor port usage
  }
);

console.log(`Process started with PID: ${process.pid}`);
```

### Managing Processes

```typescript
// List all managed processes
const processes = kernel.listProcesses();
console.log(`Running ${processes.length} processes`);

// Get specific process status
const status = kernel.getProcessStatus("my-worker");
console.log(`Status: ${status?.status}`);

// Kill a process
await kernel.killProcess("my-worker", "SIGTERM");

// Get system info
const info = kernel.getSystemInfo();
console.log(`Kernel uptime: ${kernel.getUptime()}s`);
```

---

## Server Examples

The HTTP server provides a standalone process that can be managed by the kernel.

### Standalone Server

```typescript
import { HTTPServer } from "./server.ts";

// Create and start server
const server = new HTTPServer({
  port: 8080,
  hostname: "0.0.0.0",
  debug: true,
});

await server.start();
```

### Server with Environment Variables

```typescript
// The server automatically reads from environment:
// - PORT: Server port (default: 8000)
// - HOSTNAME: Server hostname (default: "localhost")
// - DEBUG: Enable debug mode (default: false)

// Set environment before starting
Deno.env.set("PORT", "3000");
Deno.env.set("DEBUG", "true");

const server = new HTTPServer();
await server.start();
```

---

## Router Examples

The Router provides method-based routing with middleware support.

### Basic Routing

```typescript
import { createRouter } from "./router.ts";
import { json } from "./utils/response.ts";

const router = createRouter();

// Simple GET route
router.get("/", () => {
  return json({ message: "Hello World" });
});

// Route with path parameters
router.get("/users/:id", (ctx) => {
  const userId = ctx.params.id;
  return json({ userId, name: "John Doe" });
});

// POST route with body
router.post("/api/data", (ctx) => {
  const body = ctx.state.body;
  return json({ received: body, timestamp: Date.now() });
});
```

### Routes with Middleware

```typescript
import { createRouter } from "./router.ts";
import { json } from "./utils/response.ts";
import type { Context, Middleware } from "./utils/context.ts";

const router = createRouter();

// Custom middleware
const authMiddleware: Middleware = async (ctx, next) => {
  const token = ctx.request.headers.get("Authorization");
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }
  ctx.state.user = { id: 1, name: "User" };
  return await next(ctx);
};

// Route with middleware
router.get("/protected", authMiddleware, (ctx) => {
  return json({ user: ctx.state.user });
});
```

### Request Validation

```typescript
import { createRouter } from "./router.ts";
import { json } from "./utils/response.ts";
import {
  validator,
  requiredString,
  requiredEmail,
  requiredNumber,
  optionalString,
} from "./utils/validator.ts";

const router = createRouter();

// Validated POST route
router.post(
  "/users",
  validator({
    name: requiredString({ minLength: 2, maxLength: 50 }),
    email: requiredEmail(),
    age: requiredNumber({ min: 18, max: 120, integer: true }),
    bio: optionalString({ maxLength: 500 }),
  }),
  (ctx) => {
    const user = ctx.state.body;
    return json({
      id: crypto.randomUUID(),
      ...user,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }
);
```

### Sub-Routers

```typescript
import { createRouter } from "./router.ts";
import { json } from "./utils/response.ts";

const mainRouter = createRouter();

// Create API v1 sub-router
const apiV1 = mainRouter.route("/api/v1");

apiV1.get("/users", () => json({ users: [] }));
apiV1.get("/posts", () => json({ posts: [] }));

// Routes are now at: /api/v1/users and /api/v1/posts
```

### Complete Server with Router

```typescript
import { createRouter, registerCoreRoutes } from "./router.ts";
import { json } from "./utils/response.ts";
import { bodyParser } from "./utils/parsers.ts";
import { logger, timing, requestId } from "./middleware/index.ts";

const router = createRouter();

// Add middleware
router.use(logger());
router.use(timing());
router.use(requestId());
router.use(bodyParser());

// Add your routes
router.get("/", () => json({ message: "API Ready" }));

// Start server
Deno.serve({ port: 8000 }, (request) => router.handle(request));
```

---

## Console Styler Examples

The Console Styler library provides rich terminal formatting and logging.

### Basic Logging

```typescript
import { ConsoleStyler } from "./utils/console-styler/mod.ts";

// Simple logging methods
ConsoleStyler.logInfo("Application started");
ConsoleStyler.logSuccess("Operation completed successfully");
ConsoleStyler.logWarning("Low memory warning");
ConsoleStyler.logError("Failed to connect to database");

// With metadata
ConsoleStyler.logInfo("User logged in", {
  userId: 123,
  timestamp: Date.now()
});
```

### HTTP Route Logging

```typescript
import { ConsoleStyler } from "./utils/console-styler/mod.ts";

// Log HTTP routes with colored method names
ConsoleStyler.logRoute("GET", "/api/users", "Registered route");
ConsoleStyler.logRoute("POST", "/api/users", "Registered route");
ConsoleStyler.logRoute("DELETE", "/api/users/:id", "Registered route");
```

### Banners

```typescript
import { ConsoleStyler } from "./utils/console-styler/mod.ts";

// Application startup banner
ConsoleStyler.renderBanner({
  version: "1.0.0",
  buildDate: new Date().toISOString(),
  environment: "production",
  port: 8000,
  author: "Your Team",
  repository: "github.com/yourorg/yourproject",
  description: "Your Application Description",
  features: [
    "Feature 1",
    "Feature 2",
    "Feature 3",
  ],
});
```

### Advanced Logger Configuration

```typescript
import { Logger, ConfigBuilder } from "./utils/console-styler/mod.ts";
import { neonTheme } from "./utils/console-styler/mod.ts";

// Create custom logger
const config = new ConfigBuilder()
  .setTheme(neonTheme)
  .setMinLevel("info")
  .setTimestampFormat("iso")
  .build();

const logger = new Logger(config);

logger.info("Custom logger message");
logger.debug("This won't show (below min level)");
logger.error("Error message", { code: 500 });
```

### Tables

```typescript
import { TableRenderer } from "./utils/console-styler/mod.ts";

const table = new TableRenderer();

table.render(
  [
    { name: "Alice", age: 30, role: "Developer" },
    { name: "Bob", age: 25, role: "Designer" },
    { name: "Charlie", age: 35, role: "Manager" },
  ],
  {
    columns: [
      { key: "name", header: "Name", width: 15 },
      { key: "age", header: "Age", width: 5, align: "right" },
      { key: "role", header: "Role", width: 15 },
    ],
    title: "Team Members",
    border: "rounded",
  }
);
```

### Progress Bars

```typescript
import { ProgressBar, Spinner } from "./utils/console-styler/mod.ts";

// Progress bar
const progress = new ProgressBar({
  total: 100,
  label: "Processing",
  width: 40,
});

for (let i = 0; i <= 100; i += 10) {
  progress.update(i);
  await new Promise(resolve => setTimeout(resolve, 100));
}
progress.finish("Complete!");

// Spinner
const spinner = new Spinner({
  message: "Loading data...",
  style: "dots",
});

spinner.start();
await someAsyncOperation();
spinner.stop("Data loaded!");
```

### Boxes

```typescript
import { BoxRenderer } from "./utils/console-styler/mod.ts";

const box = new BoxRenderer();

box.render("Important Message", {
  title: "Alert",
  padding: 2,
  style: "double",
  color: "red",
});

box.render([
  "Line 1: Some information",
  "Line 2: More details",
  "Line 3: Final note",
], {
  title: "Multi-line Box",
  style: "rounded",
});
```

### Charts

```typescript
import { ChartRenderer } from "./utils/console-styler/mod.ts";

const chart = new ChartRenderer();

// Bar chart
chart.renderBarChart(
  [
    { label: "Jan", value: 120 },
    { label: "Feb", value: 150 },
    { label: "Mar", value: 180 },
    { label: "Apr", value: 140 },
  ],
  {
    title: "Monthly Sales",
    width: 50,
    color: "green",
  }
);

// Line chart
chart.renderLineChart(
  [10, 25, 15, 40, 35, 50, 45],
  {
    title: "Trend Analysis",
    height: 10,
    width: 60,
  }
);
```

### Logging Plugins

```typescript
import {
  Logger,
  ConfigBuilder,
  FileLoggerPlugin,
  JsonLoggerPlugin,
} from "./utils/console-styler/mod.ts";

// Add file logging
const filePlugin = new FileLoggerPlugin({
  filePath: "./logs/app.log",
  maxSize: 10 * 1024 * 1024, // 10MB
  rotate: true,
});

// Add JSON logging
const jsonPlugin = new JsonLoggerPlugin({
  filePath: "./logs/app.json",
  pretty: false,
});

const config = new ConfigBuilder()
  .addPlugin(filePlugin)
  .addPlugin(jsonPlugin)
  .build();

const logger = new Logger(config);
logger.info("This will log to console, file, and JSON");
```

### Interactive Prompts

```typescript
import { InteractivePrompts } from "./utils/console-styler/mod.ts";

const prompts = new InteractivePrompts();

// Confirmation
const confirmed = await prompts.confirm("Do you want to continue?");

// Text input
const name = await prompts.input("Enter your name:");

// Choice selection
const choice = await prompts.select(
  "Choose an option:",
  ["Option 1", "Option 2", "Option 3"]
);

console.log(`You selected: ${choice}`);
```

---

## Complete Application Example

Here's a complete example combining all modules:

```typescript
import { Kernel } from "./kernel.ts";
import { HTTPServer } from "./server.ts";
import { createRouter } from "./router.ts";
import { json } from "./utils/response.ts";
import { ConsoleStyler } from "./utils/console-styler/mod.ts";

// If running as main module, boot the kernel
if (import.meta.main) {
  // Option 1: Use Kernel (manages server as subprocess)
  const kernel = new Kernel({
    serverPort: 8000,
    debug: true,
  });
  await kernel.boot();

  // Option 2: Run server directly
  // const server = new HTTPServer({ port: 8000 });
  // await server.start();
}

// Custom route setup (add to router.ts or separate file)
export function setupCustomRoutes(router: ReturnType<typeof createRouter>) {
  router.get("/custom", () => {
    ConsoleStyler.logInfo("Custom route accessed");
    return json({
      message: "Custom endpoint",
      timestamp: new Date().toISOString(),
    });
  });

  router.post("/process", async (ctx) => {
    const data = ctx.state.body;
    ConsoleStyler.logInfo("Processing data", data);

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 100));

    return json({
      success: true,
      processed: data,
    });
  });
}
```

---

## Environment Variables

Common environment variables used across modules:

```bash
# Server configuration
PORT=8000
HOSTNAME=localhost
DEBUG=true

# Deno environment
DENO_ENV=production

# Custom variables (passed to spawned processes)
WORKER_MODE=production
LOG_LEVEL=info
```

---

## Running Examples

```bash
# Run the kernel (starts server automatically)
deno run --allow-all kernel.ts

# Run server directly
deno run --allow-all server.ts

# With environment variables
DEBUG=true PORT=3000 deno run --allow-all kernel.ts

# Run with specific permissions
deno run --allow-net --allow-env --allow-read --allow-run kernel.ts
```

---

## Additional Resources

- See `kernel.ts:38-685` for full Kernel API
- See `server.ts:29-238` for full Server API
- See `router.ts:30-372` for full Router API
- See `utils/console-styler/mod.ts` for complete Console Styler exports
- Check `utils/console-styler/examples/` for more styling examples
