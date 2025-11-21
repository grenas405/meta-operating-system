// ==============================================================================
// Window Mode
// ------------------------------------------------------------------------------
// Compact terminal window with in-place updates
// ==============================================================================

import { BoxRenderer, ColorSystem } from "@pedromdominguez/genesis-trace";
import type { ILogger } from "../../core/interfaces/ILogger.ts";
import type { SystemMetrics } from "../types/SystemMetrics.ts";
import type { ITerminal } from "../adapters/interfaces.ts";
import type { HeartbeatConfig, AlertThresholds } from "../config/HeartbeatConfig.ts";
import { getCpuSeverity, getMemorySeverity, getOverallSeverity } from "../config/HeartbeatConfig.ts";
import type { MonitorMode } from "./types.ts";
import { DenoTerminal } from "../adapters/DenoAdapters.ts";

// ==============================================================================
// Color Mapper
// ==============================================================================

type ColorName = "brightGreen" | "lightYellow" | "orange" | "brightRed" | "cyan";

export class ColorMapper {
  constructor(private readonly thresholds: AlertThresholds) {}

  getCpuColor(percent: number): ColorName {
    const severity = getCpuSeverity(percent, this.thresholds);
    switch (severity) {
      case "critical": return "brightRed";
      case "warning": return "lightYellow";
      default: return "brightGreen";
    }
  }

  getMemoryColor(percent: number): ColorName {
    const severity = getMemorySeverity(percent, this.thresholds);
    switch (severity) {
      case "critical": return "brightRed";
      case "warning": return "orange";
      default: return "brightGreen";
    }
  }

  getBarColor(percent: number): ColorName {
    if (percent > 80) return "brightRed";
    if (percent > 60) return "orange";
    return "brightGreen";
  }
}

// ==============================================================================
// Status Symbol
// ==============================================================================

export function getStatusSymbol(
  cpuPercent: number,
  memoryPercent: number,
  thresholds: AlertThresholds,
): string {
  const severity = getOverallSeverity(cpuPercent, memoryPercent, thresholds);
  switch (severity) {
    case "critical": return "🔴";
    case "warning": return "🟡";
    default: return "🟢";
  }
}

// ==============================================================================
// Progress Bar Renderer
// ==============================================================================

export class ProgressBarRenderer {
  constructor(
    private readonly width: number,
    private readonly colorMapper: ColorMapper,
  ) {}

  render(percent: number): string {
    const filled = Math.round((percent / 100) * this.width);
    const empty = this.width - filled;
    const color = this.colorMapper.getBarColor(percent);
    const bar = "█".repeat(filled) + "░".repeat(empty);
    return ColorSystem.colorize(bar, color);
  }
}

// ==============================================================================
// Memory Formatter
// ==============================================================================

export function formatMemory(megabytes: number): string {
  if (megabytes >= 1024) {
    return `${(megabytes / 1024).toFixed(2)} GB`;
  }
  return `${megabytes.toFixed(0)} MB`;
}

// ==============================================================================
// Clock Time Formatter
// ==============================================================================

export function formatClockTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString();
}

// ==============================================================================
// Terminal Cursor Controller
// ==============================================================================

export class CursorController {
  private encoder = new TextEncoder();

  constructor(private readonly terminal: ITerminal) {}

  moveTo(line: number, col: number = 0): void {
    this.terminal.write(this.encoder.encode(`\x1b[${line};${col}H`));
  }

  save(): void {
    this.terminal.write(this.encoder.encode("\x1b7"));
  }

  restore(): void {
    this.terminal.write(this.encoder.encode("\x1b8"));
  }

  clearLine(): void {
    this.terminal.write(this.encoder.encode("\x1b[2K"));
  }

  clearLines(count: number, startLine: number): void {
    for (let i = 0; i < count; i++) {
      this.moveTo(startLine + i, 0);
      this.clearLine();
    }
  }
}

// ==============================================================================
// Window Content Builder
// ==============================================================================

export class WindowContentBuilder {
  constructor(
    private readonly colorMapper: ColorMapper,
    private readonly progressBar: ProgressBarRenderer,
    private readonly thresholds: AlertThresholds,
  ) {}

  build(metrics: SystemMetrics): string[] {
    const timestamp = formatClockTime(metrics.timestamp);
    const status = getStatusSymbol(
      metrics.cpu_usage_percent,
      metrics.memory_usage_percent,
      this.thresholds,
    );

    const content: string[] = [];

    // Header
    content.push(`${status} ${timestamp} - System Vitals`);
    content.push("");

    // CPU
    const cpuColor = this.colorMapper.getCpuColor(metrics.cpu_usage_percent);
    const cpuBar = this.progressBar.render(metrics.cpu_usage_percent);
    content.push(
      `${ColorSystem.colorize("CPU:", cpuColor)} ${cpuBar} ${
        ColorSystem.colorize(metrics.cpu_usage_percent.toFixed(1) + "%", cpuColor)
      }`,
    );

    // Memory
    const memColor = this.colorMapper.getMemoryColor(metrics.memory_usage_percent);
    const memBar = this.progressBar.render(metrics.memory_usage_percent);
    content.push(
      `${ColorSystem.colorize("MEM:", memColor)} ${memBar} ${
        ColorSystem.colorize(metrics.memory_usage_percent.toFixed(1) + "%", memColor)
      }`,
    );

    // Memory details
    content.push(
      `     ${formatMemory(metrics.memory_used_mb)} / ${formatMemory(metrics.memory_total_mb)}`,
    );

    // Swap
    if (metrics.swap_total_mb > 0) {
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
        content.push(ColorSystem.colorize("⚠️  CPU spike detected!", "brightRed"));
      }
      if (metrics.memory_leak_suspected) {
        content.push(ColorSystem.colorize("⚠️  Memory leak suspected!", "brightRed"));
      }
    }

    return content;
  }
}

// ==============================================================================
// Window Mode Dependencies
// ==============================================================================

export interface WindowModeDeps {
  logger: ILogger;
  config: HeartbeatConfig;
  terminal?: ITerminal;
}

// ==============================================================================
// Window Mode Factory
// ==============================================================================

export function createWindowMode(deps: WindowModeDeps): MonitorMode {
  const {
    config,
    terminal = new DenoTerminal(),
  } = deps;

  const colorMapper = new ColorMapper(config.thresholds);
  const progressBar = new ProgressBarRenderer(config.window.barWidth, colorMapper);
  const contentBuilder = new WindowContentBuilder(colorMapper, progressBar, config.thresholds);
  const cursor = new CursorController(terminal);
  const encoder = new TextEncoder();

  let windowStartLine = 0;

  return {
    label: "Compact Window",
    description: "Non-intrusive metrics window that updates in place.",

    onStart() {
      // Reserve space for the window
      console.log("\n".repeat(config.window.height));

      terminal.write(encoder.encode("\n💓 Heartbeat Monitor - Window Mode\n"));
      terminal.write(encoder.encode("Initializing system metrics...\n\n"));
      windowStartLine = 3;
    },

    onMetrics(metrics: SystemMetrics) {
      const content = contentBuilder.build(metrics);

      cursor.save();
      cursor.moveTo(windowStartLine, 0);
      cursor.clearLines(config.window.height, windowStartLine);
      cursor.moveTo(windowStartLine, 0);

      BoxRenderer.render(content, {
        style: "rounded",
        padding: 0,
        title: "💓 Heartbeat",
        color: "cyan",
        minWidth: config.window.minWidth,
      });

      cursor.restore();
    },
  };
}
