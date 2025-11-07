// ==============================================================================
// ⚙️ Default Configuration Constants
// ------------------------------------------------------------------------------
// Single source of truth for all default configuration values
// ==============================================================================

/**
 * Default configuration values for the DenoGenesis system
 *
 * DESIGN PRINCIPLES:
 * - Single Source of Truth: All defaults in one place
 * - Immutable: Use `as const` to prevent modifications
 * - Type-safe: TypeScript ensures correct usage
 * - Environment-independent: Defaults work without environment variables
 */
export const DEFAULT_CONFIG = {
  /** Default VERSION file path  */
  VERSION: "v1.0.0-dev",
  /** Default HTTP server port */
  PORT: 9000,

  /** Default HTTP server hostname */
  HOSTNAME: "localhost",

  /** Default debug mode state */
  DEBUG: false,

  /** Default environment name */
  ENVIRONMENT: "development",

  /** Default server script path (relative to kernel) */
  SERVER_SCRIPT_PATH: "./core/server.ts",

  /** Default heartbeat script path (relative to kernel) */
  HEARTBEAT_SCRIPT_PATH: "./heartbeat/main.ts",

  /** Default log history size */
  MAX_LOG_HISTORY: 100,

  /** Default request timeout in milliseconds */
  REQUEST_TIMEOUT: 30000,
} as const;

/**
 * Environment variable names
 * Centralized to avoid string duplication
 */
export const ENV_VARS = {
  PORT: "PORT",
  HOSTNAME: "HOSTNAME",
  DEBUG: "DEBUG",
  DENO_ENV: "DENO_ENV",
  ENV: "ENV",
} as const;
