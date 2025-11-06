// ==============================================================================
// ⚙️ Configuration Module
// ------------------------------------------------------------------------------
// Centralized configuration management for DenoGenesis
// ==============================================================================

export { DEFAULT_CONFIG, ENV_VARS } from "./defaults.ts";
export {
  env,
  EnvironmentConfig,
  type KernelConfig,
  type ServerConfig,
} from "./environment.ts";
