/**
 * Custom REPL Shell for Meta-OS
 * Interactive command-line interface for kernel management
 */

import { ConsoleStyler } from "./console-styler/mod.ts";
import type { Kernel } from "../kernel.ts";

interface ReplCommand {
  name: string;
  description: string;
  aliases?: string[];
  handler: (args: string[], kernel: Kernel) => Promise<void> | void;
}

export class MetaRepl {
  private kernel: Kernel;
  private commands: Map<string, ReplCommand> = new Map();
  private running = false;
  private history: string[] = [];

  constructor(kernel: Kernel) {
    this.kernel = kernel;
    this.registerDefaultCommands();
  }

  /**
   * Register default built-in commands
   */
  private registerDefaultCommands(): void {
    // Help command
    this.registerCommand({
      name: "help",
      description: "Display available commands",
      aliases: ["h", "?"],
      handler: () => {
        ConsoleStyler.logInfo("\nAvailable commands:");
        const commands = Array.from(this.commands.values());
        for (const cmd of commands) {
          const aliases = cmd.aliases ? ` (${cmd.aliases.join(", ")})` : "";
          ConsoleStyler.logInfo(`  ${cmd.name}${aliases} - ${cmd.description}`);
        }
        ConsoleStyler.logInfo("");
      },
    });

    // Process list command
    this.registerCommand({
      name: "ps",
      description: "List all managed processes",
      aliases: ["processes", "list"],
      handler: () => {
        const processes = this.kernel.listProcesses();
        if (processes.length === 0) {
          ConsoleStyler.logWarning("No managed processes");
          return;
        }

        ConsoleStyler.logInfo("\nManaged Processes:");
        ConsoleStyler.logInfo(
          "ID".padEnd(20) +
            "NAME".padEnd(20) +
            "PID".padEnd(10) +
            "STATUS".padEnd(12) +
            "RESTARTS",
        );
        ConsoleStyler.logInfo("-".repeat(80));

        for (const proc of processes) {
          ConsoleStyler.logInfo(
            proc.id.padEnd(20) +
              proc.name.padEnd(20) +
              String(proc.pid || "N/A").padEnd(10) +
              proc.status.padEnd(12) +
              String(proc.restartCount),
          );
        }
        ConsoleStyler.logInfo("");
      },
    });

    // System info command
    this.registerCommand({
      name: "info",
      description: "Display kernel system information",
      aliases: ["sysinfo", "status"],
      handler: () => {
        const info = this.kernel.getSystemInfo();
        const uptime = this.kernel.getUptime();

        ConsoleStyler.logInfo("\nKernel System Information:");
        ConsoleStyler.logInfo(`  Version:    ${info.version}`);
        ConsoleStyler.logInfo(`  PID:        ${info.pid}`);
        ConsoleStyler.logInfo(`  Platform:   ${info.platform}`);
        ConsoleStyler.logInfo(`  Uptime:     ${this.formatUptime(uptime)}`);
        ConsoleStyler.logInfo(
          `  Start Time: ${new Date(info.startTime).toISOString()}`,
        );
        ConsoleStyler.logInfo("");
      },
    });

    // Kill process command
    this.registerCommand({
      name: "kill",
      description: "Kill a managed process by ID",
      handler: async (args) => {
        if (args.length === 0) {
          ConsoleStyler.logError("Usage: kill <process-id>");
          return;
        }

        const processId = args[0];
        try {
          await this.kernel.killProcess(processId);
          ConsoleStyler.logSuccess(`Process ${processId} killed successfully`);
        } catch (error) {
          ConsoleStyler.logError(
            `Failed to kill process: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      },
    });

    // History command
    this.registerCommand({
      name: "history",
      description: "Show command history",
      handler: () => {
        if (this.history.length === 0) {
          ConsoleStyler.logWarning("No command history");
          return;
        }

        ConsoleStyler.logInfo("\nCommand History:");
        this.history.forEach((cmd, index) => {
          ConsoleStyler.logInfo(`  ${index + 1}: ${cmd}`);
        });
        ConsoleStyler.logInfo("");
      },
    });

    // Clear screen command
    this.registerCommand({
      name: "clear",
      description: "Clear the screen",
      aliases: ["cls"],
      handler: () => {
        console.clear();
      },
    });

    // Eval command (evaluate JavaScript)
    this.registerCommand({
      name: "eval",
      description: "Evaluate JavaScript expression",
      aliases: ["js"],
      handler: (args) => {
        const code = args.join(" ");
        if (!code) {
          ConsoleStyler.logError("Usage: eval <javascript-code>");
          return;
        }

        try {
          // Make kernel available in eval context
          const result = eval(`(function(kernel) { return ${code}; })`)(
            this.kernel,
          );
          ConsoleStyler.logSuccess("Result:");
          ConsoleStyler.logInfo(result);
        } catch (error) {
          ConsoleStyler.logError(
            `Evaluation error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      },
    });

    // Exit command
    this.registerCommand({
      name: "exit",
      description: "Exit the REPL (kernel continues running)",
      aliases: ["quit", "q"],
      handler: () => {
        const kernelPid = this.kernel.getSystemInfo().pid;
        ConsoleStyler.logWarning("Exiting REPL... (Kernel continues running)");
        ConsoleStyler.logInfo(`To re-enter: Send signal to PID ${kernelPid}`);
        ConsoleStyler.logInfo("To stop kernel: Press CTRL+C");
        this.running = false;
      },
    });

    // Shutdown command
    this.registerCommand({
      name: "shutdown",
      description: "Shutdown the kernel and all processes",
      handler: () => {
        ConsoleStyler.logWarning("Shutting down kernel...");
        Deno.exit(0);
      },
    });
  }

  /**
   * Register a custom command
   */
  registerCommand(command: ReplCommand): void {
    this.commands.set(command.name, command);

    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.commands.set(alias, command);
      }
    }
  }

  /**
   * Format uptime in human-readable format
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(" ");
  }

  /**
   * Process a command line input
   */
  private async processCommand(line: string): Promise<void> {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Add to history
    this.history.push(trimmed);

    // Parse command and arguments
    const parts = trimmed.split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Find and execute command
    const command = this.commands.get(commandName);
    if (command) {
      try {
        await command.handler(args, this.kernel);
      } catch (error) {
        ConsoleStyler.logError(
          `Command error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    } else {
      ConsoleStyler.logError(`Unknown command: ${commandName}`);
      ConsoleStyler.logInfo("Type 'help' for available commands");
    }
  }

  /**
   * Display welcome message
   */
  private displayWelcome(): void {
    ConsoleStyler.logInfo("");
    ConsoleStyler.logSuccess(
      "╔═══════════════════════════════════════════════╗",
    );
    ConsoleStyler.logSuccess(
      "║      Meta-OS REPL Shell - Interactive Mode    ║",
    );
    ConsoleStyler.logSuccess(
      "╚═══════════════════════════════════════════════╝",
    );
    ConsoleStyler.logInfo("");
    ConsoleStyler.logInfo("Type 'help' for available commands");
    ConsoleStyler.logInfo("Type 'exit' to leave REPL (kernel keeps running)");
    ConsoleStyler.logInfo("Press CTRL+C to shutdown the kernel");
    ConsoleStyler.logInfo("");
  }

  /**
   * Start the REPL
   */
  async start(): Promise<void> {
    this.running = true;
    this.displayWelcome();

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    // Set stdin to raw mode for better input handling
    Deno.stdin.setRaw(false);

    while (this.running) {
      // Display prompt
      await Deno.stdout.write(encoder.encode("meta-os> "));

      // Read input
      const buffer = new Uint8Array(1024);
      const n = await Deno.stdin.read(buffer);

      if (n === null) {
        // EOF reached
        break;
      }

      const input = decoder.decode(buffer.subarray(0, n)).trim();

      // Process the command
      await this.processCommand(input);
    }

    ConsoleStyler.logInfo("REPL session ended");
  }
}
