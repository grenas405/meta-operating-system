# Console Styler

A comprehensive, professional terminal logging and formatting library for Deno applications. Zero external dependencies, pure Deno native APIs, with full TypeScript support.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Deno](https://img.shields.io/badge/deno-1.x-brightgreen.svg)](https://deno.land)

## Features

- **Zero Dependencies**: Built exclusively with Deno native APIs
- **Rich Logging**: Multiple log levels with metadata support
- **Visual Components**: Tables, boxes, progress bars, spinners, charts, and banners
- **Color System**: 16, 256, and true color support with automatic detection
- **Theming**: Built-in themes (default, neon, dracula, minimal) and custom theme support
- **Plugins**: Extensible plugin architecture for file logging, JSON output, remote logging, and more
- **Framework Adapters**: Ready-to-use middleware for Oak, Hono, and Express
- **Child Loggers**: Namespaced logging for modular applications
- **TypeScript**: Full type safety and excellent IntelliSense support
- **Production Ready**: Battle-tested for CLI tools and server applications

## Quick Start

### Installation

```typescript
// Import from JSR (recommended)
import { Logger } from "jsr:@grenas405/console-styler";

// Or import from deno.land/x
import { Logger } from "https://deno.land/x/console_styler/mod.ts";

// Or use with mod.ts directly
import { Logger } from "./mod.ts";
```

### Basic Usage

```typescript
import { Logger } from "./mod.ts";

const logger = new Logger();

logger.debug("Debug information");
logger.info("General information");
logger.success("Operation completed successfully");
logger.warning("Warning: something needs attention");
logger.error("Error: operation failed");
logger.critical("Critical: system failure");
```

## Core Features

### 1. Structured Logging

#### Log with Metadata

```typescript
import { Logger } from "./mod.ts";

const logger = new Logger();

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
```

#### Child Loggers (Namespaces)

Create namespaced loggers for different parts of your application:

```typescript
import { Logger } from "./mod.ts";

const logger = new Logger();

const apiLogger = logger.child("api");
const dbLogger = logger.child("database");
const cacheLogger = logger.child("cache");

apiLogger.info("Handling GET request to /users");
dbLogger.info("Executing query: SELECT * FROM users");
cacheLogger.info("Cache hit for key: users_list");
```

### 2. Configuration

Use `ConfigBuilder` for fluent configuration:

```typescript
import { ConfigBuilder, Logger, neonTheme } from "./mod.ts";

const config = new ConfigBuilder()
  .theme(neonTheme)
  .logLevel("debug")
  .timestampFormat("YYYY-MM-DD HH:mm:ss")
  .enableHistory(true)
  .maxHistorySize(500)
  .build();

const logger = new Logger(config);
```

### 3. Themes

Built-in themes with easy customization:

```typescript
import { Logger, ConfigBuilder, neonTheme, draculaTheme, minimalTheme } from "./mod.ts";

// Use built-in themes
const neonLogger = new Logger(
  new ConfigBuilder().theme(neonTheme).build()
);

const draculaLogger = new Logger(
  new ConfigBuilder().theme(draculaTheme).build()
);
```

### 4. Plugins

Extend functionality with plugins:

```typescript
import { Logger, FileLoggerPlugin, JsonLoggerPlugin, ConfigBuilder } from "./mod.ts";

const config = new ConfigBuilder()
  .plugin(new FileLoggerPlugin({
    filepath: "./logs/app.log"
  }))
  .plugin(new JsonLoggerPlugin({
    filepath: "./logs/app.json"
  }))
  .build();

const logger = new Logger(config);
```

Available plugins:

- **FileLoggerPlugin**: Write logs to file
- **JsonLoggerPlugin**: Output structured JSON logs
- **RemoteLoggerPlugin**: Send logs to remote server
- **SlackLoggerPlugin**: Send critical alerts to Slack

### 5. Visual Components

#### Tables

Render beautiful tables with custom formatting:

```typescript
import { TableRenderer } from "./mod.ts";

const users = [
  { id: 1, name: "Alice", email: "alice@example.com", role: "admin" },
  { id: 2, name: "Bob", email: "bob@example.com", role: "user" },
];

// Simple table (auto-columns)
TableRenderer.render(users);

// Custom columns with formatting
TableRenderer.render(users, [
  { key: "id", label: "ID", width: 5 },
  { key: "name", label: "Name", width: 20 },
  { key: "email", label: "Email", width: 25 },
  { key: "role", label: "Role", width: 10 },
]);

// Key-value table
TableRenderer.renderKeyValue([
  { label: "Version", value: "1.0.0" },
  { label: "Environment", value: "production" },
  { label: "Uptime", value: "5d 12h" },
]);
```

#### Boxes

Create styled boxes for important messages:

```typescript
import { BoxRenderer } from "./mod.ts";

// Simple message box
BoxRenderer.render("Operation completed successfully!");

// Multi-line box with title
BoxRenderer.render(
  [
    "Server Status",
    "Port: 8000",
    "Environment: production",
    "Database: Connected"
  ],
  {
    title: "System Information",
    style: "double",  // single, double, rounded, bold
    padding: 2
  }
);

// Predefined message types
BoxRenderer.message("This is an info message", "info");
BoxRenderer.message("Success!", "success");
BoxRenderer.message("Warning!", "warning");
BoxRenderer.message("Error!", "error");
```

#### Progress Indicators

##### Progress Bar

```typescript
import { ProgressBar } from "./mod.ts";

const progress = new ProgressBar({
  total: 100,
  width: 40,
  label: "Processing"
});

for (let i = 0; i <= 100; i += 10) {
  progress.update(i);
  await new Promise(resolve => setTimeout(resolve, 200));
}

progress.complete();
```

##### Spinner

```typescript
import { Spinner } from "./mod.ts";

const spinner = new Spinner({ message: "Loading data..." });
spinner.start();

await new Promise(resolve => setTimeout(resolve, 2000));
spinner.update("Processing data...");

await new Promise(resolve => setTimeout(resolve, 1000));
spinner.succeed("Data loaded successfully!");
// Or: spinner.fail("Failed to load data");
```

#### Charts

Render bar charts in your terminal:

```typescript
import { ChartRenderer } from "./mod.ts";

const data = [
  { label: "Jan", value: 120 },
  { label: "Feb", value: 250 },
  { label: "Mar", value: 180 },
  { label: "Apr", value: 300 },
];

ChartRenderer.barChart(data, {
  width: 60,
  showValues: true,
  color: ColorSystem.codes.cyan
});
```

#### Banners

Create eye-catching application banners:

```typescript
import { BannerRenderer } from "./mod.ts";

BannerRenderer.render({
  title: "MY APPLICATION",
  subtitle: "Professional CLI Tool",
  version: "1.0.0",
  author: "Your Name",
  style: "double"  // single, double, bold
});
```

### 6. ASCII Art Banners (ConsoleStyler)

The `ConsoleStyler` class provides a special `renderBanner()` method for creating enterprise-grade ASCII art banners, perfect for application startups:

```typescript
import { ConsoleStyler } from "./mod.ts";

// DenoGenesis-style banner with full configuration
ConsoleStyler.renderBanner({
  version: "1.0.0",
  buildDate: "2024-01-15",
  environment: "production",  // development, staging, testing, production
  port: 8000,
  author: "Your Name",
  repository: "https://github.com/yourusername/yourapp",
  description: "DenoGenesis Enterprise Application",
  features: ["REST API", "WebSockets", "Database", "Auth"],
  database: "PostgreSQL",
  ai: {
    enabled: true,
    models: ["GPT-4", "Claude-3"]
  }
});

// Output:
// ╔════════════════════════════════════════════════════════════════╗
// ║                                                                ║
// ║         🚀 DenoGenesis Enterprise Application                  ║
// ║                                                                ║
// ╚════════════════════════════════════════════════════════════════╝
//    Version: 1.0.0
//    Environment: PRODUCTION
//    Port: 8000
//    Author: Your Name
//    Features: REST API, WebSockets, Database, Auth
//    Database: PostgreSQL
//    AI Models: GPT-4, Claude-3
```

This is perfect for displaying your application banner at startup with all system information!

### 7. Color System

Comprehensive color support with automatic terminal detection:

```typescript
import { ColorSystem } from "./mod.ts";

// Detect color support
const support = ColorSystem.detectColorSupport(); // "none" | "basic" | "256" | "truecolor"

// Use hex colors
console.log(
  ColorSystem.hexToRgb("#FF6B35") + "Brand color text" + ColorSystem.codes.reset
);

// Use RGB colors
console.log(
  ColorSystem.rgb(100, 200, 255) + "Custom RGB text" + ColorSystem.codes.reset
);

// Create gradients
const gradient = ColorSystem.createGradient([255, 0, 0], [0, 0, 255], 50);
for (const color of gradient) {
  process.stdout.write(`${color}█${ColorSystem.codes.reset}`);
}
```

### 8. Formatters

Built-in formatters for common use cases:

```typescript
import { Formatter } from "./mod.ts";

Formatter.bytes(1234567890);        // "1.15 GB"
Formatter.duration(125432);         // "2m 5s"
Formatter.number(1234567);          // "1,234,567"
Formatter.currency(1234.56);        // "$1,234.56"
Formatter.percentage(0.8542);       // "85.42%"
Formatter.relativeTime(new Date(Date.now() - 3600000)); // "1 hour ago"
```

### 9. Interactive Prompts

Create interactive CLI experiences:

```typescript
import { InteractivePrompts } from "./mod.ts";

// Text input
const name = await InteractivePrompts.input("What is your name?", "Anonymous");

// Confirmation
const confirmed = await InteractivePrompts.confirm("Continue?", true);

// Selection
const choice = await InteractivePrompts.select(
  "Choose an option:",
  ["Option 1", "Option 2", "Option 3"]
);
```

## Framework Integration

### Oak Middleware

```typescript
import { Application } from "https://deno.land/x/oak/mod.ts";
import { oakLogger } from "./mod.ts";

const app = new Application();

app.use(oakLogger({
  logLevel: "info",
  logRequests: true,
  logResponses: true
}));

app.use((ctx) => {
  ctx.response.body = "Hello World!";
});

await app.listen({ port: 8000 });
```

### Hono Middleware

```typescript
import { Hono } from "https://deno.land/x/hono/mod.ts";
import { honoLogger } from "./mod.ts";

const app = new Hono();

app.use("*", honoLogger({
  logLevel: "info",
  colorize: true
}));

app.get("/", (c) => c.text("Hello World!"));

Deno.serve(app.fetch);
```

### Express Middleware

```typescript
import express from "npm:express";
import { expressLogger } from "./mod.ts";

const app = express();

app.use(expressLogger({
  logLevel: "info",
  includeHeaders: false
}));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(3000);
```

## Advanced Usage

### Custom Plugins

Create your own plugins:

```typescript
import { Plugin, LogEntry, StylerConfig } from "./mod.ts";

class CustomPlugin implements Plugin {
  onInit?(config: StylerConfig): void {
    console.log("Plugin initialized");
  }

  onLog?(entry: LogEntry): void {
    // Process log entry
    console.log("Custom plugin received log:", entry);
  }

  async onShutdown?(): Promise<void> {
    // Cleanup resources
    console.log("Plugin shutting down");
  }
}

// Use the plugin
const logger = new Logger(
  new ConfigBuilder()
    .plugin(new CustomPlugin())
    .build()
);
```

### Custom Themes

Define your own color schemes:

```typescript
import { Theme } from "./mod.ts";

const myTheme: Theme = {
  name: "my-theme",
  colors: {
    debug: "\x1b[90m",      // gray
    info: "\x1b[36m",       // cyan
    success: "\x1b[32m",    // green
    warning: "\x1b[33m",    // yellow
    error: "\x1b[31m",      // red
    critical: "\x1b[91m",   // bright red
    muted: "\x1b[2m",       // dim
    accent: "\x1b[35m",     // magenta
  },
  symbols: {
    debug: "🔍",
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    error: "❌",
    critical: "🚨",
  }
};

const logger = new Logger(
  new ConfigBuilder().theme(myTheme).build()
);
```

### Log History and Export

Access and export log history:

```typescript
import { Logger, ConfigBuilder } from "./mod.ts";

const logger = new Logger(
  new ConfigBuilder()
    .enableHistory(true)
    .maxHistorySize(1000)
    .build()
);

logger.info("Log message 1");
logger.warning("Log message 2");
logger.error("Log message 3");

// Get all history
const history = logger.getHistory();

// Filter history
const errors = logger.getHistory({ level: "error" });
const recent = logger.getHistory({ since: new Date(Date.now() - 3600000) });

// Export to file
await logger.exportLogs("./logs/export.json");

// Clear history
logger.clearHistory();
```

### Graceful Shutdown

Properly close logger and plugins:

```typescript
const logger = new Logger(config);

// Use logger throughout your app
logger.info("Application started");

// On shutdown
await logger.shutdown();
```

## API Reference

### Main Exports (from `mod.ts`)

```typescript
// Core
export { Logger } from "./core/logger.ts";
export { ConfigBuilder } from "./core/config.ts";
export { ColorSystem } from "./core/colors.ts";
export { Formatter } from "./core/formatter.ts";
export { ConsoleStyler } from "./core/console.ts";

// Types
export type {
  LogEntry,
  LogLevel,
  LogOutput,
  Plugin,
  StylerConfig,
  Theme
} from "./core/config.ts";

// Components
export { TableRenderer } from "./components/tables.ts";
export { BoxRenderer } from "./components/boxes.ts";
export { ProgressBar, Spinner } from "./components/progress.ts";
export { BannerRenderer } from "./components/banners.ts";
export { ChartRenderer } from "./components/charts.ts";
export { InteractivePrompts } from "./components/interactive.ts";

// Themes
export {
  defaultTheme,
  draculaTheme,
  minimalTheme,
  neonTheme,
  getTheme,
  themes
} from "./themes/mod.ts";

// Plugins
export { FileLoggerPlugin } from "./plugins/file-logger.ts";
export { JsonLoggerPlugin } from "./plugins/json-logger.ts";
export { RemoteLoggerPlugin } from "./plugins/remote-logger.ts";
export { SlackLoggerPlugin } from "./plugins/slack-logger.ts";

// Adapters
export { oakLogger } from "./adapters/oak.ts";
export { honoLogger } from "./adapters/hono.ts";
export { expressLogger } from "./adapters/express.ts";

// Utilities
export { TerminalDetector } from "./utils/terminal.ts";
export * from "./utils/format-helper.ts";
```

## Examples

Check out the `examples/` directory for complete working examples:

- **basic.ts**: Quick start guide with common features
- **comprehensive.ts**: Full demonstration of all features
- **denogenesis-banner.ts**: ASCII art banner examples (ConsoleStyler.renderBanner)
- **mission-control.ts**: Real-world server monitoring example
- **incident-response.ts**: Error tracking and alerting example

Run examples:

```bash
# Basic example
deno run --allow-read --allow-write --allow-env examples/basic.ts

# Comprehensive demo
deno run --allow-read --allow-write --allow-env examples/comprehensive.ts

# DenoGenesis ASCII banner examples
deno run --allow-env --allow-read examples/denogenesis-banner.ts
```

## Best Practices

### 1. Use Child Loggers for Modules

```typescript
// app.ts
const logger = new Logger();

// api.ts
const apiLogger = logger.child("api");

// database.ts
const dbLogger = logger.child("database");
```

### 2. Configure Log Levels by Environment

```typescript
const config = new ConfigBuilder()
  .logLevel(Deno.env.get("ENV") === "production" ? "info" : "debug")
  .build();
```

### 3. Use Metadata for Structured Logging

```typescript
// Good
logger.info("User action", {
  userId: "123",
  action: "login",
  ip: "192.168.1.1"
});

// Avoid
logger.info("User 123 logged in from 192.168.1.1");
```

### 4. Gracefully Handle Shutdown

```typescript
// Register cleanup
Deno.addSignalListener("SIGINT", async () => {
  await logger.shutdown();
  Deno.exit(0);
});
```

### 5. Use Progress Indicators for Long Operations

```typescript
const spinner = new Spinner({ message: "Processing..." });
spinner.start();

try {
  await longRunningOperation();
  spinner.succeed("Operation complete!");
} catch (error) {
  spinner.fail("Operation failed!");
  logger.error("Error details", { error });
}
```

## Performance

Console Styler is designed for performance:

- Lazy evaluation of log formatting
- Minimal overhead when logging is disabled
- Efficient color code generation
- No external dependencies to slow down startup

## Browser Support

This library is designed for **Deno** and terminal environments. It is not intended for browser use.

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## Testing

```bash
deno test --allow-read --allow-write --allow-env
```

## License

MIT License - see LICENSE file for details

## Author

**Pedro M. Dominguez** ([@grenas405](https://github.com/grenas405))

## Support

- Issues: [GitHub Issues](https://github.com/grenas405/console-styler/issues)
- Discussions: [GitHub Discussions](https://github.com/grenas405/console-styler/discussions)

## Changelog

### v1.0.0 (Current)

- Initial release
- Core logging functionality
- Visual components (tables, boxes, progress, charts)
- Plugin system
- Framework adapters (Oak, Hono, Express)
- Theme support
- 256-color and true color support
- Interactive prompts
- Comprehensive documentation

---

**Made with ❤️ for the Deno community**
