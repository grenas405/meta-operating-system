/**
 * Basic HTTP Server Example
 * Demonstrates core features from mod.ts
 */

import {
  createRouter,
  json,
  text,
  html,
  notFound,
  badRequest,
  errorHandler,
  timing,
  requestId,
  bodyParser,
  cors,
  validate,
  requiredString,
  requiredEmail,
  optionalNumber,
  defaultLogger,
  type Context,
} from "../mod.ts";

// Create router with logger
const router = createRouter(defaultLogger);

// Register middleware stack
router.use(errorHandler());
router.use(timing());
router.use(requestId());
router.use(cors({ origin: "*" }));
router.use(bodyParser());

// ============================================================================
// ROUTE EXAMPLES
// ============================================================================

// Simple JSON response
router.get("/api/hello", (ctx: Context) => {
  return json({ message: "Hello from Meta-OS!", requestId: ctx.state.requestId });
});

// Text response
router.get("/api/text", () => {
  return text("Plain text response");
});

// HTML response
router.get("/", () => {
  return html(`
    <!DOCTYPE html>
    <html>
      <head><title>Meta-OS Example</title></head>
      <body>
        <h1>Meta-OS Server</h1>
        <ul>
          <li><a href="/api/hello">JSON Hello</a></li>
          <li><a href="/api/text">Text Response</a></li>
          <li><a href="/api/users/123">User by ID</a></li>
          <li><a href="/health">Health Check</a></li>
        </ul>
      </body>
    </html>
  `);
});

// Route with URL parameters
router.get("/api/users/:id", (ctx: Context) => {
  const id = ctx.params.id;
  if (!id) {
    return badRequest("User ID required");
  }
  return json({
    user: { id, name: `User ${id}`, createdAt: new Date().toISOString() },
  });
});

// POST with body parsing
router.post("/api/users", (ctx: Context) => {
  const body = ctx.state.body as Record<string, unknown> | undefined;

  if (!body || !body.name) {
    return badRequest("Name is required");
  }

  return json({
    created: true,
    user: {
      id: crypto.randomUUID(),
      name: body.name,
      email: body.email || null,
    },
  }, { status: 201 });
});

// POST with validation
router.post("/api/contact", (ctx: Context) => {
  const body = ctx.state.body as Record<string, unknown> | undefined;

  const schema = {
    name: requiredString({ minLength: 2, maxLength: 100 }),
    email: requiredEmail(),
    age: optionalNumber({ min: 0, max: 150 }),
    message: requiredString({ minLength: 10, maxLength: 1000 }),
  };

  const result = validate(body || {}, schema);

  if (!result.valid) {
    return json({ errors: result.errors }, { status: 400 });
  }

  return json({
    success: true,
    message: "Contact form submitted",
    data: result.data,
  });
});

// Health check endpoint
router.get("/health", () => {
  return json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Deno.osUptime(),
  });
});

// Catch-all for 404
router.get("*", () => {
  return notFound("Route not found");
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = parseInt(Deno.env.get("PORT") || "8080");

console.log(`Starting server on http://localhost:${PORT}`);

Deno.serve(
  { port: PORT },
  (req) => router.handle(req),
);
