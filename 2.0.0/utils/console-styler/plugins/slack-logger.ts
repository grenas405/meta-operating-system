// plugins/slack-logger.ts
import { Plugin } from "./plugin-interface.ts";
import { LogEntry, LogLevel } from "../core/config.ts";

export interface SlackLoggerOptions {
  webhookUrl: string;
  minLevel?: LogLevel;
  username?: string;
  channel?: string;
  iconEmoji?: string;
}

export class SlackLoggerPlugin implements Plugin {
  name = "slack-logger";
  version = "1.0.0";

  constructor(private options: SlackLoggerOptions) {
    this.options.minLevel = options.minLevel || "error";
    this.options.username = options.username || "Logger Bot";
    this.options.iconEmoji = options.iconEmoji || ":robot_face:";
  }

  async onLog(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) return;

    const color = this.getColor(entry.level);
    const emoji = this.getEmoji(entry.level);

    const payload = {
      username: this.options.username,
      icon_emoji: this.options.iconEmoji,
      channel: this.options.channel,
      attachments: [{
        color,
        title: `${emoji} ${entry.level.toUpperCase()}`,
        text: entry.message,
        fields: entry.metadata
          ? Object.entries(entry.metadata).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true,
          }))
          : [],
        footer: entry.namespace || "Application",
        ts: Math.floor(entry.timestamp.getTime() / 1000),
      }],
    };

    try {
      await fetch(this.options.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Failed to send log to Slack:", error instanceof Error ? error.message : String(error));
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = [
      "debug",
      "info",
      "success",
      "warning",
      "error",
      "critical",
    ];
    const minIndex = levels.indexOf(this.options.minLevel!);
    const levelIndex = levels.indexOf(level);
    return levelIndex >= minIndex;
  }

  private getColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      debug: "#6272a4",
      info: "#3b82f6",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      critical: "#dc2626",
    };
    return colors[level];
  }

  private getEmoji(level: LogLevel): string {
    const emojis: Record<LogLevel, string> = {
      debug: "🔍",
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
      critical: "🚨",
    };
    return emojis[level];
  }
}
