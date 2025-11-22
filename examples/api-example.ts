/**
 * Genesis Operating System - Usage Example
 *
 * This example demonstrates how to use the Genesis OS public API
 * to create custom HTTP services with routing and middleware.
 */

import {
  // Router and routing
  createRouter,
  type RouteHandler,
  type Context,

  // Middleware
  cors,
  security,
  errorHandler,
  compose,

  // Validation
  validate,
  requiredString,
  requiredEmail,
  requiredNumber,
  optionalString,

  // Response helpers
  json,
  html,
  text,
  notFound,
  badRequest,

  // Core utilities
  defaultLogger,
  type ILogger,
} from "./mod.ts";

// ============================================================================
// EXAMPLE 1: Simple Router with Routes
// ============================================================================

function example1SimpleRouter() {
  console.log("\n=== Example 1: Simple Router ===\n");

  // Create a router (requires a logger)
  const logger = defaultLogger;
  const router = createRouter(logger);

  // Define routes
  router.get("/", (_ctx: Context) => {
    return html(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Genesis OS Example</title>
          <style>
            body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; }
            h1 { color: #333; }
            .endpoint { background: #f4f4f4; padding: 10px; margin: 10px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>Genesis Operating System - Example</h1>
          <p>Welcome to the Genesis OS router example!</p>
          <h2>Available Endpoints:</h2>
          <div class="endpoint"><strong>GET /</strong> - This page</div>
          <div class="endpoint"><strong>GET /api/hello</strong> - JSON response</div>
          <div class="endpoint"><strong>GET /api/users/:id</strong> - Get user by ID</div>
          <div class="endpoint"><strong>POST /api/users</strong> - Create user (needs validation)</div>
        </body>
      </html>
    `);
  });

  router.get("/api/hello", (_ctx: Context) => {
    return json({
      message: "Hello from Genesis OS!",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    });
  });

  // Route with URL parameters
  router.get("/api/users/:id", (ctx: Context) => {
    const userId = ctx.params?.id;
    return json({
      user: {
        id: userId,
        name: `User ${userId}`,
        email: `user${userId}@example.com`,
        createdAt: new Date().toISOString(),
      },
    });
  });

  // Route with request body and validation
  router.post("/api/users", async (ctx: Context) => {
    try {
      const body = await ctx.request.json();

      // Validate the request body
      const validation = validate(body, {
        name: requiredString({ minLength: 2, maxLength: 50 }),
        email: requiredEmail(),
        age: requiredNumber({ min: 18, max: 120 }),
        bio: optionalString({ maxLength: 500 }),
      });

      if (!validation.isValid) {
        return badRequest(
          `Validation failed: ${JSON.stringify(validation.errors)}`,
        );
      }

      // Create user (in real app, save to database)
      const newUser = {
        id: crypto.randomUUID(),
        name: body.name,
        email: body.email,
        age: body.age,
        bio: body.bio || "",
        createdAt: new Date().toISOString(),
      };

      return json(newUser, { status: 201 });
    } catch (_error) {
      return badRequest("Invalid JSON body");
    }
  });

  console.log("✅ Router created with 4 routes");
  console.log("   - GET /");
  console.log("   - GET /api/hello");
  console.log("   - GET /api/users/:id");
  console.log("   - POST /api/users");
  console.log("\nTo use this router, integrate it with an HTTP server.\n");

  return router;
}

// ============================================================================
// EXAMPLE 2: Middleware Usage
// ============================================================================

function example2Middleware() {
  console.log("\n=== Example 2: Middleware Usage ===\n");

  const logger = defaultLogger;
  const router = createRouter(logger);

  // Apply middleware to the router
  router.use(errorHandler());
  router.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  }));
  router.use(security({
    environment: "development",
    enableHSTS: true,
    enableXSSProtection: true,
  }));

  // Custom timing middleware
  const timingMiddleware = async (
    ctx: Context,
    next: () => Promise<Response>,
  ) => {
    const start = Date.now();
    const response = await next();
    const duration = Date.now() - start;

    // Add timing header
    const headers = new Headers(response.headers);
    headers.set("X-Response-Time", `${duration}ms`);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };

  router.use(timingMiddleware);

  // Custom authentication middleware
  const authMiddleware = async (
    ctx: Context,
    next: () => Promise<Response>,
  ) => {
    const authHeader = ctx.request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return json(
        {
          error: "Unauthorized",
          message: "Missing or invalid authorization header",
        },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);

    // Validate token (in real app, verify JWT, etc.)
    if (token !== "secret-token-123") {
      return json(
        { error: "Unauthorized", message: "Invalid token" },
        { status: 401 },
      );
    }

    // Attach user info to context (extend Context type in real app)
    (ctx as any).user = { id: "user-123", name: "John Doe" };

    return next();
  };

  // Public route
  router.get("/api/public", (_ctx: Context) => {
    return json({
      message: "This is a public resource",
      timestamp: new Date().toISOString(),
    });
  });

  // Protected route (uses auth middleware)
  router.get("/api/protected", authMiddleware, (ctx: Context) => {
    const user = (ctx as any).user;
    return json({
      message: "This is a protected resource",
      user,
    });
  });

  console.log("✅ Router created with middleware:");
  console.log("   - Error handler");
  console.log("   - CORS");
  console.log("   - Security headers");
  console.log("   - Custom timing middleware");
  console.log("   - Custom auth middleware (for specific routes)");
  console.log("\nRoutes:");
  console.log("   - GET /api/public (no auth required)");
  console.log("   - GET /api/protected (requires Bearer token)\n");

  return router;
}

// ============================================================================
// EXAMPLE 3: RESTful Todo API
// ============================================================================

function example3RestfulAPI() {
  console.log("\n=== Example 3: RESTful Todo API ===\n");

  const logger = defaultLogger;
  const router = createRouter(logger);

  // In-memory data store
  interface Todo {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    createdAt: string;
    updatedAt: string;
  }

  const todos: Map<string, Todo> = new Map();

  // List all todos
  router.get("/api/todos", (_ctx: Context) => {
    const todoList = Array.from(todos.values());
    return json({
      count: todoList.length,
      todos: todoList,
    });
  });

  // Get single todo
  router.get("/api/todos/:id", (ctx: Context) => {
    const id = ctx.params?.id;
    const todo = todos.get(id!);

    if (!todo) {
      return notFound("Todo not found");
    }

    return json(todo);
  });

  // Create todo
  router.post("/api/todos", async (ctx: Context) => {
    try {
      const body = await ctx.request.json();

      const validation = validate(body, {
        title: requiredString({ minLength: 1, maxLength: 100 }),
        description: optionalString({ maxLength: 500 }),
      });

      if (!validation.isValid) {
        return badRequest(
          `Validation failed: ${JSON.stringify(validation.errors)}`,
        );
      }

      const todo: Todo = {
        id: crypto.randomUUID(),
        title: body.title,
        description: body.description || "",
        completed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      todos.set(todo.id, todo);

      return json(todo, { status: 201 });
    } catch (_error) {
      return badRequest("Invalid JSON body");
    }
  });

  // Update todo
  router.put("/api/todos/:id", async (ctx: Context) => {
    const id = ctx.params?.id;
    const todo = todos.get(id!);

    if (!todo) {
      return notFound("Todo not found");
    }

    try {
      const body = await ctx.request.json();

      const updatedTodo: Todo = {
        ...todo,
        title: body.title ?? todo.title,
        description: body.description ?? todo.description,
        completed: body.completed ?? todo.completed,
        updatedAt: new Date().toISOString(),
      };

      todos.set(id!, updatedTodo);

      return json(updatedTodo);
    } catch (_error) {
      return badRequest("Invalid JSON body");
    }
  });

  // Delete todo
  router.delete("/api/todos/:id", (ctx: Context) => {
    const id = ctx.params?.id;
    const todo = todos.get(id!);

    if (!todo) {
      return notFound("Todo not found");
    }

    todos.delete(id!);

    return json({ message: "Todo deleted successfully" });
  });

  console.log("✅ RESTful Todo API created:");
  console.log("   - GET /api/todos - List all todos");
  console.log("   - GET /api/todos/:id - Get todo by ID");
  console.log("   - POST /api/todos - Create new todo");
  console.log("   - PUT /api/todos/:id - Update todo");
  console.log("   - DELETE /api/todos/:id - Delete todo\n");

  return router;
}

// ============================================================================
// EXAMPLE 4: Composing Middleware
// ============================================================================

function example4ComposingMiddleware() {
  console.log("\n=== Example 4: Composing Middleware ===\n");

  // Create individual middleware functions
  const middleware1 = async (
    ctx: Context,
    next: () => Promise<Response>,
  ) => {
    console.log("Middleware 1: Before");
    const response = await next();
    console.log("Middleware 1: After");
    return response;
  };

  const middleware2 = async (
    ctx: Context,
    next: () => Promise<Response>,
  ) => {
    console.log("Middleware 2: Before");
    const response = await next();
    console.log("Middleware 2: After");
    return response;
  };

  const middleware3 = async (
    ctx: Context,
    next: () => Promise<Response>,
  ) => {
    console.log("Middleware 3: Before");
    const response = await next();
    console.log("Middleware 3: After");
    return response;
  };

  // Final handler that will be called after all middleware
  const finalHandler = async (_ctx: Context) => {
    return json({ message: "Handler executed successfully!" });
  };

  // Compose middleware into a single function
  const composedMiddleware = compose(
    [middleware1, middleware2, middleware3],
    finalHandler,
  );

  console.log("✅ Middleware composed:");
  console.log("   - Middleware 1");
  console.log("   - Middleware 2");
  console.log("   - Middleware 3");
  console.log("   - Final handler");
  console.log("\nExecution order:");
  console.log("   1. Middleware 1: Before");
  console.log("   2. Middleware 2: Before");
  console.log("   3. Middleware 3: Before");
  console.log("   4. Final handler executes");
  console.log("   5. Middleware 3: After");
  console.log("   6. Middleware 2: After");
  console.log("   7. Middleware 1: After\n");

  return composedMiddleware;
}

// ============================================================================
// Main
// ============================================================================

if (import.meta.main) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║           Meta Operating System - API Examples                ║
║                                                                ║
║  Demonstrates routing, middleware, validation, and more       ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);

  const args = Deno.args;
  const exampleArg = args[0];

  switch (exampleArg) {
    case "1":
    case "router":
      example1SimpleRouter();
      break;

    case "2":
    case "middleware":
      example2Middleware();
      break;

    case "3":
    case "rest":
      example3RestfulAPI();
      break;

    case "4":
    case "compose":
      example4ComposingMiddleware();
      break;

    case "all":
      example1SimpleRouter();
      example2Middleware();
      example3RestfulAPI();
      example4ComposingMiddleware();
      break;

    default:
      console.log("Usage: deno run --allow-all example.ts [example-number]");
      console.log("");
      console.log("Available examples:");
      console.log("  1, router     - Simple router with routes");
      console.log("  2, middleware - Middleware usage");
      console.log("  3, rest       - RESTful Todo API");
      console.log("  4, compose    - Composing middleware");
      console.log("  all           - Run all examples");
      console.log("");
      console.log("Examples:");
      console.log("  deno run --allow-all example.ts 1");
      console.log("  deno run --allow-all example.ts router");
      console.log("  deno run --allow-all example.ts all");
      console.log("");
      console.log("Note: These examples demonstrate the API usage.");
      console.log("      To run an actual HTTP server, use:");
      console.log("      deno run --allow-all kernel.ts");
      console.log("");
  }
}
