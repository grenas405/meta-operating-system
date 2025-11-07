/**
 * HTTP Server Entry Point
 * Standalone HTTP server that can be spawned and managed by the kernel
 * No external dependencies - uses only Deno built-in APIs
 */

import { createRouter, registerCoreRoutes } from "./router.ts";
import {
  createPerformanceMiddleware,
  PerformanceMonitor,
} from "./middleware/performanceMonitor.ts";
import {
  bodyParser,
  errorHandler,
  logging,
  requestId,
  staticHandler,
  timing,
} from "./middleware/index.ts";
import type { ILogger } from "./interfaces/mod.ts";
import { defaultLogger } from "./adapters/mod.ts";
import { env, type ServerConfig } from "./config/mod.ts";

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
  private logger: ILogger;

  constructor(
    config: Partial<ServerConfig> = {},
    logger: ILogger = defaultLogger,
  ) {
    // Use centralized configuration with environment variable fallbacks
    this.config = env.loadServerConfig(config);
    this.logger = logger;

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
    this.logger.logInfo(`[${timestamp}] [SERVER] ${message}`, metadata);
  }

  private logSuccess(
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    const timestamp = new Date().toISOString();
    this.logger.logSuccess(`[${timestamp}] [SERVER] ${message}`, metadata);
  }

  private logError(message: string, metadata?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    this.logger.logError(`[${timestamp}] [SERVER] ${message}`, metadata);
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    // Display startup banner
    // NOTE: renderBanner is not part of ILogger interface - using ConsoleStyler directly for now
    const { ConsoleStyler } = await import("./utils/console-styler/mod.ts");
    ConsoleStyler.renderBanner({
      version: this.systemInfo.version,
      buildDate: new Date().toISOString(),
      environment: this.config.environment,
      port: this.config.port,
      author: "Pedro M.Dominguez",
      repository: "https://github.com/grenas405/meta-operating-system",
      description: "HTTP Server for Deno Genesis Meta OS",
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
    const router = createRouter(this.logger);

    // Add middleware
    this.log("Registering middleware stack...");

    this.log("Registering errorHandler middleware");
    router.use(errorHandler());

    this.log("Registering performanceMonitor middleware");
    router.use(
      createPerformanceMiddleware(
        this.performanceMonitor,
        this.logger,
        this.config.debug,
      ),
    );

    this.log("Registering logging middleware");
    router.use(logging({
      environment: this.config.environment,
      logLevel: this.config.debug ? "debug" : "info",
      logRequests: true,
      logResponses: this.config.debug,
    }));

    this.log("Registering timing middleware");
    router.use(timing());

    this.log("Registering requestId middleware");
    router.use(requestId());

    this.log("Registering bodyParser middleware");
    router.use(bodyParser());

    this.log("Registering staticHandler middleware");
    router.use(
      staticHandler({
        root: "./public",
      }),
    );

    this.logSuccess("Middleware stack registration complete");

    // Register core routes
    registerCoreRoutes(router, {
      systemInfo: this.systemInfo,
      getUptime: this.getUptime.bind(this),
      performanceMonitor: this.performanceMonitor,
      config: {
        port: this.config.port,
        hostname: this.config.hostname,
      },
      logger: this.logger,
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
            // Signal to kernel that server is ready
            this.logger.logInfo("SERVER_READY");
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
    this.logger.logWarning(
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
