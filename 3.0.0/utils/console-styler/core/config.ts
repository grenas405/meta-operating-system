// core/config.ts
import { defaultTheme } from "../themes/default.ts";

export type LogLevel =
  | "debug"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "critical";

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
  category?: string;
  requestId?: string;
  namespace?: string;
}

export interface LogOutput {
  type: "console" | "file" | "remote" | "custom";
  minLevel?: LogLevel;
  formatter?: (entry: LogEntry) => string;
}

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    debug: string;
    critical: string;
    muted: string;
    accent: string;
  };
  symbols: {
    success: string;
    error: string;
    warning: string;
    info: string;
    debug: string;
    critical: string;
    bullet: string;
    arrow: string;
    check: string;
    cross: string;
  };
  boxDrawing: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
    horizontal: string;
    vertical: string;
    cross: string;
    teeLeft: string;
    teeRight: string;
    teeTop: string;
    teeBottom: string;
  };
}

export interface Plugin {
  name: string;
  version: string;
  onInit?(config: StylerConfig): void | Promise<void>;
  onLog?(entry: LogEntry): void | Promise<void>;
  onShutdown?(): void | Promise<void>;
  extendMethods?(): Record<string, Function>;
}

export interface StylerConfig {
  // Output
  colorMode: "auto" | "enabled" | "disabled";
  emojiMode: "auto" | "enabled" | "disabled";
  unicodeMode: "auto" | "enabled" | "disabled";

  // Formatting
  timestampFormat: string;
  dateFormat: string;
  indentSize: number;
  maxLineWidth: number;

  // Behavior
  logLevel: LogLevel;
  enableHistory: boolean;
  maxHistorySize: number;

  // Output targets
  outputs: LogOutput[];

  // Theme
  theme: Theme;

  // Plugins
  plugins: Plugin[];
}

export const defaultConfig: StylerConfig = {
  colorMode: "auto",
  emojiMode: "auto",
  unicodeMode: "auto",
  timestampFormat: "HH:mm:ss",
  dateFormat: "YYYY-MM-DD",
  indentSize: 2,
  maxLineWidth: 80,
  logLevel: "debug",
  enableHistory: true,
  maxHistorySize: 1000,
  outputs: [{ type: "console" }],
  theme: defaultTheme,
  plugins: [],
};

export class ConfigBuilder {
  private config: Partial<StylerConfig> = {};

  colorMode(mode: "auto" | "enabled" | "disabled"): this {
    this.config.colorMode = mode;
    return this;
  }

  emojiMode(mode: "auto" | "enabled" | "disabled"): this {
    this.config.emojiMode = mode;
    return this;
  }

  unicodeMode(mode: "auto" | "enabled" | "disabled"): this {
    this.config.unicodeMode = mode;
    return this;
  }

  timestampFormat(format: string): this {
    this.config.timestampFormat = format;
    return this;
  }

  logLevel(level: LogLevel): this {
    this.config.logLevel = level;
    return this;
  }

  enableHistory(enable: boolean): this {
    this.config.enableHistory = enable;
    return this;
  }

  maxHistorySize(size: number): this {
    this.config.maxHistorySize = size;
    return this;
  }

  theme(theme: Theme): this {
    this.config.theme = theme;
    return this;
  }

  plugin(plugin: Plugin): this {
    this.config.plugins = [...(this.config.plugins || []), plugin];
    return this;
  }

  output(output: LogOutput): this {
    this.config.outputs = [...(this.config.outputs || []), output];
    return this;
  }

  maxLineWidth(width: number): this {
    this.config.maxLineWidth = width;
    return this;
  }

  build(): StylerConfig {
    return { ...defaultConfig, ...this.config };
  }
}
