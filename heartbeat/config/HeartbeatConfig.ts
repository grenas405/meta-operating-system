// ==============================================================================
// Heartbeat Configuration
// ------------------------------------------------------------------------------
// Centralized configuration for heartbeat monitor
// ==============================================================================

export interface AlertThresholds {
  cpu: {
    warning: number;  // Yellow alert threshold
    critical: number; // Red alert threshold
  };
  memory: {
    warning: number;  // Yellow alert threshold
    critical: number; // Red alert threshold
  };
  swap: {
    notice: number;   // Notice threshold for swap usage
  };
}

export interface ServerConfig {
  port: number;
  hostname: string;
  maxHistory: number;
}

export interface LoggingConfig {
  filePath: string;
  intervalMs: number;
}

export interface WindowConfig {
  height: number;
  barWidth: number;
  minWidth: number;
}

export interface HeartbeatConfig {
  defaultMode: "window" | "server" | "journal";
  thresholds: AlertThresholds;
  server: ServerConfig;
  logging: LoggingConfig;
  window: WindowConfig;
}

// ==============================================================================
// Default Configuration
// ==============================================================================

export const DEFAULT_CONFIG: HeartbeatConfig = {
  defaultMode: "server",

  thresholds: {
    cpu: {
      warning: 60,
      critical: 80,
    },
    memory: {
      warning: 70,
      critical: 85,
    },
    swap: {
      notice: 10,
    },
  },

  server: {
    port: 3000,
    hostname: "127.0.0.1",
    maxHistory: 60,
  },

  logging: {
    filePath: "./heartbeat.json",
    intervalMs: 60_000, // 1 minute
  },

  window: {
    height: 13,
    barWidth: 20,
    minWidth: 40,
  },
};

// ==============================================================================
// Configuration Builder
// ==============================================================================

export class ConfigBuilder {
  private config: HeartbeatConfig;

  constructor(baseConfig: HeartbeatConfig = DEFAULT_CONFIG) {
    this.config = structuredClone(baseConfig);
  }

  withDefaultMode(mode: "window" | "server" | "journal"): this {
    this.config.defaultMode = mode;
    return this;
  }

  withCpuThresholds(warning: number, critical: number): this {
    this.config.thresholds.cpu = { warning, critical };
    return this;
  }

  withMemoryThresholds(warning: number, critical: number): this {
    this.config.thresholds.memory = { warning, critical };
    return this;
  }

  withServerPort(port: number): this {
    this.config.server.port = port;
    return this;
  }

  withServerHostname(hostname: string): this {
    this.config.server.hostname = hostname;
    return this;
  }

  withLogFilePath(path: string): this {
    this.config.logging.filePath = path;
    return this;
  }

  withLogInterval(intervalMs: number): this {
    this.config.logging.intervalMs = intervalMs;
    return this;
  }

  withMaxHistory(count: number): this {
    this.config.server.maxHistory = count;
    return this;
  }

  withWindowHeight(height: number): this {
    this.config.window.height = height;
    return this;
  }

  build(): HeartbeatConfig {
    return structuredClone(this.config);
  }
}

// ==============================================================================
// Threshold Helpers
// ==============================================================================

export type SeverityLevel = "ok" | "warning" | "critical";

export function getCpuSeverity(
  percent: number,
  thresholds: AlertThresholds,
): SeverityLevel {
  if (percent > thresholds.cpu.critical) return "critical";
  if (percent > thresholds.cpu.warning) return "warning";
  return "ok";
}

export function getMemorySeverity(
  percent: number,
  thresholds: AlertThresholds,
): SeverityLevel {
  if (percent > thresholds.memory.critical) return "critical";
  if (percent > thresholds.memory.warning) return "warning";
  return "ok";
}

export function getOverallSeverity(
  cpuPercent: number,
  memoryPercent: number,
  thresholds: AlertThresholds,
): SeverityLevel {
  const cpuSeverity = getCpuSeverity(cpuPercent, thresholds);
  const memorySeverity = getMemorySeverity(memoryPercent, thresholds);

  if (cpuSeverity === "critical" || memorySeverity === "critical") {
    return "critical";
  }
  if (cpuSeverity === "warning" || memorySeverity === "warning") {
    return "warning";
  }
  return "ok";
}
