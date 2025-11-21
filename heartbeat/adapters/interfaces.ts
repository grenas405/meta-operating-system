// ==============================================================================
// Adapter Interfaces
// ------------------------------------------------------------------------------
// Abstractions for external dependencies to enable testing and flexibility
// ==============================================================================

import type { SystemMetrics } from "../types/SystemMetrics.ts";

// ==============================================================================
// Command Runner Interface
// ==============================================================================

export interface CommandResult {
  success: boolean;
  code: number | null;
}

export interface CommandOutput {
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  status: Promise<CommandResult>;
}

export interface ICommandRunner {
  spawn(options: {
    command: string;
    args: string[];
    cwd?: string;
  }): CommandOutput;
}

// ==============================================================================
// File System Interface
// ==============================================================================

export interface IFileSystem {
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

// ==============================================================================
// HTTP Server Interface
// ==============================================================================

export interface ServerConfig {
  port: number;
  hostname: string;
  signal?: AbortSignal;
  onListen?: (info: { port: number; hostname: string }) => void;
}

export interface IHttpServer {
  serve(
    config: ServerConfig,
    handler: (request: Request) => Promise<Response> | Response,
  ): { finished: Promise<void>; shutdown: () => void };
}

// ==============================================================================
// System Info Interface
// ==============================================================================

export interface ISystemInfo {
  hostname(): string;
  pid(): number;
  exit(code: number): never;
}

// ==============================================================================
// Terminal Interface
// ==============================================================================

export interface ITerminal {
  write(data: Uint8Array): void;
  writeLine(text: string): void;
}

// ==============================================================================
// Clock Interface
// ==============================================================================

export interface IClock {
  now(): number;
  timestamp(): number;
}

// ==============================================================================
// Metrics Repository Interface
// ==============================================================================

export interface IMetricsRepository {
  save(metrics: SystemMetrics[]): Promise<void>;
  load(): Promise<SystemMetrics[]>;
  append(metrics: SystemMetrics[]): Promise<void>;
}
