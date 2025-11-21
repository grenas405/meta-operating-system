// ==============================================================================
// Monitor Mode Types
// ------------------------------------------------------------------------------
// Shared types for monitor modes
// ==============================================================================

import type { SystemMetrics } from "../types/SystemMetrics.ts";

export interface ProcessStatus {
  success: boolean;
  code: number | null;
}

export interface MonitorMode {
  label: string;
  description: string;
  onStart?: () => void | Promise<void>;
  onMetrics: (metrics: SystemMetrics) => void | Promise<void>;
  onShutdown?: (status: ProcessStatus) => void | Promise<void>;
}
