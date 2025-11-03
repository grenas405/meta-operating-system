#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write

/**
 * Comprehensive Demo of Console Styler Library
 *
 * This demonstrates all core features using only Deno native APIs
 * No external dependencies required!
 */

import { Logger, ConfigBuilder } from "../mod.ts";
import { TableRenderer } from "../components/tables.ts";
import { BoxRenderer } from "../components/boxes.ts";
import { ProgressBar, Spinner } from "../components/progress.ts";
import { BannerRenderer } from "../components/banners.ts";
import { ChartRenderer } from "../components/charts.ts";
import { ColorSystem } from "../core/colors.ts";
import { Formatter } from "../core/formatter.ts";
import { defaultTheme, neonTheme, draculaTheme } from "../themes/mod.ts";

console.clear();
console.log("\n");

// =============================================================================
// 1. COLOR SYSTEM DEMONSTRATION
// =============================================================================

console.log(ColorSystem.colorize("=".repeat(80), ColorSystem.codes.cyan));
console.log(
  ColorSystem.colorize(
    "  🎨 CONSOLE STYLER LIBRARY - COMPREHENSIVE DEMO",
    ColorSystem.codes.bright,
  ),
);
console.log(ColorSystem.colorize("=".repeat(80), ColorSystem.codes.cyan));
console.log("\n");

// Test color support
console.log(
  ColorSystem.colorize("1. Terminal Color Support Detection", ColorSystem.codes.bright),
);
console.log(
  `   Support Level: ${
    ColorSystem.colorize(
      ColorSystem.detectColorSupport().toUpperCase(),
      ColorSystem.codes.green,
    )
  }`,
);
console.log(
  `   256 Colors: ${ColorSystem.supports256Color() ? "✅" : "❌"}`,
);
console.log(
  `   True Color: ${ColorSystem.supportsTrueColor() ? "✅" : "❌"}`,
);
console.log("\n");

// =============================================================================
// 2. BASIC LOGGING
// =============================================================================

console.log(ColorSystem.colorize("2. Basic Logging", ColorSystem.codes.bright));

const logger = new Logger();

logger.debug("Debug message - for development troubleshooting");
logger.info("Info message - general information");
logger.success("Success message - operation completed successfully");
logger.warning("Warning message - potential issue detected");
logger.error("Error message - something went wrong");
logger.critical("Critical message - system-level failure");
console.log("\n");

// =============================================================================
// 3. LOGGING WITH METADATA
// =============================================================================

console.log(ColorSystem.colorize("3. Logging with Metadata", ColorSystem.codes.bright));

logger.info("User logged in", {
  userId: "12345",
  username: "alice",
  ip: "192.168.1.100",
  timestamp: new Date().toISOString(),
});

logger.error("Database connection failed", {
  host: "db.example.com",
  port: 5432,
  error: "Connection timeout",
  retryAttempt: 3,
});
console.log("\n");

// =============================================================================
// 4. CHILD LOGGERS (NAMESPACES)
// =============================================================================

console.log(ColorSystem.colorize("4. Child Loggers / Namespaces", ColorSystem.codes.bright));

const apiLogger = logger.child("api");
const dbLogger = logger.child("database");
const cacheLogger = logger.child("cache");

apiLogger.info("Handling GET request to /users");
dbLogger.info("Executing query: SELECT * FROM users");
cacheLogger.info("Cache hit for key: users_list");
console.log("\n");

// =============================================================================
// 5. CUSTOM CONFIGURATION
// =============================================================================

console.log(ColorSystem.colorize("5. Custom Configuration", ColorSystem.codes.bright));

const customLogger = new Logger(
  new ConfigBuilder()
    .timestampFormat("YYYY-MM-DD HH:mm:ss")
    .logLevel("info")
    .maxHistorySize(500)
    .build(),
);

customLogger.info("Logger with custom timestamp format");
customLogger.debug("This won't show - log level is set to info");
console.log("\n");

// =============================================================================
// 6. THEMES
// =============================================================================

console.log(ColorSystem.colorize("6. Theming System", ColorSystem.codes.bright));

const neonLogger = new Logger(
  new ConfigBuilder().theme(neonTheme).build(),
);

console.log("Default Theme:");
logger.success("Using default theme");
logger.warning("Warning in default theme");

console.log("\nNeon Theme:");
neonLogger.success("Using neon theme");
neonLogger.warning("Warning in neon theme");
console.log("\n");

// =============================================================================
// 7. BOX RENDERING
// =============================================================================

console.log(ColorSystem.colorize("7. Box Rendering", ColorSystem.codes.bright));
console.log("\n");

BoxRenderer.render("Simple message in a box", {
  style: "single",
  padding: 1,
});

console.log("\n");

BoxRenderer.render(
  [
    "Multiple lines",
    "in a rounded box",
    "with custom styling",
  ],
  {
    style: "rounded",
    title: "Rounded Box",
    color: ColorSystem.codes.cyan,
    padding: 2,
  },
);

console.log("\n");

BoxRenderer.message("This is an info message", "info");
console.log("\n");
BoxRenderer.message("Operation successful!", "success");
console.log("\n");
BoxRenderer.message("Warning: High memory usage", "warning");
console.log("\n");
BoxRenderer.message("Error: Connection failed", "error");
console.log("\n");

// =============================================================================
// 8. TABLE RENDERING
// =============================================================================

console.log(ColorSystem.colorize("8. Table Rendering", ColorSystem.codes.bright));
console.log("\n");

const users = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", role: "admin", active: true },
  { id: 2, name: "Bob Smith", email: "bob@example.com", role: "user", active: true },
  { id: 3, name: "Charlie Brown", email: "charlie@example.com", role: "user", active: false },
  { id: 4, name: "Diana Prince", email: "diana@example.com", role: "moderator", active: true },
];

TableRenderer.render(users, [
  { key: "id", label: "ID", width: 5 },
  { key: "name", label: "Name", width: 20 },
  { key: "email", label: "Email", width: 25 },
  { key: "role", label: "Role", width: 12 },
  {
    key: "active",
    label: "Status",
    width: 10,
    formatter: (val: boolean) =>
      val
        ? ColorSystem.colorize("✅ Active", ColorSystem.codes.green)
        : ColorSystem.colorize("❌ Inactive", ColorSystem.codes.red),
  },
]);

console.log("\n");

// Key-value table
const systemInfo = [
  { label: "Version", value: "1.0.0" },
  { label: "Environment", value: "production" },
  { label: "Uptime", value: "5d 12h 34m" },
  { label: "CPU Usage", value: "45%" },
  { label: "Memory Usage", value: "62%" },
];

console.log("System Information:");
console.log("\n");
TableRenderer.renderKeyValue(systemInfo);
console.log("\n");

// =============================================================================
// 9. BANNER RENDERING
// =============================================================================

console.log(ColorSystem.colorize("9. Banner Rendering", ColorSystem.codes.bright));
console.log("\n");

BannerRenderer.render({
  title: "CONSOLE STYLER",
  subtitle: "Professional Terminal Logging",
  version: "1.0.0",
  author: "Your Name",
  style: "double",
});

console.log("\n");

// =============================================================================
// 10. CHARTS
// =============================================================================

console.log(ColorSystem.colorize("10. Chart Rendering", ColorSystem.codes.bright));
console.log("\n");

const requestData = [
  { label: "Jan", value: 120 },
  { label: "Feb", value: 250 },
  { label: "Mar", value: 180 },
  { label: "Apr", value: 300 },
  { label: "May", value: 420 },
  { label: "Jun", value: 350 },
];

console.log("Monthly Requests:");
ChartRenderer.barChart(requestData, {
  width: 60,
  showValues: true,
  color: ColorSystem.codes.cyan,
});

console.log("\n");

// =============================================================================
// 11. PROGRESS INDICATORS
// =============================================================================

console.log(ColorSystem.colorize("11. Progress Indicators", ColorSystem.codes.bright));
console.log("\n");

// Progress Bar
console.log("Progress Bar Demo:");
const progressBar = new ProgressBar({ total: 100, width: 50 });
for (let i = 0; i <= 100; i += 5) {
  progressBar.update(i);
  await new Promise((resolve) => setTimeout(resolve, 100));
}
progressBar.complete();

console.log("\n");

// Spinner
console.log("Spinner Demo:");
const spinner = new Spinner({ message: "Loading data..." });
spinner.start();
await new Promise((resolve) => setTimeout(resolve, 2000));
spinner.update("Processing data...");
await new Promise((resolve) => setTimeout(resolve, 1000));
spinner.succeed("Data loaded successfully!");

console.log("\n");

// =============================================================================
// 12. FORMATTERS
// =============================================================================

console.log(ColorSystem.colorize("12. Built-in Formatters", ColorSystem.codes.bright));
console.log("\n");

console.log(`Bytes: ${Formatter.bytes(1234567890)}`);
console.log(`Duration: ${Formatter.duration(125432)}`);
console.log(`Number: ${Formatter.number(1234567)}`);
console.log(`Currency: ${Formatter.currency(1234.56)}`);
console.log(`Percentage: ${Formatter.percentage(0.8542)}`);
console.log(`Relative Time: ${Formatter.relativeTime(new Date(Date.now() - 3600000))}`);
console.log("\n");

// =============================================================================
// 13. COLOR GRADIENTS
// =============================================================================

console.log(ColorSystem.colorize("13. Color Gradients", ColorSystem.codes.bright));
console.log("\n");

console.log("Red to Blue Gradient:");
const gradient1 = ColorSystem.createGradient([255, 0, 0], [0, 0, 255], 50);
let line1 = "";
for (const color of gradient1) {
  line1 += `${color}█${ColorSystem.codes.reset}`;
}
console.log(line1);

console.log("\nGreen to Yellow Gradient:");
const gradient2 = ColorSystem.createGradient([0, 255, 0], [255, 255, 0], 50);
let line2 = "";
for (const color of gradient2) {
  line2 += `${color}█${ColorSystem.codes.reset}`;
}
console.log(line2);

console.log("\n");

// =============================================================================
// 14. HEX AND RGB COLORS
// =============================================================================

console.log(ColorSystem.colorize("14. Hex and RGB Colors", ColorSystem.codes.bright));
console.log("\n");

console.log(
  `${ColorSystem.hexToRgb("#FF6B35")}Custom brand color from hex${ColorSystem.codes.reset}`,
);
console.log(
  `${
    ColorSystem.rgb(100, 200, 255)
  }Custom color from RGB values${ColorSystem.codes.reset}`,
);
console.log(
  `${
    ColorSystem.hexToBgRgb("#1DA1F2")
  }Text with custom background color${ColorSystem.codes.reset}`,
);

console.log("\n");

// =============================================================================
// 15. LOG HISTORY
// =============================================================================

console.log(ColorSystem.colorize("15. Log History", ColorSystem.codes.bright));
console.log("\n");

const historyLogger = new Logger(
  new ConfigBuilder().enableHistory(true).maxHistorySize(100).build(),
);

historyLogger.info("First log entry");
historyLogger.warning("Second log entry");
historyLogger.error("Third log entry");

const history = historyLogger.getHistory();
console.log(`Total logs in history: ${history.length}`);

const errorLogs = historyLogger.getHistory({ level: "error" });
console.log(`Error logs: ${errorLogs.length}`);

console.log("\n");

// =============================================================================
// SUMMARY
// =============================================================================

console.log(ColorSystem.colorize("=".repeat(80), ColorSystem.codes.cyan));
console.log(
  ColorSystem.colorize("  ✅ DEMO COMPLETE", ColorSystem.codes.bright),
);
console.log(ColorSystem.colorize("=".repeat(80), ColorSystem.codes.cyan));
console.log("\n");

BoxRenderer.render(
  [
    "Console Styler Library",
    "",
    "✅ Zero external dependencies",
    "✅ Deno native APIs only",
    "✅ Full TypeScript support",
    "✅ Rich terminal formatting",
    "✅ Flexible theming system",
    "✅ Plugin architecture",
    "✅ Production ready",
    "",
    "Perfect for CLI tools and server applications!",
  ],
  {
    style: "double",
    title: "Summary",
    color: ColorSystem.codes.green,
    padding: 1,
  },
);

console.log("\n");
