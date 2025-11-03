// core/logger.ts
import { defaultConfig, LogEntry, LogLevel, StylerConfig } from "./config.ts";
import { ColorSystem } from "./colors.ts";
import { Formatter } from "./formatter.ts";

export class Logger {
  private history: LogEntry[] = [];

  constructor(
    private config: StylerConfig = defaultConfig,
    private namespace?: string,
  ) {
    // Initialize plugins
    this.config.plugins.forEach((plugin) => {
      plugin.onInit?.(this.config);
    });
  }

  /**
   * Create child logger with namespace
   */
  child(namespace: string, overrides?: Partial<StylerConfig>): Logger {
    const childNamespace = this.namespace ? `${this.namespace}:${namespace}` : namespace;

    return new Logger(
      { ...this.config, ...overrides },
      childNamespace,
    );
  }

  /**
   * Register plugin
   */
  use(plugin: any): void {
    this.config.plugins.push(plugin);
    plugin.onInit?.(this.config);
  }

  /**
   * Configure logger
   */
  configure(config: Partial<StylerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Log methods
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this._log("debug", message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this._log("info", message, metadata);
  }

  success(message: string, metadata?: Record<string, any>): void {
    this._log("success", message, metadata);
  }

  warning(message: string, metadata?: Record<string, any>): void {
    this._log("warning", message, metadata);
  }

  error(message: string, metadata?: Record<string, any>): void {
    this._log("error", message, metadata);
  }

  critical(message: string, metadata?: Record<string, any>): void {
    this._log("critical", message, metadata);
  }

  /**
   * Internal logging method
   */
  private _log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    // Check log level
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message: this.namespace ? `[${this.namespace}] ${message}` : message,
      metadata,
      namespace: this.namespace,
    };

    // Store in history
    if (this.config.enableHistory) {
      this.history.push(entry);
      if (this.history.length > this.config.maxHistorySize) {
        this.history.shift();
      }
    }

    // Execute plugins
    this.config.plugins.forEach((plugin) => {
      plugin.onLog?.(entry);
    });

    // Render to console
    this.render(entry);
  }

  /**
   * Check if should log based on level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "success", "warning", "error", "critical"];
    const currentLevelIndex = levels.indexOf(this.config.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Render log entry
   */
  private render(entry: LogEntry): void {
    const theme = this.config.theme;
    const useColor = this.shouldUseColor();
    const useEmoji = this.shouldUseEmoji();

    // Get color for level
    const colorMap: Record<LogLevel, string> = {
      debug: theme.colors.debug,
      info: theme.colors.info,
      success: theme.colors.success,
      warning: theme.colors.warning,
      error: theme.colors.error,
      critical: theme.colors.critical,
    };

    const color = colorMap[entry.level];

    // Get symbol for level
    const symbol = useEmoji ? theme.symbols[entry.level] : "";

    // Format timestamp
    const timestamp = Formatter.timestamp(entry.timestamp, this.config.timestampFormat);
    const timestampStr = useColor
      ? ColorSystem.colorize(`[${timestamp}]`, theme.colors.muted)
      : `[${timestamp}]`;

    // Format message
    const messageStr = useColor
      ? ColorSystem.colorize(`${symbol} ${entry.message}`, color)
      : `${symbol} ${entry.message}`;

    // Output
    console.log(`${timestampStr} ${messageStr}`);

    // Output metadata if present
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      const metadataStr = Formatter.json(entry.metadata, 2, useColor);
      const indented = metadataStr.split("\n").map((line) => "  " + line).join("\n");
      console.log(indented);
    }
  }

  /**
   * Check if should use color
   */
  private shouldUseColor(): boolean {
    if (this.config.colorMode === "enabled") return true;
    if (this.config.colorMode === "disabled") return false;
    // Auto mode
    return Deno.stdout.isTerminal();
  }

  /**
   * Check if should use emoji
   */
  private shouldUseEmoji(): boolean {
    if (this.config.emojiMode === "enabled") return true;
    if (this.config.emojiMode === "disabled") return false;
    // Auto mode
    return Deno.stdout.isTerminal();
  }

  /**
   * Get log history
   */
  getHistory(filter?: {
    level?: LogLevel;
    namespace?: string;
    since?: Date;
  }): LogEntry[] {
    let filtered = [...this.history];

    if (filter) {
      if (filter.level) {
        filtered = filtered.filter((log) => log.level === filter.level);
      }
      if (filter.namespace) {
        filtered = filtered.filter((log) => log.namespace === filter.namespace);
      }
      if (filter.since) {
        filtered = filtered.filter((log) => log.timestamp >= filter.since!);
      }
    }

    return filtered;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Export logs to file
   */
  async exportLogs(filename: string): Promise<void> {
    const exportData = {
      exportTime: new Date().toISOString(),
      namespace: this.namespace,
      logs: this.history,
    };

    const content = JSON.stringify(exportData, null, 2);
    await Deno.writeTextFile(filename, content);
  }

  /**
   * Shutdown logger
   */
  async shutdown(): Promise<void> {
    // Execute shutdown hooks for plugins
    await Promise.all(
      this.config.plugins.map((plugin) => plugin.onShutdown?.()),
    );
  }
}
