/**
 * Heartbeat Metrics HTTP Server
 * Serves system metrics via HTTP API on port 3000
 */

import { createRouter } from "../core/router.ts";
import { json } from "../core/utils/response.ts";
import {
  errorHandler,
  logger,
  requestId,
  timing,
} from "../core/middleware/index.ts";
import type { Context } from "../core/utils/context.ts";
import type { SystemMetrics } from "./types/SystemMetrics.ts";
import { ConsoleStyler } from "../core/utils/console-styler/mod.ts";

interface HeartbeatServerConfig {
  port?: number;
  hostname?: string;
}

export class HeartbeatServer {
  private config: HeartbeatServerConfig;
  private server: Deno.HttpServer | null = null;
  private abortController: AbortController;
  private latestMetrics: SystemMetrics | null = null;
  private metricsHistory: SystemMetrics[] = [];
  private readonly MAX_HISTORY = 60; // Keep last 60 seconds

  constructor(config: HeartbeatServerConfig = {}) {
    this.config = {
      port: config.port ?? 3000,
      hostname: config.hostname ?? "localhost",
    };
    this.abortController = new AbortController();
  }

  /**
   * Update metrics (called by monitor)
   */
  updateMetrics(metrics: SystemMetrics): void {
    this.latestMetrics = metrics;
    this.metricsHistory.push(metrics);

    if (this.metricsHistory.length > this.MAX_HISTORY) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Get latest metrics
   */
  getLatestMetrics(): SystemMetrics | null {
    return this.latestMetrics;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): SystemMetrics[] {
    return this.metricsHistory;
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    ConsoleStyler.logSection("Heartbeat Metrics Server", "brightCyan", "heavy");

    // Create custom logger using console-styler
    const customLogger = {
      logInfo: (message: string, metadata?: Record<string, unknown>) => {
        ConsoleStyler.logInfo(message, metadata);
      },
      logSuccess: (message: string, metadata?: Record<string, unknown>) => {
        ConsoleStyler.logSuccess(message, metadata);
      },
      logWarning: (message: string, metadata?: Record<string, unknown>) => {
        ConsoleStyler.logWarning(message, metadata);
      },
      logError: (message: string, metadata?: Record<string, unknown>) => {
        ConsoleStyler.logError(message, metadata);
      },
      logCritical: (message: string, metadata?: Record<string, unknown>) => {
        ConsoleStyler.logCritical(message, metadata);
      },
      logDebug: (message: string, metadata?: Record<string, unknown>) => {
        ConsoleStyler.logDebug(message, metadata);
      },
      logRequest: (
        method: string,
        path: string,
        status: number,
        duration: number,
        size?: number,
      ) => {
        ConsoleStyler.logRequest(method, path, status, duration, size);
      },
      logSection: (title: string, colorName?: any, style?: any) => {
        ConsoleStyler.logSection(title, colorName, style);
      },
    };

    // Create router
    const router = createRouter(customLogger);

    // Add middleware
    router.use(errorHandler());
    router.use(logger(customLogger));
    router.use(timing());
    router.use(requestId());

    // Register metrics routes
    router.get("/", () =>
      json({
        message: "Heartbeat Metrics Server",
        version: "1.0.0",
        endpoints: [
          "GET /metrics - Latest system metrics",
          "GET /metrics/history - Last 60 seconds of metrics",
          "GET /metrics/summary - Summary statistics",
          "GET /health - Health check",
        ],
      }));

    router.get("/health", () =>
      json({
        status: "healthy",
        timestamp: Date.now(),
        metricsAvailable: this.latestMetrics !== null,
      }));

    router.get("/metrics", () => {
      if (!this.latestMetrics) {
        return json(
          { error: "No metrics available yet" },
          { status: 503 },
        );
      }
      return json(this.latestMetrics);
    });

    router.get("/metrics/history", () => {
      return json({
        count: this.metricsHistory.length,
        metrics: this.metricsHistory,
      });
    });

    router.get("/metrics/summary", () => {
      if (this.metricsHistory.length === 0) {
        return json(
          { error: "No metrics history available" },
          { status: 503 },
        );
      }

      // Calculate summary statistics
      const cpuValues = this.metricsHistory.map((m) => m.cpu_usage_percent);
      const memValues = this.metricsHistory.map((m) => m.memory_usage_percent);

      const avgCpu = cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length;
      const maxCpu = Math.max(...cpuValues);
      const minCpu = Math.min(...cpuValues);

      const avgMem = memValues.reduce((a, b) => a + b, 0) / memValues.length;
      const maxMem = Math.max(...memValues);
      const minMem = Math.min(...memValues);

      return json({
        period: {
          start: this.metricsHistory[0].timestamp,
          end: this.metricsHistory[this.metricsHistory.length - 1].timestamp,
          samples: this.metricsHistory.length,
        },
        cpu: {
          average: avgCpu,
          min: minCpu,
          max: maxCpu,
          current: this.latestMetrics?.cpu_usage_percent ?? 0,
        },
        memory: {
          average: avgMem,
          min: minMem,
          max: maxMem,
          current: this.latestMetrics?.memory_usage_percent ?? 0,
        },
        latest: this.latestMetrics,
      });
    });

    try {
      this.server = Deno.serve(
        {
          port: this.config.port!,
          hostname: this.config.hostname!,
          signal: this.abortController.signal,
          onListen: ({ port, hostname }) => {
            ConsoleStyler.logSuccess(
              `Server listening on http://${hostname}:${port}`,
              { port, hostname },
            );
            ConsoleStyler.logInfo("Available endpoints:");
            console.log("  GET  /              - API information");
            console.log("  GET  /health        - Health check");
            console.log("  GET  /metrics       - Latest system metrics");
            console.log("  GET  /metrics/history - Last 60 seconds of metrics");
            console.log("  GET  /metrics/summary - Summary statistics");
            console.log("");
          },
        },
        async (request) => {
          try {
            return await router.handle(request);
          } catch (error) {
            const errorMessage = error instanceof Error
              ? error.message
              : String(error);
            ConsoleStyler.logError(
              `Unhandled error in request handler: ${errorMessage}`,
              { url: request.url, method: request.method },
            );

            return new Response(
              JSON.stringify({ error: "Internal Server Error" }),
              {
                status: 500,
                headers: { "Content-Type": "application/json" },
              },
            );
          }
        },
      );

      await this.server.finished;
      ConsoleStyler.logSuccess("Server shutdown complete");
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      ConsoleStyler.logError(`Failed to start server: ${errorMessage}`, {
        port: this.config.port,
        hostname: this.config.hostname,
      });
      throw error;
    }
  }

  /**
   * Stop the server
   */
  stop(): void {
    this.abortController.abort();
  }
}
