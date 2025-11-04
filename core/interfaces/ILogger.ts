// ==============================================================================
// 📝 ILogger Interface
// ------------------------------------------------------------------------------
// Logging abstraction interface for dependency injection
// Decouples application code from specific logging implementations
// ==============================================================================

/**
 * Core logging interface that all loggers must implement
 *
 * DESIGN PRINCIPLES:
 * - Dependency Inversion: Depend on abstractions, not concrete implementations
 * - Single Responsibility: Each logger implementation handles one logging strategy
 * - Testability: Easy to mock for unit testing
 * - Flexibility: Swap logging implementations without changing application code
 */
export interface ILogger {
  /**
   * Log informational message
   * @param message - The message to log
   * @param metadata - Optional structured data
   */
  logInfo(message: string, metadata?: Record<string, unknown>): void;

  /**
   * Log success message
   * @param message - The message to log
   * @param metadata - Optional structured data
   */
  logSuccess(message: string, metadata?: Record<string, unknown>): void;

  /**
   * Log warning message
   * @param message - The message to log
   * @param metadata - Optional structured data
   */
  logWarning(message: string, metadata?: Record<string, unknown>): void;

  /**
   * Log error message
   * @param message - The message to log
   * @param metadata - Optional structured data
   */
  logError(message: string, metadata?: Record<string, unknown>): void;

  /**
   * Log debug message
   * @param message - The message to log
   * @param metadata - Optional structured data
   */
  logDebug(message: string, metadata?: Record<string, unknown>): void;

  /**
   * Log critical error message
   * @param message - The message to log
   * @param metadata - Optional structured data
   */
  logCritical(message: string, metadata?: Record<string, unknown>): void;

  /**
   * Log HTTP request/response
   * @param method - HTTP method (GET, POST, etc.)
   * @param path - Request path
   * @param status - HTTP status code
   * @param duration - Response time in milliseconds
   * @param size - Optional response size in bytes
   */
  logRequest(
    method: string,
    path: string,
    status: number,
    duration: number,
    size?: number,
  ): void;

  /**
   * Log section header
   * @param title - Section title
   * @param colorName - Optional color name
   * @param style - Optional border style
   */
  logSection(
    title: string,
    colorName?: string,
    style?: "standard" | "heavy" | "double" | "simple",
  ): void;
}
