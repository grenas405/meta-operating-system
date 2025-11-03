/**
 * GENESIS REPL - Futuristic Unix-Style Command Interface
 * ========================================================
 *
 * "Where Unix Philosophy meets Cyberpunk Aesthetics"
 *
 * A revolutionary command-line interface for the Deno Genesis framework
 * that combines timeless Unix principles with modern developer experience.
 *
 * Philosophy:
 * - Do one thing well: Manage Genesis sites and infrastructure
 * - Text-based interface: Terminal-native with stunning visuals
 * - Composable: Every command is a building block
 * - Self-documenting: The system explains itself
 */

import { newCommand } from "./cli/commands/new.ts";
import { dbCommand } from "./cli/commands/db.ts";
import { initCommand } from "./cli/commands/init.ts";
import { devCommand } from "./cli/commands/dev.ts";
import { deployCommand } from "./cli/commands/deploy.ts";

// =============================================================================
// CYBERPUNK COLOR PALETTE
// =============================================================================

const colors = {
  // Neon primary colors
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

  // Background gradients (for special effects)
  bgDark: "\x1b[48;2;10;10;20m",
  bgMid: "\x1b[48;2;20;20;40m",
};

// =============================================================================
// INTERFACE TYPES
// =============================================================================

interface GenesisCommand {
  name: string;
  description: string;
  category: "site" | "database" | "development" | "deployment" | "system";
  aliases?: string[];
  handler: (args: string[]) => Promise<void> | void;
}

interface CLIContext {
  cwd: string;
  configPath: string;
  verbose: boolean;
  dryRun: boolean;
  format: "text" | "json" | "yaml";
}

// =============================================================================
// GENESIS REPL CLASS
// =============================================================================

export class GenesisRepl {
  private commands: Map<string, GenesisCommand> = new Map();
  private running = false;
  private history: string[] = [];
  private commandCount = 0;

  constructor() {
    this.registerCommands();
  }

  /**
   * Create CLI context for command execution
   */
  private createCLIContext(verbose = false): CLIContext {
    return {
      cwd: Deno.cwd(),
      configPath: "",
      verbose,
      dryRun: false,
      format: "text" as const,
    };
  }

  /**
   * Register all Genesis commands
   */
  private registerCommands(): void {
    // Site Management Commands
    this.registerCommand({
      name: "init",
      description:
        "Initialize a new Genesis site with hub-and-spoke architecture",
      category: "site",
      handler: async (args) => {
        const context = this.createCLIContext(args.includes("--verbose"));
        await initCommand(args, context);
      },
    });

    this.registerCommand({
      name: "new",
      description:
        "Generate industry-specific frontend with AI-powered templates",
      category: "site",
      handler: async (args) => {
        const context = this.createCLIContext(args.includes("--verbose"));
        await newCommand(args, context);
      },
    });

    // Database Commands
    this.registerCommand({
      name: "db",
      description: "Setup MariaDB with multi-tenant architecture",
      category: "database",
      handler: async (args) => {
        const context = this.createCLIContext(args.includes("--verbose"));
        await dbCommand(args, context);
      },
    });

    // Development Commands
    this.registerCommand({
      name: "dev",
      description: "Start development server with hot reload",
      category: "development",
      aliases: ["serve", "start"],
      handler: async (args) => {
        const context = this.createCLIContext(args.includes("--verbose"));
        await devCommand(args, context);
      },
    });

    // Deployment Commands
    this.registerCommand({
      name: "deploy",
      description: "Generate nginx and systemd configuration files",
      category: "deployment",
      handler: async (args) => {
        const context = this.createCLIContext(args.includes("--verbose"));
        await deployCommand(args, context);
      },
    });

    // System Commands
    this.registerCommand({
      name: "help",
      description: "Display available commands and usage information",
      category: "system",
      aliases: ["h", "?"],
      handler: () => {
        this.showHelp();
      },
    });

    this.registerCommand({
      name: "status",
      description: "Show Genesis framework and site status",
      category: "system",
      handler: () => {
        this.showStatus();
      },
    });

    this.registerCommand({
      name: "version",
      description: "Display Genesis framework version",
      category: "system",
      aliases: ["v"],
      handler: () => {
        this.showVersion();
      },
    });

    this.registerCommand({
      name: "history",
      description: "Show command history",
      category: "system",
      handler: () => {
        this.showHistory();
      },
    });

    this.registerCommand({
      name: "clear",
      description: "Clear the screen",
      category: "system",
      aliases: ["cls"],
      handler: () => {
        console.clear();
        this.displayWelcome();
      },
    });

    this.registerCommand({
      name: "exit",
      description: "Exit the Genesis REPL",
      category: "system",
      aliases: ["quit", "q"],
      handler: () => {
        this.exit();
      },
    });
  }

  /**
   * Register a command
   */
  private registerCommand(command: GenesisCommand): void {
    this.commands.set(command.name, command);

    // Register aliases
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.commands.set(alias, command);
      }
    }
  }

  /**
   * Display futuristic welcome banner
   */
  private displayWelcome(): void {
    const banner = `
${colors.neonCyan}╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║   ${colors.bright}██████╗ ███████╗███╗   ██╗███████╗███████╗██╗███████╗${colors.reset}${colors.neonCyan}          ║
║   ${colors.bright}██╔════╝ ██╔════╝████╗  ██║██╔════╝██╔════╝██║██╔════╝${colors.reset}${colors.neonCyan}          ║
║   ${colors.bright}██║  ███╗█████╗  ██╔██╗ ██║█████╗  ███████╗██║███████╗${colors.reset}${colors.neonCyan}          ║
║   ${colors.bright}██║   ██║██╔══╝  ██║╚██╗██║██╔══╝  ╚════██║██║╚════██║${colors.reset}${colors.neonCyan}          ║
║   ${colors.bright}╚██████╔╝███████╗██║ ╚████║███████╗███████║██║███████║${colors.reset}${colors.neonCyan}          ║
║   ${colors.bright}╚═════╝ ╚══════╝╚═╝  ╚═══╝╚══════╝╚══════╝╚═╝╚══════╝${colors.reset}${colors.neonCyan}          ║
║                                                                       ║
║              ${colors.neonPink}⚡ Unix Philosophy + Modern Runtime ⚡${colors.reset}${colors.neonCyan}              ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.neonGreen}▸${colors.reset} ${colors.bright}Framework:${colors.reset} Deno Genesis ${colors.dim}v1.0.0${colors.reset}
${colors.neonGreen}▸${colors.reset} ${colors.bright}Runtime:${colors.reset}   Deno ${colors.dim}${Deno.version.deno}${colors.reset}
${colors.neonGreen}▸${colors.reset} ${colors.bright}TypeScript:${colors.reset} ${colors.dim}${Deno.version.typescript}${colors.reset}
${colors.neonGreen}▸${colors.reset} ${colors.bright}Platform:${colors.reset}  ${colors.dim}${Deno.build.os} ${Deno.build.arch}${colors.reset}

${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.electricBlue}Type ${colors.bright}'help'${colors.reset}${colors.electricBlue} to see available commands${colors.reset}
${colors.electricBlue}Type ${colors.bright}'exit'${colors.reset}${colors.electricBlue} to quit${colors.reset}

`;
    console.log(banner);
  }

  /**
   * Display help with categorized commands
   */
  private showHelp(): void {
    console.log(
      `\n${colors.neonCyan}${colors.bright}═══ GENESIS COMMANDS ═══${colors.reset}\n`,
    );

    const categories = {
      site: "Site Management",
      database: "Database Operations",
      development: "Development Tools",
      deployment: "Deployment & Infrastructure",
      system: "System Commands",
    };

    // Group commands by category
    const commandsByCategory: Record<string, GenesisCommand[]> = {
      site: [],
      database: [],
      development: [],
      deployment: [],
      system: [],
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
      }
      console.log();
    }

    console.log(
      `${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`,
    );
  }

  /**
   * Display Genesis status
   */
  private showStatus(): void {
    const cwd = Deno.cwd();
    const timestamp = new Date().toISOString();

    console.log(
      `\n${colors.neonCyan}╭─── ${colors.bright}GENESIS STATUS${colors.reset}${colors.neonCyan} ───╮${colors.reset}\n`,
    );
    console.log(
      `  ${colors.neonGreen}Working Directory:${colors.reset}  ${colors.dim}${cwd}${colors.reset}`,
    );
    console.log(
      `  ${colors.neonGreen}Commands Executed:${colors.reset}  ${colors.dim}${this.commandCount}${colors.reset}`,
    );
    console.log(
      `  ${colors.neonGreen}Timestamp:${colors.reset}         ${colors.dim}${timestamp}${colors.reset}`,
    );
    console.log(`\n${colors.neonCyan}╰${"─".repeat(60)}╯${colors.reset}\n`);
  }

  /**
   * Display version information
   */
  private showVersion(): void {
    console.log(
      `\n${colors.neonPink}${colors.bright}Deno Genesis Framework${colors.reset}`,
    );
    console.log(`${colors.dim}Version: 1.0.0${colors.reset}`);
    console.log(`${colors.dim}Build: 2025-01-03${colors.reset}\n`);
  }

  /**
   * Display command history
   */
  private showHistory(): void {
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
  }

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
        await command.handler(args);
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

  /**
   * Get futuristic prompt
   */
  private getPrompt(): string {
    const promptSymbol = "▸";
    return `${colors.neonCyan}genesis${colors.reset} ${colors.neonPink}${promptSymbol}${colors.reset} `;
  }

  /**
   * Exit the REPL
   */
  private exit(): void {
    console.log(`\n${colors.neonCyan}╭${"─".repeat(60)}╮${colors.reset}`);
    console.log(
      `${colors.neonCyan}│${colors.reset}  ${colors.neonPink}Exiting Genesis REPL...${colors.reset}`,
    );
    console.log(
      `${colors.neonCyan}│${colors.reset}  ${colors.dim}May your code be elegant and your deploys swift.${colors.reset}`,
    );
    console.log(`${colors.neonCyan}╰${"─".repeat(60)}╯${colors.reset}\n`);
    this.running = false;
  }

  /**
   * Start the REPL
   */
  async start(): Promise<void> {
    this.running = true;
    console.clear();
    this.displayWelcome();

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    // Set stdin to non-raw mode for better line editing
    Deno.stdin.setRaw(false);

    while (this.running) {
      // Display prompt
      await Deno.stdout.write(encoder.encode(this.getPrompt()));

      // Read input
      const buffer = new Uint8Array(1024);
      const n = await Deno.stdin.read(buffer);

      if (n === null) {
        // EOF reached (Ctrl+D)
        this.exit();
        break;
      }

      const input = decoder.decode(buffer.subarray(0, n)).trim();

      // Process the command
      await this.processCommand(input);
    }
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Start the Genesis REPL when run directly
 */
if (import.meta.main) {
  const repl = new GenesisRepl();
  await repl.start();
}
