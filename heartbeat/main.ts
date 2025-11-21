// ==============================================================================
// Heartbeat Monitor CLI
// ------------------------------------------------------------------------------
// Entry point for the heartbeat monitoring system
// ==============================================================================

import type { ILogger } from "../core/interfaces/ILogger.ts";
import type { SystemMetrics } from "./types/SystemMetrics.ts";
import type { MonitorMode, ProcessStatus } from "./modes/types.ts";
import type { ICommandRunner, ISystemInfo } from "./adapters/interfaces.ts";

import { GenesisTraceAdapter } from "./adapters/GenesisTraceAdapter.ts";
import { DenoCommandRunner, DenoSystemInfo } from "./adapters/DenoAdapters.ts";
import { DEFAULT_CONFIG, type HeartbeatConfig } from "./config/HeartbeatConfig.ts";
import { createServerMode } from "./modes/ServerMode.ts";
import { createWindowMode } from "./modes/WindowMode.ts";
import { createJournalMode } from "./modes/JournalMode.ts";

// ==============================================================================
// Types
// ==============================================================================

interface CliOptions {
  mode?: MonitorModeKey;
  list: boolean;
  help: boolean;
  unknown: string[];
}

type MonitorModeKey = "window" | "server" | "journal";

// ==============================================================================
// Mode Registry
// ==============================================================================

interface ModeFactory {
  (logger: ILogger, config: HeartbeatConfig): MonitorMode;
}

const MODE_FACTORIES: Record<MonitorModeKey, ModeFactory> = {
  window: (logger, config) => createWindowMode({ logger, config }),
  server: (logger, config) => createServerMode({ logger, config }),
  journal: (logger, config) => createJournalMode({ logger, config }),
};

// ==============================================================================
// CLI Argument Parser
// ==============================================================================

function isModeKey(value: string): value is MonitorModeKey {
  return Object.hasOwn(MODE_FACTORIES, value);
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    mode: undefined,
    list: false,
    help: false,
    unknown: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--mode":
      case "-m": {
        const modeValue = args[i + 1];
        if (!modeValue) {
          options.unknown.push(arg);
        } else if (isModeKey(modeValue)) {
          options.mode = modeValue;
          i++;
        } else {
          options.unknown.push(`${arg} ${modeValue}`);
          i++;
        }
        break;
      }
      case "--list":
      case "-l":
        options.list = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        if (!options.mode && isModeKey(arg)) {
          options.mode = arg;
        } else {
          options.unknown.push(arg);
        }
    }
  }

  return options;
}

// ==============================================================================
// Help & List Output
// ==============================================================================

function printModeList(logger: ILogger, config: HeartbeatConfig): void {
  logger.logSection("Available Monitor Modes", "brightCyan", "heavy");
  for (const [key, factory] of Object.entries(MODE_FACTORIES)) {
    const mode = factory(logger, config);
    console.log(`- ${key.padEnd(9)} ${mode.description}`);
  }
}

function printHelp(logger: ILogger, config: HeartbeatConfig): void {
  logger.logSection("Heartbeat Monitor CLI", "brightCyan", "heavy");
  console.log(
    "Usage: deno run --allow-run --allow-read --allow-env --allow-sys main.ts [options]",
  );
  console.log(
    "       deno run --allow-run --allow-read --allow-env --allow-sys main.ts [mode]\n",
  );

  logger.logInfo("Options:");
  console.log("  -m, --mode <mode>   Select monitor mode");
  console.log("  -l, --list          Show available modes");
  console.log("  -h, --help          Show this help message\n");

  logger.logInfo("Modes:");
  for (const [key, factory] of Object.entries(MODE_FACTORIES)) {
    const mode = factory(logger, config);
    console.log(`  ${key.padEnd(9)} ${mode.description}`);
  }
  console.log("");

  logger.logInfo("Examples:");
  console.log("  deno task start                 # Launch window mode monitor");
  console.log(
    "  deno run --allow-run --allow-read --allow-env --allow-sys main.ts window",
  );
  console.log(
    "  deno run --allow-run --allow-read --allow-env --allow-sys main.ts --mode journal",
  );
  console.log(
    "  deno run --allow-run --allow-read --allow-env --allow-sys main.ts journal",
  );
  console.log("");
}

// ==============================================================================
// Stream Processing
// ==============================================================================

const STDOUT_DECODER = new TextDecoder();
const STDERR_DECODER = new TextDecoder();

async function pumpStderr(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  logger: ILogger,
): Promise<void> {
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      const text = STDERR_DECODER.decode(value);
      const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
      for (const line of lines) {
        logger.logWarning("Monitor stderr", { message: line });
      }
    }
  } catch (error) {
    logger.logError("Failed to read stderr", { error: String(error) });
  } finally {
    reader.releaseLock();
  }
}

// ==============================================================================
// Monitor Runner
// ==============================================================================

interface MonitorRunnerDeps {
  logger: ILogger;
  config: HeartbeatConfig;
  commandRunner: ICommandRunner;
  systemInfo: ISystemInfo;
}

async function runMonitor(
  modeKey: MonitorModeKey,
  deps: MonitorRunnerDeps,
): Promise<void> {
  const { logger, config, commandRunner, systemInfo } = deps;
  const factory = MODE_FACTORIES[modeKey];
  const mode = factory(logger, config);

  await mode.onStart?.();

  // Get the directory where this script is located (heartbeat directory)
  const scriptDir = new URL(".", import.meta.url).pathname;

  const process = commandRunner.spawn({
    command: "cargo",
    args: ["run", "--release", "--quiet"],
    cwd: scriptDir,
  });

  const stdoutReader = process.stdout.getReader();
  const stderrReader = process.stderr?.getReader();
  const stderrPump = stderrReader
    ? pumpStderr(stderrReader, logger)
    : Promise.resolve();

  try {
    while (true) {
      const { done, value } = await stdoutReader.read();
      if (done) break;
      if (!value) continue;

      const chunk = STDOUT_DECODER.decode(value);
      const lines = chunk.split("\n").filter((line) => line.trim().length > 0);

      for (const line of lines) {
        try {
          const metrics = JSON.parse(line) as SystemMetrics;
          await mode.onMetrics(metrics);
        } catch (error) {
          logger.logError("Failed to parse metrics", {
            line: line.substring(0, 100),
            error: String(error),
          });
        }
      }
    }
  } catch (error) {
    logger.logCritical("Error reading from monitor", {
      error: String(error),
    });
  } finally {
    stdoutReader.releaseLock();
  }

  const status = await process.status;
  await stderrPump;

  const processStatus: ProcessStatus = {
    success: status.success,
    code: status.code,
  };

  if (!status.success) {
    logger.logError("Monitor process exited with error", {
      code: status.code,
    });
  }

  await mode.onShutdown?.(processStatus);

  if (!status.success) {
    systemInfo.exit(typeof status.code === "number" ? status.code : 1);
  }
}

// ==============================================================================
// Main Entry Point
// ==============================================================================

if (import.meta.main) {
  // Create dependencies
  const logger = new GenesisTraceAdapter();
  const config = DEFAULT_CONFIG;
  const commandRunner = new DenoCommandRunner();
  const systemInfo = new DenoSystemInfo();

  const options = parseArgs(Deno.args);

  if (options.help) {
    printHelp(logger, config);
    Deno.exit(0);
  }

  if (options.list) {
    printModeList(logger, config);
    Deno.exit(0);
  }

  if (options.unknown.length > 0) {
    logger.logWarning("Ignoring unknown arguments", {
      values: options.unknown,
    });
  }

  const modeKey = options.mode ?? config.defaultMode;

  if (!isModeKey(modeKey)) {
    logger.logError("Unknown mode requested", { mode: modeKey });
    printModeList(logger, config);
    Deno.exit(1);
  }

  await runMonitor(modeKey, { logger, config, commandRunner, systemInfo });
}
