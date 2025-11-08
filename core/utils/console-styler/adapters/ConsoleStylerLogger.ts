// ==============================================================================
// 🎨 ConsoleStyler Logger Adapter
// ------------------------------------------------------------------------------
// Adapter that implements ILogger interface using ConsoleStyler
// Allows ConsoleStyler to be used via dependency injection
// ==============================================================================

import { ConsoleStyler } from "../core/console.ts";
import type { ILogger } from "../interfaces/ILogger.ts";

/**
 * Adapter that wraps ConsoleStyler to implement ILogger interface
 *
 * DESIGN PATTERN: Adapter Pattern
 * - Adapts ConsoleStyler's static API to ILogger interface
 * - Enables dependency injection
 * - Allows swapping ConsoleStyler with other logging implementations
 *
 * USAGE:
 * ```typescript
 * const logger: ILogger = new ConsoleStylerLogger();
 * logger.logInfo("Server starting", { port: 8000 });
 * ```
 */
export class ConsoleStylerLogger implements ILogger {
  logInfo(message: string, metadata?: Record<string, unknown>): void {
    ConsoleStyler.logInfo(message, metadata);
  }

  logSuccess(message: string, metadata?: Record<string, unknown>): void {
    ConsoleStyler.logSuccess(message, metadata);
  }

  logWarning(message: string, metadata?: Record<string, unknown>): void {
    ConsoleStyler.logWarning(message, metadata);
  }

  logError(message: string, metadata?: Record<string, unknown>): void {
    ConsoleStyler.logError(message, metadata);
  }

  logDebug(message: string, metadata?: Record<string, unknown>): void {
    ConsoleStyler.logDebug(message, metadata);
  }

  logCritical(message: string, metadata?: Record<string, unknown>): void {
    ConsoleStyler.logCritical(message, metadata);
  }

  logRequest(
    method: string,
    path: string,
    status: number,
    duration: number,
    size?: number,
  ): void {
    ConsoleStyler.logRequest(method, path, status, duration, size);
  }

  logSection(
    title: string,
    colorName?: string,
    style?: "standard" | "heavy" | "double" | "simple",
  ): void {
    // Cast to any to handle ConsoleStyler's complex color type unions
    ConsoleStyler.logSection(title, colorName as any, style);
  }
}

/**
 * Default logger instance for convenience
 * Use this when you don't need to customize the logger
 */
export const defaultLogger: ILogger = new ConsoleStylerLogger();
