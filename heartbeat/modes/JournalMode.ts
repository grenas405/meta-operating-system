// ==============================================================================
// Journal Mode
// ------------------------------------------------------------------------------
// Systemd-style journal log output
// ==============================================================================

import { ColorSystem } from "@pedromdominguez/genesis-trace";
import type { ILogger } from "../../core/interfaces/ILogger.ts";
import type { SystemMetrics } from "../types/SystemMetrics.ts";
import type { ISystemInfo } from "../adapters/interfaces.ts";
import type { HeartbeatConfig, AlertThresholds } from "../config/HeartbeatConfig.ts";
import { getOverallSeverity } from "../config/HeartbeatConfig.ts";
import type { MonitorMode, ProcessStatus } from "./types.ts";
import { DenoSystemInfo } from "../adapters/DenoAdapters.ts";
import { formatMemory } from "./WindowMode.ts";

// ==============================================================================
// Severity Level Types
// ==============================================================================

type JournalSeverity = "info" | "notice" | "warning";
type SeverityColor = "brightGreen" | "orange" | "brightRed" | "brightCyan";

// ==============================================================================
// Journal Timestamp Formatter
// ==============================================================================

export class JournalTimestampFormatter {
  format(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  formatNow(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}

// ==============================================================================
// Severity Calculator
// ==============================================================================

export class SeverityCalculator {
  constructor(private readonly thresholds: AlertThresholds) {}

  calculate(cpuUsage: number, memoryUsage: number): JournalSeverity {
    const severity = getOverallSeverity(cpuUsage, memoryUsage, this.thresholds);
    switch (severity) {
      case "critical": return "warning";
      case "warning": return "notice";
      default: return "info";
    }
  }

  getColor(level: JournalSeverity): SeverityColor {
    switch (level) {
      case "warning": return "brightRed";
      case "notice": return "orange";
      case "info": return "brightGreen";
    }
  }
}

// ==============================================================================
// Journal Line Builder
// ==============================================================================

export class JournalLineBuilder {
  constructor(
    private readonly hostname: string,
    private readonly pid: number,
    private readonly timestampFormatter: JournalTimestampFormatter,
  ) {}

  buildPrefix(timestamp: string): string {
    return `${timestamp} ${this.hostname} heartbeat[${this.pid}]:`;
  }

  buildMetricsLine(
    metrics: SystemMetrics,
    severity: JournalSeverity,
    severityColor: SeverityColor,
  ): string {
    const timestamp = this.timestampFormatter.format(metrics.timestamp);
    const prefix = this.buildPrefix(timestamp);
    const levelTag = severity.toUpperCase().padEnd(7);

    const cpuStr = `cpu=${metrics.cpu_usage_percent.toFixed(1)}%`;
    const memStr = `mem=${metrics.memory_usage_percent.toFixed(1)}%`;
    const memUsedStr = `used=${formatMemory(metrics.memory_used_mb)}`;
    const memTotalStr = `total=${formatMemory(metrics.memory_total_mb)}`;

    return `${prefix} ${ColorSystem.colorize(levelTag, severityColor)} ${cpuStr} ${memStr} ${memUsedStr}/${memTotalStr}`;
  }

  buildAlertLine(timestamp: string, message: string): string {
    const prefix = this.buildPrefix(timestamp);
    return `${prefix} ${ColorSystem.colorize("ALERT  ", "brightRed")} ${message}`;
  }

  buildNoticeLine(timestamp: string, message: string): string {
    const prefix = this.buildPrefix(timestamp);
    return `${prefix} ${ColorSystem.colorize("NOTICE ", "orange")} ${message}`;
  }

  buildServiceLine(message: string, color: SeverityColor): string {
    const timestamp = this.timestampFormatter.formatNow();
    const prefix = this.buildPrefix(timestamp);
    return `${prefix} ${ColorSystem.colorize(message, color)}`;
  }
}

// ==============================================================================
// Journal Output Handler
// ==============================================================================

export class JournalOutputHandler {
  constructor(
    private readonly lineBuilder: JournalLineBuilder,
    private readonly severityCalc: SeverityCalculator,
    private readonly timestampFormatter: JournalTimestampFormatter,
    private readonly thresholds: AlertThresholds,
  ) {}

  outputMetrics(metrics: SystemMetrics): void {
    const severity = this.severityCalc.calculate(
      metrics.cpu_usage_percent,
      metrics.memory_usage_percent,
    );
    const color = this.severityCalc.getColor(severity);

    console.log(this.lineBuilder.buildMetricsLine(metrics, severity, color));

    this.outputAlerts(metrics);
    this.outputSwapNotice(metrics);
  }

  private outputAlerts(metrics: SystemMetrics): void {
    const timestamp = this.timestampFormatter.format(metrics.timestamp);

    if (metrics.cpu_spike_detected) {
      console.log(
        this.lineBuilder.buildAlertLine(
          timestamp,
          `CPU spike detected: ${metrics.cpu_usage_percent.toFixed(1)}% utilization`,
        ),
      );
    }

    if (metrics.memory_leak_suspected) {
      console.log(
        this.lineBuilder.buildAlertLine(
          timestamp,
          `Memory leak suspected: ${metrics.memory_usage_percent.toFixed(1)}% usage trending upward`,
        ),
      );
    }
  }

  private outputSwapNotice(metrics: SystemMetrics): void {
    if (metrics.swap_total_mb > 0 && metrics.swap_used_mb > 0) {
      const swapPercent = (metrics.swap_used_mb / metrics.swap_total_mb) * 100;
      if (swapPercent > this.thresholds.swap.notice) {
        const timestamp = this.timestampFormatter.format(metrics.timestamp);
        console.log(
          this.lineBuilder.buildNoticeLine(
            timestamp,
            `swap=${swapPercent.toFixed(1)}% used=${metrics.swap_used_mb.toFixed(0)}MB`,
          ),
        );
      }
    }
  }

  outputStart(): void {
    console.log(
      this.lineBuilder.buildServiceLine("Started heartbeat monitoring service", "brightGreen"),
    );
  }

  outputShutdown(success: boolean, code: number | null): void {
    const message = success
      ? "Stopped heartbeat monitoring service"
      : `Service failed with exit code ${code}`;
    const color = success ? "brightGreen" : "brightRed";
    console.log(this.lineBuilder.buildServiceLine(message, color));
  }
}

// ==============================================================================
// Journal Mode Dependencies
// ==============================================================================

export interface JournalModeDeps {
  logger: ILogger;
  config: HeartbeatConfig;
  systemInfo?: ISystemInfo;
}

// ==============================================================================
// Journal Mode Factory
// ==============================================================================

export function createJournalMode(deps: JournalModeDeps): MonitorMode {
  const {
    config,
    systemInfo = new DenoSystemInfo(),
  } = deps;

  const hostname = systemInfo.hostname();
  const pid = systemInfo.pid();

  const timestampFormatter = new JournalTimestampFormatter();
  const severityCalc = new SeverityCalculator(config.thresholds);
  const lineBuilder = new JournalLineBuilder(hostname, pid, timestampFormatter);
  const outputHandler = new JournalOutputHandler(
    lineBuilder,
    severityCalc,
    timestampFormatter,
    config.thresholds,
  );

  return {
    label: "Journal Log",
    description: "Systemd-style journal log output to stdout.",

    onStart() {
      outputHandler.outputStart();
    },

    onMetrics(metrics: SystemMetrics) {
      outputHandler.outputMetrics(metrics);
    },

    onShutdown(status: ProcessStatus) {
      outputHandler.outputShutdown(status.success, status.code);
    },
  };
}
