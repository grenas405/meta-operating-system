// ==============================================================================
// Deno Runtime Adapters
// ------------------------------------------------------------------------------
// Concrete implementations of adapter interfaces using Deno APIs
// ==============================================================================

import type {
  CommandOutput,
  CommandResult,
  IClock,
  ICommandRunner,
  IFileSystem,
  IHttpServer,
  IMetricsRepository,
  ISystemInfo,
  ITerminal,
  ServerConfig,
} from "./interfaces.ts";
import type { SystemMetrics } from "../types/SystemMetrics.ts";

// ==============================================================================
// Deno Command Runner
// ==============================================================================

export class DenoCommandRunner implements ICommandRunner {
  spawn(options: {
    command: string;
    args: string[];
    cwd?: string;
  }): CommandOutput {
    const command = new Deno.Command(options.command, {
      args: options.args,
      stdout: "piped",
      stderr: "piped",
      cwd: options.cwd,
    });

    const process = command.spawn();

    return {
      stdout: process.stdout,
      stderr: process.stderr,
      status: process.status.then((s): CommandResult => ({
        success: s.success,
        code: s.code,
      })),
    };
  }
}

// ==============================================================================
// Deno File System
// ==============================================================================

export class DenoFileSystem implements IFileSystem {
  async readTextFile(path: string): Promise<string> {
    return await Deno.readTextFile(path);
  }

  async writeTextFile(path: string, content: string): Promise<void> {
    await Deno.writeTextFile(path, content);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await Deno.stat(path);
      return true;
    } catch {
      return false;
    }
  }
}

// ==============================================================================
// Deno HTTP Server
// ==============================================================================

export class DenoHttpServer implements IHttpServer {
  serve(
    config: ServerConfig,
    handler: (request: Request) => Promise<Response> | Response,
  ): { finished: Promise<void>; shutdown: () => void } {
    const abortController = new AbortController();

    const server = Deno.serve(
      {
        port: config.port,
        hostname: config.hostname,
        signal: config.signal ?? abortController.signal,
        onListen: config.onListen,
      },
      handler,
    );

    return {
      finished: server.finished,
      shutdown: () => abortController.abort(),
    };
  }
}

// ==============================================================================
// Deno System Info
// ==============================================================================

export class DenoSystemInfo implements ISystemInfo {
  hostname(): string {
    return Deno.hostname?.() ?? "localhost";
  }

  pid(): number {
    return Deno.pid;
  }

  exit(code: number): never {
    Deno.exit(code);
  }
}

// ==============================================================================
// Deno Terminal
// ==============================================================================

export class DenoTerminal implements ITerminal {
  private encoder = new TextEncoder();

  write(data: Uint8Array): void {
    Deno.stdout.writeSync(data);
  }

  writeLine(text: string): void {
    Deno.stdout.writeSync(this.encoder.encode(text + "\n"));
  }
}

// ==============================================================================
// Real Clock
// ==============================================================================

export class RealClock implements IClock {
  now(): number {
    return Date.now();
  }

  timestamp(): number {
    return Math.floor(Date.now() / 1000);
  }
}

// ==============================================================================
// JSON File Metrics Repository
// ==============================================================================

export class JsonFileMetricsRepository implements IMetricsRepository {
  constructor(
    private readonly filePath: string,
    private readonly fileSystem: IFileSystem = new DenoFileSystem(),
  ) {}

  async save(metrics: SystemMetrics[]): Promise<void> {
    await this.fileSystem.writeTextFile(
      this.filePath,
      JSON.stringify(metrics, null, 2),
    );
  }

  async load(): Promise<SystemMetrics[]> {
    try {
      const content = await this.fileSystem.readTextFile(this.filePath);
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  async append(metrics: SystemMetrics[]): Promise<void> {
    const existing = await this.load();
    await this.save([...existing, ...metrics]);
  }
}
