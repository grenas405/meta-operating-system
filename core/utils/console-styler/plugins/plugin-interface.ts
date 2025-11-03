// plugins/plugin-interface.ts
import { LogEntry, StylerConfig } from "../core/config.ts";

export interface Plugin {
  name: string;
  version: string;

  // Lifecycle hooks
  onInit?(config: StylerConfig): void | Promise<void>;
  onLog?(entry: LogEntry): void | Promise<void>;
  onShutdown?(): void | Promise<void>;

  // Extend functionality
  extendMethods?(): Record<string, Function>;
}
