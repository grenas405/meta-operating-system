/**
 * ConsoleStyler Logger Adapter
 * Adapts ConsoleStyler's static methods to implement the ILogger interface
 * for dependency injection and testability.
 */

import { ConsoleStyler } from "../core/console.ts";
import type { ILogger } from "../../../interfaces/ILogger.ts";

/**
 * Adapter class that wraps ConsoleStyler's static methods
 * to implement the ILogger interface
 */
export class ConsoleStylerAdapter implements ILogger {
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
    ConsoleStyler.logSection(title, colorName as any, style);
  }
}

/**
 * Factory function to create a ConsoleStyler logger instance
 * @returns ILogger instance backed by ConsoleStyler
 */
export function createConsoleLogger(): ILogger {
  return new ConsoleStylerAdapter();
}
