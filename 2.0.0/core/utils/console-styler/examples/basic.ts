// examples/basic.ts
import {
  BoxRenderer,
  ChartRenderer,
  ConfigBuilder,
  FileLoggerPlugin,
  InteractivePrompts,
  Logger,
  neonTheme,
  ProgressBar,
  TableRenderer,
} from "../mod.ts";

// Basic usage
const logger = new Logger();
logger.info("Application started");
logger.success("Connected to database");
logger.warning("High memory usage detected");
logger.error("Failed to load configuration");

console.log("\n---\n");

// With configuration
const config = new ConfigBuilder()
  .theme(neonTheme)
  .logLevel("debug")
  .plugin(new FileLoggerPlugin({ filepath: "./logs/app.log" }))
  .build();

const customLogger = new Logger(config);
customLogger.debug("Debug message");
customLogger.info("Info message with neon theme");

console.log("\n---\n");

// Tables
TableRenderer.render([
  { name: "Alice", age: 30, role: "Developer" },
  { name: "Bob", age: 25, role: "Designer" },
  { name: "Charlie", age: 35, role: "Manager" },
]);

console.log("\n---\n");

// Boxes
BoxRenderer.message("Operation completed successfully!", "success");
BoxRenderer.render([
  "Server Configuration",
  "Port: 8000",
  "Environment: production",
  "Database: Connected",
], { title: "System Status", style: "double" });

console.log("\n---\n");

// Progress bar
const progress = new ProgressBar({ total: 100, width: 40 });
for (let i = 0; i <= 100; i += 10) {
  progress.update(i);
  await new Promise((resolve) => setTimeout(resolve, 200));
}
progress.complete();

console.log("\n---\n");

// Charts
ChartRenderer.barChart([
  { label: "API Calls", value: 1250 },
  { label: "Page Views", value: 3400 },
  { label: "Errors", value: 23 },
], { showValues: true });

console.log("\n---\n");

// Interactive prompts
const name = await InteractivePrompts.input("What is your name?", "Anonymous");
console.log(`Hello, ${name}!`);

const shouldContinue = await InteractivePrompts.confirm("Continue?", true);
console.log(`User chose: ${shouldContinue ? "Yes" : "No"}`);
