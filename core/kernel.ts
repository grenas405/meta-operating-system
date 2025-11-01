/**
 * Deno-Genesis Kernel
 * Entry point for the meta-os system
 * No external dependencies - uses only Deno built-in APIs
 */

import { createServer } from "./server.ts";
import type { Server } from "./server.ts";
import type { Context } from "./utils/context.ts";
import { json, badRequest } from "./utils/response.ts";
import { bodyParser } from "./utils/parsers.ts";
import {
  validator,
  requiredString,
  optionalString,
  requiredNumber,
  requiredEmail,
} from "./utils/validator.ts";
import {
  createPerformanceMiddleware,
  PerformanceMonitor,
} from "./middleware/performanceMonitor.ts";
import { logger, requestId, timing } from "./middleware/index.ts";
import { ConsoleStyler } from "./utils/console-styler/ConsoleStyler.ts";

interface KernelConfig {
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

class Kernel {
  private config: KernelConfig;
  private systemInfo: SystemInfo;
  private abortController: AbortController;
  private httpServer: Server;
  private performanceMonitor: PerformanceMonitor;

  constructor(config: Partial<KernelConfig> = {}) {
    this.config = {
      port: config.port ?? (Number(Deno.env.get("PORT")) || 8000),
      hostname: config.hostname ??
        (Deno.env.get("HOSTNAME") || "localhost"),
      debug: config.debug ?? Deno.env.get("DEBUG") === "true",
    };

    this.systemInfo = {
      startTime: Date.now(),
      version: "0.1.0",
      pid: Deno.pid,
      platform: Deno.build.os,
    };

    this.abortController = new AbortController();

    // Initialize performance monitoring
    this.performanceMonitor = new PerformanceMonitor();

    // Create HTTP server with middleware
    this.httpServer = createServer({
      port: this.config.port,
      hostname: this.config.hostname,
      signal: this.abortController.signal,
      onListen: ({ port, hostname }) => {
        ConsoleStyler.logSuccess(
          `Server listening on http://${hostname}:${port}`,
          {
            port,
            hostname,
            protocol: "http",
          },
        );
        ConsoleStyler.logSuccess("🚀 Kernel is ready");
      },
    });

    // Add middleware
    this.httpServer.use(
      createPerformanceMiddleware(this.performanceMonitor, this.config.debug),
    );
    this.httpServer.use(logger());
    this.httpServer.use(timing());
    this.httpServer.use(requestId());
    this.httpServer.use(bodyParser()); // Parse request bodies

    // Register routes
    this.registerRoutes();
  }

  /**
   * Register HTTP routes
   */
  private registerRoutes(): void {
    // Root endpoint
    this.httpServer.get("/", () => {
      return json({
        message: "Deno-Genesis Kernel",
        version: this.systemInfo.version,
        uptime: this.getUptime(),
      });
    });

    // Health check endpoint
    this.httpServer.get("/health", () => {
      return json({
        status: "healthy",
        uptime: this.getUptime(),
        timestamp: Date.now(),
      });
    });

    // System info endpoint
    this.httpServer.get("/info", () => {
      return json({
        ...this.systemInfo,
        uptime: this.getUptime(),
        memory: Deno.memoryUsage(),
        config: {
          port: this.config.port,
          hostname: this.config.hostname,
        },
      });
    });

    // Performance metrics endpoint
    this.httpServer.get("/metrics", () => {
      return json(this.performanceMonitor.getMetrics());
    });

    // Detailed performance metrics endpoint
    this.httpServer.get("/metrics/detailed", () => {
      return json(this.performanceMonitor.getDetailedMetrics());
    });

    // Performance insights endpoint
    this.httpServer.get("/metrics/insights", () => {
      return json(this.performanceMonitor.getPerformanceInsights());
    });

    // Example: Echo endpoint - demonstrates basic JSON body parsing
    this.httpServer.post("/echo", (ctx: Context) => {
      const body = ctx.state.body;

      if (!body) {
        return badRequest("No body provided");
      }

      return json({
        message: "Echo response",
        received: body,
        timestamp: Date.now(),
      });
    });

    // Example: User creation with validation
    this.httpServer.post(
      "/users",
      validator({
        name: requiredString({ minLength: 2, maxLength: 50 }),
        email: requiredEmail(),
        age: requiredNumber({ min: 18, max: 120, integer: true }),
        bio: optionalString({ maxLength: 500 }),
      }),
      (ctx: Context) => {
        const user = ctx.state.body as Record<string, unknown>;

        // In a real app, you'd save to a database here
        const createdUser = {
          id: crypto.randomUUID(),
          ...user,
          createdAt: new Date().toISOString(),
        };

        ConsoleStyler.logSuccess("User created", createdUser);

        return json(createdUser, { status: 201 });
      },
    );

    // Example: Form data endpoint
    this.httpServer.post("/contact", (ctx: Context) => {
      const body = ctx.state.body as Record<string, unknown>;

      if (!body) {
        return badRequest("No form data provided");
      }

      // Process contact form submission
      ConsoleStyler.logInfo("Contact form submitted", body);

      return json({
        message: "Contact form received",
        data: body,
      });
    });

    // Example: File upload endpoint
    this.httpServer.post("/upload", (ctx: Context) => {
      const files = ctx.state.files as Array<{
        name: string;
        filename: string;
        type: string;
        size: number;
        data: Uint8Array;
      }>;

      if (!files || files.length === 0) {
        return badRequest("No files uploaded");
      }

      // Process uploaded files
      const fileInfo = files.map((file) => ({
        fieldName: file.name,
        filename: file.filename,
        mimeType: file.type,
        size: file.size,
      }));

      ConsoleStyler.logSuccess(`Received ${files.length} file(s)`, fileInfo);

      return json({
        message: "Files uploaded successfully",
        files: fileInfo,
      });
    });
  }

  /**
   * Initialize kernel subsystems
   */
  private async init(): Promise<void> {
    this.log("Initializing kernel subsystems...");

    // Register signal handlers for graceful shutdown
    Deno.addSignalListener("SIGINT", () => this.shutdown("SIGINT"));
    Deno.addSignalListener("SIGTERM", () => this.shutdown("SIGTERM"));

    this.logSuccess("Kernel initialization complete");
  }

  /**
   * Get system uptime in seconds
   */
  private getUptime(): number {
    return Math.floor((Date.now() - this.systemInfo.startTime) / 1000);
  }

  /**
   * Logging utility
   */
  private log(message: string, metadata?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    ConsoleStyler.logInfo(`[${timestamp}] 🔧 [KERNEL] ${message}`, metadata);
  }

  /**
   * Success logging utility
   */
  private logSuccess(
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    const timestamp = new Date().toISOString();
    ConsoleStyler.logSuccess(`[${timestamp}] 🔧 [KERNEL] ${message}`, metadata);
  }

  /**
   * Error logging utility
   */
  private logError(message: string, metadata?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    ConsoleStyler.logError(`[${timestamp}] 🔧 [KERNEL] ${message}`, metadata);
  }

  /**
   * Start the kernel
   */
  async boot(): Promise<void> {
    // Display beautiful startup banner
    ConsoleStyler.renderBanner({
      version: this.systemInfo.version,
      buildDate: new Date().toISOString(),
      environment: Deno.env.get("DENO_ENV") || "development",
      port: this.config.port,
      author: "Meta-OS Team",
      repository: "github.com/meta-os/deno-genesis",
      description: "Deno-Genesis Meta Operating System",
      features: [
        "HTTP Server",
        "Middleware Pipeline",
        "Hot Reload",
        "Zero Dependencies",
      ],
    });

    this.log("Booting Deno-Genesis Kernel...");
    this.log(`Platform: ${this.systemInfo.platform}`, {
      platform: this.systemInfo.platform,
      pid: this.systemInfo.pid,
      version: this.systemInfo.version,
    });

    await this.init();

    this.log(
      `Starting HTTP server on ${this.config.hostname}:${this.config.port}`,
    );

    await this.httpServer.listen();
    this.logSuccess("Server shutdown complete");
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(signal: string): Promise<void> {
    ConsoleStyler.logWarning(
      `Received ${signal}, initiating graceful shutdown...`,
    );

    // Abort the server
    this.abortController.abort();

    // Cleanup
    this.logSuccess("Cleanup complete");
    this.logSuccess("Kernel shutdown complete");

    Deno.exit(0);
  }

  /**
   * Get HTTP server instance for extension
   */
  getServer(): Server {
    return this.httpServer;
  }
}

/**
 * Main entry point
 */
if (import.meta.main) {
  const kernel = new Kernel();
  await kernel.boot();
}

export { Kernel, type KernelConfig, type SystemInfo };
