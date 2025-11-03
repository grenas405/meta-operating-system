#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env

/**
 * Deno Genesis Dev Command
 *
 * Unix Philosophy Implementation:
 * - Do one thing well: Start development server with hot reload
 * - Accept text input: Port configuration and watch patterns
 * - Produce text output: Structured development logs and status
 * - Filter and transform: File changes → server restarts
 * - Composable: Can be scripted, automated, integrated with other tools
 *
 * Security-First Approach:
 * - Explicit permissions for file watching and process spawning
 * - Safe process management with cleanup handlers
 * - Auditable file access patterns
 *
 * Zero-Configuration Philosophy:
 * - Sensible defaults for all options
 * - Auto-detection of site configuration
 * - Self-documenting output with color-coded logs
 */

import {
  join,
  relative,
  resolve,
} from "https://deno.land/std@0.224.0/path/mod.ts";
import { exists } from "https://deno.land/std@0.224.0/fs/mod.ts";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface CLIContext {
  cwd: string;
  configPath: string;
  verbose: boolean;
  dryRun: boolean;
  format: "text" | "json" | "yaml";
}

interface DevOptions {
  port?: number;
  host?: string;
  watch?: string[];
  excludeWatch?: string[];
  clearScreen?: boolean;
  openBrowser?: boolean;
  noReload?: boolean;
}

interface SiteConfig {
  name: string;
  port: number;
  directory: string;
  mainFile: string;
}

interface WatchPattern {
  include: string[];
  exclude: string[];
}

// ============================================================================
// CONSTANTS AND DEFAULTS
// ============================================================================

const DEFAULT_DEV_CONFIG = {
  host: "localhost",
  port: 3000,
  clearScreen: true,
  openBrowser: false,
  noReload: false,
  mainFile: "main.ts",
};

const DEFAULT_WATCH_PATTERNS: WatchPattern = {
  include: [
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx",
    "**/*.json",
    "**/*.css",
    "**/*.html",
    "**/*.md",
  ],
  exclude: [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
    "**/*.log",
    "**/logs/**",
    "**/.env*",
    "**/deno-genesis-cli/**",
  ],
};

// Color utilities for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

function logInfo(message: string): void {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function logSuccess(message: string): void {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logWarning(message: string): void {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function logError(message: string): void {
  console.error(`${colors.red}✗${colors.reset} ${message}`);
}

function logSection(title: string): void {
  console.log(
    `\n${colors.cyan}${colors.bright}━━━ ${title} ━━━${colors.reset}\n`,
  );
}

function logBox(lines: string[], title?: string): void {
  const maxLength = Math.max(...lines.map((l) => l.length), title?.length || 0);
  const border = "─".repeat(maxLength + 4);

  console.log(`\n${colors.cyan}┌${border}┐${colors.reset}`);

  if (title) {
    const padding = " ".repeat(Math.floor((maxLength - title.length) / 2));
    console.log(
      `${colors.cyan}│${colors.reset}  ${padding}${colors.bright}${title}${colors.reset}${padding}  ${colors.cyan}│${colors.reset}`,
    );
    console.log(`${colors.cyan}├${border}┤${colors.reset}`);
  }

  lines.forEach((line) => {
    const padding = " ".repeat(maxLength - line.length);
    console.log(
      `${colors.cyan}│${colors.reset}  ${line}${padding}  ${colors.cyan}│${colors.reset}`,
    );
  });

  console.log(`${colors.cyan}└${border}┘${colors.reset}\n`);
}

// ============================================================================
// ARGUMENT PARSING
// ============================================================================

function parseDevArgs(args: string[]): DevOptions {
  const options: DevOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--port" && args[i + 1]) {
      options.port = parseInt(args[++i], 10);
    } else if (arg === "--host" && args[i + 1]) {
      options.host = args[++i];
    } else if (arg === "--watch" && args[i + 1]) {
      options.watch = args[++i].split(",");
    } else if (arg === "--exclude" && args[i + 1]) {
      options.excludeWatch = args[++i].split(",");
    } else if (arg === "--no-clear") {
      options.clearScreen = false;
    } else if (arg === "--open") {
      options.openBrowser = true;
    } else if (arg === "--no-reload") {
      options.noReload = true;
    }
  }

  return options;
}

// ============================================================================
// SITE CONFIGURATION DETECTION
// ============================================================================

async function detectSiteConfig(
  context: CLIContext,
): Promise<SiteConfig | null> {
  try {
    // Try to find site-config.ts in current directory
    const siteConfigPath = join(context.cwd, "site-config.ts");

    if (await exists(siteConfigPath)) {
      logInfo(
        `Found site configuration: ${relative(context.cwd, siteConfigPath)}`,
      );

      // Dynamically import the configuration
      const configModule = await import(`file://${siteConfigPath}`);
      const config = configModule.SITE_CONFIG || configModule.default;

      return {
        name: config.name || "unknown",
        port: config.port || DEFAULT_DEV_CONFIG.port,
        directory: context.cwd,
        mainFile: config.mainFile || "main.ts",
      };
    }

    // Try to find main.ts or mod.ts
    const mainFiles = ["main.ts", "mod.ts", "server.ts", "app.ts"];

    for (const file of mainFiles) {
      const mainPath = join(context.cwd, file);
      if (await exists(mainPath)) {
        logInfo(`Found entry point: ${file}`);
        return {
          name: "dev-site",
          port: DEFAULT_DEV_CONFIG.port,
          directory: context.cwd,
          mainFile: file,
        };
      }
    }

    return null;
  } catch (error) {
    logError(`Failed to detect site configuration: ${error.message}`);
    return null;
  }
}

// ============================================================================
// FILE WATCHING LOGIC
// ============================================================================

function shouldWatchFile(path: string, patterns: WatchPattern): boolean {
  const relativePath = path.replace(/\\/g, "/");

  // Check exclude patterns first
  for (const pattern of patterns.exclude) {
    if (matchPattern(relativePath, pattern)) {
      return false;
    }
  }

  // Check include patterns
  for (const pattern of patterns.include) {
    if (matchPattern(relativePath, pattern)) {
      return true;
    }
  }

  return false;
}

function matchPattern(path: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]");

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

// ============================================================================
// DEVELOPMENT SERVER MANAGEMENT
// ============================================================================

let currentProcess: Deno.ChildProcess | null = null;
let isRestarting = false;
let restartTimer: number | null = null;

async function startDevServer(
  siteConfig: SiteConfig,
  options: DevOptions,
  context: CLIContext,
): Promise<void> {
  if (isRestarting) {
    return;
  }

  isRestarting = true;

  // Kill existing process if running
  if (currentProcess) {
    try {
      currentProcess.kill("SIGTERM");
      await currentProcess.status;
    } catch {
      // Process already terminated
    }
    currentProcess = null;
  }

  // Clear screen if enabled
  if (options.clearScreen !== false && DEFAULT_DEV_CONFIG.clearScreen) {
    console.clear();
  }

  logSection("Starting Development Server");

  const port = options.port || siteConfig.port;
  const host = options.host || DEFAULT_DEV_CONFIG.host;
  const mainFile = join(siteConfig.directory, siteConfig.mainFile);

  logBox([
    `Site: ${colors.bright}${siteConfig.name}${colors.reset}`,
    `Entry: ${colors.dim}${relative(context.cwd, mainFile)}${colors.reset}`,
    `URL: ${colors.green}http://${host}:${port}${colors.reset}`,
    `Environment: ${colors.yellow}development${colors.reset}`,
  ], "Server Configuration");

  try {
    // Create the Deno command with all necessary permissions
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--allow-all", // In development, allow all permissions
        mainFile,
      ],
      env: {
        ...Deno.env.toObject(),
        DENO_ENV: "development",
        PORT: port.toString(),
        HOST: host,
      },
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });

    currentProcess = command.spawn();

    logSuccess("Development server started");
    logInfo("Watching for file changes...");
    logInfo(`Press ${colors.bright}Ctrl+C${colors.reset} to stop\n`);

    // Wait for process to complete (it won't unless there's an error)
    const status = await currentProcess.status;

    if (!status.success && !isRestarting) {
      logError(`Server exited with code ${status.code}`);
    }
  } catch (error) {
    logError(`Failed to start server: ${error.message}`);
  } finally {
    isRestarting = false;
  }
}

function scheduleRestart(
  siteConfig: SiteConfig,
  options: DevOptions,
  context: CLIContext,
  delay: number = 300,
): void {
  if (options.noReload) {
    logWarning("Hot reload disabled - restart manually");
    return;
  }

  // Clear existing restart timer
  if (restartTimer !== null) {
    clearTimeout(restartTimer);
  }

  // Schedule restart with debounce
  restartTimer = setTimeout(() => {
    logInfo(
      `${colors.yellow}File change detected - restarting server...${colors.reset}`,
    );
    startDevServer(siteConfig, options, context);
    restartTimer = null;
  }, delay);
}

// ============================================================================
// FILE WATCHER SETUP
// ============================================================================

async function setupFileWatcher(
  siteConfig: SiteConfig,
  options: DevOptions,
  context: CLIContext,
): Promise<void> {
  const watchPatterns: WatchPattern = {
    include: options.watch || DEFAULT_WATCH_PATTERNS.include,
    exclude: options.excludeWatch || DEFAULT_WATCH_PATTERNS.exclude,
  };

  if (context.verbose) {
    logInfo("Watch patterns:");
    console.log(`  Include: ${watchPatterns.include.join(", ")}`);
    console.log(`  Exclude: ${watchPatterns.exclude.join(", ")}`);
  }

  const watcher = Deno.watchFs(siteConfig.directory, { recursive: true });

  for await (const event of watcher) {
    if (
      event.kind === "modify" || event.kind === "create" ||
      event.kind === "remove"
    ) {
      // Check if any of the changed files match our watch patterns
      const shouldRestart = event.paths.some((path) =>
        shouldWatchFile(path, watchPatterns)
      );

      if (shouldRestart) {
        const changedFiles = event.paths
          .filter((path) => shouldWatchFile(path, watchPatterns))
          .map((path) => relative(context.cwd, path))
          .join(", ");

        if (context.verbose) {
          logInfo(`Change detected: ${changedFiles}`);
        }

        scheduleRestart(siteConfig, options, context);
      }
    }
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

function setupGracefulShutdown(): void {
  const cleanup = async () => {
    logSection("Shutting Down");

    if (currentProcess) {
      logInfo("Stopping development server...");
      try {
        currentProcess.kill("SIGTERM");
        await currentProcess.status;
      } catch {
        // Already terminated
      }
    }

    if (restartTimer !== null) {
      clearTimeout(restartTimer);
    }

    logSuccess("Development server stopped cleanly");
    Deno.exit(0);
  };

  // Handle Ctrl+C
  Deno.addSignalListener("SIGINT", cleanup);

  // Handle process termination
  Deno.addSignalListener("SIGTERM", cleanup);
}

// ============================================================================
// BROWSER OPENING
// ============================================================================

async function openBrowser(url: string): Promise<void> {
  try {
    const os = Deno.build.os;
    let command: string[];

    switch (os) {
      case "darwin":
        command = ["open", url];
        break;
      case "windows":
        command = ["cmd", "/c", "start", url];
        break;
      default: // linux
        command = ["xdg-open", url];
        break;
    }

    const process = new Deno.Command(command[0], {
      args: command.slice(1),
      stdout: "null",
      stderr: "null",
    }).spawn();

    await process.status;
    logSuccess(`Opened browser at ${url}`);
  } catch (error) {
    logWarning(`Failed to open browser: ${error.message}`);
  }
}

// ============================================================================
// MAIN COMMAND HANDLER
// ============================================================================

export async function devCommand(
  args: string[],
  context: CLIContext,
): Promise<number> {
  try {
    // Display header
    logBox([
      "🔥 Development Server with Hot Reload",
      "",
      "Unix Philosophy + Modern Runtime = Fast Development",
      "File changes automatically restart the server",
    ], "Deno Genesis Dev Mode");

    // Parse command line options
    const options = parseDevArgs(args);

    // Detect site configuration
    const siteConfig = await detectSiteConfig(context);

    if (!siteConfig) {
      logError("Could not detect site configuration or entry point");
      logInfo("Make sure you're in a Genesis site directory with:");
      logInfo("  - site-config.ts, or");
      logInfo("  - main.ts/mod.ts/server.ts/app.ts");
      return 1;
    }

    // Validate entry point exists
    const entryPath = join(siteConfig.directory, siteConfig.mainFile);
    if (!await exists(entryPath)) {
      logError(`Entry point not found: ${siteConfig.mainFile}`);
      return 1;
    }

    // Setup graceful shutdown handlers
    setupGracefulShutdown();

    // Start the development server
    await startDevServer(siteConfig, options, context);

    // Open browser if requested
    if (options.openBrowser) {
      const port = options.port || siteConfig.port;
      const host = options.host || DEFAULT_DEV_CONFIG.host;
      await openBrowser(`http://${host}:${port}`);
    }

    // Setup file watcher for hot reload
    await setupFileWatcher(siteConfig, options, context);

    return 0;
  } catch (error) {
    logError(`Dev command failed: ${error.message}`);
    if (context.verbose) {
      console.error(error.stack);
    }
    return 1;
  }
}

// ============================================================================
// HELP TEXT
// ============================================================================

export function showDevHelp(): void {
  console.log(`
${colors.cyan}${colors.bright}genesis dev${colors.reset} - Start development server with hot reload

${colors.bright}USAGE:${colors.reset}
  genesis dev [options]

${colors.bright}OPTIONS:${colors.reset}
  --port <number>          Port to run the server on (default: from site-config.ts or 3000)
  --host <string>          Host to bind to (default: localhost)
  --watch <patterns>       Comma-separated file patterns to watch (default: **/*.ts,**/*.css,**/*.html)
  --exclude <patterns>     Comma-separated patterns to exclude from watching
  --no-clear               Don't clear screen on restart
  --open                   Open browser automatically
  --no-reload              Disable automatic reload on file changes

${colors.bright}EXAMPLES:${colors.reset}
  ${colors.dim}# Start dev server with default settings${colors.reset}
  genesis dev

  ${colors.dim}# Start on a specific port${colors.reset}
  genesis dev --port 3005

  ${colors.dim}# Watch additional file types${colors.reset}
  genesis dev --watch "**/*.ts,**/*.json,**/*.md"

  ${colors.dim}# Exclude certain directories from watching${colors.reset}
  genesis dev --exclude "**/*.test.ts,**/temp/**"

  ${colors.dim}# Open browser automatically${colors.reset}
  genesis dev --open

  ${colors.dim}# Disable hot reload (manual restarts only)${colors.reset}
  genesis dev --no-reload

${colors.bright}FEATURES:${colors.reset}
  • Hot reload on file changes
  • Automatic restart with debouncing
  • Color-coded logging
  • Graceful shutdown handling
  • Browser auto-opening
  • Configurable watch patterns
  • Zero-configuration defaults

${colors.bright}FILE WATCHING:${colors.reset}
  By default, watches: ${colors.dim}TypeScript, JavaScript, CSS, HTML, JSON, Markdown${colors.reset}
  Automatically excludes: ${colors.dim}node_modules, .git, dist, build, logs${colors.reset}

${colors.bright}SECURITY:${colors.reset}
  In development mode, all Deno permissions are granted.
  Production deployments use explicit, minimal permissions.

${colors.bright}UNIX PHILOSOPHY:${colors.reset}
  • Do one thing well: Development server with hot reload
  • Composable: Works with other Genesis commands
  • Text-based: All output is human-readable and parseable
  • Explicit: Clear permissions and behavior
`);
}

// ============================================================================
// EXPORT FOR CLI INTEGRATION
// ============================================================================

// This allows the command to be imported and used by the main CLI
if (import.meta.main) {
  const mockContext: CLIContext = {
    cwd: Deno.cwd(),
    configPath: join(Deno.cwd(), "genesis.config.ts"),
    verbose: Deno.args.includes("--verbose"),
    dryRun: false,
    format: "text",
  };

  if (Deno.args.includes("--help") || Deno.args.includes("-h")) {
    showDevHelp();
    Deno.exit(0);
  }

  const exitCode = await devCommand(Deno.args, mockContext);
  Deno.exit(exitCode);
}
