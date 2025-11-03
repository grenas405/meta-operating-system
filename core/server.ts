/**
 * HTTP Server Entry Point
 * Standalone HTTP server that can be spawned and managed by the kernel
 * No external dependencies - uses only Deno built-in APIs
 */

import { createRouter, registerCoreRoutes } from "./router.ts";
import { bodyParser } from "./utils/parsers.ts";
import {
  createPerformanceMiddleware,
  PerformanceMonitor,
} from "./middleware/performanceMonitor.ts";
import { errorHandler, logger, requestId, timing } from "./middleware/index.ts";
import { ConsoleStyler } from "./utils/console-styler/ConsoleStyler.ts";

interface ServerConfig {
  port: number;
  hostname: string;
  debug: boolean;
}

interface SystemInfo {
  startTime: number;
  version: string;
  pid: number;
  platform: string;
}

class HTTPServer {
  private config: ServerConfig;
  private systemInfo: SystemInfo;
  private abortController: AbortController;
  private performanceMonitor: PerformanceMonitor;
  private server: Deno.HttpServer | null = null;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = {
      port: config.port ?? (Number(Deno.env.get("PORT")) || 8000),
      hostname: config.hostname ?? (Deno.env.get("HOSTNAME") || "localhost"),
      debug: config.debug ?? Deno.env.get("DEBUG") === "true",
    };

    this.systemInfo = {
      startTime: Date.now(),
      version: "0.1.0",
      pid: Deno.pid,
      platform: Deno.build.os,
    };

    this.abortController = new AbortController();
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Initialize HTTP server
   */
  private async init(): Promise<void> {
    this.log("Initializing HTTP server...");

    // Register signal handlers for graceful shutdown
    Deno.addSignalListener("SIGINT", () => this.shutdown("SIGINT"));
    Deno.addSignalListener("SIGTERM", () => this.shutdown("SIGTERM"));

    this.logSuccess("HTTP server initialization complete");
  }

  /**
   * Get system uptime in seconds
   */
  private getUptime(): number {
    return Math.floor((Date.now() - this.systemInfo.startTime) / 1000);
  }

  /**
   * Logging utilities
   */
  private log(message: string, metadata?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    ConsoleStyler.logInfo(`[${timestamp}] [SERVER] ${message}`, metadata);
  }

  private logSuccess(
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    const timestamp = new Date().toISOString();
    ConsoleStyler.logSuccess(`[${timestamp}] [SERVER] ${message}`, metadata);
  }

  private logError(message: string, metadata?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    ConsoleStyler.logError(`[${timestamp}] [SERVER] ${message}`, metadata);
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    ConsoleStyler.renderBanner({
      version: this.systemInfo.version,
      buildDate: new Date().toISOString(),
      environment: Deno.env.get("DENO_ENV") || "development",
      port: this.config.port,
      author: "Meta-OS Team",
      repository: "github.com/meta-os/meta-operating-system",
      description: "Meta Operating System - HTTP Server",
      features: [
        "HTTP Routes",
        "Middleware Pipeline",
        "Performance Monitoring",
        "Zero Dependencies",
      ],
    });

    this.log("Starting HTTP server...");
    this.log(`Platform: ${this.systemInfo.platform}`, {
      platform: this.systemInfo.platform,
      pid: this.systemInfo.pid,
      version: this.systemInfo.version,
    });

    await this.init();

    // Create router and register middleware
    const router = createRouter();

    // Add middleware
    router.use(errorHandler());
    router.use(
      createPerformanceMiddleware(this.performanceMonitor, this.config.debug),
    );
    router.use(logger());
    router.use(timing());
    router.use(requestId());
    router.use(bodyParser());

    // Register core routes
    registerCoreRoutes(router, {
      systemInfo: this.systemInfo,
      getUptime: this.getUptime.bind(this),
      performanceMonitor: this.performanceMonitor,
      config: {
        port: this.config.port,
        hostname: this.config.hostname,
      },
    });

    this.log(
      `Starting HTTP listener on ${this.config.hostname}:${this.config.port}`,
    );

    try {
      this.server = Deno.serve(
        {
          port: this.config.port,
          hostname: this.config.hostname,
          signal: this.abortController.signal,
          onListen: ({ port, hostname }) => {
            this.logSuccess(
              `HTTP server listening on http://${hostname}:${port}`,
              {
                port,
                hostname,
                protocol: "http",
              },
            );
          },
        },
        async (request) => {
          try {
            return await router.handle(request);
          } catch (error) {
            const errorMessage = error instanceof Error
              ? error.message
              : String(error);
            this.logError(
              `Unhandled error in request handler: ${errorMessage}`,
              {
                url: request.url,
                method: request.method,
                error: errorMessage,
              },
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
      this.logSuccess("HTTP server shutdown complete");
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      this.logError(`Failed to start HTTP server: ${errorMessage}`, {
        port: this.config.port,
        hostname: this.config.hostname,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(signal: string): Promise<void> {
    ConsoleStyler.logWarning(
      `Received ${signal}, shutting down HTTP server...`,
    );

    // Abort the server
    this.abortController.abort();

    this.logSuccess("HTTP server cleanup complete");

    Deno.exit(0);
  }
}

/**
 * Main entry point
 */
if (import.meta.main) {
  const server = new HTTPServer();
  await server.start();
}

export { HTTPServer, type ServerConfig, type SystemInfo };
