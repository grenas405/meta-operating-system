/**
 * Genesis OS Kernel
 * Runtime orchestrator for managing Deno processes
 * Designed to run as a systemd service with elevated privileges
 * No external dependencies - uses only Deno built-in APIs
 */

import type { ILogger } from "./core/interfaces/mod.ts";
import { defaultLogger } from "./core/adapters/mod.ts";

import {
  env,
  type KernelConfig,
  type ManagedProcess,
  type ProcessHealthCheck,
  type SystemInfo,
} from "./mod.ts";

import { MetaRepl } from "./repl.ts";
import {
  generateVersionFileFromGit,
  getGitVersionInfo,
} from "./core/utils/gitVersionGenerator.ts";

class Kernel {
  private config: KernelConfig;
  private systemInfo: SystemInfo;
  private processes: Map<string, ManagedProcess> = new Map();
  private shutdownInProgress = false;
  private logger: ILogger;
  private readonly defaultHealthCheckInterval = 15_000;
  private readonly defaultHealthFailures = 3;
  private readonly healthCheckTimeout = 2_000;
  private readonly heartbeatPort = 3000;
  private readonly heartbeatHostname = "127.0.0.1";

  constructor(
    config: Partial<KernelConfig> = {},
    logger: ILogger = defaultLogger,
  ) {
    // Use centralized configuration with environment variable fallbacks
    this.config = env.loadKernelConfig(config);
    this.logger = logger;

    this.systemInfo = {
      startTime: Date.now(),
      version: "v1.0.0-dev",
      pid: Deno.pid,
      platform: Deno.build.os,
    };
  }

  /**
   * Initialize kernel subsystems
   */
  private async init(): Promise<void> {
    this.log("Initializing kernel subsystems...");

    // Register signal handlers for graceful shutdown
    Deno.addSignalListener("SIGINT", () => this.shutdown("SIGINT"));
    Deno.addSignalListener("SIGTERM", () => this.shutdown("SIGTERM"));

    // Register SIGUSR1 handler to re-enter REPL
    Deno.addSignalListener("SIGUSR1", () => this.reenterRepl());

    this.logSuccess("Kernel initialization complete");
  }

  /**
   * Check if a port is available using only Deno primitives
   */
  private async isPortAvailable(
    port: number,
    hostname = "127.0.0.1",
  ): Promise<boolean> {
    try {
      const listener = Deno.listen({ port, hostname });
      listener.close();
      return true;
    } catch (error) {
      if (error instanceof Deno.errors.AddrInUse) {
        return false;
      }

      this.logError(
        `Unexpected error while probing port ${port}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  /**
   * Spawn a new Deno process
   */
  async spawnProcess(
    id: string,
    name: string,
    scriptPath: string,
    args: string[] = [],
    options: {
      env?: Record<string, string>;
      autoRestart?: boolean;
      cwd?: string;
      port?: number;
      hostname?: string;
      healthCheck?: ProcessHealthCheck;
      healthCheckIntervalMs?: number;
      maxHealthCheckFailures?: number;
    } = {},
  ): Promise<ManagedProcess> {
    if (this.processes.has(id)) {
      throw new Error(`Process with id '${id}' already exists`);
    }

    // Check if port is already in use (if port is specified)
    if (typeof options.port === "number") {
      const hostname = options.hostname ?? "127.0.0.1";
      const available = await this.isPortAvailable(options.port, hostname);
      if (!available) {
        throw new Error(
          `Port ${options.port} (${hostname}) is already in use`,
        );
      }
    }

    this.log(`Spawning process: ${name} (${id})`, { scriptPath, args });

    const command = new Deno.Command(Deno.execPath(), {
      args: ["run", "--allow-all", scriptPath, ...args],
      env: {
        ...Deno.env.toObject(),
        ...options.env,
      },
      cwd: options.cwd,
      stdout: "piped",
      stderr: "piped",
    });

    const managedProcess: ManagedProcess = {
      id,
      name,
      command,
      startTime: Date.now(),
      restartCount: 0,
      autoRestart: options.autoRestart ?? false,
      status: "starting",
      healthCheck: options.healthCheck,
      healthCheckInterval: options.healthCheckIntervalMs ??
        this.defaultHealthCheckInterval,
      maxHealthCheckFailures: options.maxHealthCheckFailures ??
        this.defaultHealthFailures,
      consecutiveHealthFailures: 0,
      isReady: true,
    };

    this.processes.set(id, managedProcess);

    try {
      this.startChildProcess(managedProcess);
    } catch (error) {
      managedProcess.status = "failed";
      this.logError(`Failed to start process: ${name}`, {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    return managedProcess;
  }

  /**
   * Launch or relaunch a managed process
   */
  private startChildProcess(
    process: ManagedProcess,
    options: { isRestart?: boolean; reason?: string } = {},
  ): void {
    const child = process.command.spawn();
    process.child = child;
    process.pid = child.pid;
    process.status = "running";
    process.startTime = Date.now();
    process.consecutiveHealthFailures = 0;

    if (options.isRestart) {
      process.restartCount++;
      this.logSuccess(
        `Process restarted: ${process.name} (PID: ${child.pid})`,
        {
          id: process.id,
          pid: child.pid,
          reason: options.reason,
          restartCount: process.restartCount,
        },
      );
    } else {
      this.logSuccess(`Process started: ${process.name} (PID: ${child.pid})`, {
        id: process.id,
        pid: child.pid,
      });
    }

    this.monitorProcess(process, child);
    this.watchProcessExit(process, child);
    this.setupHealthMonitor(process);
  }

  /**
   * Monitor process output
   */
  private monitorProcess(
    process: ManagedProcess,
    child: Deno.ChildProcess,
  ): void {
    const decoder = new TextDecoder();

    // Monitor stdout
    (async () => {
      if (!child.stdout) return;
      for await (const chunk of child.stdout) {
        const text = decoder.decode(chunk);
        // Check for ready signal
        if (text.includes("SERVER_READY") && process.readyResolver) {
          process.readyResolver();
          process.isReady = true;
        }

        // Filter heartbeat monitor output - only show important messages
        if (process.id === "heartbeat") {
          const trimmed = text.trim();
          // Only show: server startup info, endpoints, warnings, errors, and critical alerts
          if (
            trimmed.includes("SERVER_READY") ||
            trimmed.includes("Heartbeat server started") ||
            trimmed.includes("endpoints") ||
            trimmed.includes("port") ||
            trimmed.includes("hostname") ||
            trimmed.includes("WARNING") ||
            trimmed.includes("ERROR") ||
            trimmed.includes("CRITICAL") ||
            trimmed.includes("spike detected") ||
            trimmed.includes("leak suspected")
          ) {
            this.logger.logInfo(`[${process.name}] ${trimmed}`);
          }
          // Suppress regular metric updates
        } else {
          // Display all output for non-heartbeat processes
          this.logger.logInfo(`[${process.name}] ${text.trim()}`);
        }
      }
    })();

    // Monitor stderr and detect address already in use
    (async () => {
      if (!child.stderr) return;
      for await (const chunk of child.stderr) {
        const text = decoder.decode(chunk);
        this.logger.logError(`[${process.name}] ${text.trim()}`);

        // Check for address already in use error
        if (
          text.includes("AddrInUse") || text.includes("address already in use")
        ) {
          this.logError(
            `Address already in use for ${process.name}, attempting to monitor existing process`,
          );
          process.status = "failed";
        }
      }
    })();
  }

  /**
   * Configure periodic health monitoring for a process
   */
  private setupHealthMonitor(process: ManagedProcess): void {
    if (!process.healthCheck) {
      return;
    }

    if (process.healthCheckTimer) {
      return; // already monitoring
    }

    const interval = process.healthCheckInterval ??
      this.defaultHealthCheckInterval;

    const timerId = setInterval(() => {
      if (this.shutdownInProgress) return;
      if (process.status !== "running") return;
      if (
        process.readyPromise && process.restartCount === 0 &&
        process.isReady === false
      ) {
        return;
      }
      if (process.healthCheckInProgress) return;
      this.runHealthCheck(process).catch((error) => {
        this.logError(`Health monitor error for ${process.name}`, {
          id: process.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, interval);

    process.healthCheckTimer = timerId as number;
  }

  /**
   * Stop the health monitor for a process
   */
  private clearHealthMonitor(process: ManagedProcess): void {
    if (process.healthCheckTimer !== undefined) {
      clearInterval(process.healthCheckTimer);
      process.healthCheckTimer = undefined;
    }
  }

  /**
   * Execute a single health check probe
   */
  private async runHealthCheck(process: ManagedProcess): Promise<void> {
    if (!process.healthCheck) {
      return;
    }

    process.healthCheckInProgress = true;
    try {
      const healthy = await process.healthCheck();
      process.lastHealthCheckTime = Date.now();
      process.lastHealthStatus = healthy ? "healthy" : "unhealthy";

      if (healthy) {
        if ((process.consecutiveHealthFailures ?? 0) > 0) {
          this.logSuccess(
            `Health restored for ${process.name} after consecutive failures`,
            { id: process.id },
          );
        }
        process.consecutiveHealthFailures = 0;
        return;
      }

      process.consecutiveHealthFailures =
        (process.consecutiveHealthFailures ?? 0) + 1;

      const failures = process.consecutiveHealthFailures;
      this.log(
        `Health check failed for ${process.name} (${failures} consecutive)`,
        { id: process.id },
      );

      if (
        failures >=
          (process.maxHealthCheckFailures ?? this.defaultHealthFailures)
      ) {
        await this.restartProcess(process, "health_check_failed");
        process.consecutiveHealthFailures = 0;
      }
    } catch (error) {
      process.consecutiveHealthFailures =
        (process.consecutiveHealthFailures ?? 0) + 1;
      this.logError(`Health check error for ${process.name}`, {
        id: process.id,
        error: error instanceof Error ? error.message : String(error),
      });

      if (
        process.consecutiveHealthFailures >=
          (process.maxHealthCheckFailures ?? this.defaultHealthFailures)
      ) {
        await this.restartProcess(process, "health_check_error");
        process.consecutiveHealthFailures = 0;
      }
    } finally {
      process.healthCheckInProgress = false;
    }
  }

  /**
   * Request a managed restart for a process
   */
  private async restartProcess(
    process: ManagedProcess,
    reason: string,
  ): Promise<void> {
    if (!process.autoRestart) {
      this.logWarning(
        `Auto-restart disabled for ${process.name}, cannot self-heal`,
        { id: process.id, reason },
      );
      return;
    }

    if (!process.child) {
      this.log(
        `Process ${process.name} is not running; starting new instance (reason: ${reason})`,
        { id: process.id },
      );
      try {
        this.startChildProcess(process, { isRestart: true, reason });
      } catch (error) {
        this.logError(`Failed to start ${process.name}`, {
          id: process.id,
          error: error instanceof Error ? error.message : String(error),
        });
        process.status = "failed";
      }
      return;
    }

    if (process.restartRequested) {
      this.log(
        `Restart already requested for ${process.name}, skipping duplicate`,
        { id: process.id, reason },
      );
      return;
    }

    this.log(
      `Requesting restart for ${process.name} due to ${reason}`,
      { id: process.id },
    );

    process.restartRequested = true;
    process.restartReason = reason;

    try {
      process.child.kill("SIGTERM");
    } catch (error) {
      this.logError(`Failed to send SIGTERM to ${process.name}`, {
        id: process.id,
        error: error instanceof Error ? error.message : String(error),
      });
      process.restartRequested = false;
      process.restartReason = undefined;
    }
  }

  /**
   * Helper to perform HTTP-based health checks with a timeout
   */
  private async checkHttpEndpoint(url: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.healthCheckTimeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      return response.ok;
    } catch (_) {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Watch for process exit and handle restart
   */
  private async watchProcessExit(
    process: ManagedProcess,
    child: Deno.ChildProcess,
  ): Promise<void> {
    try {
      const status = await child.status;

      if (process.child === child) {
        process.child = undefined;
        process.pid = undefined;
      }

      if (this.shutdownInProgress) {
        process.status = "stopped";
        this.clearHealthMonitor(process);
        return;
      }

      const restartRequested = process.restartRequested ?? false;
      const restartReason = process.restartReason ??
        (status.success ? "process_exit" : `exit_code_${status.code ?? -1}`);

      if (status.success && !restartRequested) {
        this.log(`Process exited successfully: ${process.name}`, {
          id: process.id,
          code: status.code,
        });
        process.status = "stopped";
        this.clearHealthMonitor(process);
        return;
      }

      if (!process.autoRestart) {
        if (!restartRequested) {
          this.logError(`Process crashed: ${process.name}`, {
            id: process.id,
            code: status.code,
          });
        } else {
          this.log(
            `Restart requested for ${process.name} but autoRestart is disabled`,
            {
              id: process.id,
              reason: restartReason,
            },
          );
        }
        process.status = restartRequested ? "stopped" : "failed";
        this.clearHealthMonitor(process);
        return;
      }

      if (!restartRequested) {
        this.logError(`Process crashed: ${process.name}`, {
          id: process.id,
          code: status.code,
        });
        await this.delay(2000);
      } else {
        this.log(
          `Process ${process.name} restart requested (reason: ${restartReason})`,
          { id: process.id },
        );
      }

      try {
        this.startChildProcess(process, {
          isRestart: true,
          reason: restartReason,
        });
      } catch (error) {
        this.logError(`Failed to restart process: ${process.name}`, {
          id: process.id,
          error: error instanceof Error ? error.message : String(error),
        });
        process.status = "failed";
      }
    } catch (error) {
      this.logError(`Error monitoring process: ${process.name}`, {
        id: process.id,
        error: error instanceof Error ? error.message : String(error),
      });
      process.status = "failed";
    } finally {
      process.restartRequested = false;
      process.restartReason = undefined;
    }
  }

  /**
   * Kill a managed process
   */
  async killProcess(
    id: string,
    signal: Deno.Signal = "SIGTERM",
  ): Promise<void> {
    const process = this.processes.get(id);
    if (!process) {
      throw new Error(`Process with id '${id}' not found`);
    }

    if (!process.child || !process.pid) {
      throw new Error(`Process '${id}' is not running`);
    }

    this.log(`Killing process: ${process.name} (PID: ${process.pid})`, {
      id,
      signal,
    });

    try {
      process.autoRestart = false; // Disable auto-restart
      process.child.kill(signal);
      await process.child.status;
      process.status = "stopped";
      this.clearHealthMonitor(process);
      this.logSuccess(`Process killed: ${process.name}`, { id });
    } catch (error) {
      this.logError(`Failed to kill process: ${process.name}`, {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get process status
   */
  getProcessStatus(id: string): ManagedProcess | undefined {
    return this.processes.get(id);
  }

  /**
   * List all managed processes
   */
  listProcesses(): ManagedProcess[] {
    return Array.from(this.processes.values());
  }

  /**
   * Get system uptime in seconds
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.systemInfo.startTime) / 1000);
  }

  /**
   * Simple delay helper
   */
  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Logging utilities
   */
  private log(message: string, metadata?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    this.logger.logInfo(`[${timestamp}] [KERNEL] ${message}`, metadata);
  }

  private logSuccess(
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    const timestamp = new Date().toISOString();
    this.logger.logSuccess(`[${timestamp}] [KERNEL] ${message}`, metadata);
  }

  private logWarning(
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    const timestamp = new Date().toISOString();
    this.logger.logWarning(`[${timestamp}] [KERNEL] ${message}`, metadata);
  }

  private logError(message: string, metadata?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    this.logger.logError(`[${timestamp}] [KERNEL] ${message}`, metadata);
  }

  /**
   * Start the kernel
   */
  async boot(): Promise<void> {
    // Generate VERSION file from git before boot
    this.log("Generating VERSION file from git...");
    await generateVersionFileFromGit();

    // Get git version info and update systemInfo
    const gitVersionInfo = await getGitVersionInfo();
    this.systemInfo.version = gitVersionInfo.version;
    this.log(
      `Version: ${gitVersionInfo.version} (${gitVersionInfo.commitHash})`,
    );

    // Display startup banner
    // NOTE: renderBanner is not part of ILogger interface - using ConsoleStyler directly for now
    // This is acceptable as banners are a specialized formatting concern
    const { ConsoleStyler } = await import(
      "@pedromdominguez/genesis-trace"
    );
    ConsoleStyler.renderBanner({
      version: this.systemInfo.version,
      buildDate: gitVersionInfo.buildDate,
      environment: this.config.environment,
      port: this.config.serverPort,
      author: "Pedro M. Dominguez",
      repository: "https://github.com/grenas405/meta-operating-system",
      description: "Genesis Operating System - Process Orchestrator",
      features: [
        "Process Management",
        "Auto-Restart",
        "Process Monitoring",
        "Graceful Shutdown",
      ],
    });

    this.log("Booting Genesis OS Kernel...");
    this.log(`Platform: ${this.systemInfo.platform}`, {
      platform: this.systemInfo.platform,
      pid: this.systemInfo.pid,
      version: this.systemInfo.version,
    });

    await this.init();

    // =========================================================================
    // PROCESS 1: Heartbeat Monitor
    // =========================================================================
    this.log("Starting heartbeat monitor process...");
    const heartbeatScriptPath = new URL(
      this.config.heartbeatScriptPath,
      import.meta.url,
    ).pathname;

    const heartbeatHealthCheck = () =>
      this.checkHttpEndpoint(
        `http://${this.heartbeatHostname}:${this.heartbeatPort}/health`,
      );

    await this.spawnProcess(
      "heartbeat",
      "Heartbeat Monitor",
      heartbeatScriptPath,
      [],
      {
        env: {
          DEBUG: String(this.config.debug),
        },
        autoRestart: true,
        port: this.heartbeatPort,
        hostname: this.heartbeatHostname,
        healthCheck: heartbeatHealthCheck,
        healthCheckIntervalMs: 10_000,
      },
    );

    this.logSuccess("Heartbeat monitor started");

    // =========================================================================
    // PROCESS 2: HTTP Configuration Server
    // =========================================================================
    this.log(
      `Starting HTTP configuration server on port ${this.config.serverPort}...`,
    );
    const serverScriptPath = new URL(
      this.config.serverScriptPath,
      import.meta.url,
    ).pathname;

    // Create a ready promise for the HTTP server
    let serverReadyResolver: () => void;
    const serverReadyPromise = new Promise<void>((resolve) => {
      serverReadyResolver = resolve;
    });

    const serverHealthCheck = () =>
      this.checkHttpEndpoint(
        `http://${this.config.serverHostname}:${this.config.serverPort}/health`,
      );

    const httpProcess = await this.spawnProcess(
      "http-server",
      "HTTP Server",
      serverScriptPath,
      [],
      {
        env: {
          PORT: String(this.config.serverPort),
          HOSTNAME: this.config.serverHostname,
          DEBUG: String(this.config.debug),
        },
        autoRestart: true,
        port: this.config.serverPort,
        hostname: this.config.serverHostname,
        healthCheck: serverHealthCheck,
        healthCheckIntervalMs: 15_000,
        maxHealthCheckFailures: 3,
      },
    );

    // Attach the ready promise to the process
    httpProcess.isReady = false;
    httpProcess.readyPromise = serverReadyPromise;
    httpProcess.readyResolver = serverReadyResolver!;
    serverReadyPromise.then(() => {
      httpProcess.isReady = true;
    }).catch(() => {
      httpProcess.isReady = false;
    });

    // Wait for HTTP server to be ready
    this.log("Waiting for HTTP server to be ready...");
    await serverReadyPromise;
    this.logSuccess(
      `HTTP server is ready on port ${this.config.serverPort}`,
    );

    this.logSuccess("Kernel boot complete");

    // =========================================================================
    // PROCESS 3: REPL Shell
    // =========================================================================
    // Only start REPL if stdin is a TTY (interactive terminal)
    if (Deno.stdin.isTerminal()) {
      this.log("Starting REPL shell for process monitoring...");
      await this.startRepl();
    } else {
      this.log("Running in non-interactive mode (no TTY detected)");
      this.log(
        `To enter REPL, send SIGUSR1: kill -SIGUSR1 ${this.systemInfo.pid}`,
      );
    }

    // Keep kernel running after REPL exits
    await new Promise(() => {}); // Run forever until signal
  }

  /**
   * Start the interactive REPL shell
   */
  private async startRepl(): Promise<void> {
    const repl = new MetaRepl(this);
    await repl.start();

    // After REPL exits, keep kernel running
    this.log("REPL exited, kernel continues running in background");
    this.log(
      `To re-enter the REPL, send SIGUSR1: kill -SIGUSR1 ${this.systemInfo.pid}`,
    );
  }

  /**
   * Re-enter the REPL shell
   */
  private reenterRepl(): void {
    // Check if stdin is a TTY before attempting to start REPL
    if (!Deno.stdin.isTerminal()) {
      this.logError(
        "Cannot start REPL: stdin is not a TTY (not connected to a terminal)",
      );
      this.log("REPL requires an interactive terminal session");
      return;
    }

    this.log("Re-entering REPL shell...");
    // Start REPL in a new async context
    (async () => {
      const repl = new MetaRepl(this);
      await repl.start();
      this.log("REPL exited again, kernel continues running in background");
      this.log(
        `To re-enter the REPL, send SIGUSR1: kill -SIGUSR1 ${this.systemInfo.pid}`,
      );
    })();
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(signal: string): Promise<void> {
    this.shutdownInProgress = true;
    this.logger.logWarning(
      `Received ${signal}, initiating graceful shutdown...`,
    );

    // Kill all managed processes
    const killPromises: Promise<void>[] = [];
    for (const [id, process] of this.processes.entries()) {
      if (process.status === "running" && process.child) {
        this.log(`Stopping process: ${process.name}`, { id });
        killPromises.push(
          this.killProcess(id, "SIGTERM").catch((error) => {
            this.logError(`Error stopping process: ${process.name}`, {
              id,
              error: error instanceof Error ? error.message : String(error),
            });
          }),
        );
      }
    }

    await Promise.all(killPromises);

    this.logSuccess("All processes stopped");
    this.logSuccess("Kernel shutdown complete");

    Deno.exit(0);
  }

  /**
   * Get system info
   */
  getSystemInfo(): SystemInfo {
    return { ...this.systemInfo };
  }
}

/**
 * Main entry point
 */
if (import.meta.main) {
  const kernel = new Kernel();
  await kernel.boot();
}

export { Kernel, type KernelConfig, type ManagedProcess, type SystemInfo };
