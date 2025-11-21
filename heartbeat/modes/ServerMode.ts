// ==============================================================================
// Server Mode
// ------------------------------------------------------------------------------
// HTTP server mode with metrics API and file logging
// ==============================================================================

import type { ILogger } from "../../core/interfaces/ILogger.ts";
import type { SystemMetrics } from "../types/SystemMetrics.ts";
import type { IClock, IMetricsRepository } from "../adapters/interfaces.ts";
import type { HeartbeatConfig } from "../config/HeartbeatConfig.ts";
import type { MonitorMode, ProcessStatus } from "./types.ts";
import { RealClock, JsonFileMetricsRepository, DenoFileSystem } from "../adapters/DenoAdapters.ts";

// ==============================================================================
// Metrics Buffer
// ==============================================================================

export class MetricsBuffer {
  private buffer: SystemMetrics[] = [];

  add(metrics: SystemMetrics): void {
    this.buffer.push(metrics);
  }

  flush(): SystemMetrics[] {
    const metrics = [...this.buffer];
    this.buffer = [];
    return metrics;
  }

  get length(): number {
    return this.buffer.length;
  }

  isEmpty(): boolean {
    return this.buffer.length === 0;
  }
}

// ==============================================================================
// Interval Logger
// ==============================================================================

export class IntervalLogger {
  private lastLogTime = 0;

  constructor(
    private readonly intervalMs: number,
    private readonly clock: IClock,
  ) {}

  shouldLog(): boolean {
    const now = this.clock.now();
    if (now - this.lastLogTime >= this.intervalMs) {
      this.lastLogTime = now;
      return true;
    }
    return false;
  }

  reset(): void {
    this.lastLogTime = 0;
  }
}

// ==============================================================================
// Alert Checker
// ==============================================================================

export class AlertChecker {
  constructor(private readonly logger: ILogger) {}

  checkAlerts(metrics: SystemMetrics): void {
    if (metrics.cpu_spike_detected) {
      this.logger.logWarning("CPU spike detected", {
        usage: `${metrics.cpu_usage_percent.toFixed(1)}%`,
      });
    }

    if (metrics.memory_leak_suspected) {
      this.logger.logWarning("Memory leak suspected", {
        usage: `${metrics.memory_usage_percent.toFixed(1)}%`,
      });
    }
  }
}

// ==============================================================================
// Server Mode Dependencies
// ==============================================================================

export interface ServerModeDeps {
  logger: ILogger;
  config: HeartbeatConfig;
  clock?: IClock;
  metricsRepository?: IMetricsRepository;
  serverFactory?: () => Promise<{
    start: () => Promise<void>;
    updateMetrics: (metrics: SystemMetrics) => void;
    stop: () => void;
  }>;
}

// ==============================================================================
// Server Mode Factory
// ==============================================================================

export function createServerMode(deps: ServerModeDeps): MonitorMode {
  const {
    logger,
    config,
    clock = new RealClock(),
    metricsRepository = new JsonFileMetricsRepository(
      new URL(config.logging.filePath, import.meta.url).pathname,
      new DenoFileSystem(),
    ),
  } = deps;

  const buffer = new MetricsBuffer();
  const intervalLogger = new IntervalLogger(config.logging.intervalMs, clock);
  const alertChecker = new AlertChecker(logger);

  let heartbeatServer: {
    start: () => Promise<void>;
    updateMetrics: (metrics: SystemMetrics) => void;
    stop: () => void;
  } | null = null;

  const logFilePath = new URL(config.logging.filePath, import.meta.url).pathname;

  return {
    label: "HTTP Server",
    description: `Serve metrics via HTTP API on port ${config.server.port} + log to ${config.logging.filePath}.`,

    async onStart() {
      // Import and create HeartbeatServer (lazy load to avoid circular deps)
      const { HeartbeatServer } = await import("../server.ts");
      heartbeatServer = new HeartbeatServer({
        port: config.server.port,
        hostname: config.server.hostname,
        logger,
      });

      // Start server in background
      heartbeatServer.start().catch((error: Error) => {
        logger.logError("Server error", { error: error.message });
      });

      // Wait for server to initialize
      await new Promise((resolve) => setTimeout(resolve, 1000));

      logger.logSuccess("SERVER_READY");
      logger.logSuccess("Heartbeat server started", {
        port: config.server.port,
        hostname: config.server.hostname,
        endpoints: ["GET /health", "GET /metrics"],
      });
      logger.logSuccess("File logging enabled", {
        file: logFilePath,
        interval: `${config.logging.intervalMs / 1000} seconds`,
      });
    },

    async onMetrics(metrics: SystemMetrics) {
      // Update server metrics
      heartbeatServer?.updateMetrics(metrics);

      // Buffer metrics
      buffer.add(metrics);

      // Check if it's time to persist
      if (intervalLogger.shouldLog() && !buffer.isEmpty()) {
        try {
          const metricsToSave = buffer.flush();
          await metricsRepository.append(metricsToSave);

          logger.logInfo("Metrics logged", {
            count: metricsToSave.length,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          logger.logError("Failed to write metrics to file", {
            error: String(error),
          });
        }
      }

      // Check for alerts
      alertChecker.checkAlerts(metrics);
    },

    onShutdown(_status: ProcessStatus) {
      if (!buffer.isEmpty()) {
        logger.logInfo("Flushing remaining metrics", {
          count: buffer.length,
        });
      }
      logger.logSuccess("File logging stopped", { file: logFilePath });
    },
  };
}
