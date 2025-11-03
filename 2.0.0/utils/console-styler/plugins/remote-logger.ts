// plugins/remote-logger.ts
import { Plugin } from "./plugin-interface.ts";
import { LogEntry, LogLevel } from "../core/config.ts";

export interface RemoteLoggerOptions {
  url: string;
  apiKey?: string;
  minLevel?: LogLevel;
  batchSize?: number;
  flushInterval?: number;
}

export class RemoteLoggerPlugin implements Plugin {
  name = "remote-logger";
  version = "1.0.0";

  private buffer: LogEntry[] = [];
  private flushTimer?: number;

  constructor(private options: RemoteLoggerOptions) {
    this.options.minLevel = options.minLevel || "info";
    this.options.batchSize = options.batchSize || 10;
    this.options.flushInterval = options.flushInterval || 5000; // 5 seconds
  }

  onInit(): void {
    // Start periodic flush
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.options.flushInterval);
  }

  async onLog(entry: LogEntry): Promise<void> {
    // Check if should log this level
    if (!this.shouldLog(entry.level)) return;

    this.buffer.push(entry);

    // Flush if buffer is full
    if (this.buffer.length >= this.options.batchSize!) {
      await this.flush();
    }
  }

  async onShutdown(): Promise<void> {
    if (this.flushTimer !== undefined) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "success", "warning", "error", "critical"];
    const minIndex = levels.indexOf(this.options.minLevel!);
    const levelIndex = levels.indexOf(level);
    return levelIndex >= minIndex;
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.options.apiKey) {
        headers["Authorization"] = `Bearer ${this.options.apiKey}`;
      }

      await fetch(this.options.url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          logs: logs.map((entry) => ({
            ...entry,
            timestamp: entry.timestamp.toISOString(),
          })),
        }),
      });
    } catch (error) {
      // Failed to send logs, put them back in buffer
      this.buffer = [...logs, ...this.buffer];
      console.error("Failed to send logs to remote server:", error instanceof Error ? error.message : String(error));
    }
  }
}
