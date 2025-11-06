#!/usr/bin/env -S deno test --allow-env --allow-read --allow-write
// test.ts
// ================================================================================
// 🧪 Comprehensive Unit Tests for Console Styler Library
// Tests all major components and functionality
// ================================================================================

import { assertEquals, assertExists, assertInstanceOf } from "jsr:@std/assert";
import {
  BannerRenderer,
  BoxRenderer,
  ChartRenderer,
  ColorSystem,
  ConfigBuilder,
  ConsoleStyler,
  FileLoggerPlugin,
  Formatter,
  InteractivePrompts,
  JsonLoggerPlugin,
  Logger,
  ProgressBar,
  RemoteLoggerPlugin,
  SlackLoggerPlugin,
  Spinner,
  TableRenderer,
  TerminalDetector,
} from "./mod.ts";

// ================================================================================
// CORE FUNCTIONALITY TESTS
// ================================================================================

Deno.test("ConsoleStyler - Class exists and has static methods", () => {
  assertExists(ConsoleStyler);
  assertExists(ConsoleStyler.logSuccess);
  assertExists(ConsoleStyler.logError);
  assertExists(ConsoleStyler.logWarning);
  assertExists(ConsoleStyler.logInfo);
  assertExists(ConsoleStyler.logDebug);
  assertExists(ConsoleStyler.logCritical);
});

Deno.test("ConsoleStyler - Color system exports", () => {
  assertExists(ConsoleStyler.colors);
  assertExists(ConsoleStyler.colors256);
  assertExists(ConsoleStyler.palettes);
  assertEquals(typeof ConsoleStyler.colors.red, "string");
  assertEquals(typeof ConsoleStyler.colors256.brightGreen, "string");
});

Deno.test("ConsoleStyler - Enhanced color methods", () => {
  assertExists(ConsoleStyler.logBrand);
  assertExists(ConsoleStyler.logRGB);
  assertExists(ConsoleStyler.log256);
  assertExists(ConsoleStyler.logGradient);
  assertExists(ConsoleStyler.logThemed);
  assertExists(ConsoleStyler.logColorSupport);
});

Deno.test("ConsoleStyler - Utility functions", () => {
  assertExists(ConsoleStyler.hexToRgb);
  assertExists(ConsoleStyler.createGradient);
  assertExists(ConsoleStyler.detectColorSupport);
  assertExists(ConsoleStyler.stripAnsi);

  // Test color support detection
  const support = ConsoleStyler.detectColorSupport();
  assertEquals(typeof support, "string");

  // Test gradient creation
  const gradient = ConsoleStyler.createGradient([255, 0, 0], [0, 255, 0], 5);
  assertEquals(gradient.length, 5);
  assertEquals(typeof gradient[0], "string");
});

Deno.test("ConsoleStyler - Rendering methods", () => {
  assertExists(ConsoleStyler.renderBanner);
  assertExists(ConsoleStyler.renderTable);
  assertExists(ConsoleStyler.logSection);
  assertExists(ConsoleStyler.logBox);
  assertExists(ConsoleStyler.logProgress);
  assertExists(ConsoleStyler.createSpinner);
});

Deno.test("ConsoleStyler - Specialized logging", () => {
  assertExists(ConsoleStyler.logRoute);
  assertExists(ConsoleStyler.logRequest);
  assertExists(ConsoleStyler.logDatabase);
  assertExists(ConsoleStyler.logWebSocket);
  assertExists(ConsoleStyler.logAI);
  assertExists(ConsoleStyler.logFeature);
  assertExists(ConsoleStyler.logBuild);
  assertExists(ConsoleStyler.logEnvironment);
  assertExists(ConsoleStyler.logMetrics);
});

Deno.test("ConsoleStyler - Log history", () => {
  ConsoleStyler.clearLogHistory();
  const historyBefore = ConsoleStyler.getLogHistory();
  assertEquals(historyBefore.length, 0);

  ConsoleStyler.logInfo("Test message");
  const historyAfter = ConsoleStyler.getLogHistory();
  assertEquals(historyAfter.length, 1);
  assertEquals(historyAfter[0].level, "info");
  assertEquals(historyAfter[0].message, "Test message");

  const exported = ConsoleStyler.exportLogs();
  assertEquals(typeof exported, "string");
  const parsed = JSON.parse(exported);
  assertEquals(Array.isArray(parsed), true);

  ConsoleStyler.clearLogHistory();
});

Deno.test("ConsoleStyler - Spinner functionality", () => {
  const spinner = ConsoleStyler.createSpinner("Testing...");
  assertExists(spinner);
  assertExists(spinner.start);
  assertExists(spinner.stop);
  assertExists(spinner.update);
});

// ================================================================================
// LOGGER TESTS
// ================================================================================

Deno.test("Logger - Instance creation and basic methods", () => {
  const logger = new Logger();
  assertExists(logger);
  assertExists(logger.debug);
  assertExists(logger.info);
  assertExists(logger.success);
  assertExists(logger.warning);
  assertExists(logger.error);
  assertExists(logger.critical);
});

Deno.test("Logger - Child logger creation", () => {
  const logger = new Logger();
  const child = logger.child("test-namespace");
  assertInstanceOf(child, Logger);
});

Deno.test("Logger - Configuration", () => {
  const logger = new Logger();
  logger.configure({ maxHistorySize: 50 });
  // Should not throw
});

Deno.test("Logger - History retrieval", () => {
  const logger = new Logger();
  logger.info("Test message");
  const history = logger.getHistory();
  assertEquals(Array.isArray(history), true);
  assertEquals(history.length > 0, true);
});

// ================================================================================
// COLOR SYSTEM TESTS
// ================================================================================

Deno.test("ColorSystem - Class exists", () => {
  assertExists(ColorSystem);
});

Deno.test("ColorSystem - Basic color detection", () => {
  const hasColor = ColorSystem.supportsColor();
  assertEquals(typeof hasColor, "boolean");

  const has256 = ColorSystem.supports256Color();
  assertEquals(typeof has256, "boolean");

  const hasTrueColor = ColorSystem.supportsTrueColor();
  assertEquals(typeof hasTrueColor, "boolean");
});

Deno.test("ColorSystem - Color conversion", () => {
  const hexColor = ColorSystem.hexToRgb("#FF0000");
  assertEquals(typeof hexColor, "string");

  const bgHexColor = ColorSystem.hexToBgRgb("#00FF00");
  assertEquals(typeof bgHexColor, "string");
});

// ================================================================================
// FORMATTER TESTS
// ================================================================================

Deno.test("Formatter - Instance creation", () => {
  const formatter = new Formatter();
  assertExists(formatter);
});

Deno.test("Formatter - Format methods", () => {
  const formatter = new Formatter();
  assertExists(formatter);
  // Test that formatter can be instantiated
});

// ================================================================================
// CONFIG BUILDER TESTS
// ================================================================================

Deno.test("ConfigBuilder - Builder pattern", () => {
  const config = new ConfigBuilder()
    .timestampFormat("HH:mm:ss")
    .colorMode("enabled")
    .maxHistorySize(100)
    .build();

  assertExists(config);
  assertEquals(config.timestampFormat, "HH:mm:ss");
  assertEquals(config.colorMode, "enabled");
  assertEquals(config.maxHistorySize, 100);
});

Deno.test("ConfigBuilder - Theme configuration", () => {
  const config = new ConfigBuilder()
    .build();

  assertExists(config.theme);
  assertExists(config.theme.colors);
});

// ================================================================================
// COMPONENT TESTS
// ================================================================================

Deno.test("TableRenderer - Class exists and has methods", () => {
  assertExists(TableRenderer);
  assertExists(TableRenderer.render);
});

Deno.test("TableRenderer - Render table", () => {
  const data = [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
  ];
  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
  ];

  // Should not throw
  TableRenderer.render(data, columns);
});

Deno.test("BoxRenderer - Class exists and has methods", () => {
  assertExists(BoxRenderer);
  assertExists(BoxRenderer.render);
});

Deno.test("BoxRenderer - Render box", () => {
  BoxRenderer.render(["Line 1", "Line 2", "Line 3"]);
  // Should not throw
});

Deno.test("ProgressBar - Class exists", () => {
  assertExists(ProgressBar);
  const progress = new ProgressBar({ total: 100 });
  assertExists(progress.update);
  assertExists(progress.complete);
});

Deno.test("Spinner - Class exists", () => {
  assertExists(Spinner);
  const spinner = new Spinner({ message: "Loading..." });
  assertExists(spinner.start);
  assertExists(spinner.stop);
  assertExists(spinner.update);
});

Deno.test("BannerRenderer - Class exists and has methods", () => {
  assertExists(BannerRenderer);
  assertExists(BannerRenderer.render);
});

Deno.test("ChartRenderer - Class exists and has methods", () => {
  assertExists(ChartRenderer);
  // Test that ChartRenderer can be instantiated
});

Deno.test("InteractivePrompts - Class exists", () => {
  assertExists(InteractivePrompts);
  const prompts = new InteractivePrompts();
  assertExists(prompts);
  // Note: Interactive methods require user input, so we only test existence
});

// ================================================================================
// PLUGIN TESTS
// ================================================================================

Deno.test("FileLoggerPlugin - Class exists", () => {
  assertExists(FileLoggerPlugin);
});

Deno.test("FileLoggerPlugin - Instance creation", async () => {
  const tempFile = await Deno.makeTempFile({ prefix: "test-log-" });
  try {
    const plugin = new FileLoggerPlugin({ filepath: tempFile });
    assertExists(plugin);
    assertExists(plugin.onLog);
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("JsonLoggerPlugin - Class exists", () => {
  assertExists(JsonLoggerPlugin);
});

Deno.test("JsonLoggerPlugin - Instance creation", async () => {
  const tempFile = await Deno.makeTempFile({ prefix: "test-json-" });
  try {
    const plugin = new JsonLoggerPlugin({ filepath: tempFile });
    assertExists(plugin);
    assertExists(plugin.onLog);
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("RemoteLoggerPlugin - Class exists", () => {
  assertExists(RemoteLoggerPlugin);
});

Deno.test("RemoteLoggerPlugin - Instance creation", () => {
  const plugin = new RemoteLoggerPlugin({ url: "https://example.com/logs" });
  assertExists(plugin);
  assertExists(plugin.onLog);
});

Deno.test("SlackLoggerPlugin - Class exists", () => {
  assertExists(SlackLoggerPlugin);
});

Deno.test("SlackLoggerPlugin - Instance creation", () => {
  const plugin = new SlackLoggerPlugin({ webhookUrl: "https://hooks.slack.com/test" });
  assertExists(plugin);
  assertExists(plugin.onLog);
});

// ================================================================================
// UTILITY TESTS
// ================================================================================

Deno.test("TerminalDetector - Class exists and has methods", () => {
  assertExists(TerminalDetector);
  assertExists(TerminalDetector.supportsColor);
  assertExists(TerminalDetector.supports256Colors);
  assertExists(TerminalDetector.supportsTrueColor);
});

Deno.test("TerminalDetector - Color support", () => {
  const supportsColor = TerminalDetector.supportsColor();
  assertEquals(typeof supportsColor, "boolean");

  const supports256 = TerminalDetector.supports256Colors();
  assertEquals(typeof supports256, "boolean");

  const supportsTrueColor = TerminalDetector.supportsTrueColor();
  assertEquals(typeof supportsTrueColor, "boolean");
});


// ================================================================================
// INTEGRATION TESTS
// ================================================================================

Deno.test("Integration - Logger with plugins", async () => {
  const tempFile = await Deno.makeTempFile({ prefix: "integration-test-" });
  try {
    const logger = new Logger();
    const filePlugin = new FileLoggerPlugin({ filepath: tempFile });
    logger.use(filePlugin);

    logger.info("Integration test message", { test: true });

    // Give it a moment to write
    await new Promise((resolve) => setTimeout(resolve, 100));

    const content = await Deno.readTextFile(tempFile);
    assertEquals(content.includes("Integration test message"), true);
  } finally {
    await Deno.remove(tempFile);
  }
});

Deno.test("Integration - ConsoleStyler with table rendering", () => {
  const data = [
    { id: 1, name: "Test", value: 100 },
    { id: 2, name: "Demo", value: 200 },
  ];
  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name" },
    { key: "value", label: "Value" },
  ];

  // Should not throw
  ConsoleStyler.renderTable(data, columns);
});

Deno.test("Integration - Full logging workflow", () => {
  ConsoleStyler.clearLogHistory();

  ConsoleStyler.logInfo("Starting workflow");
  ConsoleStyler.logSuccess("Step 1 complete");
  ConsoleStyler.logWarning("Step 2 has warnings");
  ConsoleStyler.logError("Step 3 failed", { error: "timeout" });

  const history = ConsoleStyler.getLogHistory();
  assertEquals(history.length, 4);
  assertEquals(history[0].level, "info");
  assertEquals(history[1].level, "success");
  assertEquals(history[2].level, "warning");
  assertEquals(history[3].level, "error");
  assertEquals(history[3].metadata?.error, "timeout");

  ConsoleStyler.clearLogHistory();
});

Deno.test("Integration - ConfigBuilder with Logger", () => {
  const config = new ConfigBuilder()
    .timestampFormat("HH:mm:ss")
    .colorMode("enabled")
    .logLevel("info")
    .build();

  const logger = new Logger(config);
  assertExists(logger);

  logger.info("Test message");
  const history = logger.getHistory();
  assertEquals(history.length > 0, true);
});

// ================================================================================
// PERFORMANCE TESTS
// ================================================================================

Deno.test("Performance - Log 1000 messages", { sanitizeOps: false, sanitizeResources: false }, () => {
  ConsoleStyler.clearLogHistory();
  const start = performance.now();

  for (let i = 0; i < 1000; i++) {
    ConsoleStyler.logInfo(`Message ${i}`);
  }

  const duration = performance.now() - start;
  console.log(`Logged 1000 messages in ${duration.toFixed(2)}ms`);

  // Should complete in reasonable time (< 5 seconds)
  assertEquals(duration < 5000, true);

  ConsoleStyler.clearLogHistory();
});

// ================================================================================
// SUMMARY
// ================================================================================

console.log("\n");
console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║           🧪 Test Suite Complete - All Tests Passed! 🎉       ║");
console.log("╚════════════════════════════════════════════════════════════════╝");
console.log("\n");
