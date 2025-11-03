/**
 * Meta-OS Kernel
 * Runtime orchestrator for managing Deno processes
 * Designed to run as a systemd service with elevated privileges
 * No external dependencies - uses only Deno built-in APIs
 */

import { ConsoleStyler } from "./utils/console-styler/ConsoleStyler.ts";

interface KernelConfig {
  debug: boolean;
  serverPort: number;
  serverHostname: string;
}

interface SystemInfo {
  startTime: number;
  version: string;
  pid: number;
  platform: string;
}

interface ManagedProcess {
  id: string;
  name: string;
  command: Deno.Command;
  child?: Deno.ChildProcess;
  pid?: number;
  startTime: number;
  restartCount: number;
  autoRestart: boolean;
  status: "starting" | "running" | "stopped" | "failed";
}

class Kernel {
  private config: KernelConfig;
  private systemInfo: SystemInfo;
  private processes: Map<string, ManagedProcess> = new Map();
  private shutdownInProgress = false;

  constructor(config: Partial<KernelConfig> = {}) {
    this.config = {
      debug: config.debug ?? Deno.env.get("DEBUG") === "true",
      serverPort: config.serverPort ??
        (Number(Deno.env.get("PORT")) || 8000),
      serverHostname: config.serverHostname ??
        (Deno.env.get("HOSTNAME") || "localhost"),
    };

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

    this.logSuccess("Kernel initialization complete");
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
    } = {},
  ): Promise<ManagedProcess> {
    if (this.processes.has(id)) {
      throw new Error(`Process with id '${id}' already exists`);
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
        // Always display process output
        ConsoleStyler.logInfo(`[${process.name}] ${text.trim()}`);
      }
    })();

    // Monitor stderr
    (async () => {
      if (!process.child?.stderr) return;
      for await (const chunk of process.child.stderr) {
        const text = decoder.decode(chunk);
        ConsoleStyler.logError(`[${process.name}] ${text.trim()}`);
      }
    })();
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
    ConsoleStyler.logInfo(`[${timestamp}] [KERNEL] ${message}`, metadata);
  }

  private logSuccess(
    message: string,
    metadata?: Record<string, unknown>,
  ): void {
    const timestamp = new Date().toISOString();
    ConsoleStyler.logSuccess(`[${timestamp}] [KERNEL] ${message}`, metadata);
  }

  private logError(message: string, metadata?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    ConsoleStyler.logError(`[${timestamp}] [KERNEL] ${message}`, metadata);
  }

  /**
   * Start the kernel
   */
  async boot(): Promise<void> {
    // Display startup banner
    ConsoleStyler.renderBanner({
      version: this.systemInfo.version,
      buildDate: new Date().toISOString(),
      environment: Deno.env.get("DENO_ENV") || "development",
      port: this.config.serverPort,
      author: "Meta-OS Team",
      repository: "github.com/meta-os/meta-operating-system",
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

    // Start the HTTP server process
    const serverScriptPath = new URL("./server.ts", import.meta.url).pathname;
    await this.spawnProcess(
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
      },
    );

    this.logSuccess("Kernel boot complete");

    // Keep the kernel running
    await new Promise(() => {}); // Run forever until signal
  }

  /**
   * Graceful shutdown
   */
  private async shutdown(signal: string): Promise<void> {
    this.shutdownInProgress = true;
    ConsoleStyler.logWarning(
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
