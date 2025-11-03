// core/RemoteLogger.ts
// ================================================================================
// 🌐 Remote Logger - Simple, Unix-Philosophy Implementation
// No complex types, no build issues, just working code
// ================================================================================

import { LogEntry, LogLevel } from "./config.ts";

// ================================================================================
// Simple Types - No Magic, Just Data Structures
// ================================================================================

export interface RemoteDestination {
  name: string;
  url: string;
  apiKey?: string;
  headers?: Record<string, string>;
  method?: string; // 'POST' or 'PUT'
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface RemoteLoggerConfig {
  destinations: RemoteDestination[];
  minLevel?: LogLevel;
  batchSize?: number;
  maxBatchSize?: number;
  flushInterval?: number;
  maxRetries?: number;
  enableCompression?: boolean;
  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  onError?: (error: Error, destination: RemoteDestination) => void;
  onSuccess?: (destination: RemoteDestination, logCount: number) => void;
  transformPayload?: (logs: LogEntry[]) => any;
}

// ================================================================================
// RemoteLogger - Do One Thing Well: Send Logs to HTTP Endpoints
// ================================================================================

export class RemoteLogger {
  private buffer: LogEntry[] = [];
  private flushTimer?: number;
  private circuitBreakers: Map<string, any> = new Map();
  private healthStats: Map<string, any> = new Map();
  private isShuttingDown = false;

  constructor(private config: RemoteLoggerConfig) {
    this.initializeDefaults();
    this.initializeDestinations();
    this.startPeriodicFlush();
  }

  // ================================================================================
  // Initialization
  // ================================================================================

  private initializeDefaults(): void {
    this.config.minLevel = this.config.minLevel || "info";
    this.config.batchSize = this.config.batchSize || 10;
    this.config.maxBatchSize = this.config.maxBatchSize || 100;
    this.config.flushInterval = this.config.flushInterval || 5000;
    this.config.maxRetries = this.config.maxRetries || 3;
    this.config.enableCompression = this.config.enableCompression ?? false;
    this.config.enableCircuitBreaker = this.config.enableCircuitBreaker ?? true;
    this.config.circuitBreakerThreshold = this.config.circuitBreakerThreshold || 5;
    this.config.circuitBreakerTimeout = this.config.circuitBreakerTimeout || 60000;
  }

  private initializeDestinations(): void {
    this.config.destinations.forEach((dest) => {
      this.healthStats.set(dest.name, {
        name: dest.name,
        isHealthy: true,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
      });

      this.circuitBreakers.set(dest.name, {
        failures: 0,
        isOpen: false,
      });
    });
  }

  // ================================================================================
  // Public API - Simple Interface
  // ================================================================================

  log(entry: LogEntry): void {
    if (this.isShuttingDown) return;
    if (!this.shouldLog(entry.level)) return;

    this.buffer.push(entry);

    if (this.buffer.length >= this.config.batchSize!) {
      this.flush().catch((err) => console.error("[RemoteLogger] Flush failed:", err));
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logsToSend = [...this.buffer];
    this.buffer = [];

    const promises = this.config.destinations.map((dest) =>
      this.sendToDestination(dest, logsToSend)
    );

    await Promise.allSettled(promises);
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  clearBuffer(): void {
    this.buffer = [];
  }

  async shutdown(): Promise<void> {
    console.log("[RemoteLogger] Shutting down...");
    this.isShuttingDown = true;
    this.stopPeriodicFlush();

    if (this.buffer.length > 0) {
      await this.flush();
    }

    console.log("[RemoteLogger] Shutdown complete");
  }

  // ================================================================================
  // Core Logic - Send Logs via HTTP
  // ================================================================================

  private async sendToDestination(
    destination: RemoteDestination,
    logs: LogEntry[],
  ): Promise<void> {
    // Check circuit breaker
    if (this.config.enableCircuitBreaker && this.isCircuitOpen(destination.name)) {
      console.warn(`[RemoteLogger] Circuit breaker open for ${destination.name}`);
      return;
    }

    const startTime = performance.now();
    let attemptCount = 0;
    const maxRetries = destination.retryAttempts || this.config.maxRetries!;

    while (attemptCount < maxRetries) {
      attemptCount++;

      try {
        await this.sendHttpRequest(destination, logs);

        // Success!
        const duration = performance.now() - startTime;
        this.recordSuccess(destination.name, duration);
        this.config.onSuccess?.(destination, logs.length);
        return;
      } catch (error) {
        console.warn(
          `[RemoteLogger] Attempt ${attemptCount}/${maxRetries} failed for ${destination.name}:`,
          error.message,
        );

        if (attemptCount < maxRetries) {
          const delay = this.calculateRetryDelay(attemptCount, destination.retryDelay || 1000);
          await this.sleep(delay);
        } else {
          // Max retries exceeded
          this.recordFailure(destination.name, error as Error);
          this.config.onError?.(error as Error, destination);
        }
      }
    }
  }

  private async sendHttpRequest(
    destination: RemoteDestination,
    logs: LogEntry[],
  ): Promise<void> {
    // Prepare payload
    const payload = this.config.transformPayload
      ? this.config.transformPayload(logs)
      : this.prepareDefaultPayload(logs);

    // Simple approach: Always use JSON string, no compression type issues
    const bodyString = JSON.stringify(payload);

    // Build headers - simple object
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(destination.headers || {}),
    };

    if (destination.apiKey) {
      headers["Authorization"] = `Bearer ${destination.apiKey}`;
    }

    // Setup abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, destination.timeout || 10000);

    try {
      // Simple fetch - no type issues
      const response = await fetch(destination.url, {
        method: destination.method || "POST",
        headers: headers,
        body: bodyString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private prepareDefaultPayload(logs: LogEntry[]): any {
    return {
      version: "1.0",
      timestamp: new Date().toISOString(),
      count: logs.length,
      logs: logs.map((entry) => ({
        timestamp: entry.timestamp.toISOString(),
        level: entry.level,
        message: entry.message,
        metadata: entry.metadata,
        category: entry.category,
        requestId: entry.requestId,
        namespace: entry.namespace,
      })),
    };
  }

  // ================================================================================
  // Helper Methods
  // ================================================================================

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "success", "warning", "error", "critical"];
    const minIndex = levels.indexOf(this.config.minLevel!);
    const levelIndex = levels.indexOf(level);
    return levelIndex >= minIndex;
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush().catch((err) => console.error("[RemoteLogger] Periodic flush failed:", err));
      }
    }, this.config.flushInterval);
  }

  private stopPeriodicFlush(): void {
    if (this.flushTimer !== undefined) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  private calculateRetryDelay(attempt: number, baseDelay: number): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isCircuitOpen(destinationName: string): boolean {
    const state = this.circuitBreakers.get(destinationName);
    if (!state || !state.isOpen) return false;

    if (state.nextRetry && Date.now() >= state.nextRetry.getTime()) {
      state.isOpen = false;
      state.failures = 0;
      return false;
    }

    return true;
  }

  private recordSuccess(destinationName: string, duration: number): void {
    const health = this.healthStats.get(destinationName);
    if (!health) return;

    health.totalRequests++;
    health.successfulRequests++;
    health.isHealthy = true;
    health.averageLatency = (health.averageLatency * (health.successfulRequests - 1) + duration) /
      health.successfulRequests;

    const circuit = this.circuitBreakers.get(destinationName);
    if (circuit) {
      circuit.failures = 0;
      circuit.isOpen = false;
      circuit.nextRetry = undefined;
    }
  }

  private recordFailure(destinationName: string, error: Error): void {
    const health = this.healthStats.get(destinationName);
    if (!health) return;

    health.totalRequests++;
    health.failedRequests++;

    const failureRate = health.failedRequests / health.totalRequests;
    health.isHealthy = failureRate < 0.5;

    if (this.config.enableCircuitBreaker) {
      const circuit = this.circuitBreakers.get(destinationName);
      if (circuit) {
        circuit.failures++;

        if (circuit.failures >= this.config.circuitBreakerThreshold!) {
          circuit.isOpen = true;
          circuit.nextRetry = new Date(Date.now() + this.config.circuitBreakerTimeout!);
          console.warn(`[RemoteLogger] Circuit breaker opened for ${destinationName}`);
        }
      }
    }
  }

  // ================================================================================
  // Management Methods
  // ================================================================================

  addDestination(destination: RemoteDestination): void {
    if (this.config.destinations.some((d) => d.name === destination.name)) {
      throw new Error(`Destination ${destination.name} already exists`);
    }

    this.config.destinations.push(destination);

    this.healthStats.set(destination.name, {
      name: destination.name,
      isHealthy: true,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
    });

    this.circuitBreakers.set(destination.name, {
      failures: 0,
      isOpen: false,
    });
  }

  removeDestination(name: string): void {
    this.config.destinations = this.config.destinations.filter((d) => d.name !== name);
    this.healthStats.delete(name);
    this.circuitBreakers.delete(name);
  }

  getHealth(): Map<string, any> {
    return new Map(this.healthStats);
  }

  getStats(): any {
    let totalRequests = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    let healthyCount = 0;

    for (const health of this.healthStats.values()) {
      totalRequests += health.totalRequests;
      totalSuccessful += health.successfulRequests;
      totalFailed += health.failedRequests;
      if (health.isHealthy) healthyCount++;
    }

    return {
      bufferSize: this.buffer.length,
      totalDestinations: this.healthStats.size,
      healthyDestinations: healthyCount,
      totalRequests: totalRequests,
      totalSuccessful: totalSuccessful,
      totalFailed: totalFailed,
    };
  }
}

// ================================================================================
// Common Destination Presets - Simple Factory Functions
// ================================================================================

export const commonDestinations = {
  custom: (name: string, url: string, apiKey?: string): RemoteDestination => ({
    name,
    url,
    apiKey,
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
  }),

  logtail: (sourceToken: string): RemoteDestination => ({
    name: "logtail",
    url: "https://in.logtail.com",
    headers: { "Authorization": `Bearer ${sourceToken}` },
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
  }),

  datadog: (apiKey: string): RemoteDestination => ({
    name: "datadog",
    url: "https://http-intake.logs.datadoghq.com/v1/input",
    headers: { "DD-API-KEY": apiKey },
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
  }),
};

// ================================================================================
// Convenience Function
// ================================================================================

export function createRemoteLogger(config: RemoteLoggerConfig): RemoteLogger {
  return new RemoteLogger(config);
}
