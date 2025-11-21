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
import type { ILogger } from "../core/interfaces/ILogger.ts";
import {
  ConsoleStyler,
  ConsoleStylerLogger,
} from "@pedromdominguez/genesis-trace";

interface HeartbeatServerConfig {
  port?: number;
  hostname?: string;
  logger?: ILogger;
}

export class HeartbeatServer {
  private config: HeartbeatServerConfig;
  private server: Deno.HttpServer | null = null;
  private abortController: AbortController;
  private latestMetrics: SystemMetrics | null = null;
  private metricsHistory: SystemMetrics[] = [];
  private readonly MAX_HISTORY = 60; // Keep last 60 seconds
  private logger: ILogger;

  constructor(config: HeartbeatServerConfig = {}) {
    this.config = {
      port: config.port ?? 3000,
      hostname: config.hostname ?? "127.0.0.1",
      logger: config.logger,
    };
    this.logger = config.logger ?? new ConsoleStylerLogger();
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
    this.logger.logSection("Heartbeat Metrics Server", "brightCyan", "heavy");

    // Create router with injected logger
    const router = createRouter(this.logger);

    // Add middleware
    router.use(errorHandler());
    router.use(logger(this.logger));
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
            this.logger.logSuccess(
              `Server listening on http://${hostname}:${port}`,
              { port, hostname },
            );
            this.logger.logSection(
              "Available Endpoints",
              "brightCyan",
              "heavy",
            );

            // Display endpoints with colored formatting matching actual request logs
            ConsoleStyler.logRoute("GET", "/", "API information");
            ConsoleStyler.logRoute("GET", "/health", "Health check");
            ConsoleStyler.logRoute("GET", "/metrics", "Latest system metrics");
            ConsoleStyler.logRoute(
              "GET",
              "/metrics/history",
              "Last 60 seconds of metrics",
            );
            ConsoleStyler.logRoute(
              "GET",
              "/metrics/summary",
              "Summary statistics",
            );
            console.log("");

            this.logger.logInfo("🎨 Colored request logging enabled:");
            this.logger.logInfo(
              "   • HTTP method (GET=green, POST=blue, DELETE=red, etc.)",
            );
            this.logger.logInfo(
              "   • Status code (2xx=green, 4xx=orange, 5xx=red)",
            );
            this.logger.logInfo("   • Response time (<50ms=green, >200ms=red)");
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
            this.logger.logError(
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
      this.logger.logSuccess("Server shutdown complete");
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      this.logger.logError(`Failed to start server: ${errorMessage}`, {
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
