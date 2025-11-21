// ==============================================================================
// 🧠 DenoGenesis CommandRunner Utility
// ------------------------------------------------------------------------------
// Unified subprocess management layer for the DenoGenesis kernel & CLI.
// Wraps `Deno.Command` for safe, structured, and observable process execution.
// ==============================================================================

import { ConsoleStyler } from "@pedromdominguez/genesis-trace";

export interface CommandResult {
  success: boolean;
  code: number;
  stdout: string;
  stderr: string;
}

export interface CommandOptions {
  cwd?: string;
  env?: Record<string, string>;
  inherit?: boolean; // whether to inherit stdio
  live?: boolean; // stream output in real time
}

export class CommandRunner {
  static textDecoder = new TextDecoder();

  /**
   * Run a command and capture all output
   */
  static async run(
    cmd: string,
    args: string[] = [],
    options: CommandOptions = {},
  ): Promise<CommandResult> {
    const { cwd, env, inherit, live } = options;

    const command = new Deno.Command(cmd, {
      args,
      cwd,
      env,
      stdout: inherit ? "inherit" : "piped",
      stderr: inherit ? "inherit" : "piped",
    });

    // Handle inherit mode - stdio goes directly to parent process
    if (inherit) {
      const result = await command.output();
      return {
        success: result.success,
        code: result.code,
        stdout: "",
        stderr: "",
      };
    }

    // Handle live streaming mode
    if (live) {
      const child = command.spawn();
      const decoder = this.textDecoder;

      // Stream stdout
      (async () => {
        for await (const chunk of child.stdout) {
          ConsoleStyler.logInfo(decoder.decode(chunk).trim());
        }
      })();

      // Stream stderr
      (async () => {
        for await (const chunk of child.stderr) {
          ConsoleStyler.logError(decoder.decode(chunk).trim());
        }
      })();

      const status = await child.status;
      return {
        success: status.success,
        code: status.code,
        stdout: "",
        stderr: "",
      };
    }

    // Default mode - capture output
    const result = await command.output();
    return {
      success: result.success,
      code: result.code,
      stdout: this.textDecoder.decode(result.stdout),
      stderr: this.textDecoder.decode(result.stderr),
    };
  }

  /**
   * Run a command silently and return only stdout as text
   */
  static async output(
    cmd: string,
    args: string[] = [],
    options?: CommandOptions,
  ): Promise<string> {
    const result = await this.run(cmd, args, options);
    if (!result.success) {
      ConsoleStyler.logError(`Command failed: ${cmd} ${args.join(" ")}`);
      ConsoleStyler.logError(result.stderr);
    }
    return result.stdout.trim();
  }

  /**
   * Check if a command exists in PATH
   */
  static async exists(cmd: string): Promise<boolean> {
    try {
      const result = await new Deno.Command("which", { args: [cmd] }).output();
      return result.success;
    } catch {
      return false;
    }
  }
}
