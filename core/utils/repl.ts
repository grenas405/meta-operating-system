/**
 * Futuristic REPL Shell for Meta-OS
 * Advanced interactive command-line interface with modern features
 */

import { ConsoleStyler } from "./console-styler/mod.ts";
import type { Kernel } from "../kernel.ts";
import { manCommand } from "./man.ts";

interface ReplCommand {
  name: string;
  description: string;
  aliases?: string[];
  usage?: string;
  handler: (args: string[], kernel: Kernel) => Promise<void> | void;
}

interface InputState {
  buffer: string;
  cursor: number;
  historyIndex: number;
  suggestionIndex: number;
}

export class MetaRepl {
  private kernel: Kernel;
  private commands: Map<string, ReplCommand> = new Map();
  private running = false;
  private history: string[] = [];
  private inputState: InputState = {
    buffer: "",
    cursor: 0,
    historyIndex: -1,
    suggestionIndex: -1,
  };
  private statusUpdateInterval?: number;
  private showStatusBar = true;

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
        // Use a Set to track unique commands by name to avoid duplicates
        const seen = new Set<string>();
        const commands = Array.from(this.commands.values());
        for (const cmd of commands) {
          if (!seen.has(cmd.name)) {
            seen.add(cmd.name);
            const aliases = cmd.aliases ? ` (${cmd.aliases.join(", ")})` : "";
            ConsoleStyler.logInfo(`  ${cmd.name}${aliases} - ${cmd.description}`);
          }
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

    // Man command (Genesis manual system)
    this.registerCommand({
      name: "man",
      description: "Display Genesis manual pages",
      handler: async (args) => {
        try {
          await manCommand(args);
        } catch (error) {
          ConsoleStyler.logError(
            `Manual error: ${
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

    // Monitor command - live process monitoring
    this.registerCommand({
      name: "monitor",
      description: "Real-time process monitoring dashboard",
      aliases: ["mon", "top"],
      handler: async () => {
        await this.showProcessMonitor();
      },
    });

    // Status bar toggle
    this.registerCommand({
      name: "statusbar",
      description: "Toggle status bar display",
      handler: () => {
        this.showStatusBar = !this.showStatusBar;
        ConsoleStyler.logSuccess(
          `Status bar ${this.showStatusBar ? "enabled" : "disabled"}`,
        );
      },
    });

    // Restart process command
    this.registerCommand({
      name: "restart",
      description: "Restart a managed process by ID",
      handler: async (args) => {
        if (args.length === 0) {
          ConsoleStyler.logError("Usage: restart <process-id>");
          return;
        }

        const processId = args[0];
        try {
          await this.kernel.killProcess(processId);
          ConsoleStyler.logSuccess(`Process ${processId} will auto-restart...`);
        } catch (error) {
          ConsoleStyler.logError(
            `Failed to restart process: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      },
    });

    // Logs command - view process logs
    this.registerCommand({
      name: "logs",
      description: "View logs for a specific process",
      handler: (args) => {
        if (args.length === 0) {
          ConsoleStyler.logError("Usage: logs <process-id>");
          return;
        }

        const processId = args[0];
        const process = this.kernel.getProcessStatus(processId);
        if (!process) {
          ConsoleStyler.logError(`Process ${processId} not found`);
          return;
        }

        ConsoleStyler.logInfo(`\nLogs for ${process.name} (${processId}):`);
        ConsoleStyler.logInfo(`PID: ${process.pid || "N/A"}`);
        ConsoleStyler.logInfo(`Status: ${process.status}`);
        ConsoleStyler.logInfo(`Start Time: ${new Date(process.startTime).toISOString()}`);
        ConsoleStyler.logInfo(`Restart Count: ${process.restartCount}`);
        ConsoleStyler.logInfo("");
      },
    });

    // Inspect command - detailed process info
    this.registerCommand({
      name: "inspect",
      description: "Detailed inspection of a process",
      aliases: ["describe", "show"],
      handler: (args) => {
        if (args.length === 0) {
          ConsoleStyler.logError("Usage: inspect <process-id>");
          return;
        }

        const processId = args[0];
        const process = this.kernel.getProcessStatus(processId);
        if (!process) {
          ConsoleStyler.logError(`Process ${processId} not found`);
          return;
        }

        const uptime = Math.floor((Date.now() - process.startTime) / 1000);

        ConsoleStyler.logInfo("\n╔════════════════════════════════════════╗");
        ConsoleStyler.logInfo("║       Process Inspection Report        ║");
        ConsoleStyler.logInfo("╚════════════════════════════════════════╝");
        ConsoleStyler.logInfo("");
        ConsoleStyler.logInfo(`ID:           ${process.id}`);
        ConsoleStyler.logInfo(`Name:         ${process.name}`);
        ConsoleStyler.logInfo(`PID:          ${process.pid || "N/A"}`);
        ConsoleStyler.logInfo(`Status:       ${process.status}`);
        ConsoleStyler.logInfo(`Auto-Restart: ${process.autoRestart ? "Enabled" : "Disabled"}`);
        ConsoleStyler.logInfo(`Restart Count: ${process.restartCount}`);
        ConsoleStyler.logInfo(`Started:      ${new Date(process.startTime).toISOString()}`);
        ConsoleStyler.logInfo(`Uptime:       ${this.formatUptime(uptime)}`);
        ConsoleStyler.logInfo("");
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
   * Show real-time process monitoring dashboard
   */
  private async showProcessMonitor(): Promise<void> {
    const encoder = new TextEncoder();
    let monitoring = true;

    // Clear screen
    await Deno.stdout.write(encoder.encode(this.CURSOR.clearScreen));
    await Deno.stdout.write(encoder.encode(this.CURSOR.hide));

    // Set up keyboard listener for exit
    const originalRawMode = Deno.stdin.readable;
    Deno.stdin.setRaw(true);

    const renderMonitor = async () => {
      const processes = this.kernel.listProcesses();
      const sysInfo = this.kernel.getSystemInfo();
      const uptime = this.kernel.getUptime();

      let output = this.CURSOR.clearScreen;

      // Header
      output += `${this.COLORS.bgBlue}${this.COLORS.bright} META-OS PROCESS MONITOR ${this.COLORS.reset} `;
      output += `${this.COLORS.cyan}Updated: ${new Date().toLocaleTimeString()}${this.COLORS.reset}`;
      output += `  ${this.COLORS.dim}Press 'q' to exit${this.COLORS.reset}\n\n`;

      // System stats
      output += `${this.COLORS.bright}System Information:${this.COLORS.reset}\n`;
      output += `  Uptime:      ${this.COLORS.cyan}${this.formatUptime(uptime)}${this.COLORS.reset}\n`;
      output += `  PID:         ${this.COLORS.cyan}${sysInfo.pid}${this.COLORS.reset}\n`;
      output += `  Platform:    ${this.COLORS.cyan}${sysInfo.platform}${this.COLORS.reset}\n`;
      output += `  Version:     ${this.COLORS.cyan}${sysInfo.version}${this.COLORS.reset}\n\n`;

      // Process table header
      output += `${this.COLORS.bright}Managed Processes (${processes.length}):${this.COLORS.reset}\n`;
      output += `${this.COLORS.dim}${"─".repeat(100)}${this.COLORS.reset}\n`;
      output += `${this.COLORS.bright}`;
      output += "ID".padEnd(22);
      output += "NAME".padEnd(22);
      output += "PID".padEnd(10);
      output += "STATUS".padEnd(12);
      output += "UPTIME".padEnd(12);
      output += "RESTARTS";
      output += `${this.COLORS.reset}\n`;
      output += `${this.COLORS.dim}${"─".repeat(100)}${this.COLORS.reset}\n`;

      // Process rows
      for (const proc of processes) {
        const uptime = Math.floor((Date.now() - proc.startTime) / 1000);
        const uptimeStr = this.formatUptime(uptime);

        // Color code based on status
        let statusColor = this.COLORS.gray;
        if (proc.status === "running") statusColor = this.COLORS.green;
        else if (proc.status === "failed") statusColor = this.COLORS.red;
        else if (proc.status === "starting") statusColor = this.COLORS.yellow;

        output += proc.id.padEnd(22);
        output += proc.name.padEnd(22);
        output += String(proc.pid || "N/A").padEnd(10);
        output += `${statusColor}${proc.status.padEnd(12)}${this.COLORS.reset}`;
        output += uptimeStr.padEnd(12);
        output += String(proc.restartCount);
        output += "\n";
      }

      output += `${this.COLORS.dim}${"─".repeat(100)}${this.COLORS.reset}\n`;

      // Legend
      output += `\n${this.COLORS.dim}Legend: `;
      output += `${this.COLORS.green}●${this.COLORS.reset} running  `;
      output += `${this.COLORS.yellow}●${this.COLORS.reset} starting  `;
      output += `${this.COLORS.red}●${this.COLORS.reset} failed  `;
      output += `${this.COLORS.gray}●${this.COLORS.reset} stopped${this.COLORS.reset}`;

      await Deno.stdout.write(encoder.encode(output));
    };

    // Initial render
    await renderMonitor();

    // Update loop
    const updateInterval = setInterval(async () => {
      if (monitoring) {
        await renderMonitor();
      }
    }, 1000);

    // Input listener
    try {
      while (monitoring) {
        const buffer = new Uint8Array(16);
        const n = await Deno.stdin.read(buffer);

        if (n === null) break;

        const byte = buffer[0];

        // 'q' or Ctrl+C to exit
        if (byte === 113 || byte === 3) {
          monitoring = false;
          break;
        }
      }
    } finally {
      clearInterval(updateInterval);
      await Deno.stdout.write(encoder.encode(this.CURSOR.show));
      Deno.stdin.setRaw(false);
      console.log("\n");
    }
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
   * ANSI color codes and control sequences
   */
  private readonly COLORS = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    red: "\x1b[31m",
    gray: "\x1b[90m",
    bgBlue: "\x1b[44m",
    bgGreen: "\x1b[42m",
    bgRed: "\x1b[41m",
  };

  private readonly CURSOR = {
    hide: "\x1b[?25l",
    show: "\x1b[?25h",
    up: (n = 1) => `\x1b[${n}A`,
    down: (n = 1) => `\x1b[${n}B`,
    forward: (n = 1) => `\x1b[${n}C`,
    back: (n = 1) => `\x1b[${n}D`,
    toColumn: (n: number) => `\x1b[${n}G`,
    clearLine: "\x1b[2K",
    clearScreen: "\x1b[2J\x1b[H",
    saveCursor: "\x1b[s",
    restoreCursor: "\x1b[u",
  };

  /**
   * Get command suggestions based on input
   */
  private getCommandSuggestions(input: string): string[] {
    if (!input) return [];

    const suggestions: string[] = [];
    const lowerInput = input.toLowerCase();

    for (const [name, cmd] of this.commands) {
      if (name === cmd.name && name.startsWith(lowerInput)) {
        suggestions.push(name);
      }
    }

    return suggestions.sort();
  }

  /**
   * Render the futuristic prompt
   */
  private renderPrompt(): string {
    const sysInfo = this.kernel.getSystemInfo();
    const uptime = this.kernel.getUptime();
    const processes = this.kernel.listProcesses();
    const runningCount = processes.filter(p => p.status === "running").length;

    // Time indicator
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

    // Status indicator (animated)
    const statusChar = runningCount > 0 ? "●" : "○";
    const statusColor = runningCount > 0 ? this.COLORS.green : this.COLORS.gray;

    // Build the prompt
    const parts = [
      `${this.COLORS.dim}[${this.COLORS.cyan}${timeStr}${this.COLORS.dim}]${this.COLORS.reset}`,
      `${statusColor}${statusChar}${this.COLORS.reset}`,
      `${this.COLORS.magenta}meta-os${this.COLORS.reset}`,
      `${this.COLORS.dim}[${this.COLORS.yellow}${runningCount}${this.COLORS.dim} proc]${this.COLORS.reset}`,
      `${this.COLORS.blue}❯${this.COLORS.reset}`,
    ];

    return parts.join(" ") + " ";
  }

  /**
   * Render status bar at the top of the screen
   */
  private renderStatusBar(): string {
    const sysInfo = this.kernel.getSystemInfo();
    const uptime = this.kernel.getUptime();
    const uptimeStr = this.formatUptime(uptime);
    const processes = this.kernel.listProcesses();
    const runningCount = processes.filter(p => p.status === "running").length;
    const totalCount = processes.length;

    const statusParts = [
      `${this.COLORS.bgBlue}${this.COLORS.bright} META-OS v${sysInfo.version} ${this.COLORS.reset}`,
      `${this.COLORS.cyan}⬆ ${uptimeStr}${this.COLORS.reset}`,
      `${this.COLORS.green}◉ ${runningCount}/${totalCount} proc${this.COLORS.reset}`,
      `${this.COLORS.yellow}⚡ PID:${sysInfo.pid}${this.COLORS.reset}`,
      `${this.COLORS.magenta}${sysInfo.platform}${this.COLORS.reset}`,
    ];

    return statusParts.join("  ") + "\n";
  }

  /**
   * Render command suggestions below the input
   */
  private renderSuggestions(suggestions: string[]): string {
    if (suggestions.length === 0) return "";

    const maxSuggestions = 5;
    const displayed = suggestions.slice(0, maxSuggestions);

    let output = `\n${this.COLORS.dim}suggestions: ${this.COLORS.reset}`;
    output += displayed.map((s, i) => {
      const isSelected = i === this.inputState.suggestionIndex;
      if (isSelected) {
        return `${this.COLORS.bgBlue}${this.COLORS.bright} ${s} ${this.COLORS.reset}`;
      }
      return `${this.COLORS.cyan}${s}${this.COLORS.reset}`;
    }).join(`${this.COLORS.dim} | ${this.COLORS.reset}`);

    if (suggestions.length > maxSuggestions) {
      output += ` ${this.COLORS.dim}+${suggestions.length - maxSuggestions} more${this.COLORS.reset}`;
    }

    return output;
  }

  /**
   * Display welcome message with futuristic ASCII art
   */
  private displayWelcome(): void {
    const banner = `
${this.COLORS.cyan}╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ${this.COLORS.bright}███╗   ███╗███████╗████████╗ █████╗       ██████╗ ███████╗${this.COLORS.reset}${this.COLORS.cyan}   ║
║   ${this.COLORS.bright}████╗ ████║██╔════╝╚══██╔══╝██╔══██╗     ██╔═══██╗██╔════╝${this.COLORS.reset}${this.COLORS.cyan}   ║
║   ${this.COLORS.bright}██╔████╔██║█████╗     ██║   ███████║     ██║   ██║███████╗${this.COLORS.reset}${this.COLORS.cyan}   ║
║   ${this.COLORS.bright}██║╚██╔╝██║██╔══╝     ██║   ██╔══██║     ██║   ██║╚════██║${this.COLORS.reset}${this.COLORS.cyan}   ║
║   ${this.COLORS.bright}██║ ╚═╝ ██║███████╗   ██║   ██║  ██║     ╚██████╔╝███████║${this.COLORS.reset}${this.COLORS.cyan}   ║
║   ${this.COLORS.bright}╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝      ╚═════╝ ╚══════╝${this.COLORS.reset}${this.COLORS.cyan}   ║
║                                                           ║
║         ${this.COLORS.magenta}${this.COLORS.bright}◢◤ F U T U R I S T I C   R E P L   S H E L L ◢◤${this.COLORS.reset}${this.COLORS.cyan}         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝${this.COLORS.reset}

${this.COLORS.green}${this.COLORS.bright}Features:${this.COLORS.reset}
  ${this.COLORS.cyan}→${this.COLORS.reset} ${this.COLORS.dim}Arrow keys for history navigation${this.COLORS.reset}
  ${this.COLORS.cyan}→${this.COLORS.reset} ${this.COLORS.dim}Tab for command auto-completion${this.COLORS.reset}
  ${this.COLORS.cyan}→${this.COLORS.reset} ${this.COLORS.dim}Real-time system status display${this.COLORS.reset}
  ${this.COLORS.cyan}→${this.COLORS.reset} ${this.COLORS.dim}Smart command suggestions${this.COLORS.reset}

${this.COLORS.yellow}Commands:${this.COLORS.reset} ${this.COLORS.dim}Type ${this.COLORS.bright}help${this.COLORS.reset}${this.COLORS.dim} for available commands${this.COLORS.reset}
${this.COLORS.yellow}Exit:${this.COLORS.reset} ${this.COLORS.dim}Type ${this.COLORS.bright}exit${this.COLORS.reset}${this.COLORS.dim} to leave REPL (kernel keeps running)${this.COLORS.reset}
${this.COLORS.red}Shutdown:${this.COLORS.reset} ${this.COLORS.dim}Press ${this.COLORS.bright}CTRL+C${this.COLORS.reset}${this.COLORS.dim} to shutdown the kernel${this.COLORS.reset}
`;

    console.log(banner);
  }

  /**
   * Handle keyboard input with special keys
   */
  private async handleKeyPress(
    key: Uint8Array,
    encoder: TextEncoder,
  ): Promise<boolean> {
    const byte = key[0];

    // Handle escape sequences (arrow keys, etc.)
    if (byte === 27 && key.length > 1) {
      // Arrow up
      if (key[1] === 91 && key[2] === 65) {
        this.navigateHistory(-1);
        return false;
      }
      // Arrow down
      if (key[1] === 91 && key[2] === 66) {
        this.navigateHistory(1);
        return false;
      }
      // Arrow left
      if (key[1] === 91 && key[2] === 68) {
        if (this.inputState.cursor > 0) {
          this.inputState.cursor--;
        }
        return false;
      }
      // Arrow right
      if (key[1] === 91 && key[2] === 67) {
        if (this.inputState.cursor < this.inputState.buffer.length) {
          this.inputState.cursor++;
        }
        return false;
      }
    }

    // Tab - auto-complete
    if (byte === 9) {
      this.handleTabCompletion();
      return false;
    }

    // Ctrl+C
    if (byte === 3) {
      await Deno.stdout.write(encoder.encode("\n"));
      this.running = false;
      return true;
    }

    // Enter
    if (byte === 13 || byte === 10) {
      return true;
    }

    // Backspace
    if (byte === 127 || byte === 8) {
      if (this.inputState.cursor > 0) {
        this.inputState.buffer =
          this.inputState.buffer.slice(0, this.inputState.cursor - 1) +
          this.inputState.buffer.slice(this.inputState.cursor);
        this.inputState.cursor--;
      }
      return false;
    }

    // Ctrl+L - clear screen
    if (byte === 12) {
      await Deno.stdout.write(encoder.encode(this.CURSOR.clearScreen));
      this.displayWelcome();
      return false;
    }

    // Ctrl+U - clear line
    if (byte === 21) {
      this.inputState.buffer = "";
      this.inputState.cursor = 0;
      return false;
    }

    // Regular character
    if (byte >= 32 && byte <= 126) {
      const char = String.fromCharCode(byte);
      this.inputState.buffer =
        this.inputState.buffer.slice(0, this.inputState.cursor) +
        char +
        this.inputState.buffer.slice(this.inputState.cursor);
      this.inputState.cursor++;
      return false;
    }

    return false;
  }

  /**
   * Navigate command history
   */
  private navigateHistory(direction: number): void {
    if (this.history.length === 0) return;

    this.inputState.historyIndex += direction;

    if (this.inputState.historyIndex < -1) {
      this.inputState.historyIndex = -1;
    } else if (this.inputState.historyIndex >= this.history.length) {
      this.inputState.historyIndex = this.history.length - 1;
    }

    if (this.inputState.historyIndex === -1) {
      this.inputState.buffer = "";
      this.inputState.cursor = 0;
    } else {
      this.inputState.buffer = this.history[
        this.history.length - 1 - this.inputState.historyIndex
      ];
      this.inputState.cursor = this.inputState.buffer.length;
    }
  }

  /**
   * Handle tab completion
   */
  private handleTabCompletion(): void {
    const suggestions = this.getCommandSuggestions(this.inputState.buffer);
    if (suggestions.length === 1) {
      // Auto-complete
      this.inputState.buffer = suggestions[0] + " ";
      this.inputState.cursor = this.inputState.buffer.length;
    } else if (suggestions.length > 1) {
      // Cycle through suggestions
      this.inputState.suggestionIndex =
        (this.inputState.suggestionIndex + 1) % suggestions.length;
      this.inputState.buffer = suggestions[this.inputState.suggestionIndex];
      this.inputState.cursor = this.inputState.buffer.length;
    }
  }

  /**
   * Render the current input line
   */
  private renderInputLine(): string {
    const prompt = this.renderPrompt();
    const buffer = this.inputState.buffer;
    const suggestions = this.getCommandSuggestions(buffer.split(" ")[0]);

    let output = this.CURSOR.clearLine + "\r" + prompt + buffer;

    // Show suggestion preview (ghost text)
    if (suggestions.length > 0 && buffer.length > 0) {
      const suggestion = suggestions[0];
      if (suggestion.startsWith(buffer)) {
        const ghost = suggestion.slice(buffer.length);
        output += `${this.COLORS.dim}${ghost}${this.COLORS.reset}`;
      }
    }

    // Render suggestions below if multiple
    if (suggestions.length > 1 && buffer.length > 0) {
      output += this.renderSuggestions(suggestions);
      // Move cursor back up
      output += this.CURSOR.up(1);
    }

    // Position cursor
    const cursorPos = prompt.length - this.countAnsiChars(prompt) + this.inputState.cursor;
    output += this.CURSOR.toColumn(cursorPos + 1);

    return output;
  }

  /**
   * Count ANSI escape sequence characters to calculate real cursor position
   */
  private countAnsiChars(str: string): number {
    const ansiRegex = /\x1b\[[0-9;]*[A-Za-z]/g;
    let count = 0;
    let match;
    while ((match = ansiRegex.exec(str)) !== null) {
      count += match[0].length;
    }
    return count;
  }

  /**
   * Start the futuristic REPL
   */
  async start(): Promise<void> {
    this.running = true;

    // Clear screen and display welcome
    await Deno.stdout.write(new TextEncoder().encode(this.CURSOR.clearScreen));
    this.displayWelcome();

    const encoder = new TextEncoder();

    // Set stdin to raw mode for character-by-character input
    Deno.stdin.setRaw(true);

    // Hide cursor during input handling
    await Deno.stdout.write(encoder.encode(this.CURSOR.hide));

    try {
      while (this.running) {
        // Reset input state
        this.inputState = {
          buffer: "",
          cursor: 0,
          historyIndex: -1,
          suggestionIndex: -1,
        };

        // Show status bar if enabled
        if (this.showStatusBar) {
          await Deno.stdout.write(encoder.encode(this.renderStatusBar()));
        }

        // Input loop
        let inputComplete = false;
        while (!inputComplete && this.running) {
          // Render the input line
          await Deno.stdout.write(encoder.encode(this.renderInputLine()));
          await Deno.stdout.write(encoder.encode(this.CURSOR.show));

          // Read a single key
          const buffer = new Uint8Array(16);
          const n = await Deno.stdin.read(buffer);

          if (n === null) {
            // EOF reached
            this.running = false;
            break;
          }

          await Deno.stdout.write(encoder.encode(this.CURSOR.hide));

          const key = buffer.subarray(0, n);
          inputComplete = await this.handleKeyPress(key, encoder);
        }

        if (!this.running) break;

        // Clear suggestions if any
        await Deno.stdout.write(encoder.encode(this.CURSOR.clearLine + "\r\n"));

        // Process the command
        const command = this.inputState.buffer.trim();
        if (command) {
          await this.processCommand(command);
        }

        console.log(); // Add a blank line after output
      }
    } finally {
      // Restore cursor and terminal settings
      await Deno.stdout.write(encoder.encode(this.CURSOR.show));
      Deno.stdin.setRaw(false);
    }

    ConsoleStyler.logInfo("\nREPL session ended");
  }
}
