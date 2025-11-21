// ==============================================================================
// Adapters Module
// ------------------------------------------------------------------------------
// Re-exports all adapter interfaces and implementations
// ==============================================================================

// Interfaces
export type {
  CommandResult,
  CommandOutput,
  ICommandRunner,
  IFileSystem,
  IHttpServer,
  ISystemInfo,
  ITerminal,
  IClock,
  IMetricsRepository,
  ServerConfig,
} from "./interfaces.ts";

// Deno implementations
export {
  DenoCommandRunner,
  DenoFileSystem,
  DenoHttpServer,
  DenoSystemInfo,
  DenoTerminal,
  RealClock,
  JsonFileMetricsRepository,
} from "./DenoAdapters.ts";

// Existing adapters
export { GenesisTraceAdapter } from "./GenesisTraceAdapter.ts";
