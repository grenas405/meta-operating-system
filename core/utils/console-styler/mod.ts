// mod.ts
// ================================================================================
// 🎨 Console Styler - Professional Terminal Logging & Formatting
// A comprehensive, reusable logging library for Deno applications
// ================================================================================

// Core exports
export { Logger } from "./core/logger.ts";
export { ConfigBuilder } from "./core/config.ts";
export { ColorSystem } from "./core/colors.ts";
export { Formatter } from "./core/formatter.ts";
export { ConsoleStyler } from "./core/console.ts";

// Types
export type { LogEntry, LogLevel, LogOutput, Plugin, StylerConfig, Theme } from "./core/config.ts";

// Components
export { TableRenderer } from "./components/tables.ts";
export type { TableColumn, TableOptions } from "./components/tables.ts";

export { BoxRenderer } from "./components/boxes.ts";
export type { BoxOptions, BoxStyle } from "./components/boxes.ts";

export { ProgressBar, Spinner } from "./components/progress.ts";
export type { ProgressBarOptions, SpinnerOptions } from "./components/progress.ts";

export { BannerRenderer } from "./components/banners.ts";
export type { BannerOptions } from "./components/banners.ts";

export { ChartRenderer } from "./components/charts.ts";
export type { ChartData, ChartOptions } from "./components/charts.ts";

export { InteractivePrompts } from "./components/interactive.ts";

// Themes
export {
  defaultTheme,
  draculaTheme,
  getTheme,
  minimalTheme,
  neonTheme,
  themes,
} from "./themes/mod.ts";

// Plugins
export { FileLoggerPlugin } from "./plugins/file-logger.ts";
export type { FileLoggerOptions } from "./plugins/file-logger.ts";

export { JsonLoggerPlugin } from "./plugins/json-logger.ts";
export type { JsonLoggerOptions } from "./plugins/json-logger.ts";

export { RemoteLoggerPlugin } from "./plugins/remote-logger.ts";
export type { RemoteLoggerOptions } from "./plugins/remote-logger.ts";

export { SlackLoggerPlugin } from "./plugins/slack-logger.ts";
export type { SlackLoggerOptions } from "./plugins/slack-logger.ts";

// Adapters
export { oakLogger } from "./adapters/oak.ts";
export type { OakLoggerOptions } from "./adapters/oak.ts";

export { honoLogger } from "./adapters/hono.ts";
export type { HonoLoggerOptions } from "./adapters/hono.ts";

export { expressLogger } from "./adapters/express.ts";
export type { ExpressLoggerOptions } from "./adapters/express.ts";

// Utilities
export { TerminalDetector } from "./utils/terminal.ts";

// Re-export everything from format-helper (which re-exports from formatter)
export * from "./utils/format-helper.ts";
