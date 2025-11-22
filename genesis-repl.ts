#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env
/**
 * GENESIS REPL - Futuristic Unix-Style Command Interface
 * ========================================================
 *
 * "Where Unix Philosophy meets Cyberpunk Aesthetics"
 *
 * A revolutionary command-line interface for the Deno Genesis Meta Operating System
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
import type { ILogger } from "./core/interfaces/ILogger.ts";
import { defaultLogger } from "./core/adapters/ConsoleStylerLogger.ts";
import { CommandRunner } from "./commandRunner.ts";
import { BoxRenderer, ColorSystem } from "@pedromdominguez/genesis-trace";

// =============================================================================
// CYBERPUNK COLOR PALETTE
// =============================================================================

const colors = {
  // Neon primary colors using RGB
  neonCyan: ColorSystem.rgb(0, 255, 255),
  neonPink: ColorSystem.rgb(255, 0, 255),
  neonGreen: ColorSystem.rgb(0, 255, 136),
  electricBlue: ColorSystem.rgb(0, 128, 255),
  plasma: ColorSystem.rgb(138, 43, 226),

  // Accent colors
  gold: ColorSystem.rgb(255, 215, 0),
  orange: ColorSystem.rgb(255, 165, 0),
  red: ColorSystem.rgb(255, 0, 80),

  // UI elements
  dim: ColorSystem.codes.dim,
  bright: ColorSystem.codes.bright,
  reset: ColorSystem.codes.reset,
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
  private logger: ILogger;
  private rootDirectory: string;
  private startTime: number;

  constructor(logger: ILogger = defaultLogger) {
    this.logger = logger;
    this.rootDirectory = Deno.cwd(); // Lock to directory where REPL was started
    this.startTime = Date.now();
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
      name: "cd",
      description: "Change the current working directory",
      category: "system",
      handler: (args) => {
        this.changeDirectory(args);
      },
    });

    this.registerCommand({
      name: "man",
      description: "Display Genesis OS manual and documentation",
      category: "system",
      handler: (args) => {
        this.showManual(args);
      },
    });

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
      description: "Show Genesis OS and site status",
      category: "system",
      handler: () => {
        this.showStatus();
      },
    });

    this.registerCommand({
      name: "version",
      description: "Display Genesis OS version",
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

    // Show native Linux commands section
    console.log(
      `${colors.neonPink}▸ ${colors.bright}Native Linux Commands${colors.reset}\n`,
    );
    console.log(
      `  ${colors.dim}Genesis REPL supports all native Linux commands:${colors.reset}\n`,
    );

    const linuxCommands = [
      ["ls", "List directory contents"],
      ["cd", "Change directory (Genesis builtin)"],
      ["pwd", "Print working directory"],
      ["cat", "Concatenate and print files"],
      ["grep", "Search text patterns"],
      ["find", "Search for files"],
      ["git", "Version control operations"],
      ["npm", "Node package manager"],
      ["curl", "Transfer data with URLs"],
      ["wget", "Download files"],
      ["mkdir", "Create directories"],
      ["rm", "Remove files/directories"],
      ["cp", "Copy files/directories"],
      ["mv", "Move/rename files"],
      ["echo", "Display messages"],
      ["touch", "Create empty files"],
      ["chmod", "Change file permissions"],
      ["ps", "Process status"],
      ["kill", "Terminate processes"],
      ["top", "Display system processes"],
    ];

    // Display in two columns
    for (let i = 0; i < linuxCommands.length; i += 2) {
      const [cmd1, desc1] = linuxCommands[i];
      const entry1 = `  ${colors.neonGreen}${
        cmd1.padEnd(12)
      }${colors.reset} ${colors.dim}│${colors.reset} ${desc1}`;

      if (i + 1 < linuxCommands.length) {
        const [cmd2, desc2] = linuxCommands[i + 1];
        console.log(
          entry1.padEnd(70) +
            `  ${colors.neonGreen}${
              cmd2.padEnd(12)
            }${colors.reset} ${colors.dim}│${colors.reset} ${desc2}`,
        );
      } else {
        console.log(entry1);
      }
    }

    console.log();
    console.log(
      `  ${colors.electricBlue}Type any Linux command to execute it directly${colors.reset}`,
    );
    console.log(
      `  ${colors.electricBlue}Type ${colors.bright}'man'${colors.reset}${colors.electricBlue} for Genesis documentation${colors.reset}`,
    );
    console.log();

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
    const uptime = Date.now() - this.startTime;
    const uptimeStr = this.formatUptime(uptime);

    console.log();
    BoxRenderer.render(
      [
        `${ColorSystem.colorize("📊 GENESIS STATUS", colors.neonPink)}`,
        "",
        `${ColorSystem.colorize("Directory:", colors.neonGreen)}  ${ColorSystem.colorize(cwd, colors.dim)}`,
        `${ColorSystem.colorize("Commands:", colors.neonGreen)}   ${ColorSystem.colorize(String(this.commandCount), colors.electricBlue)}`,
        `${ColorSystem.colorize("Uptime:", colors.neonGreen)}     ${ColorSystem.colorize(uptimeStr, colors.dim)}`,
        `${ColorSystem.colorize("Timestamp:", colors.neonGreen)}  ${ColorSystem.colorize(timestamp, colors.dim)}`,
      ],
      { style: "rounded", color: colors.neonCyan, padding: 1 }
    );
    console.log();
  }

  /**
   * Format uptime in human-readable form
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Display version information
   */
  private showVersion(): void {
    console.log();
    BoxRenderer.render(
      [
        `${ColorSystem.colorize("🚀 Deno Genesis Meta Operating System", colors.neonPink)}${colors.bright}${colors.reset}`,
        "",
        `${ColorSystem.colorize("Version:", colors.dim)}   1.0.0`,
        `${ColorSystem.colorize("Build:", colors.dim)}     2025-01-03`,
        `${ColorSystem.colorize("Runtime:", colors.dim)}   Deno ${Deno.version.deno}`,
      ],
      { style: "double", color: colors.neonCyan, padding: 1, align: "center" }
    );
    console.log();
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
   * Change directory with support for .. and absolute/relative paths
   * Restricted to rootDirectory and subdirectories only
   */
  private changeDirectory(args: string[]): void {
    try {
      const currentDir = Deno.cwd();

      if (args.length === 0) {
        // No argument - go to root directory (not home)
        Deno.chdir(this.rootDirectory);
        console.log(
          `\n${colors.neonCyan}📂 ${colors.bright}DIRECTORY${colors.reset} ${colors.dim}→${colors.reset} ${ColorSystem.colorize(this.rootDirectory, colors.neonGreen)}\n`
        );
        return;
      }

      const target = args[0];

      // Try to change directory temporarily to resolve the path
      Deno.chdir(target);
      const resolvedPath = Deno.cwd();

      // Check if resolved path is within or equal to root directory
      if (!resolvedPath.startsWith(this.rootDirectory)) {
        // Revert to previous directory
        Deno.chdir(currentDir);
        console.log();
        BoxRenderer.render(
          [
            `${ColorSystem.colorize("🔒 ACCESS DENIED", colors.red)}${colors.bright}${colors.reset}`,
            "",
            `Cannot navigate above root directory:`,
            `${ColorSystem.colorize(this.rootDirectory, colors.neonCyan)}`,
            "",
            `Requested path would resolve to:`,
            `${ColorSystem.colorize(resolvedPath, colors.red)}`,
          ],
          { style: "rounded", color: colors.red, padding: 1 }
        );
        console.log();
        return;
      }

      // Path is valid - display success message
      console.log(
        `\n${colors.neonCyan}📂 ${colors.bright}DIRECTORY${colors.reset} ${colors.dim}→${colors.reset} ${ColorSystem.colorize(resolvedPath, colors.neonGreen)}\n`
      );
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      console.log();
      BoxRenderer.render(
        [
          `${ColorSystem.colorize("⚠️  ERROR", colors.red)}`,
          "",
          `cd: ${errorMessage}`,
        ],
        { style: "rounded", color: colors.red, padding: 1 }
      );
      console.log();
    }
  }

  /**
   * Display Genesis OS manual and documentation
   */
  private showManual(args: string[]): void {
    if (args.length === 0) {
      // Show general manual
      this.showGeneralManual();
    } else {
      // Show specific command manual
      this.showCommandManual(args[0]);
    }
  }

  /**
   * Display general Genesis manual
   */
  private showGeneralManual(): void {
    const manual = `
${colors.neonCyan}${colors.bright}╔═══════════════════════════════════════════════════════════════════════╗
║                       GENESIS OS MANUAL                               ║
╚═══════════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.neonPink}${colors.bright}NAME${colors.reset}
    ${colors.bright}genesis${colors.reset} - Deno Genesis Operating System REPL

${colors.neonPink}${colors.bright}SYNOPSIS${colors.reset}
    ${colors.neonGreen}genesis${colors.reset} [command] [options]

${colors.neonPink}${colors.bright}DESCRIPTION${colors.reset}
    Genesis is a revolutionary command-line interface that combines Unix
    philosophy with modern runtime capabilities. It provides a complete
    development environment for building and deploying web applications
    with Deno.

${colors.neonPink}${colors.bright}CORE FEATURES${colors.reset}
    ${colors.neonGreen}▸${colors.reset} Hub-and-spoke architecture for multi-site management
    ${colors.neonGreen}▸${colors.reset} AI-powered industry-specific template generation
    ${colors.neonGreen}▸${colors.reset} Multi-tenant MariaDB database architecture
    ${colors.neonGreen}▸${colors.reset} Hot-reload development server
    ${colors.neonGreen}▸${colors.reset} Automated deployment configuration
    ${colors.neonGreen}▸${colors.reset} Native Linux command passthrough

${colors.neonPink}${colors.bright}COMMAND CATEGORIES${colors.reset}
    ${colors.bright}Site Management${colors.reset}     - init, new
    ${colors.bright}Database${colors.reset}            - db
    ${colors.bright}Development${colors.reset}         - dev, serve, start
    ${colors.bright}Deployment${colors.reset}          - deploy
    ${colors.bright}System${colors.reset}              - help, status, version, history, cd, man

${colors.neonPink}${colors.bright}NATIVE LINUX COMMANDS${colors.reset}
    Genesis REPL supports all native Linux commands:
    ${colors.dim}ls, pwd, cat, grep, find, git, npm, curl, wget, etc.${colors.reset}

    ${colors.bright}Note:${colors.reset} Use ${colors.neonGreen}man [command]${colors.reset} to view Genesis documentation
          Use ${colors.neonGreen}\\man [command]${colors.reset} to view native Linux man pages (if needed)

${colors.neonPink}${colors.bright}EXAMPLES${colors.reset}
    ${colors.dim}# Initialize a new Genesis site${colors.reset}
    ${colors.neonGreen}genesis${colors.reset} init my-site

    ${colors.dim}# Create AI-powered frontend${colors.reset}
    ${colors.neonGreen}genesis${colors.reset} new --industry healthcare

    ${colors.dim}# Start development server${colors.reset}
    ${colors.neonGreen}genesis${colors.reset} dev

    ${colors.dim}# Use native commands${colors.reset}
    ${colors.neonGreen}genesis${colors.reset} git status
    ${colors.neonGreen}genesis${colors.reset} ls -la

${colors.neonPink}${colors.bright}SEE ALSO${colors.reset}
    man init, man new, man db, man dev, man deploy

${colors.dim}Genesis OS v1.0.0                                         2025-01-03${colors.reset}
`;
    console.log(manual);
  }

  /**
   * Display manual for specific command
   */
  private showCommandManual(commandName: string): void {
    const command = this.commands.get(commandName);

    if (!command) {
      console.log(
        `\n${colors.red}No manual entry for '${commandName}'${colors.reset}`,
      );
      console.log(
        `${colors.dim}Type 'help' to see available Genesis commands${colors.reset}\n`,
      );
      return;
    }

    const manuals: Record<string, string> = {
      init: `
${colors.neonCyan}${colors.bright}INIT(1)                    Genesis Commands                    INIT(1)${colors.reset}

${colors.neonPink}${colors.bright}NAME${colors.reset}
    init - Initialize a new Genesis site with hub-and-spoke architecture

${colors.neonPink}${colors.bright}SYNOPSIS${colors.reset}
    ${colors.neonGreen}init${colors.reset} [site-name] [options]

${colors.neonPink}${colors.bright}DESCRIPTION${colors.reset}
    Initializes a new Genesis site with the hub-and-spoke architecture,
    creating the necessary directory structure, configuration files, and
    boilerplate code for a multi-tenant web application.

${colors.neonPink}${colors.bright}OPTIONS${colors.reset}
    ${colors.bright}--verbose${colors.reset}    Enable detailed logging
    ${colors.bright}--help${colors.reset}       Display help information

${colors.neonPink}${colors.bright}EXAMPLES${colors.reset}
    init my-awesome-site
    init healthcare-portal --verbose
`,
      new: `
${colors.neonCyan}${colors.bright}NEW(1)                     Genesis Commands                     NEW(1)${colors.reset}

${colors.neonPink}${colors.bright}NAME${colors.reset}
    new - Generate industry-specific frontend with AI-powered templates

${colors.neonPink}${colors.bright}SYNOPSIS${colors.reset}
    ${colors.neonGreen}new${colors.reset} [options]

${colors.neonPink}${colors.bright}DESCRIPTION${colors.reset}
    Generates a customized frontend application using AI-powered templates
    tailored to specific industries such as healthcare, finance, e-commerce,
    and more.

${colors.neonPink}${colors.bright}OPTIONS${colors.reset}
    ${colors.bright}--industry${colors.reset}   Specify the industry vertical
    ${colors.bright}--verbose${colors.reset}    Enable detailed logging
    ${colors.bright}--help${colors.reset}       Display help information

${colors.neonPink}${colors.bright}EXAMPLES${colors.reset}
    new --industry healthcare
    new --industry finance --verbose
`,
      db: `
${colors.neonCyan}${colors.bright}DB(1)                      Genesis Commands                      DB(1)${colors.reset}

${colors.neonPink}${colors.bright}NAME${colors.reset}
    db - Setup MariaDB with multi-tenant architecture

${colors.neonPink}${colors.bright}SYNOPSIS${colors.reset}
    ${colors.neonGreen}db${colors.reset} [subcommand] [options]

${colors.neonPink}${colors.bright}DESCRIPTION${colors.reset}
    Manages MariaDB database operations including setup, migrations,
    and multi-tenant configuration for Genesis applications.

${colors.neonPink}${colors.bright}SUBCOMMANDS${colors.reset}
    ${colors.bright}setup${colors.reset}        Initialize database schema
    ${colors.bright}migrate${colors.reset}      Run database migrations
    ${colors.bright}seed${colors.reset}         Populate with sample data

${colors.neonPink}${colors.bright}EXAMPLES${colors.reset}
    db setup
    db migrate
    db seed --env development
`,
      dev: `
${colors.neonCyan}${colors.bright}DEV(1)                     Genesis Commands                     DEV(1)${colors.reset}

${colors.neonPink}${colors.bright}NAME${colors.reset}
    dev - Start development server with hot reload

${colors.neonPink}${colors.bright}SYNOPSIS${colors.reset}
    ${colors.neonGreen}dev${colors.reset} [options]

${colors.neonPink}${colors.bright}ALIASES${colors.reset}
    serve, start

${colors.neonPink}${colors.bright}DESCRIPTION${colors.reset}
    Starts a local development server with hot module reloading,
    enabling rapid iteration and testing of Genesis applications.

${colors.neonPink}${colors.bright}OPTIONS${colors.reset}
    ${colors.bright}--port${colors.reset}       Specify port number (default: 8000)
    ${colors.bright}--verbose${colors.reset}    Enable detailed logging
    ${colors.bright}--help${colors.reset}       Display help information

${colors.neonPink}${colors.bright}EXAMPLES${colors.reset}
    dev
    dev --port 3000
    serve --verbose
`,
      deploy: `
${colors.neonCyan}${colors.bright}DEPLOY(1)                  Genesis Commands                  DEPLOY(1)${colors.reset}

${colors.neonPink}${colors.bright}NAME${colors.reset}
    deploy - Generate nginx and systemd configuration files

${colors.neonPink}${colors.bright}SYNOPSIS${colors.reset}
    ${colors.neonGreen}deploy${colors.reset} [options]

${colors.neonPink}${colors.bright}DESCRIPTION${colors.reset}
    Generates production-ready nginx reverse proxy configuration and
    systemd service files for deploying Genesis applications.

${colors.neonPink}${colors.bright}OPTIONS${colors.reset}
    ${colors.bright}--domain${colors.reset}     Specify the domain name
    ${colors.bright}--verbose${colors.reset}    Enable detailed logging
    ${colors.bright}--help${colors.reset}       Display help information

${colors.neonPink}${colors.bright}EXAMPLES${colors.reset}
    deploy --domain example.com
    deploy --domain api.example.com --verbose
`,
      cd: `
${colors.neonCyan}${colors.bright}CD(1)                      Genesis Commands                      CD(1)${colors.reset}

${colors.neonPink}${colors.bright}NAME${colors.reset}
    cd - Change the current working directory

${colors.neonPink}${colors.bright}SYNOPSIS${colors.reset}
    ${colors.neonGreen}cd${colors.reset} [directory]

${colors.neonPink}${colors.bright}DESCRIPTION${colors.reset}
    Changes the current working directory to the specified path.
    Supports relative paths (.., ./subdir) and absolute paths.

${colors.neonPink}${colors.bright}EXAMPLES${colors.reset}
    cd ..                 # Go up one directory
    cd ../..              # Go up two directories
    cd /home/user/project # Absolute path
    cd my-site            # Relative path
    cd                    # Go to home directory
`,
      help: `
${colors.neonCyan}${colors.bright}HELP(1)                    Genesis Commands                    HELP(1)${colors.reset}

${colors.neonPink}${colors.bright}NAME${colors.reset}
    help - Display available commands and usage information

${colors.neonPink}${colors.bright}SYNOPSIS${colors.reset}
    ${colors.neonGreen}help${colors.reset}

${colors.neonPink}${colors.bright}ALIASES${colors.reset}
    h, ?

${colors.neonPink}${colors.bright}DESCRIPTION${colors.reset}
    Displays a categorized list of all available Genesis commands
    with brief descriptions.
`,
    };

    const manual = manuals[command.name] || `
${colors.neonCyan}${colors.bright}${command.name.toUpperCase()}(1)${colors.reset}

${colors.neonPink}${colors.bright}NAME${colors.reset}
    ${command.name} - ${command.description}

${colors.neonPink}${colors.bright}DESCRIPTION${colors.reset}
    ${command.description}

${colors.dim}For more information, type 'help' to see all available commands.${colors.reset}
`;

    console.log(manual);
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
        this.logger.logError(`Command failed: ${errorMessage}`, {
          command: commandName,
          args,
          error: error instanceof Error ? error.stack : undefined,
        });
      }
    } else {
      // Fall through to shell command execution
      await this.executeShellCommand(commandName, args);
    }
  }

  /**
   * Execute a Linux native command using Deno.Command wrapper
   */
  private async executeShellCommand(
    cmd: string,
    args: string[],
  ): Promise<void> {
    try {
      // Map of common Unix commands to their display categories and icons
      const commandInfo: Record<string, { category: string; icon: string }> = {
        ls: { category: "FILE SYSTEM", icon: "📁" },
        pwd: { category: "DIRECTORY", icon: "📍" },
        cd: { category: "DIRECTORY", icon: "📂" },
        mkdir: { category: "FILE SYSTEM", icon: "➕" },
        rm: { category: "FILE SYSTEM", icon: "🗑️" },
        cp: { category: "FILE SYSTEM", icon: "📋" },
        mv: { category: "FILE SYSTEM", icon: "➡️" },
        cat: { category: "FILE VIEWER", icon: "👁️" },
        grep: { category: "SEARCH", icon: "🔍" },
        find: { category: "SEARCH", icon: "🔎" },
        git: { category: "VERSION CONTROL", icon: "🌿" },
        npm: { category: "PACKAGE MANAGER", icon: "📦" },
        curl: { category: "NETWORK", icon: "🌐" },
        wget: { category: "NETWORK", icon: "⬇️" },
        touch: { category: "FILE SYSTEM", icon: "✨" },
        chmod: { category: "PERMISSIONS", icon: "🔐" },
        chown: { category: "PERMISSIONS", icon: "👤" },
        ps: { category: "PROCESS", icon: "⚙️" },
        kill: { category: "PROCESS", icon: "⛔" },
        top: { category: "PROCESS", icon: "📊" },
        echo: { category: "OUTPUT", icon: "💬" },
        tree: { category: "FILE SYSTEM", icon: "🌳" },
        which: { category: "SYSTEM", icon: "🔧" },
        whoami: { category: "SYSTEM", icon: "👋" },
        date: { category: "SYSTEM", icon: "📅" },
        uname: { category: "SYSTEM", icon: "💻" },
      };

      const info = commandInfo[cmd] || { category: "SHELL", icon: "▸" };
      const fullCommand = args.length > 0 ? `${cmd} ${args.join(" ")}` : cmd;

      // Show enhanced shell execution header using BoxRenderer
      const headerContent = [
        `${ColorSystem.colorize(info.icon + " " + info.category, colors.neonPink)} ${colors.dim}│${colors.reset} ${ColorSystem.colorize(fullCommand, colors.electricBlue)}`
      ];

      console.log(); // Spacing before

      // Custom box for command header
      const boxWidth = Math.max(70, ColorSystem.visibleLength(fullCommand) + info.category.length + 10);
      const topBorder = `${colors.neonCyan}╭─┤ ${colors.bright}${info.category}${colors.reset}${colors.neonCyan} ├${"─".repeat(Math.max(boxWidth - info.category.length - 7, 5))}╮${colors.reset}`;
      const contentLine = `${colors.neonCyan}│${colors.reset} ${colors.neonPink}▸${colors.reset} ${ColorSystem.colorize(fullCommand, colors.electricBlue)} ${" ".repeat(Math.max(boxWidth - ColorSystem.visibleLength(fullCommand) - 3, 0))}${colors.neonCyan}│${colors.reset}`;
      const bottomBorder = `${colors.neonCyan}╰${"─".repeat(boxWidth)}╯${colors.reset}`;

      console.log(topBorder);
      console.log(contentLine);
      console.log(bottomBorder);
      console.log(); // Spacing after header

      // Run the command with inherited stdio for direct output
      const result = await CommandRunner.run(cmd, args, { inherit: true });

      // Show enhanced status indicator
      console.log(); // Spacing before status
      if (result.success) {
        const statusMsg = `✓ Command completed successfully`;
        console.log(
          `${colors.dim}${colors.neonCyan}└─▸${colors.reset} ${ColorSystem.colorize(statusMsg, colors.neonGreen)}`
        );
      } else {
        const statusMsg = `✗ Exit code: ${result.code}`;
        console.log(
          `${colors.dim}${colors.neonCyan}└─▸${colors.reset} ${ColorSystem.colorize(statusMsg, colors.red)}${colors.bright}${colors.reset}`
        );
      }
      console.log(); // Extra spacing
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);

      // Check if command doesn't exist
      if (
        errorMessage.includes("No such file or directory") ||
        errorMessage.includes("entity not found")
      ) {
        console.log();
        BoxRenderer.render(
          [
            `${ColorSystem.colorize("⚠️  COMMAND NOT FOUND", colors.red)}`,
            "",
            `Unknown command: ${ColorSystem.colorize(cmd, colors.electricBlue)}`,
            `Type ${ColorSystem.colorize("'help'", colors.neonGreen)} for available Genesis commands`,
          ],
          { style: "rounded", color: colors.red, padding: 1 }
        );
        console.log();
      } else {
        console.log();
        BoxRenderer.render(
          [
            `${ColorSystem.colorize("💥 EXECUTION ERROR", colors.red)}`,
            "",
            errorMessage,
          ],
          { style: "rounded", color: colors.red, padding: 1 }
        );
        console.log();
      }
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
    const totalUptime = this.formatUptime(Date.now() - this.startTime);

    console.log();
    BoxRenderer.render(
      [
        `${ColorSystem.colorize("👋 Exiting Genesis REPL", colors.neonPink)}`,
        "",
        `${ColorSystem.colorize(`Commands executed: ${this.commandCount}`, colors.dim)}`,
        `${ColorSystem.colorize(`Session uptime: ${totalUptime}`, colors.dim)}`,
        "",
        `${ColorSystem.colorize("May your code be elegant and your deploys swift.", colors.neonCyan)}${colors.dim}${colors.reset}`,
      ],
      { style: "rounded", color: colors.neonCyan, padding: 1, align: "center" }
    );
    console.log();
    this.running = false;
  }

  /**
   * Get autocomplete suggestions for partial input
   */
  private getAutocompleteSuggestions(partial: string): string[] {
    const matches: string[] = [];
    const seen = new Set<string>();

    for (const [name, cmd] of this.commands.entries()) {
      // Only show primary command names (not aliases) unless they match
      if (name.startsWith(partial) && !seen.has(cmd.name)) {
        if (name === cmd.name) {
          matches.push(name);
          seen.add(cmd.name);
        } else if (partial.length > 0) {
          // Show aliases only if user has typed something
          matches.push(name);
        }
      }
    }

    return matches.sort();
  }

  /**
   * Read a line with tab completion support
   */
  private async readLineWithCompletion(): Promise<string | null> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let line = "";
    let cursor = 0;

    // Enable raw mode for character-by-character input
    Deno.stdin.setRaw(true);

    try {
      while (true) {
        const buffer = new Uint8Array(16);
        const n = await Deno.stdin.read(buffer);

        if (n === null) {
          return null; // EOF (Ctrl+D)
        }

        const data = buffer.subarray(0, n);

        // Handle different key inputs
        if (n === 1 && data[0] === 0x04) {
          // Ctrl+D - EOF
          if (line.length === 0) {
            return null;
          }
          continue;
        } else if (n === 1 && data[0] === 0x03) {
          // Ctrl+C - clear line
          await Deno.stdout.write(
            encoder.encode(
              "\r" + " ".repeat(this.getPrompt().length + line.length + 10) +
                "\r",
            ),
          );
          return "";
        } else if (n === 1 && data[0] === 0x09) {
          // Tab - autocomplete
          const suggestions = this.getAutocompleteSuggestions(line);

          if (suggestions.length === 1) {
            // Single match - complete it
            const completion = suggestions[0];
            // Clear current line
            await Deno.stdout.write(
              encoder.encode(
                "\r" + " ".repeat(this.getPrompt().length + line.length + 10) +
                  "\r",
              ),
            );
            await Deno.stdout.write(encoder.encode(this.getPrompt()));
            line = completion;
            cursor = line.length;
            await Deno.stdout.write(encoder.encode(line));
          } else if (suggestions.length > 1) {
            // Multiple matches - show them
            await Deno.stdout.write(encoder.encode("\n"));
            const maxLen = Math.max(...suggestions.map((s) => s.length));
            const columns = Math.floor(80 / (maxLen + 2));

            for (let i = 0; i < suggestions.length; i++) {
              await Deno.stdout.write(encoder.encode(
                colors.neonGreen + suggestions[i].padEnd(maxLen + 2) +
                  colors.reset,
              ));
              if ((i + 1) % columns === 0) {
                await Deno.stdout.write(encoder.encode("\n"));
              }
            }
            if (suggestions.length % columns !== 0) {
              await Deno.stdout.write(encoder.encode("\n"));
            }

            // Redisplay prompt and current line
            await Deno.stdout.write(encoder.encode(this.getPrompt() + line));
          }
        } else if (n === 1 && data[0] === 0x7F) {
          // Backspace
          if (cursor > 0) {
            line = line.slice(0, cursor - 1) + line.slice(cursor);
            cursor--;
            // Redraw line
            await Deno.stdout.write(
              encoder.encode(
                "\r" + this.getPrompt() + line + " \r" + this.getPrompt(),
              ),
            );
            await Deno.stdout.write(encoder.encode(line.slice(0, cursor)));
          }
        } else if (n === 1 && (data[0] === 0x0A || data[0] === 0x0D)) {
          // Enter/Return
          await Deno.stdout.write(encoder.encode("\n"));
          return line;
        } else if (n === 3 && data[0] === 0x1B && data[1] === 0x5B) {
          // Arrow keys and other escape sequences
          if (data[2] === 0x44 && cursor > 0) {
            // Left arrow
            cursor--;
            await Deno.stdout.write(encoder.encode("\x1b[D"));
          } else if (data[2] === 0x43 && cursor < line.length) {
            // Right arrow
            cursor++;
            await Deno.stdout.write(encoder.encode("\x1b[C"));
          }
          // Ignore up/down arrows for now
        } else if (n === 1 && data[0] >= 0x20 && data[0] <= 0x7E) {
          // Printable character
          const char = decoder.decode(data);
          line = line.slice(0, cursor) + char + line.slice(cursor);
          cursor++;
          // Redraw from cursor position
          await Deno.stdout.write(encoder.encode(char));
          if (cursor < line.length) {
            await Deno.stdout.write(
              encoder.encode(line.slice(cursor) + "\r" + this.getPrompt()),
            );
            await Deno.stdout.write(encoder.encode(line.slice(0, cursor)));
          }
        }
      }
    } finally {
      // Restore normal mode
      Deno.stdin.setRaw(false);
    }
  }

  /**
   * Start the REPL
   */
  async start(): Promise<void> {
    this.running = true;
    console.clear();
    this.displayWelcome();

    const encoder = new TextEncoder();

    while (this.running) {
      // Display prompt
      await Deno.stdout.write(encoder.encode(this.getPrompt()));

      // Read input with tab completion
      const input = await this.readLineWithCompletion();

      if (input === null) {
        // EOF reached (Ctrl+D)
        this.exit();
        break;
      }

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
