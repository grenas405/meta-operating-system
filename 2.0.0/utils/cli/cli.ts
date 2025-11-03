#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env

/**
 * Deno Genesis CLI Tool
 *
 * Unix Philosophy Implementation:
 * - Do one thing well: Orchestrate Genesis framework operations
 * - Accept text input: Commands, configuration files, environment variables
 * - Produce text output: Structured logging, JSON output, status reports
 * - Filter and transform: Take user intent → execute framework operations
 * - Composable: Each subcommand can be piped, scripted, automated
 *
 * Security-First Composition:
 * - Explicit permissions for each operation
 * - No hidden access rights
 * - Auditable command execution
 *
 * Zero-Configuration Complexity:
 * - No build steps required
 * - Direct TypeScript execution
 * - Sensible defaults everywhere
 */

import { dirname, exists, join, parseArgs } from "./deps.ts";

import { initCommand } from "./commands/init.ts";
import { deployCommand, showDeployHelp } from "./commands/deploy.ts";
import { dbCommand, showDbHelp } from "./commands/db.ts";
import { newCommand } from "./commands/new.ts";
import { devCommand } from "./commands/dev.ts";
import { manCommand } from "./commands/man.ts";

// Types
interface CLIContext {
  cwd: string;
  configPath: string;
  verbose: boolean;
  dryRun: boolean;
  format: "text" | "json" | "yaml";
}

interface CommandDefinition {
  name: string;
  description: string;
  usage: string;
  examples: string[];
  handler: (args: string[], context: CLIContext) => Promise<number>;
  permissions: string[];
}

// ✅ CORRECTED Command registry
const COMMANDS: Record<string, CommandDefinition> = {
  init: {
    name: "init",
    description:
      "Initialize new Genesis project with hub-and-spoke architecture",
    usage: "genesis init [project-name] [--template=basic|full|enterprise]",
    examples: [
      "genesis init my-project",
      "genesis init enterprise-app --template=enterprise",
      "genesis init . --template=basic",
    ],
    handler: initCommand,
    permissions: ["--allow-read", "--allow-write", "--allow-net"],
  },

  // ✅ FIXED: dev command with correct information
  dev: {
    name: "dev",
    description: "Start development server with hot reload and file watching",
    usage: "genesis dev [options]",
    examples: [
      "genesis dev",
      "genesis dev --port 3005",
      "genesis dev --watch '**/*.ts,**/*.json,**/*.md'",
      "genesis dev --exclude '**/*.test.ts,**/temp/**'",
      "genesis dev --open",
      "genesis dev --no-reload",
    ],
    handler: devCommand,
    permissions: [
      "--allow-read",
      "--allow-write",
      "--allow-net",
      "--allow-run",
    ],
  },

  // ✅ FIXED: new command with correct information
  new: {
    name: "new",
    description:
      "Generate industry-specific frontend based on business information",
    usage: "genesis new [options]",
    examples: [
      "genesis new",
      "genesis new --verbose",
      "genesis new --dry-run",
    ],
    handler: newCommand,
    permissions: ["--allow-read", "--allow-write"],
  },

  deploy: {
    name: "deploy",
    description:
      "Generate nginx and systemd configuration files for site deployment",
    usage: "genesis deploy [domain] [options]",
    examples: [
      "genesis deploy example.com",
      "genesis deploy example.com --port 3005",
      "genesis deploy example.com --nginx-only",
      "genesis deploy example.com --systemd-only --port 3003",
    ],
    handler: deployCommand,
    permissions: ["--allow-read", "--allow-write"],
  },

  man: {
    name: "man",
    description: "Display Genesis manual pages with interactive pager",
    usage: "genesis man <command>",
    examples: [
      "genesis man",
      "genesis man init",
      "genesis man dev",
    ],
    handler: manCommand,
    permissions: ["--allow-read", "--allow-env"],
  },

  db: {
    name: "db",
    description: "Setup MariaDB database with multi-tenant architecture",
    usage: "genesis db [options]",
    examples: [
      "genesis db",
      "genesis db --name my_database",
      "genesis db --user myuser --password mypassword",
      "genesis db --test-only",
    ],
    handler: dbCommand,
    permissions: [
      "--allow-read",
      "--allow-write",
      "--allow-run",
      "--allow-env",
    ],
  },
};

// === Utility: Dry-run wrapper ===
function runWithDryRun(
  fn: (args: string[], ctx: CLIContext) => Promise<number>,
  args: string[],
  ctx: CLIContext,
): Promise<number> {
  if (ctx.dryRun) {
    console.log(
      `💡 Dry run: Would execute '${fn.name}' with args:`,
      args,
    );
    return 0;
  }
  return fn(args, ctx);
}

// Help + version
function showHelp(command?: string): void {
  if (command && COMMANDS[command]) {
    // Show command-specific help
    if (command === "deploy") {
      showDeployHelp();
      return;
    }

    if (command === "db") {
      showDbHelp();
      return;
    }

    const cmd = COMMANDS[command];
    console.log(`\n${cmd.name} - ${cmd.description}\n`);
    console.log(`Usage: ${cmd.usage}\n`);
    console.log("Examples:");
    cmd.examples.forEach((example) => console.log(`  ${example}`));
    console.log(`\nRequired permissions: ${cmd.permissions.join(" ")}\n`);
    return;
  }

  // ✅ UPDATED: Main help with corrected command descriptions
  console.log(`
🚀 Deno Genesis CLI - Unix Philosophy + Modern Runtime = Revolutionary Development

USAGE:
  genesis <command> [options]

CORE COMMANDS:
  init       Initialize new Genesis project with hub-and-spoke architecture
  dev        Start development server with hot reload and file watching
  new        Generate industry-specific frontend based on business information
  deploy     Generate nginx and systemd configuration files for deployment
  db         Setup MariaDB database with multi-tenant architecture

OPTIONS:
  --help, -h     Show this help message
  --version, -v  Show version information
  --verbose      Enable verbose output
  --dry-run      Show what would be done without executing
  --format       Output format: text, json, yaml

EXAMPLES:
  genesis init my-project
  genesis init enterprise-app --template=enterprise
  genesis dev --port 3005 --open
  genesis new --verbose
  genesis deploy example.com
  genesis deploy example.com --port 3005
  genesis db
  genesis db --test-only

For detailed help on any command:
  genesis help <command>

🔒 SECURITY: All operations use explicit Deno permissions
📖 DOCS: https://github.com/grenas405/deno-genesis/docs
💬 SUPPORT: https://github.com/grenas405/deno-genesis/issues
`);
}

function showVersion(): void {
  console.log(`
Deno Genesis Framework v2.0.0
Runtime: Deno ${Deno.version.deno}
TypeScript: ${Deno.version.typescript}
V8: ${Deno.version.v8}

Built with Unix Philosophy principles:
- Do one thing well ✓
- Composable by design ✓  
- Text-based configuration ✓
- Explicit security ✓
- Zero-configuration complexity ✓
`);
}

async function detectGenesisProject(): Promise<string | null> {
  let currentDir = Deno.cwd();

  while (currentDir !== dirname(currentDir)) {
    const configPath = join(currentDir, "genesis.config.ts");
    if (await exists(configPath)) {
      return currentDir;
    }
    currentDir = dirname(currentDir);
  }

  return null;
}

async function createCLIContext(
  args: ReturnType<typeof parseArgs>,
): Promise<CLIContext> {
  const projectRoot = await detectGenesisProject();
  const cwd = projectRoot || Deno.cwd();

  return {
    cwd,
    configPath: join(cwd, "genesis.config.ts"),
    verbose: Boolean(args.verbose),
    dryRun: Boolean(args["dry-run"]),
    format: (args.format as "text" | "json" | "yaml") || "text",
  };
}

// === Main CLI entry point ===
async function main(): Promise<number> {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "version", "verbose", "dry-run"],
    string: ["format"],
    alias: { h: "help", v: "version" },
    unknown: (arg: string) => {
      if (arg.startsWith("-")) {
        console.error(`❌ Unknown option: ${arg}`);
        return false;
      }
      return true;
    },
  });

  if (args.help) {
    const command = args._[0] as string;
    await showHelp(command);
    return 0;
  }

  if (args.version) {
    await showVersion();
    return 0;
  }

  const command = args._[0] as string;
  const commandArgs = args._.slice(1) as string[];

  if (!command) {
    await showHelp();
    return 1;
  }

  if (command === "help") {
    const helpCommand = commandArgs[0];
    await showHelp(helpCommand);
    return 0;
  }

  if (!COMMANDS[command]) {
    console.error(`❌ Unknown command: ${command}`);
    console.error(`Run 'genesis help' for available commands.`);
    return 1;
  }

  try {
    const context = await createCLIContext(args);

    if (context.verbose) {
      console.log(
        `🔒 Required permissions: ${COMMANDS[command].permissions.join(" ")}`,
      );
      console.log(`📁 Working directory: ${context.cwd}`);
      console.log(`⚙️  Configuration: ${context.configPath}`);
    }

    const exitCode = await runWithDryRun(
      COMMANDS[command].handler,
      commandArgs,
      context,
    );
    return exitCode;
  } catch (error) {
    console.error(`❌ Error executing '${command}':`, error.message);
    if (args.verbose) console.error(error.stack);
    return 1;
  }
}

// Clear exit codes
if (import.meta.main) {
  const exitCode = await main();
  Deno.exit(exitCode);
}
