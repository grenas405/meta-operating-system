/**
 * Meta-OS Kernel
 * Runtime orchestrator for managing Deno processes
 * Designed to run as a systemd service with elevated privileges
 * No external dependencies - uses only Deno built-in APIs
 */

import type { ILogger } from "./core/interfaces/mod.ts";
import { defaultLogger } from "./core/adapters/mod.ts";

import {
  type KernelConfig,
  type ManagedProcess,
  type SystemInfo,
} from "./interfaces/kernel.d.ts";

import { env } from "./mod.ts";
import { MetaRepl } from "./repl.ts";

class Kernel {
  private config: KernelConfig;
  private systemInfo: SystemInfo;
  private processes: Map<string, ManagedProcess> = new Map();
  private shutdownInProgress = false;
  private logger: ILogger;

  constructor(
    config: Partial<KernelConfig> = {},
    logger: ILogger = defaultLogger,
  ) {
    // Use centralized configuration with environment variable fallbacks
    this.config = env.loadKernelConfig(config);
    this.logger = logger;

    this.systemInfo = {
      startTime: Date.now(),
      version: "0.1.0",
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
   * Check if a port is already in use
   */
  private async isPortInUse(port: number): Promise<number | null> {
    try {
      const command = new Deno.Command("bash", {
        args: [
          "-c",
          `lsof -ti:${port} -sTCP:LISTEN 2>/dev/null || netstat -tlnp 2>/dev/null | grep :${port} | awk '{print $7}' | cut -d'/' -f1 | head -1`,
        ],
        stdout: "piped",
        stderr: "piped",
      });

      const { stdout } = await command.output();
      const decoder = new TextDecoder();
      const output = decoder.decode(stdout).trim();

      if (output) {
        const pid = parseInt(output.split("\n")[0]);
        if (!isNaN(pid) && pid > 0) {
          return pid;
        }
      }
      return null;
    } catch (error) {
      this.log(
        `Error checking port ${port}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
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
    } = {},
  ): Promise<ManagedProcess> {
    if (this.processes.has(id)) {
      throw new Error(`Process with id '${id}' already exists`);
    }

    // Check if port is already in use (if port is specified)
    if (options.port) {
      const existingPid = await this.isPortInUse(options.port);
      if (existingPid) {
        this.log(
          `Port ${options.port} is already in use by PID ${existingPid}`,
        );
        this.log(`Monitoring existing process instead of spawning new one`);

        // Create a managed process entry for the existing process
        const managedProcess: ManagedProcess = {
          id,
          name,
          command: new Deno.Command(Deno.execPath(), {
            args: ["run", "--allow-all", scriptPath, ...args],
            env: {
              ...Deno.env.toObject(),
              ...options.env,
            },
            cwd: options.cwd,
            stdout: "piped",
            stderr: "piped",
          }),
          pid: existingPid,
          startTime: Date.now(),
          restartCount: 0,
          autoRestart: options.autoRestart ?? false,
          status: "running",
        };

        this.processes.set(id, managedProcess);
        this.logSuccess(
          `Monitoring existing process: ${name} (PID: ${existingPid})`,
          { id, pid: existingPid },
        );

        // Monitor the existing process
        this.monitorExistingProcess(managedProcess);

        return managedProcess;
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
    };

    this.processes.set(id, managedProcess);

    try {
      const child = command.spawn();
      managedProcess.child = child;
      managedProcess.pid = child.pid;
      managedProcess.status = "running";

      this.logSuccess(`Process started: ${name} (PID: ${child.pid})`, {
        id,
        pid: child.pid,
      });

      // Monitor process output in background
      this.monitorProcess(managedProcess);

      // Monitor process exit
      this.watchProcessExit(managedProcess);
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
   * Monitor process output
   */
  private async monitorProcess(process: ManagedProcess): Promise<void> {
    if (!process.child) return;

    const decoder = new TextDecoder();

    // Monitor stdout
    (async () => {
      if (!process.child?.stdout) return;
      for await (const chunk of process.child.stdout) {
        const text = decoder.decode(chunk);
        // Check for ready signal
        if (text.includes("SERVER_READY") && process.readyResolver) {
          process.readyResolver();
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
      if (!process.child?.stderr) return;
      for await (const chunk of process.child.stderr) {
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
          await this.handleAddressInUse(process);
        }
      }
    })();
  }

  /**
   * Handle address already in use by finding and monitoring existing process
   */
  private async handleAddressInUse(process: ManagedProcess): Promise<void> {
    const port = this.config.serverPort;
    this.log(`Searching for existing Deno process on port ${port}...`);

    try {
      // Find the process using the port
      const command = new Deno.Command("bash", {
        args: [
          "-c",
          `lsof -ti:${port} -sTCP:LISTEN || netstat -tlnp 2>/dev/null | grep :${port} | awk '{print $7}' | cut -d'/' -f1`,
        ],
        stdout: "piped",
        stderr: "piped",
      });

      const { stdout } = await command.output();
      const decoder = new TextDecoder();
      const output = decoder.decode(stdout).trim();

      if (output) {
        const pid = parseInt(output.split("\n")[0]);
        if (!isNaN(pid)) {
          this.logSuccess(
            `Found existing process with PID ${pid} on port ${port}`,
          );

          // Update process info to monitor the existing process
          process.pid = pid;
          process.status = "running";
          process.child = undefined; // We don't control this process
          process.autoRestart = false; // Disable auto-restart to prevent address conflicts

          // Monitor the existing process
          await this.monitorExistingProcess(process);
          return;
        }
      }

      this.logError(`Could not find process using port ${port}`);
    } catch (error) {
      this.logError(
        `Error finding existing process: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Monitor an existing process that we don't control
   */
  private async monitorExistingProcess(process: ManagedProcess): Promise<void> {
    if (!process.pid) return;

    this.log(
      `Monitoring existing process: ${process.name} (PID: ${process.pid})`,
    );

    // Poll the process to check if it's still alive
    const checkInterval = 5000; // Check every 5 seconds

    const intervalId = setInterval(async () => {
      if (!process.pid || this.shutdownInProgress) {
        clearInterval(intervalId);
        return;
      }

      try {
        // Check if process is still running by checking if we can read /proc/{pid}
        const procPath = `/proc/${process.pid}`;
        await Deno.stat(procPath);
        // Process still exists
      } catch (error) {
        // Process no longer exists
        this.logError(
          `Monitored process ${process.name} (PID: ${process.pid}) has exited`,
        );
        process.status = "stopped";
        clearInterval(intervalId);

        // Auto-restart if enabled
        if (process.autoRestart && !this.shutdownInProgress) {
          this.log(
            `Restarting ${process.name} after monitored process exit...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Spawn a new process
          try {
            const child = process.command.spawn();
            process.child = child;
            process.pid = child.pid;
            process.status = "running";
            process.startTime = Date.now();
            process.restartCount++;

            this.logSuccess(
              `Process restarted: ${process.name} (PID: ${child.pid})`,
            );
            this.monitorProcess(process);
            this.watchProcessExit(process);
          } catch (restartError) {
            this.logError(`Failed to restart process: ${process.name}`, {
              error: restartError instanceof Error
                ? restartError.message
                : String(restartError),
            });
          }
        }
      }
    }, checkInterval);
  }

  /**
   * Watch for process exit and handle restart
   */
  private async watchProcessExit(process: ManagedProcess): Promise<void> {
    if (!process.child) return;

    try {
      const status = await process.child.status;

      if (this.shutdownInProgress) {
        process.status = "stopped";
        return;
      }

      if (status.success) {
        this.log(`Process exited successfully: ${process.name}`, {
          id: process.id,
          code: status.code,
        });
        process.status = "stopped";
      } else {
        this.logError(`Process crashed: ${process.name}`, {
          id: process.id,
          code: status.code,
        });
        process.status = "failed";

        // Auto-restart if enabled
        if (process.autoRestart) {
          process.restartCount++;
          this.log(
            `Restarting process: ${process.name} (attempt ${process.restartCount})`,
            {
              id: process.id,
            },
          );

          // Wait a bit before restarting
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Restart the process
          const child = process.command.spawn();
          process.child = child;
          process.pid = child.pid;
          process.status = "running";
          process.startTime = Date.now();

          this.logSuccess(
            `Process restarted: ${process.name} (PID: ${child.pid})`,
            {
              id: process.id,
              pid: child.pid,
            },
          );

          // Continue monitoring
          this.monitorProcess(process);
          this.watchProcessExit(process);
        }
      }
    } catch (error) {
      this.logError(`Error monitoring process: ${process.name}`, {
        id: process.id,
        error: error instanceof Error ? error.message : String(error),
      });
      process.status = "failed";
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

  private logError(message: string, metadata?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    this.logger.logError(`[${timestamp}] [KERNEL] ${message}`, metadata);
  }

  /**
   * Start the kernel
   */
  async boot(): Promise<void> {
    // Display startup banner
    // NOTE: renderBanner is not part of ILogger interface - using ConsoleStyler directly for now
    // This is acceptable as banners are a specialized formatting concern
    const { ConsoleStyler } = await import(
      "./core/utils/console-styler/mod.ts"
    );
    ConsoleStyler.renderBanner({
      version: this.systemInfo.version,
      buildDate: new Date().toISOString(),
      environment: this.config.environment,
      port: this.config.serverPort,
      author: "Pedro M. Dominguez",
      repository: "https://github.com/grenas405/meta-operating-system",
      description: "Meta Operating System - Process Orchestrator",
      features: [
        "Process Management",
        "Auto-Restart",
        "Process Monitoring",
        "Graceful Shutdown",
      ],
    });

    this.log("Booting Meta-OS Kernel...");
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
      },
    );

    this.logSuccess("Heartbeat monitor started");

    // =========================================================================
    // PROCESS 2: HTTP Configuration Server
    // =========================================================================
    this.log("Starting HTTP configuration server on port 9000...");
    const serverScriptPath = new URL(
      this.config.serverScriptPath,
      import.meta.url,
    ).pathname;

    // Create a ready promise for the HTTP server
    let serverReadyResolver: () => void;
    const serverReadyPromise = new Promise<void>((resolve) => {
      serverReadyResolver = resolve;
    });

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
      },
    );

    // Attach the ready promise to the process
    httpProcess.readyPromise = serverReadyPromise;
    httpProcess.readyResolver = serverReadyResolver!;

    // Wait for HTTP server to be ready
    this.log("Waiting for HTTP server to be ready...");
    await serverReadyPromise;
    this.logSuccess("HTTP server is ready on port 9000");

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
