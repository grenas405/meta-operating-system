#!/usr/bin/env -S deno run --allow-env --allow-read

/**
 * Enhanced ConsoleStyler Demo
 *
 * Demonstrates all new features while maintaining backward compatibility
 */

import { ConsoleStyler } from "./ConsoleStyler.ts";

console.log("\n");
console.log(
  "╔════════════════════════════════════════════════════════════════╗",
);
console.log("║     🎨 Enhanced ConsoleStyler - Integration Demo 🎨          ║");
console.log(
  "╚════════════════════════════════════════════════════════════════╝",
);
console.log("\n");

// =============================================================================
// 1. TERMINAL CAPABILITY DETECTION
// =============================================================================

ConsoleStyler.logColorSupport();

// =============================================================================
// 2. BACKWARD COMPATIBILITY - ALL EXISTING METHODS WORK
// =============================================================================

ConsoleStyler.logSection("🔄 Backward Compatibility Test", "cyan");

ConsoleStyler.logSuccess("All existing methods work exactly as before!");
ConsoleStyler.logInfo("Server started on port 3000", { env: "development" });
ConsoleStyler.logWarning("High memory usage detected", { usage: "85%" });
ConsoleStyler.logError("Database connection failed", { error: "timeout" });
ConsoleStyler.logDebug("Processing request...", { requestId: "abc123" });
ConsoleStyler.logCritical("SYSTEM FAILURE", { code: "FATAL" });

console.log("\n");

// =============================================================================
// 3. NEW ENHANCED COLORS
// =============================================================================

ConsoleStyler.logSection("✨ New Enhanced Color Features", "brightCyan");

// Brand colors with hex
ConsoleStyler.logBrand("Welcome to our platform!", "#FF6B35", {
  user: "Alice",
  role: "admin",
});

// Custom RGB colors
ConsoleStyler.logRGB("Custom notification", 100, 200, 255, "💎");

// 256-color palette
ConsoleStyler.log256("Orange warning message", 208, "⚠️ ");
ConsoleStyler.log256("Deep blue info", 21, "ℹ️ ");

// Themed logging
ConsoleStyler.logThemed("Solarized error", "solarized", "red", "❌");
ConsoleStyler.logThemed("Nord success", "nord", "nord14", "✅");
ConsoleStyler.logThemed("Dracula warning", "dracula", "orange", "⚠️ ");

console.log("\n");

// =============================================================================
// 4. GRADIENTS
// =============================================================================

ConsoleStyler.logSection("🌈 Color Gradients", "brightMagenta");

ConsoleStyler.logGradient(
  "Processing Pipeline (Red → Green)",
  [255, 0, 0],
  [0, 255, 0],
  30,
);

ConsoleStyler.logGradient(
  "Loading States (Blue → Cyan)",
  [0, 0, 255],
  [0, 255, 255],
  40,
);

console.log("\n");

// =============================================================================
// 5. ENHANCED EXISTING FEATURES
// =============================================================================

ConsoleStyler.logSection("🎯 Enhanced Existing Features", "brightGreen");

// Enhanced route logging (now uses 256 colors if available)
ConsoleStyler.logRoute("GET", "/api/users", "Fetch all users", 12.5);
ConsoleStyler.logRoute("POST", "/api/auth/login", "User authentication", 45.2);
ConsoleStyler.logRoute("PUT", "/api/users/123", "Update user", 23.1);
ConsoleStyler.logRoute("DELETE", "/api/users/456", "Delete user", 15.8);

console.log("\n");

// Enhanced database logging
ConsoleStyler.logDatabase("SELECT", "users", 23.4, 150);
ConsoleStyler.logDatabase("INSERT", "orders", 12.1, 1);
ConsoleStyler.logDatabase("UPDATE", "products", 156.7, 50);

console.log("\n");

// Enhanced WebSocket logging
ConsoleStyler.logWebSocket("connect", "client-abc123");
ConsoleStyler.logWebSocket("message", "client-abc123", {
  type: "chat",
  text: "Hello!",
});
ConsoleStyler.logWebSocket("disconnect", "client-abc123");

console.log("\n");

// Enhanced AI logging
ConsoleStyler.logAI("completion", "claude-sonnet-4", 1500, 234.5);
ConsoleStyler.logAI("embedding", "text-embedding-ada-002", 512, 45.2);

console.log("\n");

// =============================================================================
// 6. PERFORMANCE METRICS (ENHANCED COLORS)
// =============================================================================

ConsoleStyler.logSection("📊 Enhanced Performance Metrics", "brightBlue");

const metrics = {
  uptime: "5d 12h 34m",
  requests: 1234567,
  errors: 42,
  successRate: "99.7%",
  memory: {
    heapUsed: "245.3 MB",
    heapTotal: "512.0 MB",
    external: "12.1 MB",
    rss: "678.9 MB",
  },
  responseTime: {
    avg: 45.2,
    min: 5.1,
    max: 234.6,
  },
  database: {
    connections: 25,
    queries: 456789,
    avgQueryTime: 23.4,
  },
  websockets: {
    active: 150,
    messagesSent: 98765,
    messagesReceived: 87654,
  },
};

ConsoleStyler.logMetrics(metrics);

// =============================================================================
// 7. ENHANCED TABLE RENDERING
// =============================================================================

ConsoleStyler.logSection("📋 Enhanced Table Rendering", "brightYellow");

const users = [
  {
    id: 1,
    name: "Alice Johnson",
    email: "alice@example.com",
    status: "active",
    role: "admin",
  },
  {
    id: 2,
    name: "Bob Smith",
    email: "bob@example.com",
    status: "active",
    role: "user",
  },
  {
    id: 3,
    name: "Charlie Brown",
    email: "charlie@example.com",
    status: "inactive",
    role: "user",
  },
  {
    id: 4,
    name: "Diana Prince",
    email: "diana@example.com",
    status: "active",
    role: "moderator",
  },
];

ConsoleStyler.renderTable(users, [
  { key: "id", label: "ID", width: 5 },
  { key: "name", label: "Name", width: 20 },
  { key: "email", label: "Email", width: 25 },
  {
    key: "status",
    label: "Status",
    width: 12,
    formatter: (val) =>
      val === "active"
        ? `${ConsoleStyler.colors256.brightGreen}✅ Active${ConsoleStyler.colors.reset}`
        : `${ConsoleStyler.colors256.gray12}❌ Inactive${ConsoleStyler.colors.reset}`,
  },
  { key: "role", label: "Role", width: 12 },
]);

console.log("\n");

// =============================================================================
// 8. REQUEST LOGGING (ENHANCED)
// =============================================================================

ConsoleStyler.logSection("🌐 Enhanced Request Logging", "brightCyan");

ConsoleStyler.logRequest("GET", "/api/users", 200, 12.3, 2048);
ConsoleStyler.logRequest("POST", "/api/auth/login", 201, 45.6, 512);
ConsoleStyler.logRequest("GET", "/api/products", 304, 5.2);
ConsoleStyler.logRequest("PUT", "/api/users/123", 200, 89.4, 1024);
ConsoleStyler.logRequest("GET", "/api/nonexistent", 404, 8.1, 256);
ConsoleStyler.logRequest("POST", "/api/broken", 500, 234.5, 128);

console.log("\n");

// =============================================================================
// 9. SPECIALIZED LOGGING
// =============================================================================

ConsoleStyler.logSection("🔧 Specialized Logging Methods", "brightMagenta");

// Feature announcements
ConsoleStyler.logFeature("Authentication", "JWT-based auth system", "enabled");
ConsoleStyler.logFeature("Payments", "Stripe integration", "beta");
ConsoleStyler.logFeature("Analytics", "Real-time tracking", "experimental");
ConsoleStyler.logFeature("Legacy API", "Deprecated endpoints", "disabled");

console.log("\n");

// Build logging
ConsoleStyler.logBuild("Compilation", true, 1234.5, [
  "Compiled 150 TypeScript files",
  "Generated source maps",
  "Optimized bundle size",
]);

console.log("\n");

// Environment logging
ConsoleStyler.logEnvironment("production", [
  "SSL Enabled",
  "CDN Active",
  "Auto-scaling",
]);

console.log("\n");

// =============================================================================
// 10. PROGRESS INDICATORS (ENHANCED)
// =============================================================================

ConsoleStyler.logSection("⏳ Enhanced Progress Indicators", "brightGreen");

console.log("\nProgress bar simulation:\n");

for (let i = 0; i <= 100; i += 5) {
  ConsoleStyler.logProgress(i, 100, "Processing files...");
  await new Promise((resolve) => setTimeout(resolve, 100));
}

console.log("\n\nSpinner simulation:\n");

const spinner = ConsoleStyler.createSpinner("Loading data from API...");
spinner.start();
await new Promise((resolve) => setTimeout(resolve, 2000));
spinner.update("Processing response...");
await new Promise((resolve) => setTimeout(resolve, 1000));
spinner.stop("✅ Data loaded successfully!");

console.log("\n");

// =============================================================================
// 11. BOX RENDERING (ENHANCED)
// =============================================================================

ConsoleStyler.logSection("📦 Enhanced Box Rendering", "brightYellow");

ConsoleStyler.logBox(
  [
    "System Status: HEALTHY",
    "All services operational",
    "Last check: 30 seconds ago",
    "",
    "CPU: 45% | Memory: 62% | Disk: 78%",
  ],
  "System Health",
  "brightGreen",
);

console.log("\n");

ConsoleStyler.logBox(
  [
    `${ConsoleStyler.colors256.brightRed}CRITICAL ALERT${ConsoleStyler.colors.reset}`,
    "",
    "Database connection lost",
    "Automatic reconnection in progress...",
    "",
    "Last successful query: 5 minutes ago",
  ],
  "⚠️  Alert",
  "brightRed",
);

console.log("\n");

// =============================================================================
// 12. CUSTOM COLOR USAGE
// =============================================================================

ConsoleStyler.logSection("🎨 Direct Color System Access", "brightMagenta");

// Direct access to color system
console.log(
  `${ConsoleStyler.colors.bright}You can access the full color system:${ConsoleStyler.colors.reset}`,
);
console.log(
  `  • ${ConsoleStyler.colors256.orange}256 named colors${ConsoleStyler.colors.reset}`,
);
console.log(
  `  • ${
    ConsoleStyler.colors.rgb(255, 100, 200)
  }RGB true color${ConsoleStyler.colors.reset}`,
);
console.log(
  `  • ${
    ConsoleStyler.hexToRgb("#1DA1F2")
  }Hex colors${ConsoleStyler.colors.reset}`,
);
console.log(
  `  • ${ConsoleStyler.palettes.dracula.purple}Themed palettes${ConsoleStyler.colors.reset}`,
);

console.log("\n");

// Gradient example
const gradient = ConsoleStyler.createGradient([255, 0, 0], [0, 255, 0], 50);
let gradientLine = "Gradient: ";
for (const color of gradient) {
  gradientLine += `${color}█${ConsoleStyler.colors.reset}`;
}
console.log(gradientLine);

console.log("\n");

// =============================================================================
// SUMMARY
// =============================================================================

ConsoleStyler.logSection("✅ Integration Complete", "brightGreen");

ConsoleStyler.logBox([
  "✅ All backward-compatible methods work",
  "✅ New 256-color support added",
  "✅ RGB/Hex color support integrated",
  "✅ Enhanced visual styling throughout",
  "✅ Gradients and themed palettes available",
  "✅ Terminal capability detection working",
  "",
  `${ConsoleStyler.colors.bright}Your terminal supports: ${ConsoleStyler.detectColorSupport().toUpperCase()}${ConsoleStyler.colors.reset}`,
], "🎉 Demo Summary");

console.log("\n");

console.log(
  "╔════════════════════════════════════════════════════════════════╗",
);
console.log(
  "║           Demo Complete - Enjoy Enhanced Logging! 🚀          ║",
);
console.log(
  "╚════════════════════════════════════════════════════════════════╝",
);
console.log("\n");
