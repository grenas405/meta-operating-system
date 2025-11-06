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
const DEFAULT_MODE: MonitorModeKey = "ecg";

const MODE_FACTORIES = {
  ecg: createEcgMode,
  compact: createCompactMode,
  service: createServiceMode,
  sparkline: createSparklineMode,
  alerts: createAlertMode,
  raw: createRawMode,
  timeline: createTimelineMode,
  percore: createPerCoreMode,
  stats: createStatsMode,
  aurora: createAuroraMode,
  zen: createZenMode,
  retro: createRetroMode,
  matrix: createMatrixMode,
  quantum: createQuantumMode,
  neural: createNeuralMode,
  tron: createTronMode,
  cyberpunk: createCyberpunkMode,
  cycle: createCycleMode,
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
    "  deno task start                 # Launch default ECG dashboard",
  );
  console.log(
    "  deno run --allow-run --allow-read --allow-env main.ts sparkline",
  );
  console.log(
    "  deno run --allow-run --allow-read --allow-env main.ts --mode alerts",
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

function createEcgMode(): MonitorMode {
  const lifelineAnimator = new LifelineAnimator(60);
  let firstMetric = true;

  return {
    label: "ECG Dashboard",
    description:
      "Full-screen console dashboard with gradient lifeline and alerts.",
    onStart() {
      console.clear();
      ConsoleStyler.renderBanner({
        version: "1.0.0",
        buildDate: new Date().toISOString().split("T")[0],
        environment: "production",
        port: 0,
        author: "Heartbeat Team",
        repository: "https://github.com/yourusername/heartbeat",
        description: "Real-time System Performance Monitor",
        features: [
          "CPU Monitoring",
          "Memory Tracking",
          "Spike Detection",
          "Leak Detection",
        ],
      });

      ConsoleStyler.logInfo(
        "Compiling Rust monitor (this may take a moment)...",
      );
      console.log("");
    },
    async onMetrics(metrics) {
      if (firstMetric) {
        ConsoleStyler.logSuccess("Monitor started successfully!");
        await delay(1000);
        firstMetric = false;
      }
      renderDashboard(metrics);
    },
  };

  function renderDashboard(metrics: SystemMetrics): void {
    const date = formatClockTime(metrics.timestamp);

    console.clear();

    ConsoleStyler.logSection(
      "💓 Heartbeat System Monitor",
      "brightCyan",
      "heavy",
    );

    const lifeline = lifelineAnimator.renderGradientLifeline(
      metrics.cpu_usage_percent,
      metrics.memory_usage_percent,
    );
    console.log(`   ${lifeline}`);

    const heart = lifelineAnimator.renderPulsingHeart(
      metrics.cpu_usage_percent,
      metrics.memory_usage_percent,
    );
    console.log(`   ${heart}  System Vitals\n`);

    if (metrics.cpu_spike_detected || metrics.memory_leak_suspected) {
      const alerts: string[] = [];
      if (metrics.cpu_spike_detected) {
        alerts.push(
          "🚨 CPU SPIKE DETECTED - Usage significantly above baseline",
        );
      }
      if (metrics.memory_leak_suspected) {
        alerts.push("🚨 MEMORY LEAK SUSPECTED - Usage growing abnormally");
      }
      ConsoleStyler.logBox(alerts, "⚠️  CRITICAL ALERTS", "brightRed");
      console.log("");
    }

    const cpuColor = chooseCpuColor(metrics.cpu_usage_percent);

    ConsoleStyler.logSection("🖥️  CPU Metrics", cpuColor);
    ConsoleStyler.logCustom(
      `Overall CPU Usage: ${metrics.cpu_usage_percent.toFixed(2)}%`,
      "📊",
      cpuColor,
    );

    const coresPerRow = 4;
    const coreRows: string[] = [];
    for (let i = 0; i < metrics.cpu_cores.length; i += coresPerRow) {
      const rowCores = metrics.cpu_cores.slice(i, i + coresPerRow);
      const coreDisplay = rowCores
        .map((core) => {
          const coreColor = core.usage_percent > 80
            ? ConsoleStyler.colors256.brightRed
            : core.usage_percent > 60
            ? ConsoleStyler.colors256.orange
            : ConsoleStyler.colors256.brightGreen;
          return `${coreColor}Core ${core.core_id}: ${
            core.usage_percent.toFixed(1)
          }%${ConsoleStyler.colors.reset}`;
        })
        .join("  ");
      coreRows.push(`   ${coreDisplay}`);
    }
    coreRows.forEach((row) => console.log(row));
    console.log("");

    const memColor = chooseMemoryColor(metrics.memory_usage_percent);

    ConsoleStyler.logSection("💾 Memory Metrics", memColor);

    const memUsedGB = (metrics.memory_used_mb / 1024).toFixed(2);
    const memTotalGB = (metrics.memory_total_mb / 1024).toFixed(2);
    const memAvailableGB = (metrics.memory_available_mb / 1024).toFixed(2);

    ConsoleStyler.logCustom(
      `Used: ${memUsedGB} GB / ${memTotalGB} GB (${
        metrics.memory_usage_percent.toFixed(2)
      }%)`,
      "📊",
      memColor,
    );
    ConsoleStyler.logInfo(
      `Available: ${memAvailableGB} GB | Free: ${
        (metrics.memory_free_mb / 1024).toFixed(2)
      } GB`,
    );

    ConsoleStyler.logProgress(
      metrics.memory_used_mb,
      metrics.memory_total_mb,
      "Memory Usage",
    );
    console.log("");

    if (metrics.swap_total_mb > 0) {
      const swapUsagePercent = (metrics.swap_used_mb / metrics.swap_total_mb) *
        100;
      const swapColor = swapUsagePercent > 50 ? "warning" : "info";
      ConsoleStyler.logCustom(
        `Swap: ${metrics.swap_used_mb} MB / ${metrics.swap_total_mb} MB (${
          swapUsagePercent.toFixed(2)
        }%)`,
        "💿",
        swapColor,
      );
      console.log("");
    }

    ConsoleStyler.logCustom(`Last Updated: ${date}`, "⏰", "dim");
    console.log("");
  }
}

function createServiceMode(): MonitorMode {
  const lifelineAnimator = new LifelineAnimator(40);
  let quoteIndex = 0;
  let metricsCount = 0;
  const METRICS_BETWEEN_QUOTES = 20;

  return {
    label: "Service Log",
    description: "Minimal log-friendly output for services and journald.",
    onStart() {
      const now = new Date().toISOString();
      console.log(`[${now}] 💓 Heartbeat service starting...`);
      console.log(`[${now}] 📡 Monitoring system vitals...`);
      console.log(`[${now}] 💭 "${GENESIS_QUOTES[0]}"\n`);
    },
    onMetrics(metrics) {
      const status = getStatusSymbol(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );
      const lifeline = lifelineAnimator.renderGradientLifeline(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );
      const cleanLifeline = ConsoleStyler.stripAnsi
        ? ConsoleStyler.stripAnsi(lifeline)
        : lifeline.replace(/\x1b\[[0-9;]*m/g, "");

      const timestamp = formatTimestamp(metrics.timestamp);
      const cpu = metrics.cpu_usage_percent.toFixed(1);
      const mem = metrics.memory_usage_percent.toFixed(1);

      console.log(
        `[${timestamp}] ${status} ${cleanLifeline} | CPU: ${cpu}% | MEM: ${mem}%`,
      );

      if (metrics.cpu_spike_detected) {
        console.log(`[${timestamp}] ⚠️  ALERT: CPU spike detected (${cpu}%)`);
      }
      if (metrics.memory_leak_suspected) {
        console.log(
          `[${timestamp}] ⚠️  ALERT: Memory leak suspected (${mem}%)`,
        );
      }

      metricsCount++;
      if (metricsCount % METRICS_BETWEEN_QUOTES === 0) {
        console.log(`[${timestamp}] 💭 "${GENESIS_QUOTES[quoteIndex]}"`);
        quoteIndex = (quoteIndex + 1) % GENESIS_QUOTES.length;
      }
    },
  };
}

function createCompactMode(): MonitorMode {
  const lifelineAnimator = new LifelineAnimator(48);

  return {
    label: "Compact Dashboard",
    description: "Compact dashboard that fits nicely in small SSH sessions.",
    onStart() {
      console.clear();
      ConsoleStyler.logSection(
        "💓 Heartbeat Compact Monitor",
        "brightCyan",
        "heavy",
      );
      ConsoleStyler.logInfo(
        "Compact summary view enabled. Press Ctrl+C to exit.\n",
      );
    },
    onMetrics(metrics) {
      console.clear();
      ConsoleStyler.logSection(
        "💓 Heartbeat Compact Monitor",
        "brightCyan",
        "heavy",
      );

      const gradient = lifelineAnimator.renderGradientLifeline(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );
      const heart = lifelineAnimator.renderPulsingHeart(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );

      console.log(`   ${gradient}`);
      console.log(`   ${heart}  Status snapshot\n`);

      const timestamp = formatClockTime(metrics.timestamp);
      const cpuColor = chooseCpuColor(metrics.cpu_usage_percent);
      const memColor = chooseMemoryColor(metrics.memory_usage_percent);

      ConsoleStyler.logCustom(
        `[${timestamp}] CPU ${metrics.cpu_usage_percent.toFixed(1)}% | MEM ${
          metrics.memory_usage_percent.toFixed(1)
        }%`,
        "📊",
        cpuColor,
      );

      ConsoleStyler.logInfo(
        `Used ${formatMemory(metrics.memory_used_mb)} / ${
          formatMemory(metrics.memory_total_mb)
        } | Free ${formatMemory(metrics.memory_free_mb)} | Available ${
          formatMemory(metrics.memory_available_mb)
        }`,
      );

      ConsoleStyler.logProgress(
        metrics.memory_used_mb,
        metrics.memory_total_mb,
        "Memory Usage",
      );
      console.log("");

      if (metrics.swap_total_mb > 0) {
        const swapUsagePercent =
          (metrics.swap_used_mb / metrics.swap_total_mb) * 100;
        const swapDescriptor = `Swap ${metrics.swap_used_mb.toFixed(0)} MB / ${
          metrics.swap_total_mb.toFixed(0)
        } MB (${swapUsagePercent.toFixed(1)}%)`;
        const swapColor = swapUsagePercent > 50 ? "warning" : "info";
        ConsoleStyler.logCustom(swapDescriptor, "💿", swapColor);
        console.log("");
      }

      const topCores = [...metrics.cpu_cores]
        .sort((a, b) => b.usage_percent - a.usage_percent)
        .slice(0, 3);

      if (topCores.length > 0) {
        const coreLine = topCores
          .map((core) => `#${core.core_id}: ${core.usage_percent.toFixed(1)}%`)
          .join("  ");
        ConsoleStyler.logCustom(`Top cores  ${coreLine}`, "🧠", cpuColor);
      }

      console.log("");

      if (metrics.cpu_spike_detected || metrics.memory_leak_suspected) {
        const alerts: string[] = [];
        if (metrics.cpu_spike_detected) {
          alerts.push(
            `🚨 CPU spike detected (${metrics.cpu_usage_percent.toFixed(1)}%)`,
          );
        }
        if (metrics.memory_leak_suspected) {
          alerts.push(
            `🚨 Memory leak suspected (${
              metrics.memory_usage_percent.toFixed(1)
            }%)`,
          );
        }
        ConsoleStyler.logBox(alerts, "⚠️  Active Alerts", "brightRed");
      }
    },
  };
}

function createTimelineMode(): MonitorMode {
  const MAX_HISTORY = 60;
  const cpuHistory: number[] = [];
  const memoryHistory: number[] = [];
  const swapHistory: number[] = [];
  const lifelineAnimator = new LifelineAnimator(36);

  const appendSample = (history: number[], value: number) => {
    history.push(value);
    if (history.length > MAX_HISTORY) {
      history.shift();
    }
  };

  const summarizeHistory = (history: number[]) => {
    if (history.length === 0) {
      return { min: 0, max: 0, avg: 0, last: 0 };
    }
    let min = history[0];
    let max = history[0];
    let total = 0;
    for (const value of history) {
      if (value < min) min = value;
      if (value > max) max = value;
      total += value;
    }
    return {
      min,
      max,
      avg: total / history.length,
      last: history[history.length - 1],
    };
  };

  const renderHistory = (history: number[], colorCode: string) => {
    if (history.length === 0) return "";
    const bars = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
    let line = "";
    for (const value of history) {
      const index = Math.min(
        bars.length - 1,
        Math.max(0, Math.round((value / 100) * (bars.length - 1))),
      );
      line += bars[index];
    }
    const padded = line.padStart(MAX_HISTORY, " ");
    return `${colorCode}${padded}${ConsoleStyler.colors.reset}`;
  };

  return {
    label: "Trend Timeline",
    description:
      "Rolling 60-second timeline with sparklines and summary stats.",
    onStart() {
      console.clear();
      ConsoleStyler.logSection(
        "💓 Heartbeat Timeline Monitor",
        "brightCyan",
        "heavy",
      );
      ConsoleStyler.logInfo(
        "Tracking rolling 60-second CPU, memory, and swap usage trends.\n",
      );
    },
    onMetrics(metrics) {
      appendSample(cpuHistory, metrics.cpu_usage_percent);
      appendSample(memoryHistory, metrics.memory_usage_percent);

      if (metrics.swap_total_mb > 0) {
        const percent = (metrics.swap_used_mb / metrics.swap_total_mb) * 100;
        appendSample(swapHistory, percent);
      } else if (swapHistory.length > 0) {
        swapHistory.length = 0;
      }

      console.clear();

      const timestamp = formatClockTime(metrics.timestamp);
      const lifeline = lifelineAnimator.renderGradientLifeline(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );

      const cpuStats = summarizeHistory(cpuHistory);
      const memoryStats = summarizeHistory(memoryHistory);

      const cpuColorCode = metrics.cpu_usage_percent > 80
        ? ConsoleStyler.colors256.brightRed
        : metrics.cpu_usage_percent > 60
        ? ConsoleStyler.colors256.orange
        : ConsoleStyler.colors256.brightGreen;

      const memoryColorCode = metrics.memory_usage_percent > 85
        ? ConsoleStyler.colors256.brightRed
        : metrics.memory_usage_percent > 70
        ? ConsoleStyler.colors256.orange
        : ConsoleStyler.colors256.brightCyan;

      ConsoleStyler.logSection(
        "💓 Heartbeat Timeline Monitor",
        "brightCyan",
        "heavy",
      );
      ConsoleStyler.logCustom(
        `[${timestamp}] Status ${
          getStatusSymbol(
            metrics.cpu_usage_percent,
            metrics.memory_usage_percent,
          )
        }`,
        "🕒",
        "info",
      );
      console.log(`   ${lifeline}\n`);

      ConsoleStyler.logSection("Trend History", "brightMagenta");
      console.log(
        `   CPU  ${renderHistory(cpuHistory, cpuColorCode)}  now ${
          metrics.cpu_usage_percent.toFixed(1)
        }% | avg ${cpuStats.avg.toFixed(1)}% | min ${
          cpuStats.min.toFixed(1)
        }% | max ${cpuStats.max.toFixed(1)}%`,
      );
      console.log(
        `   MEM  ${renderHistory(memoryHistory, memoryColorCode)}  now ${
          metrics.memory_usage_percent.toFixed(1)
        }% | avg ${memoryStats.avg.toFixed(1)}% | min ${
          memoryStats.min.toFixed(1)
        }% | max ${memoryStats.max.toFixed(1)}%`,
      );

      if (swapHistory.length > 0) {
        const swapStats = summarizeHistory(swapHistory);
        const swapColor = swapStats.last > 50
          ? ConsoleStyler.colors256.orange
          : ConsoleStyler.colors256.brightCyan;
        console.log(
          `   SWP  ${renderHistory(swapHistory, swapColor)}  now ${
            swapStats.last.toFixed(1)
          }% | avg ${swapStats.avg.toFixed(1)}% | max ${
            swapStats.max.toFixed(1)
          }%`,
        );
      }

      console.log("");
      ConsoleStyler.logCustom(
        `Memory ${formatMemory(metrics.memory_used_mb)} used of ${
          formatMemory(metrics.memory_total_mb)
        } (${metrics.memory_usage_percent.toFixed(1)}%)`,
        "💾",
        chooseMemoryColor(metrics.memory_usage_percent),
      );
      if (metrics.swap_total_mb > 0) {
        const swapPercent = (metrics.swap_used_mb / metrics.swap_total_mb) *
          100;
        ConsoleStyler.logCustom(
          `Swap ${metrics.swap_used_mb.toFixed(0)} MB / ${
            metrics.swap_total_mb.toFixed(0)
          } MB (${swapPercent.toFixed(1)}%)`,
          "💿",
          swapPercent > 50 ? "warning" : "info",
        );
      }

      if (metrics.cpu_spike_detected || metrics.memory_leak_suspected) {
        const alerts: string[] = [];
        if (metrics.cpu_spike_detected) {
          alerts.push(
            `CPU spike detected (${metrics.cpu_usage_percent.toFixed(1)}%)`,
          );
        }
        if (metrics.memory_leak_suspected) {
          alerts.push(
            `Memory leak suspected (${
              metrics.memory_usage_percent.toFixed(1)
            }%)`,
          );
        }
        ConsoleStyler.logBox(alerts, "⚠️  Active Alerts", "brightRed");
      }
    },
  };
}

function createPerCoreMode(): MonitorMode {
  const BAR_WIDTH = 20;
  const lifelineAnimator = new LifelineAnimator(32);

  const renderBar = (percent: number) => {
    const capped = Math.max(0, Math.min(100, percent));
    const filled = Math.round((capped / 100) * BAR_WIDTH);
    const fillPart = "█".repeat(filled);
    const emptyPart = "░".repeat(Math.max(0, BAR_WIDTH - filled));
    const color = capped > 85
      ? ConsoleStyler.colors256.brightRed
      : capped > 70
      ? ConsoleStyler.colors256.orange
      : capped > 50
      ? ConsoleStyler.colors256.yellow
      : ConsoleStyler.colors256.brightGreen;
    return `${color}${fillPart}${ConsoleStyler.colors.reset}${ConsoleStyler.colors.dim}${emptyPart}${ConsoleStyler.colors.reset}`;
  };

  return {
    label: "Per-Core Heatmap",
    description: "Detailed per-core heatmap bars with utilization summary.",
    onStart() {
      console.clear();
      ConsoleStyler.logSection(
        "💓 Heartbeat Per-Core Monitor",
        "brightCyan",
        "heavy",
      );
      ConsoleStyler.logInfo(
        "Rendering per-core usage heatmap. Press Ctrl+C to exit.\n",
      );
    },
    onMetrics(metrics) {
      console.clear();
      const timestamp = formatClockTime(metrics.timestamp);
      const status = getStatusSymbol(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );

      ConsoleStyler.logSection(
        "💓 Heartbeat Per-Core Monitor",
        "brightCyan",
        "heavy",
      );
      const headline = lifelineAnimator.render(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );
      console.log(`   ${headline}`);
      ConsoleStyler.logCustom(
        `[${timestamp}] ${status} CPU ${
          metrics.cpu_usage_percent.toFixed(1)
        }% | MEM ${metrics.memory_usage_percent.toFixed(1)}%`,
        "📊",
        chooseCpuColor(metrics.cpu_usage_percent),
      );
      ConsoleStyler.logProgress(
        metrics.memory_used_mb,
        metrics.memory_total_mb,
        "Memory Usage",
      );
      console.log("");

      ConsoleStyler.logSection("CPU Core Heatmap", "brightMagenta");

      const cores = [...metrics.cpu_cores].sort((a, b) =>
        a.core_id - b.core_id
      );
      for (const core of cores) {
        const bar = renderBar(core.usage_percent);
        const label = `Core ${core.core_id.toString().padStart(2, " ")}`;
        console.log(
          `   ${label} ${bar} ${
            core.usage_percent.toFixed(1).padStart(6, " ")
          }%`,
        );
      }

      console.log("");

      const topCores = [...cores]
        .sort((a, b) => b.usage_percent - a.usage_percent)
        .slice(0, 3);
      if (topCores.length > 0) {
        const highlights = topCores
          .map((core) => `#${core.core_id}: ${core.usage_percent.toFixed(1)}%`)
          .join(" | ");
        ConsoleStyler.logCustom(
          `Top cores ${highlights}`,
          "🔥",
          topCores[0].usage_percent > 80 ? "warning" : "info",
        );
      }

      if (metrics.cpu_spike_detected || metrics.memory_leak_suspected) {
        console.log("");
        const alerts: string[] = [];
        if (metrics.cpu_spike_detected) {
          alerts.push(
            `CPU spike detected (${metrics.cpu_usage_percent.toFixed(1)}%)`,
          );
        }
        if (metrics.memory_leak_suspected) {
          alerts.push(
            `Memory leak suspected (${
              metrics.memory_usage_percent.toFixed(1)
            }%)`,
          );
        }
        ConsoleStyler.logBox(alerts, "⚠️  Active Alerts", "brightRed");
      }

      if (metrics.swap_total_mb > 0) {
        console.log("");
        const swapPercent = (metrics.swap_used_mb / metrics.swap_total_mb) *
          100;
        ConsoleStyler.logCustom(
          `Swap usage ${metrics.swap_used_mb.toFixed(0)} MB / ${
            metrics.swap_total_mb.toFixed(0)
          } MB (${swapPercent.toFixed(1)}%)`,
          "💿",
          swapPercent > 50 ? "warning" : "info",
        );
      }
    },
  };
}

function createStatsMode(): MonitorMode {
  const MAX_SAMPLES = 120;
  const cpuSamples: number[] = [];
  const memorySamples: number[] = [];
  const swapSamples: number[] = [];
  let cpuSpikeCount = 0;
  let memoryLeakCount = 0;
  let previousCpu: number | undefined;
  let previousMem: number | undefined;
  const lifelineAnimator = new LifelineAnimator(28);

  const appendSample = (history: number[], value: number) => {
    history.push(value);
    if (history.length > MAX_SAMPLES) {
      history.shift();
    }
  };

  const summarize = (history: number[]) => {
    if (history.length === 0) {
      return { min: 0, max: 0, avg: 0 };
    }
    let min = history[0];
    let max = history[0];
    let total = 0;
    for (const value of history) {
      if (value < min) min = value;
      if (value > max) max = value;
      total += value;
    }
    return {
      min,
      max,
      avg: total / history.length,
    };
  };

  const calculateStdDev = (history: number[]) => {
    if (history.length === 0) return 0;
    const avg = history.reduce((sum, value) => sum + value, 0) / history.length;
    const variance = history.reduce(
      (sum, value) => sum + (value - avg) ** 2,
      0,
    ) / history.length;
    return Math.sqrt(variance);
  };

  const formatDelta = (previous: number | undefined, current: number) => {
    if (previous === undefined) return "↗ +0.0%";
    const delta = current - previous;
    const arrow = delta > 1 ? "↗" : delta < -1 ? "↘" : "→";
    const deltaText = `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
    return `${arrow} ${deltaText}`;
  };

  return {
    label: "Stats Overview",
    description: "Aggregated metrics with trends and anomaly counters.",
    onStart() {
      console.clear();
      ConsoleStyler.logSection(
        "💓 Heartbeat Stats Overview",
        "brightCyan",
        "heavy",
      );
      ConsoleStyler.logInfo(
        "Collecting rolling statistics (up to ~2 minutes of samples).\n",
      );
    },
    onMetrics(metrics) {
      appendSample(cpuSamples, metrics.cpu_usage_percent);
      appendSample(memorySamples, metrics.memory_usage_percent);

      if (metrics.swap_total_mb > 0) {
        appendSample(
          swapSamples,
          (metrics.swap_used_mb / metrics.swap_total_mb) * 100,
        );
      } else if (swapSamples.length > 0) {
        swapSamples.length = 0;
      }

      if (metrics.cpu_spike_detected) cpuSpikeCount++;
      if (metrics.memory_leak_suspected) memoryLeakCount++;

      console.clear();

      const timestamp = formatClockTime(metrics.timestamp);
      const cpuSummary = summarize(cpuSamples);
      const memSummary = summarize(memorySamples);
      const swapSummary = summarize(swapSamples);

      ConsoleStyler.logSection(
        "💓 Heartbeat Stats Overview",
        "brightCyan",
        "heavy",
      );
      ConsoleStyler.logCustom(
        `[${timestamp}] Window ${cpuSamples.length} samples`,
        "🕒",
        "info",
      );

      ConsoleStyler.logCustom(
        `CPU ${metrics.cpu_usage_percent.toFixed(1)}% ${
          formatDelta(previousCpu, metrics.cpu_usage_percent)
        } | avg ${cpuSummary.avg.toFixed(1)}% | min ${
          cpuSummary.min.toFixed(1)
        }% | max ${cpuSummary.max.toFixed(1)}%`,
        "🖥️",
        chooseCpuColor(metrics.cpu_usage_percent),
      );
      ConsoleStyler.logCustom(
        `MEM ${metrics.memory_usage_percent.toFixed(1)}% ${
          formatDelta(previousMem, metrics.memory_usage_percent)
        } | avg ${memSummary.avg.toFixed(1)}% | min ${
          memSummary.min.toFixed(1)
        }% | max ${memSummary.max.toFixed(1)}%`,
        "💾",
        chooseMemoryColor(metrics.memory_usage_percent),
      );

      if (swapSamples.length > 0 && metrics.swap_total_mb > 0) {
        const swapPercent = (metrics.swap_used_mb / metrics.swap_total_mb) *
          100;
        ConsoleStyler.logCustom(
          `SWAP ${swapPercent.toFixed(1)}% | avg ${
            swapSummary.avg.toFixed(1)
          }% | max ${swapSummary.max.toFixed(1)}% (${
            metrics.swap_used_mb.toFixed(0)
          } MB of ${metrics.swap_total_mb.toFixed(0)} MB)`,
          "💿",
          swapSummary.max > 50 ? "warning" : "info",
        );
      }

      console.log("");
      const sparkline = lifelineAnimator.renderSparkline(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );
      ConsoleStyler.logSection("Trend Sparkline", "brightMagenta");
      console.log(`   ${sparkline}`);

      console.log("");
      const cpuStdDev = calculateStdDev(cpuSamples);
      const memStdDev = calculateStdDev(memorySamples);
      const stabilityColor = cpuStdDev > 15 || memStdDev > 15
        ? "warning"
        : "info";
      ConsoleStyler.logCustom(
        `Stability σ CPU ${cpuStdDev.toFixed(1)} | MEM ${memStdDev.toFixed(1)}`,
        "📉",
        stabilityColor,
      );

      console.log("");
      ConsoleStyler.logSection("Anomaly Counters", "brightMagenta");
      const totalAnomalies = cpuSpikeCount + memoryLeakCount;
      ConsoleStyler.logCustom(
        `CPU spikes detected: ${cpuSpikeCount} | Memory leaks suspected: ${memoryLeakCount}`,
        "🚨",
        totalAnomalies > 0 ? "warning" : "success",
      );

      if (metrics.cpu_spike_detected || metrics.memory_leak_suspected) {
        const alerts: string[] = [];
        if (metrics.cpu_spike_detected) {
          alerts.push(
            `CPU spike detected (${metrics.cpu_usage_percent.toFixed(1)}%)`,
          );
        }
        if (metrics.memory_leak_suspected) {
          alerts.push(
            `Memory leak suspected (${
              metrics.memory_usage_percent.toFixed(1)
            }%)`,
          );
        }
        ConsoleStyler.logBox(alerts, "⚠️  Real-time Alerts", "brightRed");
      }

      previousCpu = metrics.cpu_usage_percent;
      previousMem = metrics.memory_usage_percent;
    },
  };
}

function createAuroraMode(): MonitorMode {
  const lifelineAnimator = new LifelineAnimator(54);
  const auroraLayers: string[] = [];
  const GRADIENT_WIDTH = 60;
  const MAX_LAYERS = 4;
  let phase = 0;

  const lerpColor = (
    start: [number, number, number],
    end: [number, number, number],
    t: number,
  ): [number, number, number] => {
    const clamped = Math.max(0, Math.min(1, t));
    const mix = (index: number) =>
      Math.round(start[index] + (end[index] - start[index]) * clamped);
    return [mix(0), mix(1), mix(2)];
  };

  const renderAuroraLine = (
    cpuPercent: number,
    memoryPercent: number,
  ): string => {
    const startColor = lerpColor(
      [18, 105, 196],
      [64, 224, 208],
      memoryPercent / 100,
    );
    const endColor = lerpColor(
      [72, 0, 155],
      [148, 0, 211],
      cpuPercent / 100,
    );
    const gradient = ConsoleStyler.createGradient(
      startColor,
      endColor,
      GRADIENT_WIDTH,
    );
    let line = "";

    for (let i = 0; i < gradient.length; i++) {
      const wave =
        Math.sin((i / gradient.length) * Math.PI * 2 + phase) * 0.55 +
        Math.cos(((i + phase) / gradient.length) * Math.PI) * 0.25;
      const height = Math.max(-1, Math.min(1, wave));
      const char = height > 0.6
        ? "█"
        : height > 0.2
        ? "▓"
        : height > -0.2
        ? "▒"
        : height > -0.6
        ? "░"
        : "·";
      line += `${gradient[i]}${char}${ConsoleStyler.colors.reset}`;
    }

    return line;
  };

  return {
    label: "Aurora Pulse",
    description: "Ambient aurora horizon with flowing gradients.",
    onStart() {
      console.clear();
      ConsoleStyler.logSection("🌌 Aurora Pulse", "brightMagenta", "heavy");
      ConsoleStyler.logInfo(
        "Cosmic skyline engaged. Watch waves respond to system energy.\n",
      );
    },
    onMetrics(metrics) {
      phase += (metrics.cpu_usage_percent / 100) * 0.18 + 0.05;
      const auroraLine = renderAuroraLine(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );

      auroraLayers.unshift(auroraLine);
      if (auroraLayers.length > MAX_LAYERS) {
        auroraLayers.splice(MAX_LAYERS);
      }

      console.clear();
      ConsoleStyler.logSection("🌌 Aurora Pulse", "brightMagenta", "heavy");
      const timestamp = formatClockTime(metrics.timestamp);
      ConsoleStyler.logCustom(
        `[${timestamp}] Orbital ${
          getStatusSymbol(
            metrics.cpu_usage_percent,
            metrics.memory_usage_percent,
          )
        } | CPU ${metrics.cpu_usage_percent.toFixed(1)}% | MEM ${
          metrics.memory_usage_percent.toFixed(1)
        }%`,
        "🛰️",
        chooseCpuColor(metrics.cpu_usage_percent),
      );
      console.log("");

      auroraLayers.forEach((line, index) => {
        const prefix = index === 0 ? "" : ConsoleStyler.colors.dim;
        console.log(`   ${prefix}${line}${ConsoleStyler.colors.reset}`);
      });

      console.log("");
      const lifeline = lifelineAnimator.renderGradientLifeline(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );
      console.log(`   ${lifeline} horizon\n`);

      ConsoleStyler.logCustom(
        `Memory ${formatMemory(metrics.memory_used_mb)} of ${
          formatMemory(metrics.memory_total_mb)
        }`,
        "💾",
        chooseMemoryColor(metrics.memory_usage_percent),
      );

      if (metrics.swap_total_mb > 0) {
        const swapPercent =
          (metrics.swap_used_mb / metrics.swap_total_mb) * 100;
        ConsoleStyler.logCustom(
          `Swap ${metrics.swap_used_mb.toFixed(0)} MB / ${
            metrics.swap_total_mb.toFixed(0)
          } MB (${swapPercent.toFixed(1)}%)`,
          "💿",
          swapPercent > 50 ? "warning" : "info",
        );
      }

      if (metrics.cpu_spike_detected || metrics.memory_leak_suspected) {
        console.log("");
        const alerts: string[] = [];
        if (metrics.cpu_spike_detected) {
          alerts.push(
            `CPU spike detected (${metrics.cpu_usage_percent.toFixed(1)}%)`,
          );
        }
        if (metrics.memory_leak_suspected) {
          alerts.push(
            `Memory anomaly detected (${
              metrics.memory_usage_percent.toFixed(1)
            }%)`,
          );
        }
        ConsoleStyler.logBox(alerts, "⚠️  Aurora Alerts", "brightRed");
      }
    },
  };
}

function createZenMode(): MonitorMode {
  const lifelineAnimator = new LifelineAnimator(32);
  const breatheFrames = [
    "·           ·",
    "  ·       ·  ",
    "   •     •   ",
    "    ●   ●    ",
    "     ● ●     ",
    "      ●      ",
    "     ● ●     ",
    "    ●   ●    ",
    "   •     •   ",
    "  ·       ·  ",
  ];
  const QUOTE_INTERVAL = 60;
  const BALANCE_WIDTH = 21;
  let frame = 0;
  let quoteIndex = 0;
  let currentQuote = GENESIS_QUOTES[0];

  const renderBalance = (cpu: number, mem: number): string => {
    const diff = (cpu - mem) / 100; // -1 to 1
    const half = Math.floor(BALANCE_WIDTH / 2);
    const pointer = Math.max(
      0,
      Math.min(BALANCE_WIDTH - 1, half + Math.round(diff * half)),
    );
    let line = "";
    for (let i = 0; i < BALANCE_WIDTH; i++) {
      if (i === half) {
        line += "│";
      } else if (i === pointer) {
        line += "◉";
      } else {
        line += "·";
      }
    }
    return line;
  };

  return {
    label: "Zen Garden",
    description: "Meditative minimal monitor with rotating mantras.",
    onStart() {
      console.clear();
      ConsoleStyler.logSection("🪷 Zen Garden Monitor", "brightGreen", "heavy");
      ConsoleStyler.logInfo("inhale • exhale • observe\n");
    },
    onMetrics(metrics) {
      frame++;
      if (frame % QUOTE_INTERVAL === 0) {
        quoteIndex = (quoteIndex + 1) % GENESIS_QUOTES.length;
        currentQuote = GENESIS_QUOTES[quoteIndex];
      }

      console.clear();
      ConsoleStyler.logSection("🪷 Zen Garden Monitor", "brightGreen", "heavy");
      const timestamp = formatClockTime(metrics.timestamp);
      const breathe = breatheFrames[frame % breatheFrames.length];
      console.log(
        `   ${ConsoleStyler.colors.dim}${breathe}${ConsoleStyler.colors.reset}`,
      );
      console.log("");

      ConsoleStyler.logCustom(
        `[${timestamp}] CPU ${metrics.cpu_usage_percent.toFixed(1)}% | MEM ${
          metrics.memory_usage_percent.toFixed(1)
        }%`,
        "🌿",
        chooseMemoryColor(metrics.memory_usage_percent),
      );
      console.log(
        `   Balance ${
          ConsoleStyler.colors256.brightGreen
        }${renderBalance(metrics.cpu_usage_percent, metrics.memory_usage_percent)}${
          ConsoleStyler.colors.reset
        }`,
      );
      console.log("");
      console.log(
        `   ${ConsoleStyler.colors.dim}"${currentQuote}"${ConsoleStyler.colors.reset}\n`,
      );

      const lifeline = lifelineAnimator.render(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );
      console.log(`   ${lifeline}`);

      if (metrics.cpu_spike_detected || metrics.memory_leak_suspected) {
        console.log("");
        const alerts: string[] = [];
        if (metrics.cpu_spike_detected) {
          alerts.push(
            `CPU spike detected (${metrics.cpu_usage_percent.toFixed(1)}%)`,
          );
        }
        if (metrics.memory_leak_suspected) {
          alerts.push(
            `Memory leak suspected (${
              metrics.memory_usage_percent.toFixed(1)
            }%)`,
          );
        }
        ConsoleStyler.logBox(alerts, "⚠️  Mindfulness Alerts", "brightRed");
      }
    },
  };
}

function createRetroMode(): MonitorMode {
  const lifelineAnimator = new LifelineAnimator(46);
  const GRID_DEPTH = 6;
  const GRID_WIDTH = 48;
  let frame = 0;

  const createNeonBar = (value: number, color: string): string => {
    const width = 24;
    const clamped = Math.max(0, Math.min(100, value));
    const filled = Math.round((clamped / 100) * width);
    const empty = Math.max(0, width - filled);
    const neon = "▰".repeat(filled);
    const voidSegment = "▱".repeat(empty);
    const emptyPart = empty > 0
      ? `${ConsoleStyler.colors.dim}${voidSegment}${ConsoleStyler.colors.reset}`
      : "";
    return `${color}${neon}${ConsoleStyler.colors.reset}${emptyPart}`;
  };

  return {
    label: "Synthwave Horizon",
    description: "Neon skyline and grid inspired by 80s synthwave.",
    onStart() {
      console.clear();
      ConsoleStyler.logSection("🌅 Synthwave Horizon", "brightMagenta", "heavy");
      ConsoleStyler.logInfo("Neon grid initialized. Ride the waveform.\n");
    },
    onMetrics(metrics) {
      frame++;
      console.clear();
      ConsoleStyler.logSection("🌅 Synthwave Horizon", "brightMagenta", "heavy");
      const timestamp = formatClockTime(metrics.timestamp);
      ConsoleStyler.logCustom(
        `[${timestamp}] CPU ${metrics.cpu_usage_percent.toFixed(1)}% | MEM ${
          metrics.memory_usage_percent.toFixed(1)
        }%`,
        "🎛️",
        chooseCpuColor(metrics.cpu_usage_percent),
      );
      console.log("");

      const skyline = lifelineAnimator.renderGradientLifeline(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );
      console.log(`   ${skyline}`);
      console.log(
        `   ${ConsoleStyler.colors256.brightMagenta}${"═".repeat(58)}${
          ConsoleStyler.colors.reset
        }`,
      );

      ConsoleStyler.logCustom(
        `CPU ${metrics.cpu_usage_percent.toFixed(1)}% ${
          createNeonBar(
            metrics.cpu_usage_percent,
            ConsoleStyler.colors256.brightMagenta,
          )
        }`,
        "🎚️",
        chooseCpuColor(metrics.cpu_usage_percent),
      );
      ConsoleStyler.logCustom(
        `MEM ${metrics.memory_usage_percent.toFixed(1)}% ${
          createNeonBar(
            metrics.memory_usage_percent,
            ConsoleStyler.colors256.cyan,
          )
        }`,
        "💾",
        chooseMemoryColor(metrics.memory_usage_percent),
      );

      if (metrics.swap_total_mb > 0) {
        const swapPercent =
          (metrics.swap_used_mb / metrics.swap_total_mb) * 100;
        ConsoleStyler.logCustom(
          `SWP ${swapPercent.toFixed(1)}% ${
            createNeonBar(
              swapPercent,
              ConsoleStyler.colors256.purple,
            )
          }`,
          "💿",
          swapPercent > 50 ? "warning" : "info",
        );
      }

      console.log("");
      for (let depth = 0; depth < GRID_DEPTH; depth++) {
        const indent = " ".repeat(depth * 2);
        const width = Math.max(8, GRID_WIDTH - depth * 4);
        const shade = depth === 0
          ? ConsoleStyler.colors256.brightMagenta
          : depth < GRID_DEPTH - 2
          ? ConsoleStyler.colors256.purple
          : ConsoleStyler.colors256.deepBlue;
        let line = "";
        for (let i = 0; i < width; i++) {
          line += (i + frame + depth) % 2 === 0 ? "╱" : "╲";
        }
        console.log(`   ${indent}${shade}${line}${ConsoleStyler.colors.reset}`);
      }

      if (metrics.cpu_spike_detected || metrics.memory_leak_suspected) {
        console.log("");
        const alerts: string[] = [];
        if (metrics.cpu_spike_detected) {
          alerts.push(
            `CPU spike detected (${metrics.cpu_usage_percent.toFixed(1)}%)`,
          );
        }
        if (metrics.memory_leak_suspected) {
          alerts.push(
            `Memory surge detected (${
              metrics.memory_usage_percent.toFixed(1)
            }%)`,
          );
        }
        ConsoleStyler.logBox(alerts, "⚠️  Neon Alerts", "brightRed");
      }
    },
  };
}

function createMatrixMode(): MonitorMode {
  const MATRIX_WIDTH = 60;
  const MATRIX_HEIGHT = 12;
  const CHARS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ01234567890";

  interface MatrixColumn {
    chars: string[];
    speeds: number[];
    brightness: number[];
  }

  const columns: MatrixColumn[] = Array.from({ length: MATRIX_WIDTH }, () => ({
    chars: Array(MATRIX_HEIGHT).fill("").map(() =>
      CHARS[Math.floor(Math.random() * CHARS.length)]
    ),
    speeds: Array(MATRIX_HEIGHT).fill(0).map(() => Math.random()),
    brightness: Array(MATRIX_HEIGHT).fill(0).map(() => Math.random()),
  }));

  let frame = 0;

  return {
    label: "Matrix Rain",
    description: "Cascading green characters, The Matrix style.",
    onStart() {
      console.clear();
      ConsoleStyler.logSection("⚡ Matrix Rain", "brightGreen", "heavy");
      ConsoleStyler.logInfo("Wake up, Neo... The matrix has you.\n");
    },
    onMetrics(metrics) {
      frame++;
      const intensity = metrics.cpu_usage_percent / 100;

      // Update matrix columns
      columns.forEach((col) => {
        for (let i = 0; i < MATRIX_HEIGHT; i++) {
          if (Math.random() < 0.05 + intensity * 0.15) {
            col.chars[i] = CHARS[Math.floor(Math.random() * CHARS.length)];
            col.brightness[i] = 1.0;
          } else {
            col.brightness[i] *= 0.85;
          }
        }
      });

      console.clear();
      ConsoleStyler.logSection("⚡ Matrix Rain", "brightGreen", "heavy");
      const timestamp = formatClockTime(metrics.timestamp);

      // Render matrix
      for (let row = 0; row < MATRIX_HEIGHT; row++) {
        let line = "   ";
        for (let col = 0; col < MATRIX_WIDTH; col++) {
          const brightness = columns[col].brightness[row];
          const char = columns[col].chars[row];

          if (brightness > 0.7) {
            line += `${ConsoleStyler.colors256.brightGreen}${char}`;
          } else if (brightness > 0.4) {
            line += `${ConsoleStyler.colors256.green}${char}`;
          } else if (brightness > 0.1) {
            line += `${ConsoleStyler.colors.dim}${ConsoleStyler.colors256.green}${char}`;
          } else {
            line += " ";
          }
        }
        console.log(line + ConsoleStyler.colors.reset);
      }

      console.log("");
      ConsoleStyler.logCustom(
        `[${timestamp}] CPU ${metrics.cpu_usage_percent.toFixed(1)}% | MEM ${
          metrics.memory_usage_percent.toFixed(1)
        }% ${getStatusSymbol(metrics.cpu_usage_percent, metrics.memory_usage_percent)}`,
        "🖥️",
        chooseCpuColor(metrics.cpu_usage_percent),
      );

      ConsoleStyler.logCustom(
        `Memory ${formatMemory(metrics.memory_used_mb)} of ${
          formatMemory(metrics.memory_total_mb)
        }`,
        "💾",
        chooseMemoryColor(metrics.memory_usage_percent),
      );

      if (metrics.cpu_spike_detected || metrics.memory_leak_suspected) {
        console.log("");
        const alerts: string[] = [];
        if (metrics.cpu_spike_detected) {
          alerts.push(`Anomaly detected: CPU spike ${metrics.cpu_usage_percent.toFixed(1)}%`);
        }
        if (metrics.memory_leak_suspected) {
          alerts.push(`Anomaly detected: Memory leak ${metrics.memory_usage_percent.toFixed(1)}%`);
        }
        ConsoleStyler.logBox(alerts, "⚠️  System Anomaly", "brightRed");
      }
    },
  };
}

function createQuantumMode(): MonitorMode {
  const WAVE_WIDTH = 70;
  let phase = 0;
  const waveHistory: string[] = [];
  const MAX_HISTORY = 8;

  const renderWaveFunction = (cpuPercent: number, memPercent: number): string => {
    const amplitude = 0.4 + (cpuPercent / 100) * 0.4;
    const frequency = 1.5 + (memPercent / 100) * 2;
    let wave = "   ";

    for (let x = 0; x < WAVE_WIDTH; x++) {
      const t = x / WAVE_WIDTH;
      const y = Math.sin(t * Math.PI * frequency + phase) * amplitude;
      const collapsed = cpuPercent > 80 || memPercent > 85;

      let char: string;
      let color: string;

      if (collapsed) {
        // Collapsed state (high load) - solid bars
        const height = Math.abs(y);
        if (height > 0.6) {
          char = "█";
          color = ConsoleStyler.colors256.brightRed;
        } else if (height > 0.3) {
          char = "▓";
          color = ConsoleStyler.colors256.orange;
        } else {
          char = "▒";
          color = ConsoleStyler.colors256.lightYellow;
        }
      } else {
        // Superposition state (normal load) - wave characters
        if (y > 0.3) {
          char = "～";
          color = ConsoleStyler.colors256.cyan;
        } else if (y > 0) {
          char = "〜";
          color = ConsoleStyler.colors256.brightCyan;
        } else if (y > -0.3) {
          char = "∿";
          color = ConsoleStyler.colors256.brightBlue;
        } else {
          char = "≈";
          color = ConsoleStyler.colors256.blue;
        }
      }

      wave += `${color}${char}${ConsoleStyler.colors.reset}`;
    }

    return wave;
  };

  return {
    label: "Quantum Superposition",
    description: "Probability wavefunctions collapse under observation.",
    onStart() {
      console.clear();
      ConsoleStyler.logSection("⚛️  Quantum Superposition", "brightCyan", "heavy");
      ConsoleStyler.logInfo("Observing system state... uncertainty collapses.\n");
    },
    onMetrics(metrics) {
      phase += 0.15 + (metrics.cpu_usage_percent / 100) * 0.2;

      const wave = renderWaveFunction(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );

      waveHistory.unshift(wave);
      if (waveHistory.length > MAX_HISTORY) {
        waveHistory.splice(MAX_HISTORY);
      }

      console.clear();
      ConsoleStyler.logSection("⚛️  Quantum Superposition", "brightCyan", "heavy");

      const timestamp = formatClockTime(metrics.timestamp);
      const state = (metrics.cpu_usage_percent > 80 || metrics.memory_usage_percent > 85)
        ? "COLLAPSED"
        : "SUPERPOSITION";

      ConsoleStyler.logCustom(
        `[${timestamp}] State: ${state} | CPU ${metrics.cpu_usage_percent.toFixed(1)}% | MEM ${
          metrics.memory_usage_percent.toFixed(1)
        }%`,
        "📊",
        chooseCpuColor(metrics.cpu_usage_percent),
      );
      console.log("");

      // Render wave history with fade
      waveHistory.forEach((w, index) => {
        const dimness = index === 0 ? "" : ConsoleStyler.colors.dim;
        console.log(`${dimness}${w}${ConsoleStyler.colors.reset}`);
      });

      console.log("");
      ConsoleStyler.logCustom(
        `Quantum State: ${state === "COLLAPSED" ? "Deterministic" : "Probabilistic"}`,
        "⚛️",
        state === "COLLAPSED" ? "warning" : "success",
      );

      ConsoleStyler.logCustom(
        `Memory ${formatMemory(metrics.memory_used_mb)} of ${
          formatMemory(metrics.memory_total_mb)
        }`,
        "💾",
        chooseMemoryColor(metrics.memory_usage_percent),
      );

      if (metrics.cpu_spike_detected || metrics.memory_leak_suspected) {
        console.log("");
        const alerts: string[] = [];
        if (metrics.cpu_spike_detected) {
          alerts.push("Wavefunction collapsed: CPU spike detected");
        }
        if (metrics.memory_leak_suspected) {
          alerts.push("Quantum anomaly: Memory leak suspected");
        }
        ConsoleStyler.logBox(alerts, "⚠️  Quantum Alert", "brightRed");
      }
    },
  };
}

function createNeuralMode(): MonitorMode {
  const NODES_PER_ROW = 8;
  const ROWS = 3;
  let frame = 0;

  interface Node {
    activation: number;
    connections: number[];
  }

  const nodes: Node[][] = Array.from({ length: ROWS }, (_, rowIndex) =>
    Array.from({ length: NODES_PER_ROW }, (_, colIndex) => ({
      activation: Math.random(),
      connections: rowIndex < ROWS - 1
        ? [colIndex - 1, colIndex, colIndex + 1].filter(
            (c) => c >= 0 && c < NODES_PER_ROW,
          )
        : [],
    })),
  );

  return {
    label: "Neural Network",
    description: "Visualize system load as neural activation patterns.",
    onStart() {
      console.clear();
      ConsoleStyler.logSection("🧠 Neural Network", "brightMagenta", "heavy");
      ConsoleStyler.logInfo("Neural pathways initialized. Monitoring activations.\n");
    },
    onMetrics(metrics) {
      frame++;
      const cpuNorm = metrics.cpu_usage_percent / 100;
      const memNorm = metrics.memory_usage_percent / 100;

      // Update node activations based on CPU per core
      const coreCount = metrics.cpu_cores.length || 8;
      nodes.forEach((row, rowIndex) => {
        row.forEach((node, colIndex) => {
          const coreIndex = (rowIndex * NODES_PER_ROW + colIndex) % coreCount;
          const coreUsage = metrics.cpu_cores[coreIndex]?.usage_percent || cpuNorm * 100;

          // Smooth activation with decay
          const targetActivation = coreUsage / 100;
          node.activation = node.activation * 0.7 + targetActivation * 0.3;
        });
      });

      console.clear();
      ConsoleStyler.logSection("🧠 Neural Network", "brightMagenta", "heavy");

      const timestamp = formatClockTime(metrics.timestamp);
      ConsoleStyler.logCustom(
        `[${timestamp}] CPU ${metrics.cpu_usage_percent.toFixed(1)}% | MEM ${
          metrics.memory_usage_percent.toFixed(1)
        }% ${getStatusSymbol(metrics.cpu_usage_percent, metrics.memory_usage_percent)}`,
        "🔬",
        chooseCpuColor(metrics.cpu_usage_percent),
      );
      console.log("");

      // Render neural network
      for (let rowIndex = 0; rowIndex < ROWS; rowIndex++) {
        let nodeLine = "   ";
        const row = nodes[rowIndex];

        row.forEach((node) => {
          const activation = node.activation;
          let nodeChar: string;
          let color: string;

          if (activation > 0.8) {
            nodeChar = "●";
            color = ConsoleStyler.colors256.brightRed;
          } else if (activation > 0.6) {
            nodeChar = "●";
            color = ConsoleStyler.colors256.orange;
          } else if (activation > 0.4) {
            nodeChar = "●";
            color = ConsoleStyler.colors256.lightYellow;
          } else if (activation > 0.2) {
            nodeChar = "◉";
            color = ConsoleStyler.colors256.cyan;
          } else {
            nodeChar = "○";
            color = ConsoleStyler.colors.dim + ConsoleStyler.colors256.cyan;
          }

          nodeLine += `${color}${nodeChar}${ConsoleStyler.colors.reset}     `;
        });

        console.log(nodeLine);

        // Draw connections to next layer
        if (rowIndex < ROWS - 1) {
          const nextRow = nodes[rowIndex + 1];
          let connectionLine = "   ";

          row.forEach((node, colIndex) => {
            const avgNextActivation =
              node.connections.reduce(
                (sum, connIdx) => sum + nextRow[connIdx].activation,
                0,
              ) / (node.connections.length || 1);

            const connectionStrength = (node.activation + avgNextActivation) / 2;
            let connChar: string;
            let color: string;

            if (connectionStrength > 0.6) {
              connChar = "─";
              color = ConsoleStyler.colors256.brightMagenta;
            } else if (connectionStrength > 0.3) {
              connChar = "─";
              color = ConsoleStyler.colors256.purple;
            } else {
              connChar = "·";
              color = ConsoleStyler.colors.dim + ConsoleStyler.colors256.purple;
            }

            connectionLine += `${color}${connChar}${ConsoleStyler.colors.reset}     `;
          });

          console.log(connectionLine);
        }
      }

      console.log("");
      ConsoleStyler.logCustom(
        `Network Activity: ${(cpuNorm * 100).toFixed(1)}% | Cores: ${
          metrics.cpu_cores.length || "N/A"
        }`,
        "⚡",
        chooseCpuColor(metrics.cpu_usage_percent),
      );

      ConsoleStyler.logCustom(
        `Memory ${formatMemory(metrics.memory_used_mb)} of ${
          formatMemory(metrics.memory_total_mb)
        }`,
        "💾",
        chooseMemoryColor(metrics.memory_usage_percent),
      );

      if (metrics.cpu_spike_detected || metrics.memory_leak_suspected) {
        console.log("");
        const alerts: string[] = [];
        if (metrics.cpu_spike_detected) {
          alerts.push("Neural spike detected: CPU overload");
        }
        if (metrics.memory_leak_suspected) {
          alerts.push("Synaptic anomaly: Memory leak");
        }
        ConsoleStyler.logBox(alerts, "⚠️  Neural Alert", "brightRed");
      }
    },
  };
}

function createTronMode(): MonitorMode {
  const GRID_WIDTH = 56;
  const GRID_HEIGHT = 10;
  let frame = 0;
  const lifelineAnimator = new LifelineAnimator(50);

  const renderLightCycle = (position: number, cpuPercent: number): string => {
    const cyclePos = Math.floor(position % GRID_WIDTH);
    let line = "   ";

    for (let i = 0; i < GRID_WIDTH; i++) {
      if (i === cyclePos) {
        const color = cpuPercent > 80
          ? ConsoleStyler.colors256.brightRed
          : cpuPercent > 60
          ? ConsoleStyler.colors256.orange
          : ConsoleStyler.colors256.cyan;
        line += `${color}▶${ConsoleStyler.colors.reset}`;
      } else if (i > cyclePos - 8 && i < cyclePos) {
        const trailColor = ConsoleStyler.colors.dim + ConsoleStyler.colors256.cyan;
        line += `${trailColor}─${ConsoleStyler.colors.reset}`;
      } else if (i % 8 === 0) {
        line += `${ConsoleStyler.colors.dim}│${ConsoleStyler.colors.reset}`;
      } else {
        line += " ";
      }
    }

    return line;
  };

  return {
    label: "TRON Grid",
    description: "Light cycles racing through the digital frontier.",
    onStart() {
      console.clear();
      ConsoleStyler.logSection("🏍️  TRON GRID", "brightCyan", "heavy");
      ConsoleStyler.logInfo("Enter the grid. Fight for the users.\n");
    },
    onMetrics(metrics) {
      frame++;
      const speed = 0.5 + (metrics.cpu_usage_percent / 100) * 2;
      const cyclePosition = frame * speed;

      console.clear();
      ConsoleStyler.logSection("🏍️  TRON GRID", "brightCyan", "heavy");

      const timestamp = formatClockTime(metrics.timestamp);
      ConsoleStyler.logCustom(
        `[${timestamp}] GRID STATUS: ${
          getStatusSymbol(
            metrics.cpu_usage_percent,
            metrics.memory_usage_percent,
          )
        } OPERATIONAL`,
        "🎮",
        chooseCpuColor(metrics.cpu_usage_percent),
      );
      console.log("");

      // Top border
      console.log(
        `   ${ConsoleStyler.colors256.cyan}╔${"═".repeat(GRID_WIDTH)}╗${
          ConsoleStyler.colors.reset
        }`,
      );

      // Light cycle
      const cycle = renderLightCycle(cyclePosition, metrics.cpu_usage_percent);
      console.log(
        `   ${ConsoleStyler.colors256.cyan}║${ConsoleStyler.colors.reset}${
          cycle.slice(3)
        }${ConsoleStyler.colors256.cyan}║${ConsoleStyler.colors.reset}`,
      );

      // Grid lines
      for (let row = 0; row < GRID_HEIGHT - 2; row++) {
        let gridLine = "   ";
        const offset = (frame + row * 4) % 16;

        for (let col = 0; col < GRID_WIDTH; col++) {
          if ((col + offset) % 8 === 0) {
            const color = row % 2 === 0
              ? ConsoleStyler.colors256.cyan
              : ConsoleStyler.colors256.blue;
            gridLine += `${ConsoleStyler.colors.dim}${color}│${
              ConsoleStyler.colors.reset
            }`;
          } else {
            gridLine += " ";
          }
        }

        console.log(
          `   ${ConsoleStyler.colors256.cyan}║${ConsoleStyler.colors.reset}${
            gridLine.slice(3)
          }${ConsoleStyler.colors256.cyan}║${ConsoleStyler.colors.reset}`,
        );
      }

      // Lifeline
      const lifeline = lifelineAnimator.renderGradientLifeline(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );
      console.log(
        `   ${ConsoleStyler.colors256.cyan}║${ConsoleStyler.colors.reset} ${lifeline} ${
          ConsoleStyler.colors256.cyan
        }║${ConsoleStyler.colors.reset}`,
      );

      // Bottom border
      console.log(
        `   ${ConsoleStyler.colors256.cyan}╚${"═".repeat(GRID_WIDTH)}╝${
          ConsoleStyler.colors.reset
        }`,
      );

      console.log("");
      ConsoleStyler.logCustom(
        `PROGRAM CPU: ${metrics.cpu_usage_percent.toFixed(1)}% | MEMORY: ${
          metrics.memory_usage_percent.toFixed(1)
        }%`,
        "💿",
        chooseCpuColor(metrics.cpu_usage_percent),
      );

      ConsoleStyler.logCustom(
        `DISK ${formatMemory(metrics.memory_used_mb)} / ${
          formatMemory(metrics.memory_total_mb)
        }`,
        "🔷",
        chooseMemoryColor(metrics.memory_usage_percent),
      );

      if (metrics.cpu_spike_detected || metrics.memory_leak_suspected) {
        console.log("");
        const alerts: string[] = [];
        if (metrics.cpu_spike_detected) {
          alerts.push("GRID BREACH: CPU spike detected");
        }
        if (metrics.memory_leak_suspected) {
          alerts.push("SYSTEM CORRUPTION: Memory leak");
        }
        ConsoleStyler.logBox(alerts, "⚠️  GRID ALERT", "brightRed");
      }
    },
  };
}

function createCyberpunkMode(): MonitorMode {
  const lifelineAnimator = new LifelineAnimator(50);
  let frame = 0;
  const glitchChars = ["▓", "▒", "░", "█", "▀", "▄", "▌", "▐"];

  const renderGlitch = (): string => {
    return glitchChars[Math.floor(Math.random() * glitchChars.length)];
  };

  const renderNeonBar = (percent: number, label: string, color: string): string => {
    const width = 30;
    const filled = Math.floor((percent / 100) * width);
    const empty = width - filled;

    const bar = "━".repeat(filled);
    const emptyBar = "─".repeat(empty);

    return `   ${color}${label}${ConsoleStyler.colors.reset} ${color}${bar}${
      ConsoleStyler.colors.dim
    }${emptyBar}${ConsoleStyler.colors.reset} ${color}${percent.toFixed(1)}%${
      ConsoleStyler.colors.reset
    }`;
  };

  return {
    label: "Cyberpunk HUD",
    description: "Neon-soaked dystopian interface with glitch effects.",
    onStart() {
      console.clear();
      ConsoleStyler.logSection("🌃 CYBERPUNK HUD", "brightMagenta", "heavy");
      ConsoleStyler.logInfo("Night City systems online. Chrome engaged.\n");
    },
    onMetrics(metrics) {
      frame++;
      const shouldGlitch = metrics.cpu_usage_percent > 85 ||
        metrics.memory_usage_percent > 90;

      console.clear();

      // Glitchy header
      if (shouldGlitch && frame % 3 === 0) {
        const glitch = renderGlitch();
        ConsoleStyler.logSection(
          `${glitch} CYBERPUNK HUD ${glitch}`,
          "brightMagenta",
          "heavy",
        );
      } else {
        ConsoleStyler.logSection("🌃 CYBERPUNK HUD", "brightMagenta", "heavy");
      }

      const timestamp = formatClockTime(metrics.timestamp);
      console.log(
        `   ${ConsoleStyler.colors256.brightCyan}[${timestamp}]${
          ConsoleStyler.colors.reset
        } ${ConsoleStyler.colors256.brightMagenta}SYS.STATUS${
          ConsoleStyler.colors.reset
        } ${
          getStatusSymbol(
            metrics.cpu_usage_percent,
            metrics.memory_usage_percent,
          )
        }`,
      );
      console.log("");

      // Neon separator
      console.log(
        `   ${ConsoleStyler.colors256.brightMagenta}${"▬".repeat(60)}${
          ConsoleStyler.colors.reset
        }`,
      );
      console.log("");

      // Lifeline visualization
      const lifeline = lifelineAnimator.renderGradientLifeline(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );
      console.log(`   ${lifeline}`);
      console.log("");

      // Neon bars
      console.log(
        renderNeonBar(
          metrics.cpu_usage_percent,
          "CPU ▸",
          metrics.cpu_usage_percent > 80
            ? ConsoleStyler.colors256.brightRed
            : metrics.cpu_usage_percent > 60
            ? ConsoleStyler.colors256.orange
            : ConsoleStyler.colors256.brightCyan,
        ),
      );

      console.log(
        renderNeonBar(
          metrics.memory_usage_percent,
          "MEM ▸",
          metrics.memory_usage_percent > 85
            ? ConsoleStyler.colors256.brightRed
            : metrics.memory_usage_percent > 70
            ? ConsoleStyler.colors256.orange
            : ConsoleStyler.colors256.brightMagenta,
        ),
      );

      if (metrics.swap_total_mb > 0) {
        const swapPercent =
          (metrics.swap_used_mb / metrics.swap_total_mb) * 100;
        console.log(
          renderNeonBar(
            swapPercent,
            "SWP ▸",
            swapPercent > 50
              ? ConsoleStyler.colors256.orange
              : ConsoleStyler.colors256.purple,
          ),
        );
      }

      console.log("");
      console.log(
        `   ${ConsoleStyler.colors256.brightMagenta}${"▬".repeat(60)}${
          ConsoleStyler.colors.reset
        }`,
      );
      console.log("");

      // Stats
      ConsoleStyler.logCustom(
        `TOTAL.RAM: ${formatMemory(metrics.memory_total_mb)} | USED: ${
          formatMemory(metrics.memory_used_mb)
        }`,
        "💾",
        chooseMemoryColor(metrics.memory_usage_percent),
      );

      if (metrics.cpu_cores && metrics.cpu_cores.length > 0) {
        const coreCount = metrics.cpu_cores.length;
        const avgCore =
          metrics.cpu_cores.reduce((a, b) => a + b.usage_percent, 0) / coreCount;
        ConsoleStyler.logCustom(
          `CORES: ${coreCount} | AVG: ${avgCore.toFixed(1)}%`,
          "⚡",
          "info",
        );
      }

      if (metrics.cpu_spike_detected || metrics.memory_leak_suspected) {
        console.log("");
        const alerts: string[] = [];
        if (metrics.cpu_spike_detected) {
          alerts.push(
            `⚠️  FLATLINE: CPU spike ${metrics.cpu_usage_percent.toFixed(1)}%`,
          );
        }
        if (metrics.memory_leak_suspected) {
          alerts.push(
            `⚠️  CORRUPTED: Memory leak ${
              metrics.memory_usage_percent.toFixed(1)
            }%`,
          );
        }

        console.log(
          `   ${ConsoleStyler.colors256.brightRed}${"▬".repeat(60)}${
            ConsoleStyler.colors.reset
          }`,
        );
        alerts.forEach((alert) => {
          console.log(`   ${ConsoleStyler.colors256.brightRed}${alert}${
            ConsoleStyler.colors.reset
          }`);
        });
        console.log(
          `   ${ConsoleStyler.colors256.brightRed}${"▬".repeat(60)}${
            ConsoleStyler.colors.reset
          }`,
        );
      }
    },
  };
}

function createCycleMode(): MonitorMode {
  const SWITCH_INTERVAL_MS = 5 * 60 * 1000;
  type CycleModeKey = Exclude<MonitorModeKey, "cycle">;
  const sequence = (Object.keys(MODE_FACTORIES) as MonitorModeKey[])
    .filter((key): key is CycleModeKey => key !== "cycle");

  if (sequence.length === 0) {
    return {
      label: "Mode Carousel",
      description: "Loops through every mode every 5 minutes.",
      onStart() {
        ConsoleStyler.logWarning(
          "No monitor modes available to rotate through.",
        );
      },
      onMetrics(metrics) {
        console.log(JSON.stringify(metrics));
      },
    };
  }

  const modeCache = new Map<CycleModeKey, MonitorMode>();
  const ensureMode = (key: CycleModeKey) => {
    if (!modeCache.has(key)) {
      modeCache.set(key, MODE_FACTORIES[key]());
    }
    return modeCache.get(key)!;
  };

  let currentIndex = 0;
  let currentModeKey = sequence[currentIndex];
  let currentMode = ensureMode(currentModeKey);
  let lastSwitch = Date.now();

  const switchTo = async (
    nextIndex: number,
    metrics?: SystemMetrics,
  ) => {
    currentIndex = nextIndex % sequence.length;
    currentModeKey = sequence[currentIndex];
    currentMode = ensureMode(currentModeKey);
    lastSwitch = Date.now();
    console.clear();
    await currentMode.onStart?.();
    if (currentModeKey === "raw") {
      ConsoleStyler.logInfo("Raw stream active. Next mode in 5 minutes.");
    }
    if (metrics) {
      await currentMode.onMetrics(metrics);
    }
  };

  return {
    label: "Mode Carousel",
    description: "Loops through every mode every 5 minutes.",
    async onStart() {
      ConsoleStyler.logSection("🔄 Mode Carousel", "brightMagenta", "heavy");
      ConsoleStyler.logInfo(
        `Cycling through ${sequence.length} modes. Switching every 5 minutes.\n`,
      );
      await currentMode.onStart?.();
    },
    async onMetrics(metrics) {
      const now = Date.now();
      if (now - lastSwitch >= SWITCH_INTERVAL_MS) {
        const nextIndex = (currentIndex + 1) % sequence.length;
        await switchTo(nextIndex, metrics);
        return;
      }
      await currentMode.onMetrics(metrics);
    },
  };
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

function createSparklineMode(): MonitorMode {
  const lifelineAnimator = new LifelineAnimator(30);

  return {
    label: "Sparkline Stream",
    description: "Single-line sparkline output for piping and dashboards.",
    onStart() {
      ConsoleStyler.logInfo(
        "Sparkline stream started. Output is optimized for piping to logs or status bars.",
      );
    },
    onMetrics(metrics) {
      const timestamp = formatTimestamp(metrics.timestamp);
      const sparkline = lifelineAnimator.renderSparkline(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );
      const status = getStatusSymbol(
        metrics.cpu_usage_percent,
        metrics.memory_usage_percent,
      );

      const cpu = metrics.cpu_usage_percent.toFixed(1).padStart(5);
      const mem = metrics.memory_usage_percent.toFixed(1).padStart(5);
      const swap = metrics.swap_total_mb > 0
        ? `${metrics.swap_used_mb.toFixed(0)}/${
          metrics.swap_total_mb.toFixed(0)
        }MB`
        : "0/0MB";

      console.log(
        `[${timestamp}] ${status} ${sparkline} CPU:${cpu}% MEM:${mem}% SWAP:${swap}`,
      );
    },
  };
}

function createAlertMode(): MonitorMode {
  const lifelineAnimator = new LifelineAnimator(10);
  let healthyCounter = 0;
  let firstMetric = true;
  const HEARTBEAT_INTERVAL = 30;

  return {
    label: "Alert Watch",
    description: "Alert-focused mode with periodic healthy heartbeats.",
    onStart() {
      ConsoleStyler.logSection(
        "Heartbeat Alert Watch",
        "brightMagenta",
        "heavy",
      );
      ConsoleStyler.logInfo(
        "Alerts will surface immediately. Healthy pings emitted every 30 samples.\n",
      );
    },
    onMetrics(metrics) {
      const timestamp = formatTimestamp(metrics.timestamp);

      if (firstMetric) {
        ConsoleStyler.logSuccess(
          `[${timestamp}] ✅ Metrics stream established`,
        );
        firstMetric = false;
      }

      if (metrics.cpu_spike_detected || metrics.memory_leak_suspected) {
        const alerts: string[] = [];
        if (metrics.cpu_spike_detected) {
          alerts.push(
            `CPU spike detected (${metrics.cpu_usage_percent.toFixed(1)}%)`,
          );
        }
        if (metrics.memory_leak_suspected) {
          alerts.push(
            `Memory leak suspected (${
              metrics.memory_usage_percent.toFixed(1)
            }%)`,
          );
        }
        ConsoleStyler.logBox(alerts, `⚠️  ALERT ${timestamp}`, "brightRed");
        healthyCounter = 0;
        return;
      }

      healthyCounter++;
      if (healthyCounter >= HEARTBEAT_INTERVAL) {
        const heart = lifelineAnimator.renderPulsingHeart(
          metrics.cpu_usage_percent,
          metrics.memory_usage_percent,
        );
        ConsoleStyler.logSuccess(
          `[${timestamp}] ${heart} Stable | CPU ${
            metrics.cpu_usage_percent.toFixed(1)
          }% | MEM ${metrics.memory_usage_percent.toFixed(1)}%`,
        );
        healthyCounter = 0;
      }
    },
  };
}

function createRawMode(): MonitorMode {
  return {
    label: "Raw JSON",
    description: "Pass-through JSON metrics for scripting and integrations.",
    onStart() {
      ConsoleStyler.logInfo("Streaming raw JSON metrics. Ctrl+C to exit.\n");
    },
    onMetrics(metrics) {
      console.log(JSON.stringify(metrics));
    },
  };
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
