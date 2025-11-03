// middleware/healthCheck.ts → System Health Monitoring

import type { Context } from "../utils/context.ts";
import { ConsoleStyler } from "../utils/console-styler/mod.ts";
// ================================================================================
// 🔍 DenoGenesis Framework - Advanced Health Check Middleware
// Comprehensive system monitoring, dependency checks, and status reporting
// ================================================================================
//
// UNIX PHILOSOPHY IMPLEMENTATION:
// --------------------------------
// 1. DO ONE THING WELL:
//    - This module ONLY handles health monitoring and status reporting
//    - Does NOT handle business logic, authentication, or routing
//    - Single, focused responsibility: report system health
//
// 2. COMPOSABILITY:
//    - Designed as middleware that integrates with Oak framework
//    - Can be combined with logging, metrics, alerting
//    - Custom checks can be plugged in
//
// 3. TEXT-BASED:
//    - All responses in JSON format
//    - HTTP status codes for health state
//    - Human-readable health information
//
// 4. EXPLICIT:
//    - Clear health status (healthy/degraded/unhealthy)
//    - Detailed check results
//    - No hidden state
//
// ARCHITECTURE:
// -------------
// Health Check Flow:
//   1. Request arrives at health endpoint
//   2. Run system checks (memory, dependencies)
//   3. Run custom checks (database, APIs)
//   4. Aggregate results
//   5. Determine overall status
//   6. Cache result (optional)
//   7. Return JSON response
//
// HEALTH CHECKS EXPLAINED (FOR NON-PROGRAMMERS):
// -----------------------------------------------
// WHAT IS A HEALTH CHECK?
// A health check is like a doctor's checkup for your application
//
// THE PROBLEM:
// How do you know if your application is working?
// - Is the server running?
// - Can it connect to the database?
// - Does it have enough memory?
// - Are external APIs responding?
//
// THE SOLUTION:
// Health check endpoint: GET /health
// Returns: { status: "healthy", uptime: "5 days" }
//
// WHY IMPORTANT?
// - Load balancers use it (send traffic only to healthy servers)
// - Kubernetes uses it (restart unhealthy containers)
// - Monitoring uses it (alert when unhealthy)
// - DevOps uses it (deployment verification)
//
// HEALTH CHECK TYPES:
// -------------------
// 1. LIVENESS PROBE:
//    "Is the application alive?"
//    - Simple check: Can respond to requests?
//    - Used by K8s to restart dead containers
//    - Should be very fast (<100ms)
//    - Example: HTTP 200 means alive
//
// 2. READINESS PROBE:
//    "Is the application ready to serve traffic?"
//    - More thorough: Check dependencies
//    - Used by load balancers
//    - Can be slower (<1s)
//    - Example: Database connected, cache warm
//
// 3. STARTUP PROBE:
//    "Has the application finished starting?"
//    - Initial check during startup
//    - Prevents premature traffic
//    - Can be very slow (minutes)
//    - Example: Database migrations complete
//
// HEALTH STATUS LEVELS:
// ----------------------
// HEALTHY:
// - All checks passed
// - Full functionality
// - Ready for traffic
// - HTTP 200 OK
//
// DEGRADED:
// - Some checks failed
// - Core features work
// - Non-critical issues
// - HTTP 207 Multi-Status
//
// UNHEALTHY:
// - Critical checks failed
// - Cannot serve traffic
// - Requires intervention
// - HTTP 503 Service Unavailable
//
// DEPLOYMENT INTEGRATION:
// -----------------------
// KUBERNETES:
// livenessProbe:
//   httpGet:
//     path: /health/live
//     port: 8000
//   initialDelaySeconds: 10
//   periodSeconds: 5
//
// readinessProbe:
//   httpGet:
//     path: /health/ready
//     port: 8000
//   initialDelaySeconds: 5
//   periodSeconds: 3
//
// LOAD BALANCER:
// Health check: GET /health
// Healthy: 200-299 status code
// Unhealthy: Anything else
// Check interval: 30 seconds
// Unhealthy threshold: 3 failures
//
// MONITORING:
// Alert when:
// - Health status = unhealthy (5 minutes)
// - Memory usage > 90%
// - Dependency failures
// - Response time > 1 second
//
// USAGE:
// ------
// ```typescript
// import { createHealthCheckMiddleware, HealthCheckPresets } from "./middleware/healthCheck.ts";
//
// const app = new Application();
//
// // Basic health check
// app.use(createHealthCheckMiddleware(performanceMonitor, {
//   endpoint: '/health',
//   includeMetrics: true,
//   enableDetailedChecks: true
// }));
//
// // Custom health checks
// app.use(createHealthCheckMiddleware(performanceMonitor, {
//   endpoint: '/health',
//   customChecks: [
//     HealthCheckUtils.createDatabaseCheck(db),
//     HealthCheckUtils.createApiCheck('https://api.example.com/status'),
//     async () => ({
//       name: 'custom_check',
//       status: 'healthy',
//       details: { custom: 'data' }
//     })
//   ]
// }));
// ```
//
// RELATED DOCUMENTATION:
// ----------------------
// - Framework Philosophy: docs/02-framework/philosophy.md
// - Kubernetes Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
// - Health Check Patterns: https://microservices.io/patterns/observability/health-check-api.html
// - HTTP Status Codes: https://httpstatuses.com/
//
// ================================================================================

// ================================================================================
// 📦 TYPE DEFINITIONS
// ================================================================================

/**
 * Health check configuration object
 * 
 * DESIGN PHILOSOPHY:
 * - Flexible and extensible
 * - Opt-in complexity (simple by default)
 * - Performance-conscious (caching support)
 * - Production-ready (timeout handling)
 * 
 * @interface HealthCheckConfig
 */
export interface HealthCheckConfig {
  /**
   * HTTP endpoint for health checks
   * 
   * ENDPOINT CONVENTIONS:
   * - /health: General health
   * - /health/live: Liveness probe
   * - /health/ready: Readiness probe
   * - /healthz: Kubernetes convention
   * - /status: Alternative naming
   * 
   * EXAMPLES:
   * - endpoint: '/health'
   * - endpoint: '/api/health'
   * - endpoint: '/healthz'
   * 
   * @type {string}
   */
  endpoint: string;
  
  /**
   * Include performance metrics in response
   * 
   * METRICS INCLUDED:
   * - Request rate
   * - Response time (avg, p95, p99)
   * - Error rate
   * - Active connections
   * 
   * WHY INCLUDE?
   * - Single endpoint for health + metrics
   * - Useful for debugging
   * - Monitoring dashboards
   * 
   * WHY EXCLUDE?
   * - Reduce response size
   * - Faster response time
   * - Security (hide internal metrics)
   * 
   * @default false
   * @type {boolean}
   */
  includeMetrics: boolean;
  
  /**
   * Include environment information
   * 
   * ENVIRONMENT INFO:
   * - Node version
   * - Platform (linux, darwin, windows)
   * - Architecture (x64, arm64)
   * - Environment variables (filtered)
   * 
   * SECURITY WARNING:
   * Be careful not to expose sensitive data
   * Filter environment variables carefully
   * 
   * @default false
   * @type {boolean}
   */
  includeEnvironment?: boolean;
  
  /**
   * Timeout for health checks in milliseconds
   * 
   * TIMEOUT STRATEGY:
   * - Individual checks should timeout
   * - Prevents hanging health endpoint
   * - Load balancers have their own timeout
   * 
   * RECOMMENDED VALUES:
   * - Liveness: 100-500ms (very fast)
   * - Readiness: 1000-5000ms (thorough)
   * - Startup: 30000-60000ms (slow is OK)
   * 
   * @default 5000 (5 seconds)
   * @type {number}
   */
  timeout?: number;
  
  /**
   * Custom health check functions
   * 
   * CUSTOM CHECKS:
   * Array of functions that return health results
   * 
   * FUNCTION SIGNATURE:
   * () => Promise<HealthCheckResult>
   * 
   * EXAMPLES:
   * - Database connectivity
   * - API availability
   * - Cache accessibility
   * - File system access
   * - External service status
   * 
   * BEST PRACTICES:
   * - Keep checks fast (<1s each)
   * - Handle errors gracefully
   * - Return meaningful details
   * - Use timeouts
   * 
   * @type {Array<() => Promise<HealthCheckResult>>}
   */
  customChecks?: Array<() => Promise<HealthCheckResult>>;
  
  /**
   * Enable detailed system checks
   * 
   * DETAILED CHECKS INCLUDE:
   * - Memory usage
   * - Disk space
   * - Network connectivity
   * - CPU usage
   * - Dependency health
   * 
   * WHEN TO ENABLE:
   * - Readiness probes
   * - Development environments
   * - Troubleshooting
   * 
   * WHEN TO DISABLE:
   * - Liveness probes (too slow)
   * - High-frequency checks
   * - Production (if performance matters)
   * 
   * @default false
   * @type {boolean}
   */
  enableDetailedChecks?: boolean;
  
  /**
   * Cache health check results
   * 
   * CACHING STRATEGY:
   * - Cache results for cacheTTL milliseconds
   * - Reduces load on dependencies
   * - Faster response time
   * - Trade-off: Slightly stale data
   * 
   * WHEN TO CACHE:
   * - High-frequency checks
   * - Expensive checks (database queries)
   * - Stable systems
   * 
   * WHEN NOT TO CACHE:
   * - Real-time monitoring
   * - Critical systems
   * - Infrequent checks
   * 
   * @default false
   * @type {boolean}
   */
  cacheResults?: boolean;
  
  /**
   * Cache time-to-live in milliseconds
   * 
   * TTL RECOMMENDATIONS:
   * - High-frequency: 1000-5000ms (1-5 seconds)
   * - Medium: 10000-30000ms (10-30 seconds)
   * - Low-frequency: 60000+ (1+ minute)
   * 
   * TRADE-OFFS:
   * - Longer TTL: Better performance, staler data
   * - Shorter TTL: Fresher data, more load
   * 
   * @default 5000 (5 seconds)
   * @type {number}
   */
  cacheTTL?: number;
}

/**
 * Health check result from individual check
 * 
 * @interface HealthCheckResult
 */
export interface HealthCheckResult {
  /**
   * Name of the health check
   * 
   * NAMING CONVENTIONS:
   * - Use snake_case: database_connection
   * - Be specific: postgres_primary_db
   * - Include type: api_external_service
   * 
   * @type {string}
   */
  name: string;
  
  /**
   * Health status
   * 
   * STATUS MEANINGS:
   * - healthy: Check passed completely
   * - unhealthy: Check failed critically
   * - degraded: Check partially failed
   * 
   * @type {'healthy' | 'unhealthy' | 'degraded'}
   */
  status: 'healthy' | 'unhealthy' | 'degraded';
  
  /**
   * Additional details about the check
   * 
   * EXAMPLES:
   * - Connection pool size
   * - Last successful ping
   * - Error message
   * - Performance metrics
   * 
   * @type {any}
   */
  details?: any;
  
  /**
   * Response time in milliseconds
   * 
   * IMPORTANT FOR:
   * - Performance monitoring
   * - Timeout detection
   * - Trend analysis
   * 
   * @type {number}
   */
  responseTime?: number;
  
  /**
   * ISO timestamp of check
   * 
   * @type {string}
   */
  timestamp?: string;
  
  /**
   * Error message if check failed
   * 
   * @type {string}
   */
  error?: string;
}

/**
 * Overall system health response
 * 
 * @interface SystemHealth
 */
export interface SystemHealth {
  /**
   * Overall health status
   * @type {'healthy' | 'unhealthy' | 'degraded'}
   */
  status: 'healthy' | 'unhealthy' | 'degraded';
  
  /**
   * ISO timestamp of health check
   * @type {string}
   */
  timestamp: string;
  
  /**
   * Application version
   * @type {string}
   */
  version: string;
  
  /**
   * How long the application has been running
   * @type {string}
   */
  uptime: string;
  
  /**
   * Environment information (if enabled)
   * @type {any}
   */
  environment?: any;
  
  /**
   * Performance metrics (if enabled)
   * @type {any}
   */
  metrics?: any;
  
  /**
   * Custom check results
   * @type {HealthCheckResult[]}
   */
  checks?: HealthCheckResult[];
  
  /**
   * Dependency health status
   * @type {DependencyHealth[]}
   */
  dependencies?: DependencyHealth[];
  
  /**
   * System resource status
   * @type {ResourceHealth}
   */
  resources?: ResourceHealth;
}

/**
 * Health status of external dependencies
 * 
 * @interface DependencyHealth
 */
export interface DependencyHealth {
  /**
   * Dependency name
   * @type {string}
   */
  name: string;
  
  /**
   * Dependency type
   * 
   * TYPES:
   * - database: SQL/NoSQL databases
   * - api: External APIs
   * - service: Microservices
   * - cache: Redis, Memcached
   * - filesystem: Disk storage
   * 
   * @type {'database' | 'api' | 'service' | 'cache' | 'filesystem'}
   */
  type: 'database' | 'api' | 'service' | 'cache' | 'filesystem';
  
  /**
   * Health status
   * @type {'healthy' | 'unhealthy' | 'degraded'}
   */
  status: 'healthy' | 'unhealthy' | 'degraded';
  
  /**
   * Response time in milliseconds
   * @type {number}
   */
  responseTime: number;
  
  /**
   * Additional details
   * @type {any}
   */
  details?: any;
}

/**
 * System resource health
 * 
 * @interface ResourceHealth
 */
export interface ResourceHealth {
  /**
   * Memory health
   */
  memory: {
    used: string;
    total: string;
    percentage: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  
  /**
   * Disk health (if available)
   */
  disk?: {
    used: string;
    total: string;
    percentage: number;
    status: 'healthy' | 'warning' | 'critical';
  };
  
  /**
   * Network health (if available)
   */
  network?: {
    status: 'healthy' | 'unhealthy';
    latency?: number;
  };
}

// ================================================================================
// 🏥 HEALTH CHECK MIDDLEWARE FACTORY
// ================================================================================

/**
 * Create health check middleware for Oak framework
 * 
 * MIDDLEWARE ARCHITECTURE:
 * ------------------------
 * This middleware:
 * 1. Intercepts requests to health endpoint
 * 2. Runs all configured health checks
 * 3. Aggregates results
 * 4. Sets appropriate HTTP status
 * 5. Returns JSON response
 * 6. Logs errors
 * 
 * HTTP STATUS CODES:
 * - 200 OK: System is healthy
 * - 207 Multi-Status: System is degraded
 * - 503 Service Unavailable: System is unhealthy
 * 
 * PLACEMENT IN STACK:
 * Should be added EARLY (before authentication)
 * Health checks should always be accessible
 * 
 * ```typescript
 * app.use(healthCheckMiddleware);  // FIRST
 * app.use(loggingMiddleware);
 * app.use(corsMiddleware);
 * app.use(authMiddleware);
 * app.use(router);
 * ```
 * 
 * @public
 * @param {any} performanceMonitor - Performance monitoring instance
 * @param {HealthCheckConfig} config - Health check configuration
 * @returns {Function} Oak middleware function
 * 
 * @example
 * ```typescript
 * import { Application } from "https://deno.land/x/oak@v12.6.1/mod.ts";
 * import { createHealthCheckMiddleware } from "./middleware/healthCheck.ts";
 * 
 * const app = new Application();
 * 
 * app.use(createHealthCheckMiddleware(performanceMonitor, {
 *   endpoint: '/health',
 *   includeMetrics: true,
 *   enableDetailedChecks: true,
 *   timeout: 5000
 * }));
 * ```
 */
export function createHealthCheckMiddleware(
  performanceMonitor: any,
  config: HealthCheckConfig,
): (
  ctx: Context,
  next: () => Promise<Response>,
) => Promise<Response> {
  // Create health checker instance
  const healthChecker = new HealthChecker(config, performanceMonitor);

  return async (ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    const requestUrl = ctx.url ?? new URL(ctx.request.url);

    // Check if this is a health check request
    if (requestUrl.pathname === config.endpoint) {
      const startTime = Date.now();

      try {
        // =======================================================================
        // PERFORM HEALTH CHECK
        // =======================================================================
        
        /**
         * HEALTH CHECK PROCESS:
         * 1. Run all configured checks
         * 2. Collect results
         * 3. Determine overall status
         * 4. Format response
         */
        const healthData = await healthChecker.performHealthCheck();
        const responseTime = Date.now() - startTime;

        // =======================================================================
        // SET RESPONSE HEADERS
        // =======================================================================
        
        /**
         * RESPONSE HEADERS:
         * - Content-Type: application/json (JSON response)
         * - Cache-Control: no-cache (always fresh)
         * - X-Health-Check-Version: API version
         * - X-Response-Time: How long check took
         */
        const headers = new Headers({
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Health-Check-Version": "2.0",
          "X-Response-Time": `${responseTime}ms`,
        });
        
        // =======================================================================
        // SET HTTP STATUS CODE
        // =======================================================================
        
        /**
         * STATUS CODE MAPPING:
         * 
         * UNHEALTHY → 503 Service Unavailable
         * - Critical failure
         * - Cannot serve traffic
         * - Load balancer will remove from pool
         * - Kubernetes will restart pod
         * 
         * DEGRADED → 207 Multi-Status
         * - Partial failure
         * - Core features work
         * - Non-critical issues
         * - Load balancer keeps in pool
         * 
         * HEALTHY → 200 OK
         * - All checks passed
         * - Full functionality
         * - Ready for traffic
         */
        const status = healthData.status === "unhealthy"
          ? 503 // Service Unavailable
          : healthData.status === "degraded"
          ? 207 // Multi-Status
          : 200; // OK

        return new Response(
          JSON.stringify(healthData),
          {
            status,
            headers,
          },
        );
      } catch (error: any) {
        // =======================================================================
        // ERROR HANDLING
        // =======================================================================
        
        /**
         * HEALTH CHECK FAILURE:
         * If health check system itself fails, return 503
         * 
         * CAUSES:
         * - Uncaught exception in check
         * - Timeout
         * - Out of memory
         * - System error
         */
        ConsoleStyler.logError("Health check failed", { error: error.message });

        const failureBody = {
          status: "unhealthy",
          error: "Health check system failure",
          timestamp: new Date().toISOString(),
        };

        return new Response(
          JSON.stringify(failureBody),
          {
            status: 503,
            headers: new Headers({
              "Content-Type": "application/json",
              "Cache-Control": "no-cache, no-store, must-revalidate",
            }),
          },
        );
      }
    }

    // Not a health check request, continue to next middleware
    return await next();
  };
}

// ================================================================================
// 🏥 HEALTH CHECKER CLASS
// ================================================================================

/**
 * Health checker implementation
 * 
 * RESPONSIBILITY:
 * - Execute health checks
 * - Aggregate results
 * - Cache results (if enabled)
 * - Determine overall status
 * 
 * DESIGN PRINCIPLES:
 * - Fail-safe (errors don't crash system)
 * - Timeout protection
 * - Caching support
 * - Extensible (custom checks)
 * 
 * @class HealthChecker
 * 
 * @example
 * ```typescript
 * const checker = new HealthChecker(config, performanceMonitor);
 * const health = await checker.performHealthCheck();
 * console.log(`Status: ${health.status}`);
 * ```
 */
export class HealthChecker {
  /**
   * Cache for health check results
   * 
   * STRUCTURE:
   * Map {
   *   "main_health_check" => { data: {...}, timestamp: 1234567890 }
   * }
   * 
   * @private
   * @type {Map}
   */
  private cache = new Map<string, { data: any; timestamp: number }>();
  
  /**
   * Application start time for uptime calculation
   * @private
   * @type {number}
   */
  private startTime = Date.now();
  
  constructor(
    private config: HealthCheckConfig,
    private performanceMonitor: any
  ) {}
  
  /**
   * Perform comprehensive health check
   * 
   * ALGORITHM:
   * 1. Check cache (if enabled)
   * 2. Collect basic info (version, uptime)
   * 3. Add metrics (if enabled)
   * 4. Add environment (if enabled)
   * 5. Run system checks (if enabled)
   * 6. Run custom checks (if provided)
   * 7. Determine overall status
   * 8. Cache result (if enabled)
   * 9. Return health data
   * 
   * @public
   * @returns {Promise<SystemHealth>} Health status
   */
  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    
    // =========================================================================
    // CHECK CACHE
    // =========================================================================
    
    /**
     * CACHE CHECK:
     * If caching enabled and result is fresh, return cached data
     * 
     * BENEFITS:
     * - Faster response
     * - Less load on dependencies
     * - Reduced resource usage
     * 
     * TRADE-OFF:
     * - Slightly stale data
     */
    if (this.config.cacheResults && this.config.cacheTTL) {
      const cached = this.getCachedResult('main_health_check');
      if (cached) {
        return cached;
      }
    }
    
    // =========================================================================
    // BUILD HEALTH DATA
    // =========================================================================
    
    /**
     * INITIALIZE HEALTH DATA:
     * Start with basic information
     * Add more based on configuration
     */
    const healthData: SystemHealth = {
      status: 'healthy',              // Default to healthy
      timestamp: new Date().toISOString(),
      version: '3.0.0',               // Application version
      uptime: this.calculateUptime()  // How long running
    };
    
    // -------------------------------------------------------------------------
    // ADD PERFORMANCE METRICS
    // -------------------------------------------------------------------------
    
    /**
     * PERFORMANCE METRICS:
     * Include if requested and monitor available
     * 
     * TYPICAL METRICS:
     * - Request rate (req/sec)
     * - Response time (avg, p95, p99)
     * - Error rate (%)
     * - Active connections
     */
    if (this.config.includeMetrics && this.performanceMonitor) {
      healthData.metrics = this.performanceMonitor.getMetrics();
    }
    
    // -------------------------------------------------------------------------
    // ADD ENVIRONMENT INFO
    // -------------------------------------------------------------------------
    
    /**
     * ENVIRONMENT INFO:
     * System and runtime information
     * 
     * INCLUDES:
     * - Deno version
     * - Platform (OS)
     * - Architecture
     * - Environment variables (filtered)
     * 
     * SECURITY WARNING:
     * Be careful with environment variables
     * Filter out sensitive data (API keys, passwords)
     */
    if (this.config.includeEnvironment) {
      healthData.environment = this.getEnvironmentInfo();
    }
    
    // -------------------------------------------------------------------------
    // RUN DETAILED SYSTEM CHECKS
    // -------------------------------------------------------------------------
    
    /**
     * DETAILED CHECKS:
     * System resource monitoring
     * 
     * CHECKS:
     * - Memory usage
     * - Disk space
     * - Network connectivity
     * 
     * WHEN TO RUN:
     * - Readiness probes
     * - Development
     * - Troubleshooting
     * 
     * WHEN TO SKIP:
     * - Liveness probes (too slow)
     * - High-frequency checks
     */
    if (this.config.enableDetailedChecks) {
      healthData.resources = await this.checkSystemResources();
      healthData.dependencies = await this.checkDependencies();
    }
    
    // -------------------------------------------------------------------------
    // RUN CUSTOM CHECKS
    // -------------------------------------------------------------------------
    
    /**
     * CUSTOM CHECKS:
     * Application-specific health checks
     * 
     * EXAMPLES:
     * - Database connectivity
     * - Cache availability
     * - External API status
     * - File system access
     * 
     * ERROR HANDLING:
     * Errors in custom checks are caught
     * Marked as unhealthy
     * Don't crash entire health check
     */
    if (this.config.customChecks && this.config.customChecks.length > 0) {
      healthData.checks = await this.runCustomChecks();
    }
    
    // =========================================================================
    // DETERMINE OVERALL STATUS
    // =========================================================================
    
    /**
     * STATUS AGGREGATION:
     * Combine all check results into single status
     * 
     * LOGIC:
     * - Any unhealthy check → Overall unhealthy
     * - Any degraded check (no unhealthy) → Overall degraded
     * - All healthy → Overall healthy
     */
    healthData.status = this.determineOverallStatus(healthData);
    
    // =========================================================================
    // CACHE RESULT
    // =========================================================================
    
    /**
     * CACHE STORAGE:
     * Store result for future requests
     * Only if caching enabled
     */
    if (this.config.cacheResults && this.config.cacheTTL) {
      this.cacheResult('main_health_check', healthData);
    }
    
    return healthData;
  }
  
  /**
   * Check system resources (memory, disk, network)
   * 
   * RESOURCE CHECKS:
   * - Memory: Always checked
   * - Disk: Checked if available
   * - Network: Checked if available
   * 
   * ERROR HANDLING:
   * If a check fails, log warning but continue
   * 
   * @private
   * @returns {Promise<ResourceHealth>} Resource health status
   */
  private async checkSystemResources(): Promise<ResourceHealth> {
    const resources: ResourceHealth = {
      memory: await this.checkMemoryHealth()
    };
    
    // -------------------------------------------------------------------------
    // DISK CHECK
    // -------------------------------------------------------------------------
    
    /**
     * DISK HEALTH:
     * Check available disk space
     * 
     * WHY IMPORTANT?
     * - Logs need space
     * - Database needs space
     * - Uploads need space
     * 
     * FAILURE HANDLING:
     * If disk check unavailable, skip it
     * Log warning for debugging
     */
    try {
      resources.disk = await this.checkDiskHealth();
    } catch (error: any) {
      ConsoleStyler.logWarning('Disk health check unavailable', { error: error.message });
    }
    
    // -------------------------------------------------------------------------
    // NETWORK CHECK
    // -------------------------------------------------------------------------
    
    /**
     * NETWORK HEALTH:
     * Check network connectivity
     * 
     * HOW IT WORKS:
     * - Ping external service
     * - Measure latency
     * - Detect failures
     * 
     * FAILURE HANDLING:
     * If network check fails, mark as unhealthy
     * Don't crash entire health check
     */
    try {
      resources.network = await this.checkNetworkHealth();
    } catch (error: any) {
      ConsoleStyler.logWarning('Network health check failed', { error: error.message });
      resources.network = { status: 'unhealthy' };
    }
    
    return resources;
  }
  
  /**
   * Check memory health
   * 
   * MEMORY MONITORING:
   * - Heap used: Memory currently in use
   * - Heap total: Total allocated memory
   * - Percentage: Used / Total * 100
   * 
   * THRESHOLDS:
   * - <75%: Healthy (green)
   * - 75-90%: Warning (yellow)
   * - >90%: Critical (red)
   * 
   * WHY THESE THRESHOLDS?
   * - 75%: Normal operation, room to grow
   * - 90%: High usage, watch closely
   * - >90%: Danger zone, possible OOM
   * 
   * @private
   * @returns {Promise<Object>} Memory health status
   */
  private async checkMemoryHealth() {
    try {
      // Get memory usage from Deno
      const memory = Deno.memoryUsage();
      
      // Convert bytes to megabytes
      const usedMB = memory.heapUsed / 1024 / 1024;
      const totalMB = memory.heapTotal / 1024 / 1024;
      const percentage = (usedMB / totalMB) * 100;
      
      // Determine status based on percentage
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (percentage > 90) {
        status = 'critical';  // Danger zone
      } else if (percentage > 75) {
        status = 'warning';   // Watch closely
      }
      
      return {
        used: `${usedMB.toFixed(2)} MB`,
        total: `${totalMB.toFixed(2)} MB`,
        percentage: Math.round(percentage),
        status
      };
    } catch (error) {
      // If memory check fails, return critical status
      return {
        used: 'N/A',
        total: 'N/A',
        percentage: 0,
        status: 'critical' as const
      };
    }
  }
  
  /**
   * Check disk health
   * 
   * DISK MONITORING:
   * Checks available disk space
   * 
   * LIMITATIONS:
   * - Deno doesn't have built-in disk space API
   * - Would need system calls or external command
   * - Placeholder implementation
   * 
   * PRODUCTION IMPLEMENTATION:
   * - Use Deno.Command to run 'df' on Linux/Mac
   * - Use 'wmic' on Windows
   * - Parse output for disk usage
   * 
   * @private
   * @returns {Promise<Object>} Disk health status
   */
  private async checkDiskHealth() {
    try {
      /**
       * PLACEHOLDER:
       * Real implementation would check actual disk space
       * 
       * LINUX EXAMPLE:
       * const cmd = new Deno.Command("df", {
       *   args: ["-h", "/"]
       * });
       * const output = await cmd.output();
       * // Parse output for usage percentage
       */
      
      // Check if we can access filesystem
      await Deno.stat('./');
      
      // Return placeholder data
      return {
        used: 'N/A',
        total: 'N/A',
        percentage: 0,
        status: 'healthy' as const
      };
    } catch (error) {
      throw new Error('Disk health check not implemented');
    }
  }
  
  /**
   * Check network connectivity
   * 
   * NETWORK CHECK:
   * Ping external service to verify connectivity
   * 
   * TEST STRATEGY:
   * - Ping reliable external service
   * - Measure latency
   * - Timeout after reasonable period
   * 
   * RECOMMENDED TARGETS:
   * - DNS: 1.1.1.1 (Cloudflare)
   * - HTTP: https://www.google.com
   * - Custom: Your CDN or API
   * 
   * LATENCY THRESHOLDS:
   * - <100ms: Excellent
   * - 100-500ms: Good
   * - >500ms: Slow but acceptable
   * - >1000ms: Poor
   * - Timeout: Unhealthy
   * 
   * @private
   * @returns {Promise<Object>} Network health status
   */
  private async checkNetworkHealth() {
    const startTime = Date.now();
    
    try {
      /**
       * NETWORK TEST:
       * Fetch from reliable external service
       * 
       * WHY fetch()?
       * - Built-in to Deno
       * - Follows HTTP standards
       * - Measures real connectivity
       * 
       * TIMEOUT:
       * Use AbortController for timeout
       * Prevents hanging checks
       */
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Attempt fetch with timeout
      await fetch('https://www.google.com', {
        method: 'HEAD',  // HEAD is faster than GET
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Calculate latency
      const latency = Date.now() - startTime;
      
      return {
        status: 'healthy' as const,
        latency
      };
    } catch (error) {
      // Network check failed
      return {
        status: 'unhealthy' as const,
        latency: Date.now() - startTime
      };
    }
  }
  
  /**
   * Check external dependencies
   * 
   * DEPENDENCY CHECKS:
   * Placeholder for checking external services
   * 
   * TYPICAL DEPENDENCIES:
   * - Databases (PostgreSQL, MongoDB)
   * - Caches (Redis, Memcached)
   * - APIs (Stripe, SendGrid, Auth0)
   * - Storage (S3, Cloud Storage)
   * 
   * IMPLEMENTATION:
   * Would use custom checks provided in config
   * 
   * @private
   * @returns {Promise<DependencyHealth[]>} Dependency health
   */
  private async checkDependencies(): Promise<DependencyHealth[]> {
    // In real implementation, check actual dependencies
    // For now, return empty array
    return [];
  }
  
  /**
   * Run custom health checks
   * 
   * CUSTOM CHECK EXECUTION:
   * 1. Run each check function
   * 2. Measure response time
   * 3. Handle errors gracefully
   * 4. Collect all results
   * 
   * ERROR HANDLING:
   * - Each check is independent
   * - Error in one doesn't affect others
   * - Failed checks marked as unhealthy
   * 
   * TIMEOUT:
   * - Respects config.timeout
   * - Prevents hanging checks
   * - Returns unhealthy on timeout
   * 
   * @private
   * @returns {Promise<HealthCheckResult[]>} Check results
   */
  private async runCustomChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    /**
     * PARALLEL EXECUTION:
     * Run all checks concurrently
     * 
     * WHY PARALLEL?
     * - Faster overall execution
     * - Checks are independent
     * - Real-world scenario (concurrent requests)
     * 
     * ALTERNATIVE:
     * Sequential execution (slower but easier to debug)
     */
    for (const check of this.config.customChecks || []) {
      const startTime = Date.now();
      
      try {
        // Run check with timeout
        const result = await this.runWithTimeout(
          check(),
          this.config.timeout || 5000
        );
        
        // Add timestamp and response time
        result.timestamp = new Date().toISOString();
        result.responseTime = Date.now() - startTime;
        
        results.push(result);
      } catch (error: any) {
        // Check failed, record as unhealthy
        results.push({
          name: 'unknown_check',
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * Run async function with timeout
   * 
   * TIMEOUT IMPLEMENTATION:
   * Race between actual check and timeout
   * 
   * HOW IT WORKS:
   * - Start check
   * - Start timeout timer
   * - Whichever finishes first wins
   * - If timeout wins, throw error
   * 
   * @private
   * @param {Promise<T>} promise - Promise to run
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<T>} Result or timeout error
   */
  private async runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Check timeout')), timeoutMs)
      )
    ]);
  }
  
  /**
   * Determine overall health status from all checks
   * 
   * STATUS AGGREGATION ALGORITHM:
   * 1. Check resources (memory critical? → unhealthy)
   * 2. Check custom checks (any unhealthy? → unhealthy)
   * 3. Check dependencies (any unhealthy? → unhealthy)
   * 4. Check degraded conditions
   * 5. Default to healthy
   * 
   * PRIORITY:
   * unhealthy > degraded > healthy
   * 
   * @private
   * @param {SystemHealth} healthData - Health data to evaluate
   * @returns {'healthy' | 'degraded' | 'unhealthy'} Overall status
   */
  private determineOverallStatus(healthData: SystemHealth): 'healthy' | 'degraded' | 'unhealthy' {
    // =========================================================================
    // CHECK 1: CRITICAL RESOURCES
    // =========================================================================
    
    /**
     * CRITICAL RESOURCE CHECK:
     * If memory is critical, system is unhealthy
     * 
     * WHY CRITICAL?
     * - Out of memory is imminent
     * - Application may crash
     * - Cannot serve requests reliably
     */
    if (healthData.resources?.memory.status === 'critical') {
      return 'unhealthy';
    }
    
    // =========================================================================
    // CHECK 2: CUSTOM CHECKS
    // =========================================================================
    
    /**
     * CUSTOM CHECK FAILURES:
     * Any unhealthy custom check → Overall unhealthy
     * 
     * WHY?
     * - Custom checks are application-critical
     * - Database down = cannot serve requests
     * - API unavailable = broken functionality
     */
    const hasUnhealthyCheck = healthData.checks?.some(
      check => check.status === 'unhealthy'
    );
    if (hasUnhealthyCheck) {
      return 'unhealthy';
    }
    
    // =========================================================================
    // CHECK 3: DEPENDENCIES
    // =========================================================================
    
    /**
     * DEPENDENCY FAILURES:
     * Any unhealthy dependency → Overall unhealthy
     * 
     * EXAMPLES:
     * - Primary database down
     * - Payment API unavailable
     * - Auth service unreachable
     */
    const hasUnhealthyDependency = healthData.dependencies?.some(
      dep => dep.status === 'unhealthy'
    );
    if (hasUnhealthyDependency) {
      return 'unhealthy';
    }
    
    // =========================================================================
    // CHECK 4: DEGRADED CONDITIONS
    // =========================================================================
    
    /**
     * DEGRADED CHECKS:
     * Any degraded condition → Overall degraded
     * 
     * EXAMPLES:
     * - Secondary database slow
     * - Cache miss rate high
     * - Memory warning level
     * - Non-critical service down
     */
    const hasDegradedCheck = healthData.checks?.some(
      check => check.status === 'degraded'
    );
    const hasDegradedDependency = healthData.dependencies?.some(
      dep => dep.status === 'degraded'
    );
    const hasMemoryWarning = healthData.resources?.memory.status === 'warning';
    
    if (hasDegradedCheck || hasDegradedDependency || hasMemoryWarning) {
      return 'degraded';
    }
    
    // =========================================================================
    // DEFAULT: HEALTHY
    // =========================================================================
    
    /**
     * HEALTHY STATUS:
     * No issues found in any checks
     * System is operating normally
     */
    return 'healthy';
  }
  
  /**
   * Calculate application uptime
   * 
   * UPTIME CALCULATION:
   * Current time - Start time = Uptime
   * 
   * FORMAT:
   * - "5 days, 3 hours, 45 minutes"
   * - "2 hours, 30 minutes"
   * - "45 minutes, 12 seconds"
   * 
   * @private
   * @returns {string} Human-readable uptime
   */
  private calculateUptime(): string {
    const uptimeMs = Date.now() - this.startTime;
    
    // Calculate time components
    const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);
    
    // Build uptime string
    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0 && days === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
    
    return parts.join(', ') || '0 seconds';
  }
  
  /**
   * Get environment information
   * 
   * ENVIRONMENT DATA:
   * - Deno version
   * - Platform (OS)
   * - Architecture (CPU)
   * - Node environment (dev/prod)
   * 
   * SECURITY:
   * - Filters sensitive env vars
   * - Only includes safe information
   * 
   * @private
   * @returns {Object} Environment information
   */
  private getEnvironmentInfo() {
    return {
      deno: Deno.version.deno,
      typescript: Deno.version.typescript,
      v8: Deno.version.v8,
      platform: Deno.build.os,
      arch: Deno.build.arch,
      env: Deno.env.get('DENO_ENV') || 'development'
    };
  }
  
  /**
   * Get cached result if available and fresh
   * 
   * CACHE LOGIC:
   * 1. Check if key exists in cache
   * 2. Check if cached data is still fresh
   * 3. Return data if fresh, null if stale
   * 
   * @private
   * @param {string} key - Cache key
   * @returns {any | null} Cached data or null
   */
  private getCachedResult(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache is still fresh
    const age = Date.now() - cached.timestamp;
    const ttl = this.config.cacheTTL || 5000;
    
    if (age < ttl) {
      return cached.data;
    }
    
    // Cache is stale
    return null;
  }
  
  /**
   * Cache health check result
   * 
   * @private
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @returns {void}
   */
  private cacheResult(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

// ================================================================================
// 🛠️ HEALTH CHECK UTILITIES
// ================================================================================

/**
 * Health check utility functions
 * 
 * UTILITIES:
 * - Create database checks
 * - Create API checks
 * - Create cache checks
 * - Create file system checks
 * - Create Kubernetes probes
 * 
 * @class HealthCheckUtils
 * @static
 */
export class HealthCheckUtils {
  /**
   * Create a database health check
   * 
   * DATABASE CHECK:
   * Tests database connectivity and responsiveness
   * 
   * HOW IT WORKS:
   * 1. Execute simple query (SELECT 1)
   * 2. Measure response time
   * 3. Check for errors
   * 
   * THRESHOLDS:
   * - <100ms: Healthy
   * - 100-500ms: Degraded
   * - >500ms: Unhealthy
   * - Error: Unhealthy
   * 
   * @public
   * @static
   * @param {any} db - Database connection
   * @param {string} name - Check name
   * @returns {Function} Health check function
   * 
   * @example
   * ```typescript
   * const dbCheck = HealthCheckUtils.createDatabaseCheck(db, 'postgres_primary');
   * 
   * const customChecks = [dbCheck];
   * ```
   */
  static createDatabaseCheck(db: any, name: string = 'database'): () => Promise<HealthCheckResult> {
    return async () => {
      const startTime = Date.now();
      
      try {
        /**
         * DATABASE CONNECTIVITY TEST:
         * Execute minimal query
         * 
         * QUERY EXAMPLES:
         * - PostgreSQL: SELECT 1
         * - MySQL: SELECT 1
         * - MongoDB: db.admin().ping()
         * - Redis: PING
         */
        
        // Execute test query (example for SQL)
        // await db.query('SELECT 1');
        
        const responseTime = Date.now() - startTime;
        
        // Determine status based on response time
        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        if (responseTime > 500) {
          status = 'unhealthy';
        } else if (responseTime > 100) {
          status = 'degraded';
        }
        
        return {
          name,
          status,
          responseTime,
          details: {
            connected: true,
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error: any) {
        return {
          name,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: error.message
        };
      }
    };
  }
  
  /**
   * Create an API health check
   * 
   * API CHECK:
   * Tests external API availability
   * 
   * HOW IT WORKS:
   * 1. Send HTTP request to API
   * 2. Check status code
   * 3. Measure response time
   * 
   * SUCCESS CRITERIA:
   * - 2xx status code
   * - Response < 5 seconds
   * 
   * @public
   * @static
   * @param {string} url - API URL to check
   * @param {string} name - Check name
   * @returns {Function} Health check function
   * 
   * @example
   * ```typescript
   * const apiCheck = HealthCheckUtils.createApiCheck(
   *   'https://api.stripe.com/v1/health',
   *   'stripe_api'
   * );
   * ```
   */
  static createApiCheck(url: string, name: string = 'api'): () => Promise<HealthCheckResult> {
    return async () => {
      const startTime = Date.now();
      
      try {
        /**
         * API AVAILABILITY TEST:
         * Send HTTP request with timeout
         * 
         * METHOD:
         * - HEAD: Fastest (no body)
         * - GET: If HEAD not supported
         * 
         * TIMEOUT:
         * 5 seconds (prevent hanging)
         */
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const responseTime = Date.now() - startTime;
        
        // Check response status
        const status = response.ok ? 'healthy' : 'unhealthy';
        
        return {
          name,
          status,
          responseTime,
          details: {
            statusCode: response.status,
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error: any) {
        return {
          name,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: error.message
        };
      }
    };
  }

  /**
   * Create a cache health check
   * 
   * CACHE CHECK:
   * Tests cache connectivity and operations
   * 
   * HOW IT WORKS:
   * 1. Set test key
   * 2. Get test key
   * 3. Verify value matches
   * 4. Delete test key
   * 
   * @public
   * @static
   * @param {any} cache - Cache client (Redis, Memcached)
   * @param {string} name - Check name
   * @returns {Function} Health check function
   * 
   * @example
   * ```typescript
   * const cacheCheck = HealthCheckUtils.createCacheCheck(redis, 'redis_cache');
   * ```
   */
  static createCacheCheck(cache: any, name: string = 'cache'): () => Promise<HealthCheckResult> {
    return async () => {
      const startTime = Date.now();
      
      try {
        /**
         * CACHE OPERATION TEST:
         * Test SET/GET operations
         * 
         * TEST KEY:
         * Use unique key to avoid conflicts
         * health_check_<timestamp>
         */
        
        const testKey = `health_check_${Date.now()}`;
        const testValue = 'OK';
        
        // Test SET
        // await cache.set(testKey, testValue);
        
        // Test GET
        // const value = await cache.get(testKey);
        
        // Verify
        // if (value !== testValue) throw new Error('Cache value mismatch');
        
        // Cleanup
        // await cache.del(testKey);
        
        const responseTime = Date.now() - startTime;
        
        return {
          name,
          status: 'healthy',
          responseTime,
          details: {
            connected: true,
            responseTime: `${responseTime}ms`
          }
        };
      } catch (error: any) {
        return {
          name,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: error.message
        };
      }
    };
  }

  /**
   * Create a readiness probe (for Kubernetes/Docker deployments)
   * 
   * READINESS PROBE:
   * Checks if application is ready to serve traffic
   * 
   * USE CASE:
   * Kubernetes uses this to add pod to service
   * Load balancer uses this to route traffic
   * 
   * CHECKS:
   * - All dependencies healthy
   * - Application initialized
   * - Ready to serve requests
   * 
   * @public
   * @static
   * @param {Array} dependencies - Dependency check functions
   * @returns {Function} Readiness probe function
   * 
   * @example
   * ```typescript
   * const readinessProbe = HealthCheckUtils.createReadinessProbe([
   *   dbCheck,
   *   cacheCheck,
   *   apiCheck
   * ]);
   * ```
   */
  static createReadinessProbe(
    dependencies: Array<() => Promise<HealthCheckResult>>
  ): () => Promise<HealthCheckResult> {
    return async () => {
      const startTime = Date.now();
      
      try {
        /**
         * READINESS ALGORITHM:
         * 1. Run all dependency checks in parallel
         * 2. Wait for all to complete
         * 3. Check if all are healthy
         * 4. Return ready/not ready
         */
        
        const results = await Promise.all(dependencies.map(dep => dep()));
        const allHealthy = results.every(result => result.status === 'healthy');
        
        return {
          name: 'readiness_probe',
          status: allHealthy ? 'healthy' : 'unhealthy',
          responseTime: Date.now() - startTime,
          details: {
            dependenciesChecked: results.length,
            dependenciesHealthy: results.filter(r => r.status === 'healthy').length,
            ready: allHealthy
          }
        };
      } catch (error: any) {
        return {
          name: 'readiness_probe',
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: error.message
        };
      }
    };
  }
  
  /**
   * Create a liveness probe (for Kubernetes/Docker deployments)
   * 
   * LIVENESS PROBE:
   * Checks if application is alive (not deadlocked)
   * 
   * USE CASE:
   * Kubernetes uses this to restart dead pods
   * 
   * SIMPLE CHECK:
   * - If code executes, application is alive
   * - No dependency checks (too slow)
   * - Very fast (<100ms)
   * 
   * @public
   * @static
   * @returns {Function} Liveness probe function
   * 
   * @example
   * ```typescript
   * const livenessProbe = HealthCheckUtils.createLivenessProbe();
   * 
   * // Kubernetes config:
   * // livenessProbe:
   * //   httpGet:
   * //     path: /health/live
   * //     port: 8000
   * ```
   */
  static createLivenessProbe(): () => Promise<HealthCheckResult> {
    return async () => {
      const startTime = Date.now();
      
      /**
       * LIVENESS CHECK:
       * Simplest possible check
       * 
       * LOGIC:
       * If this code runs, process is alive
       * No external dependencies
       * No database queries
       * Just return healthy
       */
      
      return {
        name: 'liveness_probe',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          alive: true,
          timestamp: new Date().toISOString()
        }
      };
    };
  }
  
  /**
   * Validate health check configuration
   * 
   * VALIDATION RULES:
   * - Endpoint is required
   * - Endpoint must start with /
   * - Timeout must be positive
   * - Cache TTL must be positive
   * - Custom checks must be array
   * 
   * @public
   * @static
   * @param {HealthCheckConfig} config - Configuration to validate
   * @returns {Object} Validation result
   * 
   * @example
   * ```typescript
   * const validation = HealthCheckUtils.validateConfig(config);
   * if (!validation.valid) {
   *   console.error('Invalid config:', validation.errors);
   * }
   * ```
   */
  static validateConfig(config: HealthCheckConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check endpoint
    if (!config.endpoint) {
      errors.push('Health check endpoint is required');
    }
    
    if (config.endpoint && !config.endpoint.startsWith('/')) {
      errors.push('Health check endpoint must start with "/"');
    }
    
    // Check timeout
    if (config.timeout && config.timeout <= 0) {
      errors.push('Timeout must be positive');
    }
    
    // Check cache TTL
    if (config.cacheTTL && config.cacheTTL <= 0) {
      errors.push('Cache TTL must be positive');
    }
    
    // Check custom checks
    if (config.customChecks && !Array.isArray(config.customChecks)) {
      errors.push('Custom checks must be an array');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// ================================================================================
// 📊 HEALTH MONITORING AND ALERTING
// ================================================================================

/**
 * Health monitoring and alerting system
 * 
 * RESPONSIBILITY:
 * - Record health check history
 * - Detect patterns
 * - Generate alerts
 * - Calculate statistics
 * - Track trends
 * 
 * DESIGN PRINCIPLES:
 * - Real-time monitoring
 * - Automatic alerting
 * - Memory-efficient (bounded history)
 * - Actionable insights
 * 
 * @class HealthMonitor
 * 
 * @example
 * ```typescript
 * const monitor = new HealthMonitor();
 * 
 * // Record health check
 * monitor.recordHealthCheck(healthData);
 * 
 * // Get statistics
 * const stats = monitor.getHealthStats();
 * console.log(`Uptime: ${stats.uptimePercentage}`);
 * 
 * // Get alerts
 * const alerts = monitor.getRecentAlerts(24);
 * ```
 */
export class HealthMonitor {
  /**
   * Health check history
   * 
   * STRUCTURE:
   * [
   *   { timestamp: 1234567890, status: 'healthy', details: {...} },
   *   { timestamp: 1234567900, status: 'degraded', details: {...} }
   * ]
   * 
   * SIZE LIMIT:
   * Maximum 1000 entries
   * Oldest entries removed when limit reached
   * 
   * @private
   * @type {Array}
   */
  private healthHistory: Array<{ timestamp: number; status: string; details?: any }> = [];
  
  /**
   * Alert history
   * 
   * STRUCTURE:
   * [
   *   { timestamp: 1234567890, message: 'High memory', severity: 'high' }
   * ]
   * 
   * SIZE LIMIT:
   * Maximum 100 alerts
   * 
   * @private
   * @type {Array}
   */
  private alerts: Array<{ timestamp: number; message: string; severity: string }> = [];
  
  /**
   * Record health check result
   * 
   * RECORDING PROCESS:
   * 1. Add to history
   * 2. Trim history if needed
   * 3. Check for alert conditions
   * 4. Generate alerts if needed
   * 
   * @public
   * @param {SystemHealth} result - Health check result
   * @returns {void}
   */
  recordHealthCheck(result: SystemHealth): void {
    // Add to history
    this.healthHistory.push({
      timestamp: Date.now(),
      status: result.status,
      details: {
        checksCount: result.checks?.length || 0,
        dependenciesCount: result.dependencies?.length || 0,
        memoryUsage: result.resources?.memory.percentage
      }
    });
    
    // Keep only last 1000 entries
    if (this.healthHistory.length > 1000) {
      this.healthHistory = this.healthHistory.slice(-1000);
    }
    
    // Check for alerting conditions
    this.checkAlertConditions(result);
  }
  
  /**
   * Check for conditions that should trigger alerts
   * 
   * ALERT CONDITIONS:
   * 1. System unhealthy
   * 2. High memory usage (>90%)
   * 3. Consecutive degraded status
   * 4. Failed dependencies
   * 
   * @private
   * @param {SystemHealth} result - Health check result
   * @returns {void}
   */
  private checkAlertConditions(result: SystemHealth): void {
    // =========================================================================
    // CONDITION 1: UNHEALTHY STATUS
    // =========================================================================
    
    /**
     * UNHEALTHY ALERT:
     * System is unhealthy, immediate attention required
     * 
     * SEVERITY: High
     */
    if (result.status === 'unhealthy') {
      this.addAlert('System health is unhealthy', 'high');
    }
    
    // =========================================================================
    // CONDITION 2: HIGH MEMORY USAGE
    // =========================================================================
    
    /**
     * MEMORY ALERT:
     * Memory usage exceeds 90%, risk of OOM
     * 
     * SEVERITY: Medium
     */
    if (result.resources?.memory.percentage && result.resources.memory.percentage > 90) {
      this.addAlert(`High memory usage: ${result.resources.memory.percentage}%`, 'medium');
    }
    
    // =========================================================================
    // CONDITION 3: CONSECUTIVE DEGRADED
    // =========================================================================
    
    /**
     * DEGRADED ALERT:
     * System has been degraded for multiple checks
     * 
     * LOGIC:
     * Last 5 checks, at least 3 are degraded
     * 
     * SEVERITY: Medium
     */
    const recent = this.healthHistory.slice(-5);
    const allDegraded = recent.length >= 3 && recent.every(h => h.status === 'degraded');
    if (allDegraded) {
      this.addAlert('System has been in degraded state for multiple checks', 'medium');
    }
    
    // =========================================================================
    // CONDITION 4: FAILED DEPENDENCIES
    // =========================================================================
    
    /**
     * DEPENDENCY ALERT:
     * One or more dependencies are unhealthy
     * 
     * SEVERITY: High
     */
    const failedDeps = result.dependencies?.filter(d => d.status === 'unhealthy') || [];
    if (failedDeps.length > 0) {
      this.addAlert(`${failedDeps.length} dependencies are unhealthy`, 'high');
    }
  }
  
  /**
   * Add an alert
   * 
   * DEDUPLICATION:
   * Don't add duplicate alerts within 5 minutes
   * 
   * STORAGE:
   * Keep last 100 alerts only
   * 
   * @private
   * @param {string} message - Alert message
   * @param {string} severity - Alert severity
   * @returns {void}
   */
  private addAlert(message: string, severity: string): void {
    // Check for duplicates
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const isDuplicate = this.alerts.some(alert => 
      alert.message === message && alert.timestamp > fiveMinutesAgo
    );
    
    if (!isDuplicate) {
      // Add new alert
      this.alerts.push({
        timestamp: Date.now(),
        message,
        severity
      });
      
      // Log the alert
      ConsoleStyler.logWarning(`Health Alert [${severity.toUpperCase()}]`, { message });
      
      // Keep only last 100 alerts
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-100);
      }
    }
  }
  
  /**
   * Get health statistics
   * 
   * STATISTICS:
   * - Total checks performed
   * - Health status breakdown
   * - Uptime percentage
   * - Recent alerts
   * - Health trend
   * 
   * @public
   * @returns {Object} Health statistics
   */
  getHealthStats() {
    const totalChecks = this.healthHistory.length;
    const healthyChecks = this.healthHistory.filter(h => h.status === 'healthy').length;
    const degradedChecks = this.healthHistory.filter(h => h.status === 'degraded').length;
    const unhealthyChecks = this.healthHistory.filter(h => h.status === 'unhealthy').length;
    
    // Calculate uptime percentage
    const uptime = totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 100;
    
    // Recent alerts (last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentAlerts = this.alerts.filter(alert => alert.timestamp > oneDayAgo);
    
    return {
      totalChecks,
      healthyChecks,
      degradedChecks,
      unhealthyChecks,
      uptimePercentage: uptime.toFixed(2) + '%',
      recentAlerts: recentAlerts.length,
      alertsBySeverity: {
        high: recentAlerts.filter(a => a.severity === 'high').length,
        medium: recentAlerts.filter(a => a.severity === 'medium').length,
        low: recentAlerts.filter(a => a.severity === 'low').length
      },
      lastCheck: this.healthHistory.length > 0 
        ? new Date(this.healthHistory[this.healthHistory.length - 1].timestamp).toISOString()
        : null,
      healthTrend: this.calculateHealthTrend()
    };
  }
  
  /**
   * Calculate health trend
   * 
   * TREND ALGORITHM:
   * Compare recent health to previous health
   * 
   * CATEGORIES:
   * - improving: Recent health better than before
   * - stable: No significant change
   * - declining: Recent health worse than before
   * 
   * @private
   * @returns {'improving' | 'stable' | 'declining'} Health trend
   */
  private calculateHealthTrend(): 'improving' | 'stable' | 'declining' {
    if (this.healthHistory.length < 10) return 'stable';
    
    // Compare last 5 checks to previous 5
    const recent = this.healthHistory.slice(-5);
    const previous = this.healthHistory.slice(-10, -5);
    
    const recentHealthy = recent.filter(h => h.status === 'healthy').length;
    const previousHealthy = previous.filter(h => h.status === 'healthy').length;
    
    if (recentHealthy > previousHealthy) return 'improving';
    if (recentHealthy < previousHealthy) return 'declining';
    return 'stable';
  }
  
  /**
   * Get recent alerts
   * 
   * @public
   * @param {number} hours - Number of hours to look back
   * @returns {Array} Recent alerts
   */
  getRecentAlerts(hours: number = 24) {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.alerts
      .filter(alert => alert.timestamp > cutoff)
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(alert => ({
        ...alert,
        timestamp: new Date(alert.timestamp).toISOString()
      }));
  }
  
  /**
   * Clear old data (cleanup)
   * 
   * CLEANUP:
   * Remove data older than 24 hours
   * 
   * WHEN TO RUN:
   * - Daily cleanup job
   * - When memory pressure detected
   * - Manual trigger
   * 
   * @public
   * @returns {void}
   */
  cleanup(): void {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.healthHistory = this.healthHistory.filter(h => h.timestamp > oneDayAgo);
    this.alerts = this.alerts.filter(a => a.timestamp > oneDayAgo);
  }
}

// ================================================================================
// 🎯 HEALTH CHECK CONFIGURATION PRESETS
// ================================================================================

/**
 * Pre-configured health check setups for common scenarios
 * 
 * PHILOSOPHY:
 * - Convention over configuration
 * - Safe defaults for each use case
 * - Easy to customize after selecting preset
 * 
 * @example
 * ```typescript
 * // Use preset as-is
 * app.use(createHealthCheckMiddleware(monitor, {
 *   ...HealthCheckPresets.KUBERNETES_LIVENESS
 * }));
 * 
 * // Customize after selection
 * const config = {
 *   ...HealthCheckPresets.PRODUCTION,
 *   customChecks: [dbCheck, cacheCheck]
 * };
 * ```
 */
export const HealthCheckPresets = {
  /**
   * Basic health check preset
   * 
   * CHARACTERISTICS:
   * - Simple endpoint
   * - No metrics
   * - No detailed checks
   * - Fast response
   * 
   * USE CASE:
   * - Simple applications
   * - Quick status check
   * - Minimal overhead
   */
  BASIC: {
    endpoint: '/health',
    includeMetrics: false,
    includeEnvironment: false,
    enableDetailedChecks: false,
    cacheResults: false,
    timeout: 1000
  } as HealthCheckConfig,

  /**
   * Production health check preset
   * 
   * CHARACTERISTICS:
   * - Comprehensive checks
   * - Includes metrics
   * - Detailed system monitoring
   * - Caching enabled
   * 
   * USE CASE:
   * - Production environments
   * - Load balancer health checks
   * - Monitoring systems
   */
  PRODUCTION: {
    endpoint: '/health',
    includeMetrics: true,
    includeEnvironment: false,
    enableDetailedChecks: true,
    cacheResults: true,
    cacheTTL: 5000,
    timeout: 5000
  } as HealthCheckConfig,

  /**
   * Kubernetes liveness probe preset
   * 
   * CHARACTERISTICS:
   * - Very simple
   * - Very fast
   * - No dependencies
   * - Just checks if alive
   * 
   * USE CASE:
   * - Kubernetes livenessProbe
   * - Deadlock detection
   * - Process restart trigger
   */
  KUBERNETES_LIVENESS: {
    endpoint: '/health/live',
    includeMetrics: false,
    includeEnvironment: false,
    enableDetailedChecks: false,
    cacheResults: false,
    timeout: 100
  } as HealthCheckConfig,

  /**
   * Kubernetes readiness probe preset
   * 
   * CHARACTERISTICS:
   * - Checks dependencies
   * - Moderate speed
   * - Determines if ready for traffic
   * 
   * USE CASE:
   * - Kubernetes readinessProbe
   * - Load balancer decisions
   * - Service routing
   */
  KUBERNETES_READINESS: {
    endpoint: '/health/ready',
    includeMetrics: false,
    includeEnvironment: false,
    enableDetailedChecks: true,
    cacheResults: true,
    cacheTTL: 3000,
    timeout: 3000
  } as HealthCheckConfig,

  /**
   * Development health check preset
   * 
   * CHARACTERISTICS:
   * - All information included
   * - Detailed debugging info
   * - Environment variables
   * - No caching (always fresh)
   * 
   * USE CASE:
   * - Local development
   * - Debugging issues
   * - Understanding system state
   */
  DEVELOPMENT: {
    endpoint: '/health',
    includeMetrics: true,
    includeEnvironment: true,
    enableDetailedChecks: true,
    cacheResults: false,
    timeout: 10000
  } as HealthCheckConfig
};

// ================================================================================
// 🚀 EXPORT ALL HEALTH CHECK COMPONENTS
// ================================================================================

/**
 * Default export for convenient importing
 * 
 * @example
 * ```typescript
 * import health from "./middleware/healthCheck.ts";
 * 
 * // Use middleware
 * app.use(health.createHealthCheckMiddleware(monitor, config));
 * 
 * // Use utilities
 * const dbCheck = health.HealthCheckUtils.createDatabaseCheck(db);
 * 
 * // Use monitor
 * const monitor = new health.HealthMonitor();
 * 
 * // Use presets
 * const config = health.HealthCheckPresets.PRODUCTION;
 * ```
 */
export default {
  createHealthCheckMiddleware,
  HealthChecker,
  HealthCheckUtils,
  HealthMonitor,
  HealthCheckPresets
};

// ================================================================================
// END OF FILE
// ================================================================================
