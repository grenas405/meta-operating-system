/**
 * Kernel configuration interface
 */
interface KernelConfig {
  serverPort: number;
  serverHostname: string;
  debug: boolean;
  environment: string;
  serverScriptPath: string;
  heartbeatScriptPath: string;
}

interface SystemInfo {
  startTime: number;
  version: string;
  pid: number;
  platform: string;
}

type ProcessHealthCheck = () => Promise<boolean>;

interface ManagedProcess {
  id: string;
  name: string;
  command: Deno.Command;
  child?: Deno.ChildProcess;
  pid?: number;
  startTime: number;
  restartCount: number;
  autoRestart: boolean;
  status: "starting" | "running" | "stopped" | "failed";
  readyResolver?: () => void;
  readyPromise?: Promise<void>;
  isReady?: boolean;
  healthCheck?: ProcessHealthCheck;
  healthCheckInterval?: number;
  maxHealthCheckFailures?: number;
  consecutiveHealthFailures?: number;
  lastHealthCheckTime?: number;
  lastHealthStatus?: "healthy" | "unhealthy";
  healthCheckTimer?: number;
  healthCheckInProgress?: boolean;
  restartRequested?: boolean;
  restartReason?: string;
}

export { KernelConfig, ManagedProcess, SystemInfo, type ProcessHealthCheck };
