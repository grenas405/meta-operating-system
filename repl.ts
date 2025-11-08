/**
 * META-OS REPL - Futuristic Process Management Interface
 * ========================================================
 *
 * "Where Unix Philosophy meets Cyberpunk Aesthetics"
 *
 * A revolutionary command-line interface for the Meta Operating System Kernel
 * that combines timeless Unix principles with modern developer experience.
 *
 * Philosophy:
 * - Do one thing well: Manage kernel processes and system operations
 * - Text-based interface: Terminal-native with stunning visuals
 * - Composable: Every command is a building block
 * - Self-documenting: The system explains itself
 */

import { ConsoleStyler } from "./core/utils/console-styler/mod.ts";
import type { Kernel } from "./kernel.ts";
import { manCommand } from "./man.ts";

// =============================================================================
// CYBERPUNK COLOR PALETTE
// =============================================================================

const colors = {
  // Neon primary colors (RGB)
  neonCyan: "\x1b[38;2;0;255;255m",
  neonPink: "\x1b[38;2;255;0;255m",
  neonGreen: "\x1b[38;2;0;255;136m",
  electricBlue: "\x1b[38;2;0;128;255m",
  plasma: "\x1b[38;2;138;43;226m",

  // Accent colors
  gold: "\x1b[38;2;255;215;0m",
  orange: "\x1b[38;2;255;165;0m",
  red: "\x1b[38;2;255;0;80m",

  // UI elements
  dim: "\x1b[2m",
  bright: "\x1b[1m",
  reset: "\x1b[0m",

  // Standard colors for compatibility
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",

  // Backgrounds
  bgBlue: "\x1b[44m",
  bgGreen: "\x1b[42m",
  bgRed: "\x1b[41m",
  bgDark: "\x1b[48;2;10;10;20m",
};

// =============================================================================
// INTERFACE TYPES
// =============================================================================

interface ReplCommand {
  name: string;
  description: string;
  category: "process" | "monitoring" | "system" | "development" | "information";
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

// =============================================================================
// META REPL CLASS
// =============================================================================

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
  private commandCount = 0;

  constructor(kernel: Kernel) {
    this.kernel = kernel;
    this.registerDefaultCommands();
  }

  // =============================================================================
  // COMMAND REGISTRATION
  // =============================================================================

  /**
   * Register default built-in commands
   */
  private registerDefaultCommands(): void {
    // Process Management Commands
    this.registerCommand({
      name: "ps",
      description: "List all managed processes with detailed status",
      category: "process",
      aliases: ["processes", "list"],
      handler: () => {
        const processes = this.kernel.listProcesses();
        if (processes.length === 0) {
          ConsoleStyler.logWarning("No managed processes");
          return;
        }

        console.log(
          `\n${colors.neonCyan}${colors.bright}═══ MANAGED PROCESSES ═══${colors.reset}\n`,
        );
        console.log(
          `${colors.bright}${"ID".padEnd(20)}${"NAME".padEnd(20)}${
            "PID".padEnd(10)
          }${"STATUS".padEnd(12)}${"RESTARTS"}${colors.reset}`,
        );
        console.log(`${colors.dim}${"─".repeat(80)}${colors.reset}`);

        for (const proc of processes) {
          const statusColor = proc.status === "running"
            ? colors.neonGreen
            : proc.status === "failed"
            ? colors.red
            : proc.status === "starting"
            ? colors.orange
            : colors.gray;

          console.log(
            `${proc.id.padEnd(20)}${proc.name.padEnd(20)}${
              String(proc.pid || "N/A").padEnd(10)
            }${statusColor}${proc.status.padEnd(12)}${colors.reset}${
              String(proc.restartCount)
            }`,
          );
        }
        console.log();
      },
    });

    this.registerCommand({
      name: "kill",
      description: "Kill a managed process by ID",
      category: "process",
      usage: "kill <process-id>",
      handler: async (args) => {
        if (args.length === 0) {
          console.log(`${colors.red}✗ Usage:${colors.reset} kill <process-id>`);
          return;
        }

        const processId = args[0];
        try {
          await this.kernel.killProcess(processId);
          console.log(
            `${colors.neonGreen}✓${colors.reset} Process ${colors.bright}${processId}${colors.reset} killed successfully`,
          );
        } catch (error) {
          console.log(
            `${colors.red}✗ Failed to kill process:${colors.reset} ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      },
    });

    this.registerCommand({
      name: "restart",
      description: "Restart a managed process by ID",
      category: "process",
      usage: "restart <process-id>",
      handler: async (args) => {
        if (args.length === 0) {
          console.log(
            `${colors.red}✗ Usage:${colors.reset} restart <process-id>`,
          );
          return;
        }

        const processId = args[0];
        try {
          await this.kernel.killProcess(processId);
          console.log(
            `${colors.neonGreen}✓${colors.reset} Process ${colors.bright}${processId}${colors.reset} will auto-restart...`,
          );
        } catch (error) {
          console.log(
            `${colors.red}✗ Failed to restart process:${colors.reset} ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      },
    });

    this.registerCommand({
      name: "inspect",
      description: "Detailed inspection of a process",
      category: "process",
      aliases: ["describe", "show"],
      usage: "inspect <process-id>",
      handler: (args) => {
        if (args.length === 0) {
          console.log(
            `${colors.red}✗ Usage:${colors.reset} inspect <process-id>`,
          );
          return;
        }

        const processId = args[0];
        const process = this.kernel.getProcessStatus(processId);
        if (!process) {
          console.log(
            `${colors.red}✗ Process not found:${colors.reset} ${processId}`,
          );
          return;
        }

        const uptime = Math.floor((Date.now() - process.startTime) / 1000);

        console.log(
          `\n${colors.neonCyan}╔═══════════════════════════════════════════════╗${colors.reset}`,
        );
        console.log(
          `${colors.neonCyan}║${colors.reset}    ${colors.bright}Process Inspection Report${colors.reset}             ${colors.neonCyan}║${colors.reset}`,
        );
        console.log(
          `${colors.neonCyan}╚═══════════════════════════════════════════════╝${colors.reset}\n`,
        );
        console.log(
          `${colors.neonPink}▸${colors.reset} ${colors.bright}ID:${colors.reset}           ${process.id}`,
        );
        console.log(
          `${colors.neonPink}▸${colors.reset} ${colors.bright}Name:${colors.reset}         ${process.name}`,
        );
        console.log(
          `${colors.neonPink}▸${colors.reset} ${colors.bright}PID:${colors.reset}          ${
            process.pid || "N/A"
          }`,
        );
        console.log(
          `${colors.neonPink}▸${colors.reset} ${colors.bright}Status:${colors.reset}       ${process.status}`,
        );
        console.log(
          `${colors.neonPink}▸${colors.reset} ${colors.bright}Auto-Restart:${colors.reset} ${
            process.autoRestart ? "Enabled" : "Disabled"
          }`,
        );
        console.log(
          `${colors.neonPink}▸${colors.reset} ${colors.bright}Restarts:${colors.reset}     ${process.restartCount}`,
        );
        console.log(
          `${colors.neonPink}▸${colors.reset} ${colors.bright}Started:${colors.reset}      ${
            new Date(process.startTime).toISOString()
          }`,
        );
        console.log(
          `${colors.neonPink}▸${colors.reset} ${colors.bright}Uptime:${colors.reset}       ${
            this.formatUptime(uptime)
          }\n`,
        );
      },
    });

    this.registerCommand({
      name: "logs",
      description: "View logs for a specific process",
      category: "process",
      usage: "logs <process-id>",
      handler: (args) => {
        if (args.length === 0) {
          console.log(`${colors.red}✗ Usage:${colors.reset} logs <process-id>`);
          return;
        }

        const processId = args[0];
        const process = this.kernel.getProcessStatus(processId);
        if (!process) {
          console.log(
            `${colors.red}✗ Process not found:${colors.reset} ${processId}`,
          );
          return;
        }

        console.log(
          `\n${colors.neonCyan}${colors.bright}═══ LOGS: ${process.name} ═══${colors.reset}\n`,
        );
        console.log(`${colors.dim}Process ID:${colors.reset}   ${processId}`);
        console.log(
          `${colors.dim}PID:${colors.reset}          ${process.pid || "N/A"}`,
        );
        console.log(
          `${colors.dim}Status:${colors.reset}       ${process.status}`,
        );
        console.log(
          `${colors.dim}Start Time:${colors.reset}   ${
            new Date(process.startTime).toISOString()
          }`,
        );
        console.log(
          `${colors.dim}Restarts:${colors.reset}     ${process.restartCount}\n`,
        );
      },
    });

    // Monitoring Commands
    this.registerCommand({
      name: "monitor",
      description: "Real-time process monitoring dashboard",
      category: "monitoring",
      aliases: ["mon", "top"],
      handler: async () => {
        await this.showProcessMonitor();
      },
    });

    this.registerCommand({
      name: "statusbar",
      description: "Toggle status bar display",
      category: "monitoring",
      handler: () => {
        this.showStatusBar = !this.showStatusBar;
        console.log(
          `${colors.neonGreen}✓${colors.reset} Status bar ${
            this.showStatusBar ? "enabled" : "disabled"
          }`,
        );
      },
    });

    // System Commands
    this.registerCommand({
      name: "info",
      description: "Display kernel system information",
      category: "system",
      aliases: ["sysinfo", "status"],
      handler: () => {
        const info = this.kernel.getSystemInfo();
        const uptime = this.kernel.getUptime();

        console.log(
          `\n${colors.neonCyan}╭─── ${colors.bright}KERNEL SYSTEM INFO${colors.reset}${colors.neonCyan} ───╮${colors.reset}\n`,
        );
        console.log(
          `  ${colors.neonGreen}▸${colors.reset} ${colors.bright}Version:${colors.reset}    ${colors.dim}${info.version}${colors.reset}`,
        );
        console.log(
          `  ${colors.neonGreen}▸${colors.reset} ${colors.bright}PID:${colors.reset}        ${colors.dim}${info.pid}${colors.reset}`,
        );
        console.log(
          `  ${colors.neonGreen}▸${colors.reset} ${colors.bright}Platform:${colors.reset}   ${colors.dim}${info.platform}${colors.reset}`,
        );
        console.log(
          `  ${colors.neonGreen}▸${colors.reset} ${colors.bright}Uptime:${colors.reset}     ${colors.dim}${
            this.formatUptime(uptime)
          }${colors.reset}`,
        );
        console.log(
          `  ${colors.neonGreen}▸${colors.reset} ${colors.bright}Start Time:${colors.reset} ${colors.dim}${
            new Date(info.startTime).toISOString()
          }${colors.reset}`,
        );
        console.log(`\n${colors.neonCyan}╰${"─".repeat(50)}╯${colors.reset}\n`);
      },
    });

    this.registerCommand({
      name: "shutdown",
      description: "Shutdown the kernel and all processes",
      category: "system",
      handler: () => {
        console.log(`${colors.red}⚠${colors.reset}  Shutting down kernel...`);
        Deno.exit(0);
      },
    });

    this.registerCommand({
      name: "exit",
      description: "Exit the REPL (kernel continues running)",
      category: "system",
      aliases: ["quit", "q"],
      handler: () => {
        const kernelPid = this.kernel.getSystemInfo().pid;
        console.log(`\n${colors.neonCyan}╭${"─".repeat(60)}╮${colors.reset}`);
        console.log(
          `${colors.neonCyan}│${colors.reset}  ${colors.neonPink}Exiting REPL...${colors.reset}`,
        );
        console.log(
          `${colors.neonCyan}│${colors.reset}  ${colors.dim}Kernel continues running (PID: ${kernelPid})${colors.reset}`,
        );
        console.log(
          `${colors.neonCyan}│${colors.reset}  ${colors.dim}To re-enter: Send signal to kernel PID${colors.reset}`,
        );
        console.log(
          `${colors.neonCyan}│${colors.reset}  ${colors.dim}To stop kernel: Press CTRL+C${colors.reset}`,
        );
        console.log(`${colors.neonCyan}╰${"─".repeat(60)}╯${colors.reset}\n`);
        this.running = false;
      },
    });

    this.registerCommand({
      name: "clear",
      description: "Clear the screen",
      category: "system",
      aliases: ["cls"],
      handler: () => {
        console.clear();
      },
    });

    this.registerCommand({
      name: "history",
      description: "Show command history",
      category: "system",
      handler: () => {
        if (this.history.length === 0) {
          console.log(`\n${colors.dim}No command history${colors.reset}\n`);
          return;
        }

        console.log(
          `\n${colors.neonCyan}${colors.bright}═══ COMMAND HISTORY ═══${colors.reset}\n`,
        );
        this.history.forEach((cmd, index) => {
          console.log(
            `  ${colors.dim}${
              String(index + 1).padStart(3)
            }${colors.reset} ${colors.neonGreen}▸${colors.reset} ${cmd}`,
          );
        });
        console.log();
      },
    });

    this.registerCommand({
      name: "help",
      description: "Display available commands and usage information",
      category: "information",
      aliases: ["h", "?"],
      handler: () => {
        this.showHelp();
      },
    });

    // Development Commands
    this.registerCommand({
      name: "eval",
      description: "Evaluate JavaScript expression with kernel context",
      category: "development",
      aliases: ["js"],
      usage: "eval <javascript-code>",
      handler: (args) => {
        const code = args.join(" ");
        if (!code) {
          console.log(
            `${colors.red}✗ Usage:${colors.reset} eval <javascript-code>`,
          );
          return;
        }

        try {
          const result = eval(`(function(kernel) { return ${code}; })`)(
            this.kernel,
          );
          console.log(`${colors.neonGreen}✓ Result:${colors.reset}`);
          console.log(result);
        } catch (error) {
          console.log(
            `${colors.red}✗ Evaluation error:${colors.reset} ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      },
    });

    this.registerCommand({
      name: "man",
      description: "Display Genesis manual pages",
      category: "information",
      usage: "man <topic>",
      handler: async (args) => {
        try {
          await manCommand(args);
        } catch (error) {
          console.log(
            `${colors.red}✗ Manual error:${colors.reset} ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
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

  // =============================================================================
  // DISPLAY METHODS
  // =============================================================================

  /**
   * Display futuristic welcome banner
   */
  private displayWelcome(): void {
    const banner = `
${colors.neonCyan}╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ${colors.bright}███╗   ███╗███████╗████████╗ █████╗       ██████╗ ███████╗${colors.reset}${colors.neonCyan}   ║
║   ${colors.bright}████╗ ████║██╔════╝╚══██╔══╝██╔══██╗     ██╔═══██╗██╔════╝${colors.reset}${colors.neonCyan}   ║
║   ${colors.bright}██╔████╔██║█████╗     ██║   ███████║     ██║   ██║███████╗${colors.reset}${colors.neonCyan}   ║
║   ${colors.bright}██║╚██╔╝██║██╔══╝     ██║   ██╔══██║     ██║   ██║╚════██║${colors.reset}${colors.neonCyan}   ║
║   ${colors.bright}██║ ╚═╝ ██║███████╗   ██║   ██║  ██║     ╚██████╔╝███████║${colors.reset}${colors.neonCyan}   ║
║   ${colors.bright}╚═╝     ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝      ╚═════╝ ╚══════╝${colors.reset}${colors.neonCyan}   ║
║                                                               ║
║            ${colors.neonPink}⚡ Process Management + System Control ⚡${colors.reset}${colors.neonCyan}            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝${colors.reset}

${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.neonGreen}▸${colors.reset} ${colors.bright}Runtime:${colors.reset}   Deno ${colors.dim}${Deno.version.deno}${colors.reset}
${colors.neonGreen}▸${colors.reset} ${colors.bright}TypeScript:${colors.reset} ${colors.dim}${Deno.version.typescript}${colors.reset}
${colors.neonGreen}▸${colors.reset} ${colors.bright}Platform:${colors.reset}  ${colors.dim}${Deno.build.os} ${Deno.build.arch}${colors.reset}

${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.electricBlue}Type ${colors.bright}'help'${colors.reset}${colors.electricBlue} to see available commands${colors.reset}
${colors.electricBlue}Type ${colors.bright}'monitor'${colors.reset}${colors.electricBlue} for real-time process dashboard${colors.reset}
${colors.electricBlue}Type ${colors.bright}'exit'${colors.reset}${colors.electricBlue} to quit (kernel keeps running)${colors.reset}

`;
    console.log(banner);
  }

  /**
   * Display help with categorized commands
   */
  private showHelp(): void {
    console.log(
      `\n${colors.neonCyan}${colors.bright}═══ META-OS COMMANDS ═══${colors.reset}\n`,
    );

    const categories = {
      process: "Process Management",
      monitoring: "Monitoring & Dashboard",
      system: "System Control",
      development: "Development Tools",
      information: "Information & Help",
    };

    // Group commands by category
    const commandsByCategory: Record<string, ReplCommand[]> = {
      process: [],
      monitoring: [],
      system: [],
      development: [],
      information: [],
    };

    // Track seen commands to avoid duplicates from aliases
    const seen = new Set<string>();

    for (const cmd of this.commands.values()) {
      if (!seen.has(cmd.name)) {
        seen.add(cmd.name);
        commandsByCategory[cmd.category].push(cmd);
      }
    }

    // Display commands by category
    for (const [category, title] of Object.entries(categories)) {
      const cmds = commandsByCategory[category];
      if (cmds.length === 0) continue;

      console.log(
        `${colors.neonPink}▸ ${colors.bright}${title}${colors.reset}\n`,
      );

      for (const cmd of cmds) {
        const aliases = cmd.aliases
          ? ` ${colors.dim}(${cmd.aliases.join(", ")})${colors.reset}`
          : "";
        console.log(
          `  ${colors.neonGreen}${
            cmd.name.padEnd(12)
          }${colors.reset}${aliases} ${colors.dim}│${colors.reset} ${cmd.description}`,
        );
        if (cmd.usage) {
          console.log(`    ${colors.dim}Usage: ${cmd.usage}${colors.reset}`);
        }
      }
      console.log();
    }

    console.log(
      `${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`,
    );
  }

  // =============================================================================
  // PROCESS MONITORING
  // =============================================================================

  /**
   * Show real-time process monitoring dashboard
   */
  private async showProcessMonitor(): Promise<void> {
    const encoder = new TextEncoder();
    let monitoring = true;

    // Clear screen and hide cursor
    await Deno.stdout.write(encoder.encode("\x1b[2J\x1b[H\x1b[?25l"));

    // Set up keyboard listener for exit
    Deno.stdin.setRaw(true);

    const renderMonitor = async () => {
      const processes = this.kernel.listProcesses();
      const sysInfo = this.kernel.getSystemInfo();
      const uptime = this.kernel.getUptime();

      let output = "\x1b[2J\x1b[H";

      // Header
      output +=
        `${colors.bgBlue}${colors.bright} META-OS PROCESS MONITOR ${colors.reset} `;
      output += `${colors.neonCyan}Updated: ${
        new Date().toLocaleTimeString()
      }${colors.reset}`;
      output += `  ${colors.dim}Press 'q' to exit${colors.reset}\n\n`;

      // System stats
      output += `${colors.bright}System Information:${colors.reset}\n`;
      output += `  Uptime:      ${colors.neonCyan}${
        this.formatUptime(uptime)
      }${colors.reset}\n`;
      output +=
        `  PID:         ${colors.neonCyan}${sysInfo.pid}${colors.reset}\n`;
      output +=
        `  Platform:    ${colors.neonCyan}${sysInfo.platform}${colors.reset}\n`;
      output +=
        `  Version:     ${colors.neonCyan}${sysInfo.version}${colors.reset}\n\n`;

      // Process table
      output +=
        `${colors.bright}Managed Processes (${processes.length}):${colors.reset}\n`;
      output += `${colors.dim}${"─".repeat(100)}${colors.reset}\n`;
      output += `${colors.bright}`;
      output += "ID".padEnd(22);
      output += "NAME".padEnd(22);
      output += "PID".padEnd(10);
      output += "STATUS".padEnd(12);
      output += "UPTIME".padEnd(12);
      output += "RESTARTS";
      output += `${colors.reset}\n`;
      output += `${colors.dim}${"─".repeat(100)}${colors.reset}\n`;

      for (const proc of processes) {
        const procUptime = Math.floor((Date.now() - proc.startTime) / 1000);
        const uptimeStr = this.formatUptime(procUptime);

        let statusColor = colors.gray;
        if (proc.status === "running") statusColor = colors.neonGreen;
        else if (proc.status === "failed") statusColor = colors.red;
        else if (proc.status === "starting") statusColor = colors.orange;

        output += proc.id.padEnd(22);
        output += proc.name.padEnd(22);
        output += String(proc.pid || "N/A").padEnd(10);
        output += `${statusColor}${proc.status.padEnd(12)}${colors.reset}`;
        output += uptimeStr.padEnd(12);
        output += String(proc.restartCount);
        output += "\n";
      }

      output += `${colors.dim}${"─".repeat(100)}${colors.reset}\n`;

      // Legend
      output += `\n${colors.dim}Legend: `;
      output += `${colors.neonGreen}●${colors.reset} running  `;
      output += `${colors.orange}●${colors.reset} starting  `;
      output += `${colors.red}●${colors.reset} failed  `;
      output += `${colors.gray}●${colors.reset} stopped${colors.reset}`;

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
      await Deno.stdout.write(encoder.encode("\x1b[?25h"));
      Deno.stdin.setRaw(false);
      console.log("\n");
    }
  }

  // =============================================================================
  // COMMAND PROCESSING
  // =============================================================================

  /**
   * Process a command line input
   */
  private async processCommand(line: string): Promise<void> {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Add to history
    this.history.push(trimmed);
    this.commandCount++;

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
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);
        console.error(
          `\n${colors.red}✗ Error:${colors.reset} ${errorMessage}\n`,
        );
      }
    } else {
      console.log(
        `\n${colors.red}✗ Unknown command:${colors.reset} ${commandName}`,
      );
      console.log(
        `${colors.dim}Type 'help' for available commands${colors.reset}\n`,
      );
    }
  }

  // =============================================================================
  // INPUT HANDLING
  // =============================================================================

  /**
   * Get autocomplete suggestions for partial input
   */
  private getAutocompleteSuggestions(partial: string): string[] {
    const matches: string[] = [];
    const seen = new Set<string>();

    for (const [name, cmd] of this.commands.entries()) {
      if (name.startsWith(partial) && !seen.has(cmd.name)) {
        if (name === cmd.name) {
          matches.push(name);
          seen.add(cmd.name);
        } else if (partial.length > 0) {
          matches.push(name);
        }
      }
    }

    return matches.sort();
  }

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
    const processes = this.kernel.listProcesses();
    const runningCount = processes.filter((p) => p.status === "running").length;

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour12: false });

    const statusChar = runningCount > 0 ? "●" : "○";
    const statusColor = runningCount > 0 ? colors.neonGreen : colors.gray;

    const parts = [
      `${colors.dim}[${colors.neonCyan}${timeStr}${colors.dim}]${colors.reset}`,
      `${statusColor}${statusChar}${colors.reset}`,
      `${colors.neonPink}meta-os${colors.reset}`,
      `${colors.dim}[${colors.gold}${runningCount}${colors.dim} proc]${colors.reset}`,
      `${colors.electricBlue}❯${colors.reset}`,
    ];

    return parts.join(" ") + " ";
  }

  /**
   * Render status bar at the top
   */
  private renderStatusBar(): string {
    const sysInfo = this.kernel.getSystemInfo();
    const uptime = this.kernel.getUptime();
    const uptimeStr = this.formatUptime(uptime);
    const processes = this.kernel.listProcesses();
    const runningCount = processes.filter((p) => p.status === "running").length;
    const totalCount = processes.length;

    const statusParts = [
      `${colors.bgBlue}${colors.bright} META-OS v${sysInfo.version} ${colors.reset}`,
      `${colors.neonCyan}⬆ ${uptimeStr}${colors.reset}`,
      `${colors.neonGreen}◉ ${runningCount}/${totalCount} proc${colors.reset}`,
      `${colors.gold}⚡ PID:${sysInfo.pid}${colors.reset}`,
      `${colors.neonPink}${sysInfo.platform}${colors.reset}`,
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

    let output = `\n${colors.dim}suggestions: ${colors.reset}`;
    output += displayed
      .map((s, i) => {
        const isSelected = i === this.inputState.suggestionIndex;
        if (isSelected) {
          return `${colors.bgBlue}${colors.bright} ${s} ${colors.reset}`;
        }
        return `${colors.neonCyan}${s}${colors.reset}`;
      })
      .join(`${colors.dim} | ${colors.reset}`);

    if (suggestions.length > maxSuggestions) {
      output += ` ${colors.dim}+${
        suggestions.length - maxSuggestions
      } more${colors.reset}`;
    }

    return output;
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
      await Deno.stdout.write(encoder.encode("\x1b[2J\x1b[H"));
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
      this.inputState.buffer =
        this.history[this.history.length - 1 - this.inputState.historyIndex];
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
      this.inputState.suggestionIndex = (this.inputState.suggestionIndex + 1) %
        suggestions.length;
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

    let output = "\x1b[2K\r" + prompt + buffer;

    // Show suggestion preview (ghost text)
    if (suggestions.length > 0 && buffer.length > 0) {
      const suggestion = suggestions[0];
      if (suggestion.startsWith(buffer)) {
        const ghost = suggestion.slice(buffer.length);
        output += `${colors.dim}${ghost}${colors.reset}`;
      }
    }

    // Render suggestions below if multiple
    if (suggestions.length > 1 && buffer.length > 0) {
      output += this.renderSuggestions(suggestions);
      output += "\x1b[1A";
    }

    // Position cursor
    const cursorPos = prompt.length - this.countAnsiChars(prompt) +
      this.inputState.cursor;
    output += `\x1b[${cursorPos + 1}G`;

    return output;
  }

  /**
   * Count ANSI escape sequence characters
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

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

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

  // =============================================================================
  // MAIN REPL LOOP
  // =============================================================================

  /**
   * Start the futuristic REPL
   */
  async start(): Promise<void> {
    this.running = true;

    // Clear screen and display welcome
    await Deno.stdout.write(new TextEncoder().encode("\x1b[2J\x1b[H"));
    this.displayWelcome();

    const encoder = new TextEncoder();

    // Set stdin to raw mode for character-by-character input
    Deno.stdin.setRaw(true);

    // Hide cursor during input handling
    await Deno.stdout.write(encoder.encode("\x1b[?25l"));

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
          await Deno.stdout.write(encoder.encode("\x1b[?25h"));

          // Read a single key
          const buffer = new Uint8Array(16);
          const n = await Deno.stdin.read(buffer);

          if (n === null) {
            this.running = false;
            break;
          }

          await Deno.stdout.write(encoder.encode("\x1b[?25l"));

          const key = buffer.subarray(0, n);
          inputComplete = await this.handleKeyPress(key, encoder);
        }

        if (!this.running) break;

        // Clear suggestions if any
        await Deno.stdout.write(encoder.encode("\x1b[2K\r\n"));

        // Process the command
        const command = this.inputState.buffer.trim();
        if (command) {
          await this.processCommand(command);
        }

        console.log();
      }
    } finally {
      // Restore cursor and terminal settings
      await Deno.stdout.write(encoder.encode("\x1b[?25h"));
      Deno.stdin.setRaw(false);
    }

    console.log(`${colors.dim}REPL session ended${colors.reset}\n`);
  }
}
