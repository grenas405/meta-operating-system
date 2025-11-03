// plugins/file-logger.ts
import { Plugin } from "./plugin-interface.ts";
import { LogEntry } from "../core/config.ts";
import { Formatter } from "../core/formatter.ts";

export interface FileLoggerOptions {
  filepath: string;
  format?: "text" | "json";
  maxSize?: number; // Max file size in bytes before rotation
  maxFiles?: number; // Max number of rotated files to keep
}

export class FileLoggerPlugin implements Plugin {
  name = "file-logger";
  version = "1.0.0";

  private currentSize = 0;
  private fileIndex = 0;

  constructor(private options: FileLoggerOptions) {
    this.options.format = options.format || "text";
    this.options.maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
    this.options.maxFiles = options.maxFiles || 5;
  }

  async onInit(): Promise<void> {
    // Ensure log directory exists
    const dir = this.options.filepath.split("/").slice(0, -1).join("/");
    if (dir) {
      try {
        await Deno.mkdir(dir, { recursive: true });
      } catch (error) {
        if (!(error instanceof Deno.errors.AlreadyExists)) {
          throw error;
        }
      }
    }

    // Check current file size
    try {
      const stat = await Deno.stat(this.options.filepath);
      this.currentSize = stat.size;
    } catch {
      // File doesn't exist yet
      this.currentSize = 0;
    }
  }

  async onLog(entry: LogEntry): Promise<void> {
    let content: string;

    if (this.options.format === "json") {
      content = JSON.stringify(entry) + "\n";
    } else {
      const timestamp = Formatter.timestamp(
        entry.timestamp,
        "YYYY-MM-DD HH:mm:ss",
      );
      const level = entry.level.toUpperCase().padEnd(8);
      const message = entry.message;
      const metadata = entry.metadata
        ? ` ${JSON.stringify(entry.metadata)}`
        : "";
      content = `[${timestamp}] ${level} ${message}${metadata}\n`;
    }

    // Check if rotation needed
    if (this.currentSize + content.length > this.options.maxSize!) {
      await this.rotateFile();
    }

    // Append to file
    await Deno.writeTextFile(this.options.filepath, content, { append: true });
    this.currentSize += content.length;
  }

  private async rotateFile(): Promise<void> {
    // Rotate old files
    for (let i = this.options.maxFiles! - 1; i > 0; i--) {
      const oldPath = `${this.options.filepath}.${i}`;
      const newPath = `${this.options.filepath}.${i + 1}`;

      try {
        await Deno.rename(oldPath, newPath);
      } catch {
        // File doesn't exist, continue
      }
    }

    // Move current file to .1
    try {
      await Deno.rename(this.options.filepath, `${this.options.filepath}.1`);
    } catch {
      // File doesn't exist
    }

    this.currentSize = 0;
  }
}
