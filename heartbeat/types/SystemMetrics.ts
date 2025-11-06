export interface SystemMetrics {
  timestamp: number;
  cpu_usage_percent: number;
  cpu_cores: Array<{ core_id: number; usage_percent: number }>;
  memory_total_mb: number;
  memory_used_mb: number;
  memory_free_mb: number;
  memory_available_mb: number;
  memory_usage_percent: number;
  cpu_spike_detected: boolean;
  memory_leak_suspected: boolean;
  swap_total_mb: number;
  swap_used_mb: number;
}

