// plugins/json-logger.ts
import { Plugin } from "./plugin-interface.ts";
import { LogEntry } from "../core/config.ts";

export interface JsonLoggerOptions {
  filepath: string;
  pretty?: boolean;
}

export class JsonLoggerPlugin implements Plugin {
  name = "json-logger";
  version = "1.0.0";

  private logs: LogEntry[] = [];

  constructor(private options: JsonLoggerOptions) {
    this.options.pretty = options.pretty ?? false;
  }

  async onInit(): Promise<void> {
    // Ensure directory exists
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

    // Try to load existing logs
    try {
      const content = await Deno.readTextFile(this.options.filepath);
      const data = JSON.parse(content);
      this.logs = data.logs || [];
    } catch {
      // File doesn't exist or is invalid
      this.logs = [];
    }
  }

  async onLog(entry: LogEntry): Promise<void> {
    this.logs.push(entry);

    // Write to file periodically (every 10 logs or on shutdown)
    if (this.logs.length % 10 === 0) {
      await this.flush();
    }
  }

  async onShutdown(): Promise<void> {
    await this.flush();
  }

  private async flush(): Promise<void> {
    const data = {
      version: "1.0.0",
      exportTime: new Date().toISOString(),
      logs: this.logs,
    };

    const content = this.options.pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    await Deno.writeTextFile(this.options.filepath, content);
  }
}
