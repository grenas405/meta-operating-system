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
}

export { KernelConfig, ManagedProcess, SystemInfo };
