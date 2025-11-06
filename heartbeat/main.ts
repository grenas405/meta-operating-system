import { BoxRenderer, ColorSystem, ConsoleStyler } from "../core/utils/console-styler/mod.ts";
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
const DEFAULT_MODE: MonitorModeKey = "window";

const MODE_FACTORIES = {
  window: createWindowMode,
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

function printModeList(): void {
  ConsoleStyler.logSection("Available Monitor Modes", "brightCyan", "heavy");
  for (
    const [key, factory] of Object.entries(MODE_FACTORIES) as Array<
      [MonitorModeKey, () => MonitorMode]
    >
  ) {
    const mode = factory();
    console.log(`- ${key.padEnd(9)} ${mode.description}`);
  }
}

function printHelp(): void {
  ConsoleStyler.logSection("Heartbeat Monitor CLI", "brightCyan", "heavy");
  console.log(
    "Usage: deno run --allow-run --allow-read --allow-env main.ts [options]",
  );
  console.log(
    "       deno run --allow-run --allow-read --allow-env main.ts [mode]\n",
  );

  ConsoleStyler.logInfo("Options:");
  console.log("  -m, --mode <mode>   Select monitor mode");
  console.log("  -l, --list          Show available modes");
  console.log("  -h, --help          Show this help message\n");

  ConsoleStyler.logInfo("Modes:");
  for (
    const [key, factory] of Object.entries(MODE_FACTORIES) as Array<
      [MonitorModeKey, () => MonitorMode]
    >
  ) {
    const mode = factory();
    console.log(`  ${key.padEnd(9)} ${mode.description}`);
  }
  console.log("");

  ConsoleStyler.logInfo("Examples:");
  console.log(
    "  deno task start                 # Launch window mode monitor",
  );
  console.log(
    "  deno run --allow-run --allow-read --allow-env main.ts window",
  );
  console.log(
    "  deno run --allow-run --allow-read --allow-env main.ts --mode window",
  );
  console.log("");
}

async function pumpStderr(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<void> {
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      const text = STDERR_DECODER.decode(value);
      const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
      for (const line of lines) {
        ConsoleStyler.logWarning("Monitor stderr", { message: line });
      }
    }
  } catch (error) {
    ConsoleStyler.logError("Failed to read stderr", { error: String(error) });
  } finally {
    reader.releaseLock();
  }
}

async function runMonitor(modeKey: MonitorModeKey): Promise<void> {
  const factory = MODE_FACTORIES[modeKey];
  const mode = factory();

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
    ? pumpStderr(stderrReader)
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
          ConsoleStyler.logError("Failed to parse metrics", {
            line: line.substring(0, 100),
            error: String(error),
          });
        }
      }
    }
  } catch (error) {
    ConsoleStyler.logCritical("Error reading from monitor", {
      error: String(error),
    });
  } finally {
    stdoutReader.releaseLock();
  }

  const status = await process.status;
  await stderrPump;

  if (!status.success) {
    ConsoleStyler.logError("Monitor process exited with error", {
      code: status.code,
    });
  }

  await mode.onShutdown?.(status);

  if (!status.success) {
    Deno.exit(typeof status.code === "number" ? status.code : 1);
  }
}

function createWindowMode(): MonitorMode {
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
      Deno.stdout.writeSync(encoder.encode("\n💓 Heartbeat Monitor - Window Mode\n"));
      Deno.stdout.writeSync(encoder.encode("Initializing system metrics...\n\n"));
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
        const swapPercent = (metrics.swap_used_mb / metrics.swap_total_mb) * 100;
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
  const options = parseArgs(Deno.args);

  if (options.help) {
    printHelp();
    Deno.exit(0);
  }

  if (options.list) {
    printModeList();
    Deno.exit(0);
  }

  if (options.unknown.length > 0) {
    ConsoleStyler.logWarning("Ignoring unknown arguments", {
      values: options.unknown,
    });
  }

  const modeKey = options.mode ?? DEFAULT_MODE;

  if (!isModeKey(modeKey)) {
    ConsoleStyler.logError("Unknown mode requested", { mode: modeKey });
    printModeList();
    Deno.exit(1);
  }

  await runMonitor(modeKey);
}
