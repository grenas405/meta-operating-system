// ==============================================================================
// Genesis Trace Logger Adapter
// ------------------------------------------------------------------------------
// Adapter that wraps genesis-trace Logger to implement ILogger interface
// ==============================================================================

import { Logger } from "jsr:@pedromdominguez/genesis-trace";
import type { ILogger } from "../../core/interfaces/ILogger.ts";

/**
 * Adapter that wraps genesis-trace Logger to implement ILogger interface
 * Maps ILogger method names to genesis-trace Logger method names
 */
export class GenesisTraceAdapter implements ILogger {
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  logInfo(message: string, metadata?: Record<string, unknown>): void {
    this.logger.info(message, metadata);
  }

  logSuccess(message: string, metadata?: Record<string, unknown>): void {
    this.logger.success(message, metadata);
  }

  logWarning(message: string, metadata?: Record<string, unknown>): void {
    this.logger.warning(message, metadata);
  }

  logError(message: string, metadata?: Record<string, unknown>): void {
    this.logger.error(message, metadata);
  }

  logDebug(message: string, metadata?: Record<string, unknown>): void {
    this.logger.debug(message, metadata);
  }

  logCritical(message: string, metadata?: Record<string, unknown>): void {
    this.logger.critical(message, metadata);
  }

  logRequest(
    method: string,
    path: string,
    status: number,
    duration: number,
    size?: number,
  ): void {
    // Genesis trace doesn't have a specific logRequest method, so we'll use info
    const metadata: Record<string, unknown> = {
      method,
      path,
      status,
      duration,
    };
    if (size !== undefined) {
      metadata.size = size;
    }
    this.logger.info(`${method} ${path} ${status} ${duration}ms`, metadata);
  }

  logSection(
    title: string,
    colorName?: string,
    style?: "standard" | "heavy" | "double" | "simple",
  ): void {
    // Genesis trace doesn't have a section method, so we'll use info with formatting
    const border = style === "heavy" ? "━" : "─";
    const separator = border.repeat(title.length + 4);
    this.logger.info(`\n${separator}\n  ${title}\n${separator}`);
  }
}
