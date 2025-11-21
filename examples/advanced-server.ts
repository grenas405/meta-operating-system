/**
 * Advanced HTTP Server Example
 * Demonstrates performance monitoring, security, and error handling
 */

import {
  createRouter,
  json,
  createPerformanceMiddleware,
  PerformanceMonitor,
  createSecurityMiddleware,
  SecurityPresets,
  createErrorMiddleware,
  ErrorHandlerPresets,
  createHealthCheckMiddleware,
  HealthCheckPresets,
  createLoggingMiddleware,
  AppError,
  NotFoundError,
  defaultLogger,
} from "../mod.ts";

// ============================================================================
// SETUP
// ============================================================================

const router = createRouter(defaultLogger);
const performanceMonitor = new PerformanceMonitor();

// ============================================================================
// MIDDLEWARE STACK (order matters!)
// ============================================================================

// 1. Error handling (catches all errors from downstream)
router.use(createErrorMiddleware(ErrorHandlerPresets.DEVELOPMENT));

// 2. Security headers
router.use(createSecurityMiddleware({
  environment: "development",
  ...SecurityPresets.BALANCED,
}));

// 3. Performance monitoring
router.use(createPerformanceMiddleware(performanceMonitor, defaultLogger, true));

// 4. Request logging
router.use(createLoggingMiddleware({
  environment: "development",
  logRequests: true,
  logResponses: true,
  logLevel: "info",
}));

// 5. Health check (auto-registers /health endpoint)
router.use(createHealthCheckMiddleware(
  defaultLogger,
  {
    ...HealthCheckPresets.BASIC,
    endpoint: "/health",
  },
));

// ============================================================================
// ROUTES
// ============================================================================

router.get("/", () => {
  return json({
    name: "Meta-OS Advanced Example",
    endpoints: [
      "GET  /health - Health check",
      "GET  /metrics - Performance metrics",
      "GET  /api/data - Sample data",
      "GET  /api/error - Trigger error",
      "GET  /api/slow - Slow endpoint (2s)",
    ],
  });
});

// Performance metrics endpoint
router.get("/metrics", () => {
  const metrics = performanceMonitor.getMetrics();
  return json({
    performance: metrics,
    timestamp: new Date().toISOString(),
  });
});

// Sample data endpoint
router.get("/api/data", () => {
  return json({
    items: [
      { id: 1, name: "Item A", value: 100 },
      { id: 2, name: "Item B", value: 200 },
      { id: 3, name: "Item C", value: 300 },
    ],
    total: 3,
  });
});

// Error demonstration
router.get("/api/error", () => {
  throw new AppError("Something went wrong!", 500, true);
});

// Not found error
router.get("/api/missing", () => {
  throw new NotFoundError("Resource", "req-123");
});

// Slow endpoint for performance testing
router.get("/api/slow", async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return json({ message: "Slow response completed" });
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = parseInt(Deno.env.get("PORT") || "8081");

console.log(`Starting advanced server on http://localhost:${PORT}`);
console.log("Try these endpoints:");
console.log(`  curl http://localhost:${PORT}/`);
console.log(`  curl http://localhost:${PORT}/health`);
console.log(`  curl http://localhost:${PORT}/metrics`);
console.log(`  curl http://localhost:${PORT}/api/error`);

Deno.serve(
  { port: PORT },
  (req) => router.handle(req),
);
