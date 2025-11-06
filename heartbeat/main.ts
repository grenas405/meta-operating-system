import {
  BoxRenderer,
  ColorSystem,
  createConsoleLogger,
} from "../core/utils/console-styler/mod.ts";
import type { ILogger } from "../core/interfaces/ILogger.ts";
import { LifelineAnimator } from "./utils/LifelineAnimator.ts";
import { GENESIS_QUOTES } from "./constants/genesis-quotes.ts";
import type { SystemMetrics } from "./types/SystemMetrics.ts";

interface MonitorMode {
  label: string;
  description: string;
  onStart?: () => void | Promise<void>;
  onMetrics: (metrics: SystemMetrics) => void | Promise<void>;
  onShutdown?: (status: Deno.CommandStatus) => void | Promise<void>;
}

interface CliOptions {
  mode?: MonitorModeKey;
  list: boolean;
  help: boolean;
  unknown: string[];
}

const STDOUT_DECODER = new TextDecoder();
const STDERR_DECODER = new TextDecoder();
const DEFAULT_MODE: MonitorModeKey = "server";

const MODE_FACTORIES = {
  window: (logger: ILogger) => createWindowMode(logger),
  server: (logger: ILogger) => createServerMode(logger),
  journal: (logger: ILogger) => createJournalMode(logger),
} as const;

type MonitorModeKey = keyof typeof MODE_FACTORIES;

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

function formatClockTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString();
}

function formatMemory(megabytes: number): string {
  if (megabytes >= 1024) {
    return `${(megabytes / 1024).toFixed(2)} GB`;
  }
  return `${megabytes.toFixed(0)} MB`;
}

function chooseCpuColor(
  percent: number,
): "brightGreen" | "lightYellow" | "brightRed" {
  if (percent > 80) return "brightRed";
  if (percent > 60) return "lightYellow";
  return "brightGreen";
}

function chooseMemoryColor(
  percent: number,
): "brightGreen" | "orange" | "brightRed" {
  if (percent > 85) return "brightRed";
  if (percent > 70) return "orange";
  return "brightGreen";
}

function getStatusSymbol(cpuUsage: number, memoryUsage: number): string {
  if (cpuUsage > 80 || memoryUsage > 85) return "🔴";
  if (cpuUsage > 60 || memoryUsage > 70) return "🟡";
  return "🟢";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isModeKey(value: string): value is MonitorModeKey {
  return Object.hasOwn(MODE_FACTORIES, value);
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    mode: undefined,
    list: false,
    help: false,
    unknown: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--mode":
      case "-m": {
        const modeValue = args[i + 1];
        if (!modeValue) {
          options.unknown.push(arg);
        } else if (isModeKey(modeValue)) {
          options.mode = modeValue;
          i++;
        } else {
          options.unknown.push(`${arg} ${modeValue}`);
          i++;
        }
        break;
      }
      case "--list":
      case "-l":
        options.list = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        if (!options.mode && isModeKey(arg)) {
          options.mode = arg;
        } else {
          options.unknown.push(arg);
        }
    }
  }

  return options;
}

function printModeList(logger: ILogger): void {
  logger.logSection("Available Monitor Modes", "brightCyan", "heavy");
  for (
    const [key, factory] of Object.entries(MODE_FACTORIES) as Array<
      [MonitorModeKey, (logger: ILogger) => MonitorMode]
    >
  ) {
    const tempLogger = createConsoleLogger();
    const mode = factory(tempLogger);
    console.log(`- ${key.padEnd(9)} ${mode.description}`);
  }
}

function printHelp(logger: ILogger): void {
  logger.logSection("Heartbeat Monitor CLI", "brightCyan", "heavy");
  console.log(
    "Usage: deno run --allow-run --allow-read --allow-env main.ts [options]",
  );
  console.log(
    "       deno run --allow-run --allow-read --allow-env main.ts [mode]\n",
  );

  logger.logInfo("Options:");
  console.log("  -m, --mode <mode>   Select monitor mode");
  console.log("  -l, --list          Show available modes");
  console.log("  -h, --help          Show this help message\n");

  logger.logInfo("Modes:");
  for (
    const [key, factory] of Object.entries(MODE_FACTORIES) as Array<
      [MonitorModeKey, (logger: ILogger) => MonitorMode]
    >
  ) {
    const tempLogger = createConsoleLogger();
    const mode = factory(tempLogger);
    console.log(`  ${key.padEnd(9)} ${mode.description}`);
  }
  console.log("");

  logger.logInfo("Examples:");
  console.log(
    "  deno task start                 # Launch window mode monitor",
  );
  console.log(
    "  deno run --allow-run --allow-read --allow-env main.ts window",
  );
  console.log(
    "  deno run --allow-run --allow-read --allow-env main.ts --mode journal",
  );
  console.log(
    "  deno run --allow-run --allow-read --allow-env main.ts journal",
  );
  console.log("");
}

async function pumpStderr(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  logger: ILogger,
): Promise<void> {
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      const text = STDERR_DECODER.decode(value);
      const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
      for (const line of lines) {
        logger.logWarning("Monitor stderr", { message: line });
      }
    }
  } catch (error) {
    logger.logError("Failed to read stderr", { error: String(error) });
  } finally {
    reader.releaseLock();
  }
}

async function runMonitor(modeKey: MonitorModeKey, logger: ILogger): Promise<void> {
  const factory = MODE_FACTORIES[modeKey];
  const mode = factory(logger);

  await mode.onStart?.();

  // Get the directory where this script is located (heartbeat directory)
  const scriptDir = new URL(".", import.meta.url).pathname;

  const command = new Deno.Command("cargo", {
    args: ["run", "--release", "--quiet"],
    stdout: "piped",
    stderr: "piped",
    cwd: scriptDir,
  });

  const process = command.spawn();
  const stdoutReader = process.stdout.getReader();
  const stderrReader = process.stderr?.getReader();
  const stderrPump = stderrReader
    ? pumpStderr(stderrReader, logger)
    : Promise.resolve();

  try {
    while (true) {
      const { done, value } = await stdoutReader.read();
      if (done) break;
      if (!value) continue;

      const chunk = STDOUT_DECODER.decode(value);
      const lines = chunk.split("\n").filter((line) => line.trim().length > 0);

      for (const line of lines) {
        try {
          const metrics = JSON.parse(line) as SystemMetrics;
          await mode.onMetrics(metrics);
        } catch (error) {
          logger.logError("Failed to parse metrics", {
            line: line.substring(0, 100),
            error: String(error),
          });
        }
      }
    }
  } catch (error) {
    logger.logCritical("Error reading from monitor", {
      error: String(error),
    });
  } finally {
    stdoutReader.releaseLock();
  }

  const status = await process.status;
  await stderrPump;

  if (!status.success) {
    logger.logError("Monitor process exited with error", {
      code: status.code,
    });
  }

  await mode.onShutdown?.(status);

  if (!status.success) {
    Deno.exit(typeof status.code === "number" ? status.code : 1);
  }
}

function createServerMode(logger: ILogger): MonitorMode {
  let heartbeatServer: any = null;
  const LOG_FILE = new URL("./heartbeat.json", import.meta.url).pathname;
  const INTERVAL_MS = 60_000; // 1 minute
  let lastLogTime = 0;
  const metricsBuffer: SystemMetrics[] = [];

  return {
    label: "HTTP Server",
    description: "Serve metrics via HTTP API on port 3000 + log to heartbeat.json.",
    async onStart() {
      // Import and create HeartbeatServer
      const { HeartbeatServer } = await import("./server.ts");
      heartbeatServer = new HeartbeatServer({
        port: 3000,
        logger,
      });

      // Start server in background (non-blocking)
      heartbeatServer.start().catch((error: Error) => {
        logger.logError("Server error", { error: error.message });
      });

      // Wait a bit for server to initialize
      await delay(1000);

      // Log server startup information
      console.log("SERVER_READY");
      logger.logSuccess("Heartbeat server started", {
        port: 3000,
        hostname: "127.0.0.1",
        endpoints: [
          "GET /health",
          "GET /metrics",
        ],
      });
      logger.logSuccess("File logging enabled", {
        file: LOG_FILE,
        interval: "1 minute",
      });
    },
    async onMetrics(metrics) {
      // Update metrics in the server
      if (heartbeatServer) {
        heartbeatServer.updateMetrics(metrics);
      }

      // Add metrics to buffer for file logging
      metricsBuffer.push(metrics);

      // Check if 1 minute has passed
      const now = Date.now();
      if (now - lastLogTime >= INTERVAL_MS) {
        if (metricsBuffer.length > 0) {
          try {
            // Read existing data
            let existingData: SystemMetrics[] = [];
            try {
              const fileContent = await Deno.readTextFile(LOG_FILE);
              existingData = JSON.parse(fileContent);
            } catch {
              // File doesn't exist or is empty, start fresh
            }

            // Append new metrics
            const allMetrics = [...existingData, ...metricsBuffer];

            // Write to file
            await Deno.writeTextFile(
              LOG_FILE,
              JSON.stringify(allMetrics, null, 2),
            );

            logger.logInfo("Metrics logged", {
              count: metricsBuffer.length,
              total: allMetrics.length,
              timestamp: new Date().toISOString(),
            });

            // Clear buffer
            metricsBuffer.length = 0;
            lastLogTime = now;
          } catch (error) {
            logger.logError("Failed to write metrics to file", {
              error: String(error),
            });
          }
        }
      }

      // Silent mode - only log critical alerts
      if (metrics.cpu_spike_detected) {
        logger.logWarning("CPU spike detected", {
          usage: `${metrics.cpu_usage_percent.toFixed(1)}%`,
        });
      }

      if (metrics.memory_leak_suspected) {
        logger.logWarning("Memory leak suspected", {
          usage: `${metrics.memory_usage_percent.toFixed(1)}%`,
        });
      }
    },
    onShutdown() {
      // Write any remaining buffered metrics
      if (metricsBuffer.length > 0) {
        logger.logInfo("Flushing remaining metrics", {
          count: metricsBuffer.length,
        });
      }
      logger.logSuccess("File logging stopped", { file: LOG_FILE });
    },
  };
}

function createJournalMode(logger: ILogger): MonitorMode {
  const hostname = Deno.hostname?.() ?? "localhost";
  let messageCounter = 0;

  const getSeverityLevel = (cpuUsage: number, memoryUsage: number): string => {
    if (cpuUsage > 80 || memoryUsage > 85) return "warning";
    if (cpuUsage > 60 || memoryUsage > 70) return "notice";
    return "info";
  };

  const getSeverityColor = (
    level: string,
  ): "brightRed" | "orange" | "brightGreen" | "brightCyan" => {
    switch (level) {
      case "warning":
        return "brightRed";
      case "notice":
        return "orange";
      case "info":
        return "brightGreen";
      default:
        return "brightCyan";
    }
  };

  const formatJournalTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  return {
    label: "Journal Log",
    description: "Systemd-style journal log output to stdout.",
    onStart() {
      // Print initial journal header
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const timestamp = `${month}-${day} ${hours}:${minutes}:${seconds}`;

      console.log(
        `${timestamp} ${hostname} heartbeat[${Deno.pid}]: ${
          ColorSystem.colorize(
            "Started heartbeat monitoring service",
            "brightGreen",
          )
        }`,
      );
    },
    onMetrics(metrics) {
      messageCounter++;
      const timestamp = formatJournalTimestamp(metrics.timestamp);
      const level = getSeverityLevel(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );
      const levelColor = getSeverityColor(level);
      const levelTag = level.toUpperCase().padEnd(7);

      // Main metrics line
      const cpuStr = `cpu=${metrics.cpu_usage_percent.toFixed(1)}%`;
      const memStr = `mem=${metrics.memory_usage_percent.toFixed(1)}%`;
      const memUsedStr = `used=${formatMemory(metrics.memory_used_mb)}`;
      const memTotalStr = `total=${formatMemory(metrics.memory_total_mb)}`;

      console.log(
        `${timestamp} ${hostname} heartbeat[${Deno.pid}]: ${
          ColorSystem.colorize(levelTag, levelColor)
        } ${cpuStr} ${memStr} ${memUsedStr}/${memTotalStr}`,
      );

      // Alert messages
      if (metrics.cpu_spike_detected) {
        console.log(
          `${timestamp} ${hostname} heartbeat[${Deno.pid}]: ${
            ColorSystem.colorize("ALERT  ", "brightRed")
          } CPU spike detected: ${
            metrics.cpu_usage_percent.toFixed(1)
          }% utilization`,
        );
      }

      if (metrics.memory_leak_suspected) {
        console.log(
          `${timestamp} ${hostname} heartbeat[${Deno.pid}]: ${
            ColorSystem.colorize("ALERT  ", "brightRed")
          } Memory leak suspected: ${
            metrics.memory_usage_percent.toFixed(1)
          }% usage trending upward`,
        );
      }

      // Swap info (only if swap is being used)
      if (metrics.swap_total_mb > 0 && metrics.swap_used_mb > 0) {
        const swapPercent = (metrics.swap_used_mb / metrics.swap_total_mb) *
          100;
        if (swapPercent > 10) {
          console.log(
            `${timestamp} ${hostname} heartbeat[${Deno.pid}]: ${
              ColorSystem.colorize("NOTICE ", "orange")
            } swap=${swapPercent.toFixed(1)}% used=${
              metrics.swap_used_mb.toFixed(0)
            }MB`,
          );
        }
      }
    },
    onShutdown(status) {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const timestamp = `${month}-${day} ${hours}:${minutes}:${seconds}`;

      const exitMessage = status.success
        ? ColorSystem.colorize(
          "Stopped heartbeat monitoring service",
          "brightGreen",
        )
        : ColorSystem.colorize(
          `Service failed with exit code ${status.code}`,
          "brightRed",
        );

      console.log(
        `${timestamp} ${hostname} heartbeat[${Deno.pid}]: ${exitMessage}`,
      );
    },
  };
}

function createWindowMode(logger: ILogger): MonitorMode {
  let windowStartLine = 0;
  let isFirstRender = true;
  const WINDOW_HEIGHT = 13; // Number of lines the window takes

  const moveCursor = (line: number, col: number = 0) => {
    Deno.stdout.writeSync(new TextEncoder().encode(`\x1b[${line};${col}H`));
  };

  const saveCursor = () => {
    Deno.stdout.writeSync(new TextEncoder().encode("\x1b7"));
  };

  const restoreCursor = () => {
    Deno.stdout.writeSync(new TextEncoder().encode("\x1b8"));
  };

  const clearLine = () => {
    Deno.stdout.writeSync(new TextEncoder().encode("\x1b[2K"));
  };

  return {
    label: "Compact Window",
    description: "Non-intrusive metrics window that updates in place.",
    onStart() {
      // Reserve space for the window
      console.log("\n".repeat(WINDOW_HEIGHT));

      // Save initial position
      const encoder = new TextEncoder();
      Deno.stdout.writeSync(
        encoder.encode("\n💓 Heartbeat Monitor - Window Mode\n"),
      );
      Deno.stdout.writeSync(
        encoder.encode("Initializing system metrics...\n\n"),
      );
      windowStartLine = 3;
    },
    onMetrics(metrics) {
      const timestamp = formatClockTime(metrics.timestamp);
      const cpuColor = chooseCpuColor(metrics.cpu_usage_percent);
      const memColor = chooseMemoryColor(metrics.memory_usage_percent);
      const status = getStatusSymbol(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );

      // Build window content
      const content: string[] = [];

      // Header line
      content.push(`${status} ${timestamp} - System Vitals`);
      content.push("");

      // CPU info
      const cpuBar = renderCompactBar(metrics.cpu_usage_percent, 20);
      content.push(
        `${ColorSystem.colorize("CPU:", cpuColor)} ${cpuBar} ${
          ColorSystem.colorize(
            metrics.cpu_usage_percent.toFixed(1) + "%",
            cpuColor,
          )
        }`,
      );

      // Memory info
      const memBar = renderCompactBar(metrics.memory_usage_percent, 20);
      content.push(
        `${ColorSystem.colorize("MEM:", memColor)} ${memBar} ${
          ColorSystem.colorize(
            metrics.memory_usage_percent.toFixed(1) + "%",
            memColor,
          )
        }`,
      );

      // Memory details
      content.push(
        `     ${formatMemory(metrics.memory_used_mb)} / ${
          formatMemory(metrics.memory_total_mb)
        }`,
      );

      // Swap if available
      if (metrics.swap_total_mb > 0) {
        const swapPercent = (metrics.swap_used_mb / metrics.swap_total_mb) *
          100;
        content.push(
          `${ColorSystem.colorize("SWP:", "cyan")} ${
            metrics.swap_used_mb.toFixed(0)
          }MB / ${metrics.swap_total_mb.toFixed(0)}MB`,
        );
      }

      // Alerts
      if (metrics.cpu_spike_detected || metrics.memory_leak_suspected) {
        content.push("");
        if (metrics.cpu_spike_detected) {
          content.push(
            ColorSystem.colorize("⚠️  CPU spike detected!", "brightRed"),
          );
        }
        if (metrics.memory_leak_suspected) {
          content.push(
            ColorSystem.colorize("⚠️  Memory leak suspected!", "brightRed"),
          );
        }
      }

      // Save cursor position
      saveCursor();

      // Move to window start and render
      moveCursor(windowStartLine, 0);

      // Clear the window area
      for (let i = 0; i < WINDOW_HEIGHT; i++) {
        clearLine();
        console.log();
      }

      // Move back to window start
      moveCursor(windowStartLine, 0);

      // Render the box
      BoxRenderer.render(content, {
        style: "rounded",
        padding: 0,
        title: "💓 Heartbeat",
        color: "cyan",
        minWidth: 40,
      });

      // Restore cursor to end
      restoreCursor();
    },
  };
}

function renderCompactBar(percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;

  const color = percent > 80
    ? "brightRed"
    : percent > 60
    ? "orange"
    : "brightGreen";

  const bar = "█".repeat(filled) + "░".repeat(empty);
  return ColorSystem.colorize(bar, color);
}

if (import.meta.main) {
  // Create logger instance for the application
  const logger = createConsoleLogger();

  const options = parseArgs(Deno.args);

  if (options.help) {
    printHelp(logger);
    Deno.exit(0);
  }

  if (options.list) {
    printModeList(logger);
    Deno.exit(0);
  }

  if (options.unknown.length > 0) {
    logger.logWarning("Ignoring unknown arguments", {
      values: options.unknown,
    });
  }

  const modeKey = options.mode ?? DEFAULT_MODE;

  if (!isModeKey(modeKey)) {
    logger.logError("Unknown mode requested", { mode: modeKey });
    printModeList(logger);
    Deno.exit(1);
  }

  await runMonitor(modeKey, logger);
}
