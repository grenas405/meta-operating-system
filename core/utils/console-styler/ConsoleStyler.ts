// utils/consoleStyler.ts
// ================================================================================
// 🎨 DenoGenesis Console Styler - Enterprise Terminal Experience
// Professional logging, visual formatting, and development experience tools
// Extended with advanced features for enterprise-grade applications
//
// UPDATED: Now integrates enhanced color system with 256-color and RGB support
// ================================================================================

import {
  applyModifiers,
  bgColor256,
  color256,
  type Color256Name,
  colorize,
  type ColorName,
  colors,
  colors256,
  type ColorSupport,
  createGradient,
  detectColorSupport,
  hexToBgRgb,
  hexToRgb,
  palettes,
  rgbTo256,
  stripAnsi,
  supports256Color,
  supportsColor,
  supportsTrueColor,
} from "./lib/colors.ts";

// ================================================================================
// TYPE DEFINITIONS
// ================================================================================

export interface DenoGenesisConfig {
  version: string;
  buildDate: string;
  environment: string;
  port: number;
  author: string;
  repository: string;
  description: string;
  features?: string[];
  database?: string;
  ai?: {
    enabled: boolean;
    models: string[];
  };
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  metadata?: Record<string, any>;
  category?: string;
  requestId?: string;
}

export type LogLevel =
  | "debug"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "critical";

export interface PerformanceMetrics {
  uptime: string;
  requests: number;
  errors: number;
  successRate: string;
  memory?: {
    heapUsed: string;
    heapTotal: string;
    external: string;
    rss: string;
  };
  responseTime?: {
    avg: number;
    min: number;
    max: number;
  };
  database?: {
    connections: number;
    queries: number;
    avgQueryTime: number;
  };
  websockets?: {
    active: number;
    messagesSent: number;
    messagesReceived: number;
  };
}

export interface TableColumn {
  key: string;
  label: string;
  width?: number;
  align?: "left" | "center" | "right";
  formatter?: (value: any) => string;
}

export interface SpinnerInstance {
  start: () => void;
  stop: (finalMessage?: string) => void;
  update: (message: string) => void;
}

// ================================================================================
// MAIN CONSOLE STYLER CLASS
// ================================================================================

export class ConsoleStyler {
  // Export enhanced color system
  static colors = colors;
  static colors256 = colors256;
  static palettes = palettes;

  // Export color utility functions
  static color256 = color256;
  static bgColor256 = bgColor256;
  static hexToRgb = hexToRgb;
  static hexToBgRgb = hexToBgRgb;
  static createGradient = createGradient;
  static rgbTo256 = rgbTo256;
  static colorize = colorize;
  static applyModifiers = applyModifiers;
  static stripAnsi = stripAnsi;

  // Export detection functions
  static detectColorSupport = detectColorSupport;
  static supportsColor = supportsColor;
  static supports256Color = supports256Color;
  static supportsTrueColor = supportsTrueColor;

  // Internal state
  private static logHistory: LogEntry[] = [];
  private static maxLogHistory = 100;
  private static colorSupportLevel: ColorSupport = detectColorSupport();

  // ================================================================================
  // ENHANCED COLOR METHODS (NEW)
  // ================================================================================

  /**
   * Log with custom brand color (hex)
   * @example ConsoleStyler.logBrand("Welcome!", "#FF6B35", { user: "Alice" })
   */
  static logBrand(
    message: string,
    brandHex: string,
    metadata?: Record<string, any>,
  ): void {
    const color = hexToRgb(brandHex);
    console.log(`${color}🎨 ${message}${colors.reset}`);
    if (metadata && Object.keys(metadata).length > 0) {
      console.log(
        `   ${colors.dim}${
          JSON.stringify(metadata, null, 2).replace(/\n/g, "\n   ")
        }${colors.reset}`,
      );
    }
  }

  /**
   * Log with custom RGB color
   * @example ConsoleStyler.logRGB("Custom message", 255, 100, 50)
   */
  static logRGB(
    message: string,
    r: number,
    g: number,
    b: number,
    icon = "●",
    metadata?: Record<string, any>,
  ): void {
    const color = colors.rgb(r, g, b);
    console.log(`${color}${icon} ${message}${colors.reset}`);
    if (metadata && Object.keys(metadata).length > 0) {
      console.log(
        `   ${colors.dim}${
          JSON.stringify(metadata, null, 2).replace(/\n/g, "\n   ")
        }${colors.reset}`,
      );
    }
  }

  /**
   * Log with 256-color palette
   * @example ConsoleStyler.log256("Orange warning", 208)
   */
  static log256(
    message: string,
    colorNumber: number,
    icon = "●",
    metadata?: Record<string, any>,
  ): void {
    const color = color256(colorNumber);
    console.log(`${color}${icon} ${message}${colors.reset}`);
    if (metadata && Object.keys(metadata).length > 0) {
      console.log(
        `   ${colors.dim}${
          JSON.stringify(metadata, null, 2).replace(/\n/g, "\n   ")
        }${colors.reset}`,
      );
    }
  }

  /**
   * Display a color gradient with message
   * @example ConsoleStyler.logGradient("Processing stages", [255,0,0], [0,0,255], 20)
   */
  static logGradient(
    message: string,
    startRGB: [number, number, number],
    endRGB: [number, number, number],
    steps: number,
  ): void {
    console.log(`${colors.bright}${message}${colors.reset}`);
    const gradient = createGradient(startRGB, endRGB, steps);
    let line = "";
    for (const color of gradient) {
      line += `${color}█${colors.reset}`;
    }
    console.log(line);
  }

  /**
   * Log with themed palette
   * @example ConsoleStyler.logThemed("Error!", "dracula", "red")
   */
  static logThemed(
    message: string,
    theme: "solarized" | "nord" | "dracula" | "monokai",
    colorKey: string,
    icon = "●",
    metadata?: Record<string, any>,
  ): void {
    const themeColors = palettes[theme];
    const color = (themeColors as any)[colorKey] || colors.reset;
    console.log(`${color}${icon} ${message}${colors.reset}`);
    if (metadata && Object.keys(metadata).length > 0) {
      console.log(
        `   ${colors.dim}${
          JSON.stringify(metadata, null, 2).replace(/\n/g, "\n   ")
        }${colors.reset}`,
      );
    }
  }

  /**
   * Display color support information
   */
  static logColorSupport(): void {
    const support = this.colorSupportLevel;
    const supportEmojis = {
      none: "❌",
      basic: "🟡",
      "256": "🟢",
      truecolor: "✨",
    };

    this.logSection("🎨 Terminal Color Capabilities", "cyan");
    console.log(
      `   ${
        supportEmojis[support]
      } Support Level: ${colors.bright}${support.toUpperCase()}${colors.reset}`,
    );
    console.log(
      `   ${colors.dim}Basic Colors (16): ${
        supportsColor() ? "✅" : "❌"
      }${colors.reset}`,
    );
    console.log(
      `   ${colors.dim}256 Colors: ${
        supports256Color() ? "✅" : "❌"
      }${colors.reset}`,
    );
    console.log(
      `   ${colors.dim}True Color (16.7M): ${
        supportsTrueColor() ? "✅" : "❌"
      }${colors.reset}`,
    );
    console.log("");
  }

  // ================================================================================
  // CORE LOGGING METHODS (ENHANCED)
  // ================================================================================

  /**
   * Enhanced success logging with brighter colors
   */
  static logSuccess(message: string, metadata?: Record<string, any>): void {
    // Use enhanced 256-color green for better visibility
    const icon = "✅";
    const color = this.supports256Color()
      ? colors256.brightGreen
      : colors.success;
    this._logEnhanced("success", message, icon, color, metadata);
  }

  /**
   * Enhanced warning logging with 256-color support
   */
  static logWarning(message: string, metadata?: Record<string, any>): void {
    const icon = "⚠️ ";
    const color = this.supports256Color()
      ? colors256.brightOrange
      : colors.warning;
    this._logEnhanced("warning", message, icon, color, metadata);
  }

  /**
   * Enhanced error logging with richer red
   */
  static logError(message: string, metadata?: Record<string, any>): void {
    const icon = "❌";
    const color = this.supports256Color() ? colors256.brightRed : colors.error;
    this._logEnhanced("error", message, icon, color, metadata);
  }

  /**
   * Enhanced info logging with cyan variants
   */
  static logInfo(message: string, metadata?: Record<string, any>): void {
    const icon = "ℹ️ ";
    const color = this.supports256Color() ? colors256.brightCyan : colors.info;
    this._logEnhanced("info", message, icon, color, metadata);
  }

  /**
   * Enhanced debug logging
   */
  static logDebug(message: string, metadata?: Record<string, any>): void {
    const icon = "🔍";
    const color = colors.dim;
    this._logEnhanced("debug", message, icon, color, metadata);
  }

  /**
   * Enhanced critical logging with vivid red
   */
  static logCritical(message: string, metadata?: Record<string, any>): void {
    const icon = "🚨";
    const color = this.supports256Color()
      ? colors256.brightRed
      : colors.critical;
    this._logEnhanced("critical", message, icon, color, metadata);
  }

  /**
   * Custom logging with any icon and color
   */
  static logCustom(
    message: string,
    icon: string,
    colorName: ColorName | string,
    metadata?: Record<string, any>,
  ): void {
    const color = typeof colorName === "string" && colorName in colors
      ? (colors as any)[colorName]
      : colorName;

    console.log(`${color}${icon} ${message}${colors.reset}`);
    if (metadata && Object.keys(metadata).length > 0) {
      console.log(
        `   ${colors.dim}${
          JSON.stringify(metadata, null, 2).replace(/\n/g, "\n   ")
        }${colors.reset}`,
      );
    }
  }

  /**
   * Private enhanced logging helper with adaptive colors
   */
  private static _logEnhanced(
    level: LogLevel,
    message: string,
    icon: string,
    color: string,
    metadata?: Record<string, any>,
  ): void {
    // Console output with enhanced colors
    let output = `${color}${icon} ${message}${colors.reset}`;

    if (metadata && Object.keys(metadata).length > 0) {
      output += `\n   ${colors.dim}${
        JSON.stringify(metadata, null, 2).replace(/\n/g, "\n   ")
      }${colors.reset}`;
    }

    console.log(output);

    // Store in history
    this.logHistory.push({
      timestamp: new Date(),
      level,
      message,
      metadata,
    });

    // Maintain history size
    if (this.logHistory.length > this.maxLogHistory) {
      this.logHistory.splice(0, this.logHistory.length - this.maxLogHistory);
    }
  }

  // ================================================================================
  // BANNER RENDERING (ENHANCED WITH COLOR SUPPORT)
  // ================================================================================

  /**
   * Render ASCII art banner with enhanced color support
   */
  static renderBanner(config: DenoGenesisConfig): void {
    const bannerText = `
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║         🚀 ${colors.bright}${config.description.padEnd(46)}${colors.reset}║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `;

    console.log(`${colors.cyan}${bannerText}${colors.reset}`);

    // Use enhanced colors for details
    const infoColor = this.supports256Color() ? colors256.skyBlue : colors.cyan;
    const accentColor = this.supports256Color()
      ? colors256.gold
      : colors.yellow;

    console.log(
      `   ${colors.dim}Version:${colors.reset} ${infoColor}${config.version}${colors.reset}`,
    );
    console.log(
      `   ${colors.dim}Environment:${colors.reset} ${
        this.getEnvironmentColor(config.environment)
      }${config.environment.toUpperCase()}${colors.reset}`,
    );
    console.log(
      `   ${colors.dim}Port:${colors.reset} ${accentColor}${config.port}${colors.reset}`,
    );
    console.log(
      `   ${colors.dim}Author:${colors.reset} ${colors.bright}${config.author}${colors.reset}`,
    );

    if (config.features && config.features.length > 0) {
      console.log(
        `   ${colors.dim}Features:${colors.reset} ${colors256.mint}${
          config.features.join(", ")
        }${colors.reset}`,
      );
    }

    if (config.database) {
      console.log(
        `   ${colors.dim}Database:${colors.reset} ${colors256.purple}${config.database}${colors.reset}`,
      );
    }

    if (config.ai?.enabled) {
      const models = config.ai.models.join(", ");
      console.log(
        `   ${colors.dim}AI Models:${colors.reset} ${colors256.brightMagenta}${models}${colors.reset}`,
      );
    }

    console.log("");
  }

  /**
   * Get environment-specific color
   */
  private static getEnvironmentColor(environment: string): string {
    if (!this.supports256Color()) {
      // Fallback to basic colors
      const envColors: Record<string, string> = {
        "production": colors.green,
        "staging": colors.yellow,
        "development": colors.cyan,
        "testing": colors.magenta,
      };
      return envColors[environment.toLowerCase()] || colors.white;
    }

    // Use rich 256 colors
    const envColors: Record<string, string> = {
      "production": colors256.brightGreen,
      "staging": colors256.orange,
      "development": colors256.brightCyan,
      "testing": colors256.brightPurple,
    };
    return envColors[environment.toLowerCase()] || colors.white;
  }

  // ================================================================================
  // SECTION HEADERS (ENHANCED WITH 256 COLORS)
  // ================================================================================

  /**
   * Enhanced section headers with customizable styles and 256-color support
   */
  static logSection(
    title: string,
    colorName: ColorName | Color256Name = "blue",
    style: "standard" | "heavy" | "double" | "simple" = "standard",
  ): void {
    const width = 80;
    let topChar,
      bottomChar,
      sideChar,
      topCornerLeft,
      topCornerRight,
      bottomCornerLeft,
      bottomCornerRight;

    switch (style) {
      case "heavy":
        topChar = bottomChar = "━";
        sideChar = "┃";
        topCornerLeft = "┏";
        topCornerRight = "┓";
        bottomCornerLeft = "┗";
        bottomCornerRight = "┛";
        break;
      case "double":
        topChar = bottomChar = "═";
        sideChar = "║";
        topCornerLeft = "╔";
        topCornerRight = "╗";
        bottomCornerLeft = "╚";
        bottomCornerRight = "╝";
        break;
      case "simple":
        topChar = bottomChar = "-";
        sideChar = "|";
        topCornerLeft = "+";
        topCornerRight = "+";
        bottomCornerLeft = "+";
        bottomCornerRight = "+";
        break;
      default: // standard
        topChar = bottomChar = "═";
        sideChar = "║";
        topCornerLeft = "╔";
        topCornerRight = "╗";
        bottomCornerLeft = "╚";
        bottomCornerRight = "╝";
    }

    // Get color - support both basic and 256 colors
    let color: string;
    if (colorName in colors) {
      color = (colors as any)[colorName];
    } else if (colorName in colors256) {
      color = (colors256 as any)[colorName];
    } else {
      color = colors.blue;
    }

    const line = topChar.repeat(width - 2);
    console.log(
      `${color}${topCornerLeft}${line}${topCornerRight}${colors.reset}`,
    );
    console.log(
      `${color}${sideChar} ${colors.bright}${
        title.padEnd(width - 4)
      }${colors.reset}${color} ${sideChar}${colors.reset}`,
    );
    console.log(
      `${color}${bottomCornerLeft}${line}${bottomCornerRight}${colors.reset}`,
    );
  }

  // ================================================================================
  // ROUTE LOGGING (ENHANCED)
  // ================================================================================

  /**
   * Enhanced route logging with method-specific styling and 256-color support
   */
  static logRoute(
    method: string,
    path: string,
    description: string,
    responseTime?: number,
  ): void {
    const methodColors: Record<string, string> = this.supports256Color()
      ? {
        "GET": colors256.brightGreen,
        "POST": colors256.brightBlue,
        "PUT": colors256.brightOrange,
        "DELETE": colors256.brightRed,
        "PATCH": colors256.brightPurple,
        "OPTIONS": colors256.gray12,
        "HEAD": colors256.gray12,
      }
      : {
        "GET": colors.green,
        "POST": colors.blue,
        "PUT": colors.yellow,
        "DELETE": colors.red,
        "PATCH": colors.magenta,
        "OPTIONS": colors.gray,
        "HEAD": colors.gray,
      };

    const methodColor = methodColors[method.toUpperCase()] || colors.cyan;
    const methodPadded = method.padEnd(6);
    const pathPadded = path.length > 35
      ? path.substring(0, 32) + "..."
      : path.padEnd(35);

    let timeStr = "";
    if (responseTime !== undefined) {
      const timeColor = this.getResponseTimeColor(responseTime);
      timeStr = ` ${timeColor}(${responseTime.toFixed(2)}ms)${colors.reset}`;
    }

    console.log(
      `${methodColor}${methodPadded}${colors.reset} ` +
        `${colors.bright}${pathPadded}${colors.reset} ` +
        `${colors.dim}${description}${colors.reset}${timeStr}`,
    );
  }

  /**
   * Get color for response time with 256-color support
   */
  private static getResponseTimeColor(ms: number): string {
    if (!this.supports256Color()) {
      return ms < 50
        ? colors.success
        : ms < 200
        ? colors.warning
        : colors.error;
    }

    if (ms < 10) return colors256.brightGreen;
    if (ms < 50) return colors256.green;
    if (ms < 100) return colors256.yellow;
    if (ms < 200) return colors256.orange;
    return colors256.brightRed;
  }

  // ================================================================================
  // PERFORMANCE METRICS (ENHANCED)
  // ================================================================================

  /**
   * Enhanced metrics display with visual indicators and 256-color support
   */
  static logMetrics(metrics: PerformanceMetrics): void {
    this.logSection("📊 System Performance Metrics", "cyan");

    // Use enhanced colors for health indicators
    const successRate = parseFloat(metrics.successRate);
    const healthColor = this.supports256Color()
      ? (successRate > 95
        ? colors256.brightGreen
        : successRate > 90
        ? colors256.yellow
        : colors256.brightRed)
      : (successRate > 95
        ? colors.success
        : successRate > 90
        ? colors.warning
        : colors.error);

    console.log(
      `   ${colors.bright}Uptime:${colors.reset} ${
        colors256.skyBlue || colors.cyan
      }${metrics.uptime}${colors.reset}`,
    );
    console.log(
      `   ${colors.bright}Total Requests:${colors.reset} ${colors.brightWhite}${metrics.requests.toLocaleString()}${colors.reset}`,
    );
    console.log(
      `   ${colors.bright}Success Rate:${colors.reset} ${healthColor}${metrics.successRate}${colors.reset}`,
    );
    console.log(
      `   ${colors.bright}Errors:${colors.reset} ${colors.red}${metrics.errors}${colors.reset}`,
    );

    if (metrics.memory) {
      console.log(`\n   ${colors.bright}Memory Usage:${colors.reset}`);
      console.log(
        `     Heap Used: ${
          colors256.brightCyan || colors.cyan
        }${metrics.memory.heapUsed}${colors.reset}`,
      );
      console.log(
        `     Heap Total: ${colors.dim}${metrics.memory.heapTotal}${colors.reset}`,
      );
      console.log(
        `     RSS: ${colors.dim}${metrics.memory.rss}${colors.reset}`,
      );
    }

    if (metrics.responseTime) {
      console.log(`\n   ${colors.bright}Response Times:${colors.reset}`);
      const avgColor = this.getResponseTimeColor(metrics.responseTime.avg);
      console.log(
        `     Average: ${avgColor}${
          metrics.responseTime.avg.toFixed(2)
        }ms${colors.reset}`,
      );
      console.log(
        `     Min: ${colors256.brightGreen || colors.success}${
          metrics.responseTime.min.toFixed(2)
        }ms${colors.reset}`,
      );
      console.log(
        `     Max: ${colors256.brightRed || colors.error}${
          metrics.responseTime.max.toFixed(2)
        }ms${colors.reset}`,
      );
    }

    if (metrics.database) {
      console.log(`\n   ${colors.bright}Database:${colors.reset}`);
      console.log(
        `     Connections: ${
          colors256.purple || colors.magenta
        }${metrics.database.connections}${colors.reset}`,
      );
      console.log(
        `     Queries: ${colors.brightWhite}${metrics.database.queries.toLocaleString()}${colors.reset}`,
      );
      console.log(
        `     Avg Query Time: ${
          this.getResponseTimeColor(metrics.database.avgQueryTime)
        }${metrics.database.avgQueryTime.toFixed(2)}ms${colors.reset}`,
      );
    }

    if (metrics.websockets) {
      console.log(`\n   ${colors.bright}WebSockets:${colors.reset}`);
      console.log(
        `     Active Connections: ${
          colors256.brightCyan || colors.cyan
        }${metrics.websockets.active}${colors.reset}`,
      );
      console.log(
        `     Messages Sent: ${colors.brightWhite}${metrics.websockets.messagesSent.toLocaleString()}${colors.reset}`,
      );
      console.log(
        `     Messages Received: ${colors.brightWhite}${metrics.websockets.messagesReceived.toLocaleString()}${colors.reset}`,
      );
    }

    console.log("");
  }

  // ================================================================================
  // TABLE RENDERING (ENHANCED)
  // ================================================================================

  /**
   * Enhanced table rendering with 256-color support
   */
  static renderTable(
    data: Array<Record<string, any>>,
    columns: TableColumn[],
  ): void {
    if (data.length === 0) {
      this.logWarning("No data to display in table");
      return;
    }

    // Calculate column widths
    const maxWidths = columns.map((col) => {
      const labelWidth = stripAnsi(col.label).length;
      const dataWidth = Math.max(...data.map((row) => {
        const value = col.formatter
          ? col.formatter(row[col.key])
          : String(row[col.key] || "");
        return stripAnsi(value).length;
      }));
      return col.width || Math.max(labelWidth, dataWidth, 10);
    });

    // Table header with enhanced colors
    const headerColor = this.supports256Color()
      ? colors256.brightCyan
      : colors.cyan;
    const separator = maxWidths.map((w) => "─".repeat(w)).join("─┬─");

    console.log(`${colors.bright}┌─${separator}─┐${colors.reset}`);

    const headerRow = columns.map((col, i) => {
      const label = col.label.padEnd(maxWidths[i]);
      return `${headerColor}${label}${colors.reset}`;
    }).join(" │ ");

    console.log(`${colors.bright}│ ${headerRow} │${colors.reset}`);
    console.log(`${colors.bright}├─${separator}─┤${colors.reset}`);

    // Table rows with alternating dim
    data.forEach((row, rowIndex) => {
      const formatters = columns.reduce((acc, col) => {
        acc[col.key] = col.formatter;
        return acc;
      }, {} as Record<string, ((value: any) => string) | undefined>);

      const dataRow = columns.map((col, colIndex) => {
        const value = row[col.key];
        const formatted = formatters[col.key]
          ? formatters[col.key]!(value)
          : String(value || "");
        const truncated = formatted.length > maxWidths[colIndex]
          ? formatted.substring(0, maxWidths[colIndex] - 3) + "..."
          : formatted;
        return truncated.padEnd(maxWidths[colIndex]);
      }).join(" │ ");

      const rowColor = rowIndex % 2 === 0 ? "" : colors.dim;
      console.log(`${rowColor}│ ${dataRow} │${colors.reset}`);
    });

    console.log(`${colors.bright}└─${separator}─┘${colors.reset}`);
  }

  // ================================================================================
  // REQUEST/RESPONSE LOGGING (ENHANCED)
  // ================================================================================

  /**
   * Enhanced request/response logging with 256-color support
   */
  static logRequest(
    method: string,
    path: string,
    status: number,
    duration: number,
    size?: number,
  ): void {
    const methodColor = this.getMethodColor(method);
    const statusColor = this.getStatusColor(status);
    const durationColor = this.getResponseTimeColor(duration);

    const sizeInfo = size ? ` │ ${this.formatBytes(size)}` : "";

    console.log(
      `${methodColor}${method.padEnd(6)}${colors.reset} ` +
        `${colors.bright}${path.padEnd(40)}${colors.reset} ` +
        `${statusColor}${status}${colors.reset} ` +
        `${durationColor}${duration.toFixed(2)}ms${colors.reset}${sizeInfo}`,
    );
  }

  /**
   * Get method-specific color with 256-color support
   */
  private static getMethodColor(method: string): string {
    if (!this.supports256Color()) {
      const methodColors: Record<string, string> = {
        "GET": colors.green,
        "POST": colors.blue,
        "PUT": colors.yellow,
        "DELETE": colors.red,
        "PATCH": colors.magenta,
        "OPTIONS": colors.gray,
        "HEAD": colors.gray,
      };
      return methodColors[method.toUpperCase()] || colors.cyan;
    }

    const methodColors: Record<string, string> = {
      "GET": colors256.brightGreen,
      "POST": colors256.brightBlue,
      "PUT": colors256.orange,
      "DELETE": colors256.brightRed,
      "PATCH": colors256.brightPurple,
      "OPTIONS": colors256.gray12,
      "HEAD": colors256.gray12,
    };
    return methodColors[method.toUpperCase()] || colors256.brightCyan;
  }

  /**
   * Get status code color with 256-color support
   */
  private static getStatusColor(status: number): string {
    if (!this.supports256Color()) {
      if (status >= 200 && status < 300) return colors.success;
      if (status >= 300 && status < 400) return colors.yellow;
      if (status >= 400 && status < 500) return colors.error;
      if (status >= 500) return colors.critical;
      return colors.gray;
    }

    if (status >= 200 && status < 300) return colors256.brightGreen;
    if (status >= 300 && status < 400) return colors256.yellow;
    if (status >= 400 && status < 500) return colors256.orange;
    if (status >= 500) return colors256.brightRed;
    return colors256.gray12;
  }

  // ================================================================================
  // SPECIALIZED LOGGING METHODS (ENHANCED)
  // ================================================================================

  /**
   * Enhanced database operation logging
   */
  static logDatabase(
    operation: string,
    table?: string,
    duration?: number,
    rowsAffected?: number,
  ): void {
    const icon = "🗄️";
    const color = this.supports256Color() ? colors256.purple : colors.magenta;
    const tableInfo = table
      ? ` on ${colors.bright}${table}${colors.reset}`
      : "";
    const durationInfo = duration
      ? ` ${colors.dim}(${duration.toFixed(2)}ms)${colors.reset}`
      : "";
    const rowsInfo = rowsAffected !== undefined
      ? ` - ${rowsAffected} rows affected`
      : "";

    const durationColor = duration && duration > 100
      ? colors.warning
      : colors.info;
    console.log(
      `${color}${icon} ${operation}${colors.reset}${tableInfo}${rowsInfo}${durationInfo}`,
    );
  }

  /**
   * Enhanced WebSocket connection logging
   */
  static logWebSocket(
    event: "connect" | "disconnect" | "message" | "error",
    clientId?: string,
    data?: any,
  ): void {
    const icons = {
      connect: "🔌",
      disconnect: "🔌",
      message: "💬",
      error: "⚡",
    };

    const eventColors: Record<string, string> = this.supports256Color()
      ? {
        connect: colors256.brightGreen,
        disconnect: colors256.orange,
        message: colors256.brightCyan,
        error: colors256.brightRed,
      }
      : {
        connect: colors.success,
        disconnect: colors.warning,
        message: colors.info,
        error: colors.error,
      };

    const clientInfo = clientId ? ` [${clientId.substring(0, 8)}...]` : "";
    const dataInfo = data
      ? ` - ${JSON.stringify(data).substring(0, 50)}...`
      : "";

    console.log(
      `${eventColors[event]}${
        icons[event]
      } WebSocket ${event}${clientInfo}${dataInfo}${colors.reset}`,
    );
  }

  /**
   * Enhanced AI operation logging
   */
  static logAI(
    operation: string,
    model?: string,
    tokens?: number,
    duration?: number,
  ): void {
    const icon = "🤖";
    const color = this.supports256Color()
      ? colors256.brightPurple
      : colors.magenta;
    const modelInfo = model ? ` ${colors.dim}[${model}]${colors.reset}` : "";
    const tokenInfo = tokens ? ` - ${tokens} tokens` : "";
    const durationInfo = duration
      ? ` ${colors.dim}(${duration.toFixed(2)}ms)${colors.reset}`
      : "";

    console.log(
      `${color}${icon} AI ${operation}${modelInfo}${tokenInfo}${durationInfo}${colors.reset}`,
    );
  }

  /**
   * Enhanced feature announcement logging
   */
  static logFeature(
    name: string,
    description: string,
    status: "enabled" | "disabled" | "beta" | "experimental",
  ): void {
    const statusConfig = this.supports256Color()
      ? {
        enabled: { icon: "✅", color: colors256.brightGreen },
        disabled: { icon: "❌", color: colors256.brightRed },
        beta: { icon: "🧪", color: colors256.orange },
        experimental: { icon: "⚗️", color: colors256.brightPurple },
      }
      : {
        enabled: { icon: "✅", color: colors.success },
        disabled: { icon: "❌", color: colors.error },
        beta: { icon: "🧪", color: colors.warning },
        experimental: { icon: "⚗️", color: colors.magenta },
      };

    const { icon, color } = statusConfig[status];
    console.log(
      `${color}${icon} Feature: ${name} - ${description}${colors.reset}`,
    );
  }

  /**
   * Enhanced build logging
   */
  static logBuild(
    stage: string,
    success: boolean,
    duration?: number,
    details?: string[],
  ): void {
    const icon = success ? "🏗️" : "💥";
    const color = success
      ? (this.supports256Color() ? colors256.brightGreen : colors.success)
      : (this.supports256Color() ? colors256.brightRed : colors.error);

    const durationInfo = duration
      ? ` ${colors.dim}(${duration.toFixed(2)}ms)${colors.reset}`
      : "";

    console.log(
      `${color}${icon} Build ${stage}: ${
        success ? "SUCCESS" : "FAILED"
      }${durationInfo}${colors.reset}`,
    );

    if (details && details.length > 0) {
      details.forEach((detail) => {
        console.log(`   ${colors.dim}• ${detail}${colors.reset}`);
      });
    }
  }

  /**
   * Enhanced environment logging
   */
  static logEnvironment(environment: string, features?: string[]): void {
    const envConfigs = this.supports256Color()
      ? {
        development: {
          icon: "🔧",
          color: colors256.brightCyan,
          message: "Development mode - Enhanced logging and hot reload enabled",
          features: ["Hot Reload", "Debug Mode", "Verbose Logging"],
        },
        production: {
          icon: "🚀",
          color: colors256.brightGreen,
          message: "Production mode - Optimized for performance and security",
          features: [
            "Performance Optimization",
            "Security Hardening",
            "Monitoring",
          ],
        },
        testing: {
          icon: "🧪",
          color: colors256.brightBlue,
          message: "Testing mode - Running in isolated test environment",
          features: ["Test Database", "Mock Services", "Coverage Tracking"],
        },
        staging: {
          icon: "🎭",
          color: colors256.brightPurple,
          message:
            "Staging mode - Production-like environment for final testing",
          features: [
            "Production Mirror",
            "Integration Testing",
            "Performance Profiling",
          ],
        },
      }
      : {
        development: {
          icon: "🔧",
          color: colors.yellow,
          message: "Development mode - Enhanced logging and hot reload enabled",
          features: ["Hot Reload", "Debug Mode", "Verbose Logging"],
        },
        production: {
          icon: "🚀",
          color: colors.green,
          message: "Production mode - Optimized for performance and security",
          features: [
            "Performance Optimization",
            "Security Hardening",
            "Monitoring",
          ],
        },
        testing: {
          icon: "🧪",
          color: colors.blue,
          message: "Testing mode - Running in isolated test environment",
          features: ["Test Database", "Mock Services", "Coverage Tracking"],
        },
        staging: {
          icon: "🎭",
          color: colors.magenta,
          message:
            "Staging mode - Production-like environment for final testing",
          features: [
            "Production Mirror",
            "Integration Testing",
            "Performance Profiling",
          ],
        },
      };

    const config = envConfigs[environment as keyof typeof envConfigs] || {
      icon: "❓",
      color: colors.gray,
      message: `Unknown environment: ${environment}`,
      features: [],
    };

    console.log(
      `${config.color}${config.icon} ${config.message}${colors.reset}`,
    );

    const envFeatures = features || config.features;
    if (envFeatures.length > 0) {
      console.log(
        `   ${colors.dim}Features: ${envFeatures.join(", ")}${colors.reset}`,
      );
    }
  }

  // ================================================================================
  // PROGRESS INDICATORS (ENHANCED)
  // ================================================================================

  /**
   * Enhanced progress bar with 256-color gradients
   */
  static logProgress(current: number, total: number, message?: string): void {
    const percent = Math.min(100, Math.max(0, (current / total) * 100));
    const filled = Math.round(percent / 2);
    const empty = 50 - filled;

    // Use gradient colors based on progress
    let barColor: string;
    if (!this.supports256Color()) {
      barColor = percent < 60
        ? colors.green
        : percent < 80
        ? colors.yellow
        : colors.red;
    } else {
      if (percent < 30) barColor = colors256.brightGreen;
      else if (percent < 60) barColor = colors256.green;
      else if (percent < 80) barColor = colors256.yellow;
      else if (percent < 95) barColor = colors256.orange;
      else barColor = colors256.brightRed;
    }

    const bar = `│${barColor}${"█".repeat(filled)}${colors.dim}${
      "░".repeat(empty)
    }${colors.reset}│`;
    const percentStr = `${percent.toFixed(1)}%`;
    const countStr = `(${current}/${total})`;
    const messageStr = message ? ` ${colors.dim}${message}${colors.reset}` : "";

    const encoder = new TextEncoder();
    Deno.stdout.writeSync(encoder.encode(`\r${bar} ${percentStr} ${countStr}${messageStr}`));

    if (current >= total) {
      console.log(""); // New line when complete
    }
  }

  /**
   * Enhanced spinner with 256-color support
   */
  static createSpinner(message: string): SpinnerInstance {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    const spinnerColor = this.supports256Color()
      ? colors256.brightCyan
      : colors.cyan;
    let currentFrame = 0;
    let intervalId: number | null = null;
    const encoder = new TextEncoder();

    return {
      start: () => {
        intervalId = setInterval(() => {
          const frame = frames[currentFrame];
          Deno.stdout.writeSync(
            encoder.encode(`\r${spinnerColor}${frame}${colors.reset} ${message}`)
          );
          currentFrame = (currentFrame + 1) % frames.length;
        }, 80);
      },
      stop: (finalMessage?: string) => {
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
        Deno.stdout.writeSync(encoder.encode("\r\x1b[K")); // Clear line
        if (finalMessage) {
          const successColor = this.supports256Color()
            ? colors256.brightGreen
            : colors.success;
          console.log(`${successColor}✓${colors.reset} ${finalMessage}`);
        }
      },
      update: (newMessage: string) => {
        message = newMessage;
      },
    };
  }

  // ================================================================================
  // BOX RENDERING (ENHANCED)
  // ================================================================================

  /**
   * Enhanced multi-line boxed content with 256-color support
   */
  static logBox(
    content: string[],
    title?: string,
    colorName: ColorName | Color256Name = "blue",
  ): void {
    // Get color - support both basic and 256 colors
    let color: string;
    if (colorName in colors) {
      color = (colors as any)[colorName];
    } else if (colorName in colors256) {
      color = (colors256 as any)[colorName];
    } else {
      color = colors.blue;
    }

    const maxWidth = Math.max(
      title ? stripAnsi(title).length : 0,
      ...content.map((line) => stripAnsi(line).length),
    ) + 4;

    const topBorder = `╔${"═".repeat(maxWidth - 2)}╗`;
    const bottomBorder = `╚${"═".repeat(maxWidth - 2)}╝`;

    console.log(`${color}${topBorder}${colors.reset}`);

    if (title) {
      const titlePadded = title.padEnd(maxWidth - 4);
      console.log(
        `${color}║ ${colors.bright}${titlePadded}${colors.reset}${color} ║${colors.reset}`,
      );
      console.log(`${color}╠${"═".repeat(maxWidth - 2)}╣${colors.reset}`);
    }

    content.forEach((line) => {
      const linePadded = line.padEnd(maxWidth - 4);
      console.log(`${color}║ ${linePadded}${color} ║${colors.reset}`);
    });

    console.log(`${color}${bottomBorder}${colors.reset}`);
  }

  // ================================================================================
  // UTILITY METHODS
  // ================================================================================

  /**
   * Format bytes in human-readable form
   */
  private static formatBytes(bytes: number): string {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(1);
    return `${size} ${sizes[i]}`;
  }

  /**
   * Format duration in human-readable form
   */
  private static formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    }
    return `${Math.floor(seconds / 3600)}h ${
      Math.floor((seconds % 3600) / 60)
    }m`;
  }

  /**
   * Get log history
   */
  static getLogHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  static clearLogHistory(): void {
    this.logHistory = [];
  }

  /**
   * Export logs as JSON
   */
  static exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }
}

// ================================================================================
// EXPORTS
// ================================================================================

export {
  applyModifiers,
  bgColor256,
  color256,
  type Color256Name,
  colorize,
  type ColorName,
  // Re-export color system for convenience
  colors,
  colors256,
  type ColorSupport,
  createGradient,
  detectColorSupport,
  hexToBgRgb,
  hexToRgb,
  palettes,
  rgbTo256,
  stripAnsi,
  supports256Color,
  supportsColor,
  supportsTrueColor,
};
