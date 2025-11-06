// ==============================================================================
// 🌍 Environment Configuration Loader
// ------------------------------------------------------------------------------
// Centralized environment variable access and configuration loading
// ==============================================================================

import { DEFAULT_CONFIG, ENV_VARS } from "./defaults.ts";

/**
 * Server configuration interface
 */
export interface ServerConfig {
  port: number;
  hostname: string;
  debug: boolean;
  environment: string;
}

/**
 * Kernel configuration interface
 */
export interface KernelConfig {
  serverPort: number;
  serverHostname: string;
  debug: boolean;
  environment: string;
  serverScriptPath: string;
}

/**
 * Environment configuration manager
 *
 * DESIGN PRINCIPLES:
 * - Centralized Access: Single place to read environment variables
 * - Testability: Easy to mock for testing
 * - Type Safety: Returns typed configuration objects
 * - Fallback Strategy: Graceful degradation with defaults
 */
export class EnvironmentConfig {
  /**
   * Get current environment name
   * Checks DENO_ENV, ENV, then falls back to default
   */
  get environment(): string {
    return Deno.env.get(ENV_VARS.DENO_ENV) ||
      Deno.env.get(ENV_VARS.ENV) ||
      DEFAULT_CONFIG.ENVIRONMENT;
  }

  /**
   * Check if running in production
   */
  get isProduction(): boolean {
    return this.environment === "production";
  }

  /**
   * Check if running in development
   */
  get isDevelopment(): boolean {
    return this.environment === "development";
  }

  /**
   * Check if running in testing
   */
  get isTesting(): boolean {
    return this.environment === "testing";
  }

  /**
   * Check if running in staging
   */
  get isStaging(): boolean {
    return this.environment === "staging";
  }

  /**
   * Get port from environment or default
   */
  get port(): number {
    const envPort = Deno.env.get(ENV_VARS.PORT);
    return envPort ? Number(envPort) : DEFAULT_CONFIG.PORT;
  }

  /**
   * Get hostname from environment or default
   */
  get hostname(): string {
    return Deno.env.get(ENV_VARS.HOSTNAME) || DEFAULT_CONFIG.HOSTNAME;
  }

  /**
   * Get debug mode from environment or default
   */
  get debug(): boolean {
    const envDebug = Deno.env.get(ENV_VARS.DEBUG);
    return envDebug === "true" || DEFAULT_CONFIG.DEBUG;
  }

  /**
   * Load server configuration
   * Combines environment variables with defaults
   */
  loadServerConfig(overrides?: Partial<ServerConfig>): ServerConfig {
    return {
      port: overrides?.port ?? this.port,
      hostname: overrides?.hostname ?? this.hostname,
      debug: overrides?.debug ?? this.debug,
      environment: overrides?.environment ?? this.environment,
    };
  }

  /**
   * Load kernel configuration
   * Combines environment variables with defaults
   */
  loadKernelConfig(overrides?: Partial<KernelConfig>): KernelConfig {
    return {
      serverPort: overrides?.serverPort ?? this.port,
      serverHostname: overrides?.serverHostname ?? this.hostname,
      debug: overrides?.debug ?? this.debug,
      environment: overrides?.environment ?? this.environment,
      serverScriptPath: overrides?.serverScriptPath ??
        DEFAULT_CONFIG.SERVER_SCRIPT_PATH,
    };
  }
}

/**
 * Default environment config instance
 */
export const env = new EnvironmentConfig();
