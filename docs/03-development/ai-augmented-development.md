# DenoGenesis Meta Documentation
## LLM + Human Collaboration Guide for Unix Philosophy-Driven Development

**Framework Version:** 2.1+  
**Documentation Type:** Meta (AI-Augmented Development)  
**Target Audience:** Large Language Models + Human Developers  
**Last Updated:** September 2025  

---

## 🎯 **Core Mission Statement**

This meta documentation serves as the definitive guide for Large Language Models (LLMs) and human developers working collaboratively on the DenoGenesis framework. Every script, component, and architectural decision MUST adhere to Unix Philosophy principles while leveraging AI-augmented development practices.

---

## 📖 **Unix Philosophy Principles for DenoGenesis**

### **1. Do One Thing Well**
Each Deno script in the framework should have a single, clearly defined responsibility:

```typescript
// ✅ GOOD: Single responsibility
// core/utils/consoleStyler.ts - Only handles console output formatting
export function styleInfo(message: string): string {
  return `📋 ${message}`;
}

// ❌ BAD: Multiple responsibilities
// Don't combine logging, database operations, and API calls in one module
```

### **2. Make Everything a Filter**
Scripts should accept input, transform it, and produce output without side effects where possible:

```typescript
// ✅ GOOD: Pure function that transforms data
export function validateSiteConfig(config: SiteConfig): ValidationResult {
  return {
    isValid: config.port > 0 && config.siteName.length > 0,
    errors: []
  };
}

// ✅ GOOD: Composable pipeline
const result = validateSiteConfig(config)
  .then(transformToSystemdConfig)
  .then(writeConfigFile);
```

### **3. Avoid Captive User Interfaces**
Scripts should work programmatically and in automation contexts:

```typescript
// ✅ GOOD: Return structured data for programmatic use
export async function healthCheck(): Promise<HealthStatus> {
  return {
    status: "healthy",
    services: [
      { name: "database", status: "up", responseTime: 23 }
    ],
    timestamp: new Date().toISOString()
  };
}

// ❌ BAD: Direct console output only
// console.log("Database is up"); // Not programmatically useful
```

### **4. Store Data in Flat Text Files**
Configuration and state should be human-readable and version-controllable:

```typescript
// ✅ GOOD: Version file format (flat text, parseable)
// VERSION file content:
// 2.1.0
// Build Date: 2025-09-04
// Git Hash: abc123def456
// Centralized: 2025-09-04T10:30:00Z

// ✅ GOOD: Site configuration (TypeScript that compiles to readable output)
export const SITE_CONFIG = {
  port: 3000,
  siteName: "domtech",
  features: ["database", "auth", "monitoring"]
};
```

### **5. Use Software Leverage**
Leverage Deno's built-in capabilities and existing tools rather than reinventing:

```typescript
// ✅ GOOD: Use Deno's built-in capabilities
import { serve } from "https://deno.land/std@0.200.0/http/server.ts";

// ✅ GOOD: Leverage existing validation patterns
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
const ConfigSchema = z.object({
  port: z.number().min(1000).max(9999),
  siteName: z.string().min(1)
});
```

### **6. Use Shell Scripts to Increase Leverage**
Complement TypeScript with shell scripts for system operations:

```bash
#!/bin/bash
# ✅ GOOD: Shell script for system-level operations
# scripts/health-check.sh

check_service() {
  local service=$1
  local port=$2
  
  if curl -sf "http://localhost:$port/health" > /dev/null; then
    echo "$service:healthy"
  else
    echo "$service:unhealthy"
  fi
}

# Export results in parseable format
check_service "domtech" 3000
check_service "okdevs" 3002
```

### **7. Avoid Gratuitous Output**
Scripts should be quiet by default, verbose when requested:

```typescript
// ✅ GOOD: Configurable output levels
export interface LoggerConfig {
  level: 'silent' | 'error' | 'info' | 'debug';
  format: 'json' | 'text';
}

export function log(message: string, level: 'info' | 'error' | 'debug' = 'info') {
  if (shouldLog(level)) {
    console.log(formatMessage(message, level));
  }
}

// ✅ GOOD: Success indicated by exit code, minimal output
// Exit code 0 = success, non-zero = error
// Detailed output only when --verbose flag used
```

---

## 🏗️ **DenoGenesis Architecture Principles**

### **Centralized Hub-and-Spoke Model**
```
/home/admin/deno-genesis/               # Framework Hub
├── core/                              # Shared framework code
│   ├── middleware/                    # HTTP middleware (auth, logging, etc.)
│   ├── database/                      # Database connection and utilities  
│   ├── config/                        # Environment and configuration management
│   ├── utils/                         # Utility functions and helpers
│   ├── types/                         # TypeScript type definitions
│   └── meta.ts                        # Framework integrity validation
├── sites/                             # Individual site instances (spokes)
│   ├── domtech/                       # Port 3000 - Tech solutions site
│   ├── heavenlyroofing/              # Port 3001 - Roofing business site
│   ├── okdevs/                       # Port 3002 - Developer community site
│   ├── pedromdominguez/              # Port 3003 - Personal portfolio site
│   └── efficientmovers/              # Port 3004 - Moving services site
├── shared-components/                 # Reusable UI components
├── scripts/                          # System automation scripts
├── config/                           # Infrastructure configuration
└── VERSION                           # Framework version tracking
```

### **Version Drift Prevention**
The core directory prevents version drift through:
- **Symbolic linking**: Sites link to `core/` rather than copying
- **Centralized updates**: One framework update affects all sites
- **Integrity validation**: `core/meta.ts` ensures consistency

### **Port Isolation Strategy**
```typescript
// Each site maintains isolated port configuration
// sites/domtech/site-config.ts
export const SITE_CONFIG = {
  port: 3000,
  siteName: "domtech",
  database: "domtech_db",
  features: ["auth", "monitoring", "api"]
};

// sites/okdevs/site-config.ts  
export const SITE_CONFIG = {
  port: 3002,
  siteName: "okdevs",
  database: "okdevs_db", 
  features: ["community", "events", "projects"]
};
```

---

## 🤖 **LLM Collaboration Guidelines**

### **Context Preservation Patterns**

When working with LLMs on DenoGenesis, maintain context through:

1. **Structured Documentation References**
```typescript
/**
 * @fileoverview Site health monitoring utility
 * @module core/utils/health
 * @requires core/config/env.ts - Environment configuration
 * @requires core/database/client.ts - Database connectivity
 * @follows Unix Philosophy: Single responsibility (health checking only)
 * @architecture Hub-and-spoke: Used by all sites via symbolic link
 */
```

2. **Explicit Dependencies and Relationships**
```typescript
// Always document architectural relationships
import type { SiteConfig } from "../types/site.ts";
import { DATABASE_CONFIG } from "../config/env.ts";

// Document why this exists and how it fits into the bigger picture
/**
 * Validates site configuration against framework requirements.
 * Part of the centralized architecture - ensures all sites follow
 * consistent patterns while maintaining their individual identity.
 */
export function validateSiteConfig(config: SiteConfig): boolean {
  // Implementation follows Unix Philosophy: 
  // - Single purpose (validation only)
  // - Returns structured data (not side effects)
  // - Composable with other validation functions
}
```

3. **Decision Documentation**
```typescript
/**
 * ARCHITECTURAL DECISION RECORD (ADR)
 * 
 * Decision: Use symbolic links instead of npm/git submodules
 * Rationale: Prevents version drift while maintaining development flexibility
 * Trade-offs: Requires careful deployment scripting
 * Alternatives considered: Git submodules, NPM packages, direct copying
 * 
 * Unix Philosophy alignment:
 * - Simplicity: Single source of truth for framework code
 * - Composability: Sites can still override individual components
 * - Transparency: Clear relationships between hub and spokes
 */
```

### **AI-Friendly Code Patterns**

Structure code to be easily understood and modified by AI:

```typescript
// ✅ GOOD: Clear interfaces and explicit types
interface HealthCheckResult {
  serviceName: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTimeMs: number;
  lastChecked: string;
  details?: string;
}

// ✅ GOOD: Self-documenting function names and parameters
export async function checkServiceHealth(
  serviceName: string, 
  endpoint: string,
  timeoutMs: number = 5000
): Promise<HealthCheckResult> {
  // Implementation is predictable and follows established patterns
}

// ✅ GOOD: Consistent error handling patterns
export class DenoGenesisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DenoGenesisError';
  }
}
```

---

## 🔧 **Development Standards**

### **File Organization Principles**

```
core/
├── types/                     # All TypeScript interfaces and types
│   ├── site.ts               # Site-specific type definitions
│   ├── database.ts           # Database-related types  
│   └── framework.ts          # Framework-level types
├── utils/                     # Pure utility functions
│   ├── consoleStyler.ts      # Console output formatting
│   ├── validation.ts         # Data validation utilities
│   └── index.ts              # Barrel export for convenience
├── middleware/                # HTTP middleware components
│   ├── auth.ts               # Authentication middleware
│   ├── logging.ts            # Request logging middleware
│   └── index.ts              # Middleware composition
├── database/                  # Database abstraction layer
│   ├── client.ts             # Database connection management
│   ├── migrations.ts         # Database migration utilities
│   └── queries.ts            # Common query builders
├── config/                    # Configuration management
│   ├── env.ts                # Environment variable handling
│   ├── site.ts               # Site-specific configuration
│   └── database.ts           # Database configuration
└── meta.ts                    # Framework integrity and validation
```

### **Naming Conventions**

```typescript
// ✅ File naming: kebab-case for files, PascalCase for classes
// file: console-styler.ts
export class ConsoleStyler {
  // ✅ Method naming: camelCase, descriptive
  formatInfoMessage(message: string): string { }
  
  // ✅ Constant naming: SCREAMING_SNAKE_CASE
  private static readonly DEFAULT_COLOR_RESET = '\x1b[0m';
}

// ✅ Interface naming: PascalCase with descriptive suffixes
interface SiteConfiguration { }
interface DatabaseConnectionOptions { }
interface HealthCheckResult { }

// ✅ Type naming: PascalCase, often ending in Type for clarity
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type DeploymentEnvironment = 'development' | 'staging' | 'production';
```

### **TypeScript Configuration for Deno**

```typescript
// deno.json - Project-level configuration
{
  "compilerOptions": {
    "allowJs": true,
    "lib": ["deno.window"],
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  },
  "lint": {
    "rules": {
      "tags": ["recommended"],
      "exclude": ["no-unused-vars"] // Allow unused vars for interface definitions
    }
  },
  "fmt": {
    "useTabs": false,
    "lineWidth": 100,
    "indentWidth": 2,
    "semiColons": true,
    "singleQuote": false,
    "proseWrap": "preserve"
  }
}
```

### **Import/Export Patterns**

```typescript
// ✅ GOOD: Use explicit, descriptive imports
import { validateSiteConfig } from "../utils/validation.ts";
import { ConsoleStyler } from "../utils/console-styler.ts";
import type { SiteConfiguration, HealthCheckResult } from "../types/site.ts";

// ✅ GOOD: Barrel exports for convenience (index.ts files)
// core/utils/index.ts
export { validateSiteConfig } from "./validation.ts";
export { ConsoleStyler } from "./console-styler.ts";
export { formatErrorMessage } from "./error-formatting.ts";

// ✅ GOOD: Re-export types for easy access
export type { SiteConfiguration, HealthCheckResult } from "../types/site.ts";

// ❌ BAD: Avoid wildcard imports for clarity
// import * as utils from "../utils/index.ts"; // Too ambiguous
```

---

## 🚀 **Script Development Patterns**

### **Command Line Interface Structure**

```typescript
// ✅ Standard CLI script structure
#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net

import { parseArgs } from "https://deno.land/std@0.200.0/cli/parse_args.ts";
import { colors } from "https://deno.land/std@0.200.0/fmt/colors.ts";

interface ScriptOptions {
  verbose?: boolean;
  dryRun?: boolean;
  config?: string;
  help?: boolean;
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    boolean: ["verbose", "dry-run", "help"],
    string: ["config"],
    alias: {
      v: "verbose",
      h: "help",
      c: "config"
    }
  }) as ScriptOptions;

  if (args.help) {
    showHelp();
    Deno.exit(0);
  }

  try {
    const result = await executeScript(args);
    
    if (args.verbose) {
      console.log(colors.green("✅ Script completed successfully"));
      console.log(JSON.stringify(result, null, 2));
    }
    
    Deno.exit(0);
  } catch (error) {
    console.error(colors.red("❌ Script failed:"), error.message);
    
    if (args.verbose) {
      console.error(error.stack);
    }
    
    Deno.exit(1);
  }
}

function showHelp(): void {
  console.log(`
Usage: script-name [OPTIONS]

Options:
  -v, --verbose     Enable verbose output
      --dry-run     Show what would be done without executing
  -c, --config      Specify configuration file path
  -h, --help        Show this help message

Examples:
  script-name --verbose --config=/path/to/config.ts
  script-name --dry-run
`);
}

async function executeScript(options: ScriptOptions): Promise<unknown> {
  // Implementation follows Unix Philosophy:
  // 1. Single responsibility
  // 2. Structured input/output
  // 3. Composable with other scripts
  // 4. Minimal output by default
}

// Execute main function
if (import.meta.main) {
  main();
}
```

### **Error Handling Standards**

```typescript
// ✅ Consistent error handling across all scripts
export class DenoGenesisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DenoGenesisError';
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack
    };
  }
}

// ✅ Result pattern for operations that might fail
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

export function failure<E extends Error>(error: E): Result<never, E> {
  return { success: false, error };
}

// ✅ Usage in scripts
async function performOperation(): Promise<Result<OperationResult, DenoGenesisError>> {
  try {
    const result = await riskyOperation();
    return success(result);
  } catch (error) {
    return failure(new DenoGenesisError(
      "Operation failed", 
      "OPERATION_FAILED",
      { originalError: error.message }
    ));
  }
}
```

---

## 🌐 **Deployment and Configuration**

### **Environment Configuration Pattern**

```typescript
// core/config/env.ts - Centralized environment management
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ✅ Schema-based configuration validation
const EnvironmentSchema = z.object({
  DENO_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().min(1000).max(9999).optional(),
  DATABASE_URL: z.string().url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  VERSION: z.string().regex(/^\d+\.\d+\.\d+/).optional(),
  BUILD_HASH: z.string().regex(/^[a-f0-9]{7,40}$/i).optional()
});

type Environment = z.infer<typeof EnvironmentSchema>;

// ✅ Validated environment access
export function getEnvironment(): Environment {
  const rawEnv = {
    DENO_ENV: Deno.env.get('DENO_ENV'),
    PORT: Deno.env.get('PORT'),
    DATABASE_URL: Deno.env.get('DATABASE_URL'),
    LOG_LEVEL: Deno.env.get('LOG_LEVEL'),
    VERSION: Deno.env.get('VERSION'),
    BUILD_HASH: Deno.env.get('BUILD_HASH')
  };

  const result = EnvironmentSchema.safeParse(rawEnv);
  
  if (!result.success) {
    throw new DenoGenesisError(
      'Invalid environment configuration',
      'ENV_VALIDATION_ERROR',
      { errors: result.error.errors }
    );
  }

  return result.data;
}

// ✅ Export validated environment
export const ENV = getEnvironment();
export const { DENO_ENV, PORT, DATABASE_URL, LOG_LEVEL, VERSION, BUILD_HASH } = ENV;
```

### **Site Configuration Pattern**

```typescript
// sites/[site-name]/site-config.ts - Site-specific overrides
import type { SiteConfiguration } from "../../core/types/site.ts";

export const SITE_CONFIG: SiteConfiguration = {
  // Required configuration
  siteName: "domtech",
  port: 3000,
  
  // Database configuration
  database: {
    name: "domtech_db",
    prefix: "dt_",
    migrations: "./migrations"
  },
  
  // Feature flags
  features: {
    authentication: true,
    monitoring: true,
    apiAccess: true,
    adminPanel: true
  },
  
  // Environment-specific overrides
  environments: {
    development: {
      logLevel: 'debug',
      enableHotReload: true,
      corsOrigins: ['http://localhost:3000']
    },
    production: {
      logLevel: 'info',
      enableCompression: true,
      enableCaching: true,
      corsOrigins: ['https://domingueztechsolutions.com']
    }
  }
};
```

---

## 🔍 **Quality Assurance and Testing**

### **Framework Integrity Validation**

The `core/meta.ts` module provides comprehensive framework validation:

```typescript
// Example usage of framework integrity checking
import { validateFrameworkIntegrity } from "../core/meta.ts";

// ✅ Before deploying any site, validate framework integrity
const integrityResult = await validateFrameworkIntegrity();

if (!integrityResult.valid) {
  console.error("❌ Framework integrity check failed:");
  integrityResult.errors.forEach(error => console.error(`  - ${error}`));
  
  if (integrityResult.warnings.length > 0) {
    console.warn("⚠️ Warnings:");
    integrityResult.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  Deno.exit(1);
}

console.log("✅ Framework integrity validated");
```

### **Unit Testing Patterns**

```typescript
// tests/utils/validation.test.ts
import { assertEquals, assertThrows } from "https://deno.land/std@0.200.0/testing/asserts.ts";
import { describe, it } from "https://deno.land/std@0.200.0/testing/bdd.ts";
import { validateSiteConfig } from "../../core/utils/validation.ts";

describe("validateSiteConfig", () => {
  it("should validate correct site configuration", () => {
    const validConfig = {
      siteName: "testsite",
      port: 3000,
      database: { name: "test_db" },
      features: { authentication: true }
    };
    
    const result = validateSiteConfig(validConfig);
    assertEquals(result.isValid, true);
  });
  
  it("should reject invalid port numbers", () => {
    const invalidConfig = {
      siteName: "testsite", 
      port: -1,  // Invalid port
      database: { name: "test_db" },
      features: { authentication: true }
    };
    
    const result = validateSiteConfig(invalidConfig);
    assertEquals(result.isValid, false);
    assertEquals(result.errors.length, 1);
  });
});

// Run tests with: deno test --allow-read tests/
```

### **Integration Testing**

```typescript
// tests/integration/site-startup.test.ts
import { assertEquals } from "https://deno.land/std@0.200.0/testing/asserts.ts";
import { describe, it, beforeAll, afterAll } from "https://deno.land/std@0.200.0/testing/bdd.ts";

describe("Site Startup Integration", () => {
  let serverProcess: Deno.ChildProcess;
  
  beforeAll(async () => {
    // Start test server
    serverProcess = new Deno.Command("deno", {
      args: ["run", "--allow-all", "sites/domtech/main.ts"],
      env: { "DENO_ENV": "test", "PORT": "3099" }
    }).spawn();
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  });
  
  afterAll(() => {
    serverProcess.kill();
  });
  
  it("should respond to health check", async () => {
    const response = await fetch("http://localhost:3099/health");
    assertEquals(response.status, 200);
    
    const data = await response.json();
    assertEquals(data.status, "healthy");
  });
});
```

---

## 📚 **Documentation Standards**

### **Code Documentation**

```typescript
/**
 * @fileoverview Database connection and query utilities
 * @module core/database/client
 * @author DenoGenesis Framework Team
 * @since 2.1.0
 * 
 * This module provides a centralized database abstraction layer following
 * Unix Philosophy principles:
 * - Single responsibility: Database connectivity only
 * - Composability: Query builders that can be combined
 * - Error transparency: Structured error responses
 * 
 * @example
 * ```typescript
 * import { createConnection, query } from "./core/database/client.ts";
 * 
 * const db = await createConnection();
 * const users = await query(db, "SELECT * FROM users WHERE site_key = ?", ["domtech"]);
 * ```
 */

/**
 * Creates a database connection with site-specific configuration
 * 
 * @param siteConfig - Site-specific database configuration
 * @returns Promise resolving to database connection instance
 * @throws {DenoGenesisError} When connection fails or configuration is invalid
 * 
 * @example
 * ```typescript
 * const connection = await createConnection({
 *   database: "domtech_db",
 *   host: "localhost",
 *   port: 3306
 * });
 * ```
 */
export async function createConnection(
  siteConfig: DatabaseConfig
): Promise<DatabaseConnection> {
  // Implementation...
}
```

### **API Documentation**

```typescript
// Generate API documentation automatically from TypeScript interfaces
/**
 * @api {GET} /api/v1/health Health Check
 * @apiName GetHealth
 * @apiGroup System
 * @apiVersion 1.0.0
 * 
 * @apiDescription Returns the health status of the site and its dependencies
 * 
 * @apiSuccess {String} status Overall health status ("healthy" | "unhealthy" | "degraded")
 * @apiSuccess {Object[]} services Array of service health information
 * @apiSuccess {String} services.name Service name
 * @apiSuccess {String} services.status Service health status
 * @apiSuccess {Number} services.responseTime Response time in milliseconds
 * @apiSuccess {String} timestamp ISO timestamp of health check
 * 
 * @apiSuccessExample {json} Success Response:
 * {
 *   "status": "healthy",
 *   "services": [
 *     {
 *       "name": "database",
 *       "status": "healthy",
 *       "responseTime": 23
 *     }
 *   ],
 *   "timestamp": "2025-09-04T10:30:00.000Z"
 * }
 */
```

---

## 🔧 **Development Workflow**

### **Git Workflow Standards**

```bash
# ✅ Feature development workflow
git checkout main
git pull origin main

# Create feature branch with descriptive name
git checkout -b feature/site-health-monitoring

# Make changes following Unix Philosophy
# - Single responsibility commits
# - Clear, descriptive commit messages
# - Test-driven development

# Commit with conventional commit format
git add .
git commit -m "feat(core): add site health monitoring utility

- Implements Unix Philosophy single responsibility principle
- Returns structured health data for programmatic use
- Includes integration with existing logging system
- Follows established error handling patterns

Closes #123"

# Push and create pull request
git push origin feature/site-health-monitoring
```

### **Code Review Guidelines**

When reviewing code (human or AI), check for:

1. **Unix Philosophy Adherence**
   - Single responsibility principle
   - Composability with other functions
   - Minimal side effects
   - Structured input/output

2. **DenoGenesis Architecture Alignment**
   - Proper use of centralized core modules
   - Consistent site configuration patterns
   - Appropriate error handling
   - Framework integrity preservation

3. **TypeScript Best Practices**
   - Explicit type definitions
   - Proper use of interfaces
   - Deno-compatible imports
   - No Node.js-specific code

4. **Performance and Security**
   - Efficient database queries
   - Proper input validation
   - Security-first design
   - Resource cleanup

---

## 📈 **Monitoring and Maintenance**

### **Health Monitoring Pattern**

```typescript
// core/utils/health-monitor.ts
export interface ServiceHealthCheck {
  name: string;
  check: () => Promise<HealthCheckResult>;
  interval: number; // milliseconds
  timeout: number;  // milliseconds
}

export class HealthMonitor {
  private checks: Map<string, ServiceHealthCheck> = new Map();
  private results: Map<string, HealthCheckResult> = new Map();
  private intervals: Map<string, number> = new Map();

  registerCheck(check: ServiceHealthCheck): void {
    this.checks.set(check.name, check);
    this.startMonitoring(check);
  }

  private async startMonitoring(check: ServiceHealthCheck): Promise<void> {
    const intervalId = setInterval(async () => {
      try {
        const result = await Promise.race([
          check.check(),
          this.timeoutPromise(check.timeout)
        ]);
        
        this.results.set(check.name, result);
      } catch (error) {
        this.results.set(check.name, {
          serviceName: check.name,
          status: 'unhealthy',
          responseTimeMs: check.timeout,
          lastChecked: new Date().toISOString(),
          details: error.message
        });
      }
    }, check.interval);
    
    this.intervals.set(check.name, intervalId);
  }

  getHealthStatus(): OverallHealthStatus {
    const services = Array.from(this.results.values());
    const allHealthy = services.every(service => service.status === 'healthy');
    const anyUnhealthy = services.some(service => service.status === 'unhealthy');
    
    return {
      status: anyUnhealthy ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded',
      services,
      timestamp: new Date().toISOString()
    };
  }

  private timeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), timeout);
    });
  }

  shutdown(): void {
    this.intervals.forEach(intervalId => clearInterval(intervalId));
    this.intervals.clear();
  }
}
```

### **Logging Standards**

```typescript
// core/utils/logger.ts - Structured logging following Unix principles
export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  message: string;
  context?: Record<string, unknown>;
  traceId?: string;
}

export class Logger {
  constructor(
    private serviceName: string,
    private logLevel: LogEntry['level'] = 'info'
  ) {}

  private shouldLog(level: LogEntry['level']): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    context?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      context,
      traceId: this.getTraceId()
    };
  }

  private getTraceId(): string {
    // Implementation for distributed tracing
    return crypto.randomUUID().substring(0, 8);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.log(JSON.stringify(this.createLogEntry('debug', message, context)));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.log(JSON.stringify(this.createLogEntry('info', message, context)));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(JSON.stringify(this.createLogEntry('warn', message, context)));
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(JSON.stringify(this.createLogEntry('error', message, context)));
    }
  }
}

// ✅ Usage in sites
// sites/domtech/main.ts
import { Logger } from "../../core/utils/logger.ts";
const logger = new Logger('domtech', 'info');

logger.info('Site starting up', { port: 3000, version: '2.1.0' });
```

---

## 🧪 **Testing and Validation Patterns**

### **Framework Integrity Testing**

```typescript
// tests/framework/integrity.test.ts
import { describe, it, beforeAll } from "https://deno.land/std@0.200.0/testing/bdd.ts";
import { assertEquals, assert } from "https://deno.land/std@0.200.0/testing/asserts.ts";
import { validateFrameworkIntegrity } from "../../core/meta.ts";

describe("Framework Integrity Validation", () => {
  let integrityResult: IntegrityCheckResult;

  beforeAll(async () => {
    integrityResult = await validateFrameworkIntegrity();
  });

  it("should have valid core directory structure", () => {
    const coreChecks = integrityResult.checks.filter(
      check => check.name.startsWith('Core Directory') && check.category === 'critical'
    );
    
    const failedCoreChecks = coreChecks.filter(check => check.status === 'failed');
    assertEquals(failedCoreChecks.length, 0, 
      `Core directory structure validation failed: ${failedCoreChecks.map(c => c.message).join(', ')}`
    );
  });

  it("should have valid VERSION file", () => {
    const versionChecks = integrityResult.checks.filter(
      check => check.name.includes('VERSION')
    );
    
    const criticalVersionFailures = versionChecks.filter(
      check => check.category === 'critical' && check.status === 'failed'
    );
    
    assertEquals(criticalVersionFailures.length, 0,
      `VERSION file validation failed: ${criticalVersionFailures.map(c => c.message).join(', ')}`
    );
  });

  it("should have consistent site configurations", () => {
    assert(integrityResult.valid, 
      `Framework integrity validation failed: ${integrityResult.errors.join(', ')}`
    );
  });

  it("should report any warnings for review", () => {
    if (integrityResult.warnings.length > 0) {
      console.warn("⚠️ Framework integrity warnings:");
      integrityResult.warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
  });
});
```

### **Site Configuration Testing**

```typescript
// tests/sites/config-validation.test.ts
import { describe, it } from "https://deno.land/std@0.200.0/testing/bdd.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.200.0/testing/asserts.ts";

// Test all site configurations for consistency
const SITES = ['domtech', 'heavenlyroofing', 'okdevs', 'pedromdominguez', 'efficientmovers'];
const REQUIRED_PORTS = [3000, 3001, 3002, 3003, 3004];

describe("Site Configuration Validation", () => {
  SITES.forEach((siteName, index) => {
    describe(`Site: ${siteName}`, () => {
      it("should have valid site configuration", async () => {
        const configPath = `../../sites/${siteName}/site-config.ts`;
        
        try {
          const config = await import(configPath);
          assertExists(config.SITE_CONFIG);
          assertEquals(config.SITE_CONFIG.siteName, siteName);
          assertEquals(config.SITE_CONFIG.port, REQUIRED_PORTS[index]);
        } catch (error) {
          throw new Error(`Failed to load ${siteName} configuration: ${error.message}`);
        }
      });

      it("should have required directories", async () => {
        const sitePath = `../../sites/${siteName}`;
        const requiredDirs = ['public', 'routes'];
        
        for (const dir of requiredDirs) {
          try {
            const stat = await Deno.stat(`${sitePath}/${dir}`);
            assert(stat.isDirectory, `${dir} should be a directory`);
          } catch {
            throw new Error(`Required directory missing: ${sitePath}/${dir}`);
          }
        }
      });

      it("should have symbolic links to core modules", async () => {
        const sitePath = `../../sites/${siteName}`;
        const coreLinks = ['middleware', 'database', 'config', 'utils', 'types'];
        
        for (const link of coreLinks) {
          try {
            const stat = await Deno.lstat(`${sitePath}/${link}`);
            assert(stat.isSymlink, `${link} should be a symbolic link to core`);
          } catch {
            throw new Error(`Core symbolic link missing: ${sitePath}/${link}`);
          }
        }
      });
    });
  });

  it("should have no port conflicts", () => {
    const usedPorts = new Set();
    
    REQUIRED_PORTS.forEach(port => {
      assert(!usedPorts.has(port), `Port ${port} is used by multiple sites`);
      usedPorts.add(port);
    });
  });
});
```

---

## 🚀 **Deployment Automation**

### **Deployment Script Pattern**

```typescript
#!/usr/bin/env -S deno run --allow-all

// scripts/deploy-site.ts - Unix Philosophy compliant deployment
import { parseArgs } from "https://deno.land/std@0.200.0/cli/parse_args.ts";
import { colors } from "https://deno.land/std@0.200.0/fmt/colors.ts";
import { validateFrameworkIntegrity } from "../core/meta.ts";
import { Logger } from "../core/utils/logger.ts";

interface DeploymentOptions {
  site: string;
  environment: 'development' | 'staging' | 'production';
  skipIntegrityCheck?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  rollback?: boolean;
}

interface DeploymentResult {
  success: boolean;
  siteName: string;
  environment: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  steps: DeploymentStep[];
  errors?: string[];
}

interface DeploymentStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: string;
  endTime?: string;
  duration?: number;
  details?: string;
}

class SiteDeployment {
  private logger: Logger;
  private options: DeploymentOptions;
  private result: DeploymentResult;

  constructor(options: DeploymentOptions) {
    this.options = options;
    this.logger = new Logger('deployment', options.verbose ? 'debug' : 'info');
    this.result = {
      success: false,
      siteName: options.site,
      environment: options.environment,
      startTime: new Date().toISOString(),
      steps: []
    };
  }

  async deploy(): Promise<DeploymentResult> {
    try {
      this.logger.info(`Starting deployment: ${this.options.site} to ${this.options.environment}`);

      if (this.options.dryRun) {
        this.logger.info("🔍 DRY RUN MODE - No changes will be made");
      }

      // Step 1: Pre-deployment validation
      await this.executeStep("Framework Integrity Check", () => this.validateIntegrity());
      
      // Step 2: Site configuration validation
      await this.executeStep("Site Configuration Validation", () => this.validateSiteConfig());
      
      // Step 3: Database preparation
      await this.executeStep("Database Preparation", () => this.prepareDatabase());
      
      // Step 4: Build and optimize assets
      await this.executeStep("Asset Building", () => this.buildAssets());
      
      // Step 5: Service configuration
      await this.executeStep("Service Configuration", () => this.configureService());
      
      // Step 6: Health check
      await this.executeStep("Post-Deployment Health Check", () => this.healthCheck());

      this.result.success = true;
      this.result.endTime = new Date().toISOString();
      this.result.duration = Date.now() - new Date(this.result.startTime).getTime();

      this.logger.info(`✅ Deployment completed successfully in ${this.result.duration}ms`);
      return this.result;

    } catch (error) {
      this.result.success = false;
      this.result.endTime = new Date().toISOString();
      this.result.errors = [error.message];
      
      this.logger.error(`❌ Deployment failed: ${error.message}`);
      
      if (this.options.rollback && !this.options.dryRun) {
        await this.rollback();
      }
      
      throw error;
    }
  }

  private async executeStep(stepName: string, operation: () => Promise<void>): Promise<void> {
    const step: DeploymentStep = {
      name: stepName,
      status: 'running',
      startTime: new Date().toISOString()
    };
    
    this.result.steps.push(step);
    
    try {
      this.logger.debug(`Starting step: ${stepName}`);
      
      if (!this.options.dryRun) {
        await operation();
      } else {
        // In dry-run mode, simulate the operation
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
        step.details = "Simulated in dry-run mode";
      }
      
      step.status = 'completed';
      step.endTime = new Date().toISOString();
      step.duration = new Date(step.endTime).getTime() - new Date(step.startTime!).getTime();
      
      this.logger.debug(`Completed step: ${stepName} (${step.duration}ms)`);
      
    } catch (error) {
      step.status = 'failed';
      step.endTime = new Date().toISOString();
      step.details = error.message;
      throw error;
    }
  }

  private async validateIntegrity(): Promise<void> {
    if (this.options.skipIntegrityCheck) {
      this.logger.info("⚠️ Skipping framework integrity check");
      return;
    }

    const integrityResult = await validateFrameworkIntegrity();
    
    if (!integrityResult.valid) {
      throw new Error(`Framework integrity validation failed: ${integrityResult.errors.join(', ')}`);
    }

    if (integrityResult.warnings.length > 0) {
      this.logger.warn("⚠️ Framework integrity warnings:");
      integrityResult.warnings.forEach(warning => this.logger.warn(`  ${warning}`));
    }
  }

  private async validateSiteConfig(): Promise<void> {
    const configPath = `./sites/${this.options.site}/site-config.ts`;
    
    try {
      const config = await import(configPath);
      
      if (!config.SITE_CONFIG) {
        throw new Error("SITE_CONFIG export not found");
      }

      if (config.SITE_CONFIG.siteName !== this.options.site) {
        throw new Error(`Site name mismatch: expected ${this.options.site}, got ${config.SITE_CONFIG.siteName}`);
      }

      this.logger.debug(`Site configuration validated: ${this.options.site}`);
      
    } catch (error) {
      throw new Error(`Site configuration validation failed: ${error.message}`);
    }
  }

  private async prepareDatabase(): Promise<void> {
    // Database migration and preparation logic
    this.logger.debug("Preparing database for deployment");
    // Implementation would include:
    // - Running migrations
    // - Backing up current data
    // - Validating schema compatibility
  }

  private async buildAssets(): Promise<void> {
    // Asset building and optimization logic
    this.logger.debug("Building and optimizing assets");
    // Implementation would include:
    // - Compiling TypeScript
    // - Minifying CSS/JS
    // - Optimizing images
    // - Generating cache manifests
  }

  private async configureService(): Promise<void> {
    // SystemD service configuration
    this.logger.debug("Configuring system service");
    // Implementation would include:
    // - Updating systemd service files
    // - Reloading systemd daemon
    // - Starting/restarting services
  }

  private async healthCheck(): Promise<void> {
    const siteConfig = await import(`./sites/${this.options.site}/site-config.ts`);
    const port = siteConfig.SITE_CONFIG.port;
    const maxRetries = 5;
    const retryDelay = 2000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`http://localhost:${port}/health`, {
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const healthData = await response.json();
          this.logger.debug(`Health check passed: ${JSON.stringify(healthData)}`);
          return;
        }
      } catch (error) {
        this.logger.debug(`Health check attempt ${i + 1} failed: ${error.message}`);
      }

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    throw new Error(`Health check failed after ${maxRetries} attempts`);
  }

  private async rollback(): Promise<void> {
    this.logger.info("🔄 Initiating rollback procedure");
    // Rollback implementation would include:
    // - Restoring previous service configuration
    // - Rolling back database changes
    // - Restoring previous assets
    // - Restarting services
  }
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    string: ["site", "environment"],
    boolean: ["skip-integrity", "dry-run", "verbose", "rollback", "help"],
    alias: {
      s: "site",
      e: "environment", 
      v: "verbose",
      h: "help"
    }
  });

  if (args.help) {
    console.log(`
${colors.bold('DenoGenesis Site Deployment Script')}

Usage: deploy-site.ts [OPTIONS]

Required Options:
  -s, --site SITE           Site name to deploy (domtech, okdevs, etc.)
  -e, --environment ENV     Target environment (development, staging, production)

Optional Options:
      --skip-integrity      Skip framework integrity check
      --dry-run            Show what would be done without executing
      --rollback           Enable automatic rollback on failure
  -v, --verbose            Enable verbose logging
  -h, --help               Show this help message

Examples:
  # Deploy domtech site to production
  ./scripts/deploy-site.ts --site domtech --environment production

  # Dry run deployment with verbose output
  ./scripts/deploy-site.ts --site okdevs --environment staging --dry-run --verbose

  # Deploy with automatic rollback on failure
  ./scripts/deploy-site.ts --site pedromdominguez --environment production --rollback
`);
    Deno.exit(0);
  }

  if (!args.site || !args.environment) {
    console.error(colors.red("❌ Error: --site and --environment are required"));
    console.error("Use --help for usage information");
    Deno.exit(1);
  }

  const validSites = ['domtech', 'heavenlyroofing', 'okdevs', 'pedromdominguez', 'efficientmovers'];
  const validEnvironments = ['development', 'staging', 'production'];

  if (!validSites.includes(args.site)) {
    console.error(colors.red(`❌ Error: Invalid site '${args.site}'. Valid sites: ${validSites.join(', ')}`));
    Deno.exit(1);
  }

  if (!validEnvironments.includes(args.environment)) {
    console.error(colors.red(`❌ Error: Invalid environment '${args.environment}'. Valid environments: ${validEnvironments.join(', ')}`));
    Deno.exit(1);
  }

  const deployment = new SiteDeployment({
    site: args.site,
    environment: args.environment as 'development' | 'staging' | 'production',
    skipIntegrityCheck: args["skip-integrity"],
    dryRun: args["dry-run"],
    verbose: args.verbose,
    rollback: args.rollback
  });

  try {
    const result = await deployment.deploy();
    
    if (args.verbose) {
      console.log("\n" + colors.green("📊 Deployment Summary:"));
      console.log(JSON.stringify(result, null, 2));
    }
    
    Deno.exit(0);
  } catch (error) {
    console.error(colors.red(`💥 Deployment failed: ${error.message}`));
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
```

---

## 🔍 **Performance Monitoring and Optimization**

### **Performance Metrics Collection**

```typescript
// core/utils/performance-monitor.ts
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: string;
  tags?: Record<string, string>;
}

export interface PerformanceSnapshot {
  siteName: string;
  timestamp: string;
  metrics: PerformanceMetric[];
  summary: {
    averageResponseTime: number;
    memoryUsageMB: number;
    requestCount: number;
    errorRate: number;
  };
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private readonly maxMetricsPerType = 1000; // Prevent memory leaks

  recordMetric(metric: PerformanceMetric): void {
    const existing = this.metrics.get(metric.name) || [];
    existing.push(metric);
    
    // Keep only recent metrics
    if (existing.length > this.maxMetricsPerType) {
      existing.splice(0, existing.length - this.maxMetricsPerType);
    }
    
    this.metrics.set(metric.name, existing);
  }

  recordResponseTime(endpoint: string, duration: number): void {
    this.recordMetric({
      name: 'http_response_time',
      value: duration,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      tags: { endpoint }
    });
  }

  recordMemoryUsage(): void {
    const memUsage = Deno.memoryUsage();
    
    this.recordMetric({
      name: 'memory_heap_used',
      value: Math.round(memUsage.heapUsed / 1024 / 1024), // Convert to MB
      unit: 'bytes',
      timestamp: new Date().toISOString()
    });
  }

  recordDatabaseQuery(query: string, duration: number): void {
    this.recordMetric({
      name: 'database_query_time',
      value: duration,
      unit: 'ms',
      timestamp: new Date().toISOString(),
      tags: { query_type: this.getQueryType(query) }
    });
  }

  private getQueryType(query: string): string {
    const trimmed = query.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    return 'OTHER';
  }

  getSnapshot(siteName: string): PerformanceSnapshot {
    const now = new Date().toISOString();
    const allMetrics: PerformanceMetric[] = [];
    
    // Collect all metrics from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    this.metrics.forEach(metrics => {
      const recentMetrics = metrics.filter(m => 
        new Date(m.timestamp) > oneHourAgo
      );
      allMetrics.push(...recentMetrics);
    });

    // Calculate summary statistics
    const responseTimeMetrics = allMetrics.filter(m => m.name === 'http_response_time');
    const memoryMetrics = allMetrics.filter(m => m.name === 'memory_heap_used');
    const errorMetrics = allMetrics.filter(m => m.name === 'http_errors');
    
    const averageResponseTime = responseTimeMetrics.length > 0
      ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
      : 0;
    
    const currentMemory = memoryMetrics.length > 0
      ? memoryMetrics[memoryMetrics.length - 1].value
      : 0;
    
    const errorRate = responseTimeMetrics.length > 0
      ? (errorMetrics.length / responseTimeMetrics.length) * 100
      : 0;

    return {
      siteName,
      timestamp: now,
      metrics: allMetrics,
      summary: {
        averageResponseTime: Math.round(averageResponseTime * 100) / 100,
        memoryUsageMB: currentMemory,
        requestCount: responseTimeMetrics.length,
        errorRate: Math.round(errorRate * 100) / 100
      }
    };
  }

  // Export metrics in Prometheus format for monitoring integration
  getPrometheusMetrics(): string {
    const lines: string[] = [];
    
    this.metrics.forEach((metrics, metricName) => {
      if (metrics.length === 0) return;
      
      const latest = metrics[metrics.length - 1];
      const prometheusName = metricName.replace(/[^a-zA-Z0-9_]/g, '_');
      
      lines.push(`# HELP ${prometheusName} ${metricName}`);
      lines.push(`# TYPE ${prometheusName} gauge`);
      
      if (latest.tags) {
        const tagString = Object.entries(latest.tags)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        lines.push(`${prometheusName}{${tagString}} ${latest.value}`);
      } else {
        lines.push(`${prometheusName} ${latest.value}`);
      }
    });
    
    return lines.join('\n');
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
```

### **Middleware Integration for Automatic Monitoring**

```typescript
// core/middleware/performance.ts
import { Context, Next } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { performanceMonitor } from "../utils/performance-monitor.ts";

export async function performanceMiddleware(ctx: Context, next: Next): Promise<void> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);
  
  // Record memory usage periodically
  performanceMonitor.recordMemoryUsage();
  
  try {
    await next();
    
    const duration = Date.now() - startTime;
    const endpoint = `${ctx.request.method} ${ctx.request.url.pathname}`;
    
    // Record successful request
    performanceMonitor.recordResponseTime(endpoint, duration);
    
    // Add performance headers for debugging
    ctx.response.headers.set('X-Response-Time', `${duration}ms`);
    ctx.response.headers.set('X-Request-ID', requestId);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const endpoint = `${ctx.request.method} ${ctx.request.url.pathname}`;
    
    // Record failed request
    performanceMonitor.recordMetric({
      name: 'http_errors',
      value: 1,
      unit: 'count',
      timestamp: new Date().toISOString(),
      tags: { 
        endpoint,
        error_type: error.constructor.name,
        status_code: ctx.response.status.toString()
      }
    });
    
    throw error; // Re-throw to let error handling middleware process it
  }
}
```

---

## 🛡️ **Security and Hardening Guidelines**

### **Input Validation Pattern**

```typescript
// core/utils/validation.ts
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ✅ Schema-based validation following Unix Philosophy
export const SiteConfigurationSchema = z.object({
  siteName: z.string()
    .min(1, "Site name is required")
    .max(50, "Site name too long")
    .regex(/^[a-z0-9-]+$/, "Site name must be lowercase alphanumeric with hyphens"),
  
  port: z.number()
    .int("Port must be an integer")
    .min(1000, "Port must be >= 1000")
    .max(9999, "Port must be <= 9999"),
  
  database: z.object({
    name: z.string().min(1, "Database name is required"),
    prefix: z.string().optional(),
    maxConnections: z.number().min(1).max(100).default(10)
  }),
  
  features: z.object({
    authentication: z.boolean().default(false),
    monitoring: z.boolean().default(true),
    apiAccess: z.boolean().default(false),
    adminPanel: z.boolean().default(false)
  })
});

export type SiteConfiguration = z.infer<typeof SiteConfigurationSchema>;

// ✅ Sanitization utilities
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

export function sanitizeInteger(input: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const num = Number(input);
  
  if (isNaN(num) || !Number.isInteger(num)) {
    throw new Error('Input must be a valid integer');
  }
  
  if (num < min || num > max) {
    throw new Error(`Integer must be between ${min} and ${max}`);
  }
  
  return num;
}

// ✅ SQL injection prevention
export function escapeSQL(input: string): string {
  return input.replace(/['";\\]/g, '\\$&');
}

// ✅ Path traversal prevention
export function sanitizePath(input: string): string {
  return input
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[^a-zA-Z0-9-_./]/g, '') // Allow only safe characters
    .replace(/\/+/g, '/') // Collapse multiple slashes
    .replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes
}
```

### **Authentication and Authorization**

```typescript
// core/middleware/auth.ts
import { Context, Next } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { verify } from "https://deno.land/x/djwt@v2.9.1/mod.ts";

interface AuthConfig {
  jwtSecret: string;
  requiredRole?: string;
  allowAnonymous?: boolean;
}

interface UserClaims {
  sub: string; // User ID
  role: string;
  site: string;
  iat: number;
  exp: number;
}

export function createAuthMiddleware(config: AuthConfig) {
  return async (ctx: Context, next: Next): Promise<void> => {
    try {
      const authHeader = ctx.request.headers.get('Authorization');
      
      if (!authHeader) {
        if (config.allowAnonymous) {
          ctx.state.user = null;
          await next();
          return;
        }
        
        ctx.response.status = 401;
        ctx.response.body = { error: 'Authorization header required' };
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      
      if (!token) {
        ctx.response.status = 401;
        ctx.response.body = { error: 'Bearer token required' };
        return;
      }

      // Verify JWT token
      const payload = await verify(token, config.jwtSecret) as UserClaims;
      
      // Check token expiration
      if (payload.exp < Date.now() / 1000) {
        ctx.response.status = 401;
        ctx.response.body = { error: 'Token expired' };
        return;
      }

      // Check required role
      if (config.requiredRole && payload.role !== config.requiredRole) {
        ctx.response.status = 403;
        ctx.response.body = { error: 'Insufficient permissions' };
        return;
      }

      // Store user information in context
      ctx.state.user = payload;
      
      await next();
      
    } catch (error) {
      ctx.response.status = 401;
      ctx.response.body = { 
        error: 'Invalid token',
        details: error.message 
      };
    }
  };
}

// ✅ Usage in site routes
// sites/domtech/routes/admin.ts
import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { createAuthMiddleware } from "../../middleware/auth.ts";

const adminRouter = new Router();

// Protect admin routes
adminRouter.use(createAuthMiddleware({
  jwtSecret: Deno.env.get('JWT_SECRET')!,
  requiredRole: 'admin'
}));

adminRouter.get('/admin/dashboard', (ctx) => {
  const user = ctx.state.user as UserClaims;
  ctx.response.body = {
    message: `Welcome to admin dashboard, ${user.sub}`,
    role: user.role
  };
});
```

### **Rate Limiting and DOS Protection**

```typescript
// core/middleware/rate-limit.ts
import { Context, Next } from "https://deno.land/x/oak@v12.6.1/mod.ts";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface ClientRecord {
  requests: number[];
  blocked: boolean;
  blockedUntil?: number;
}

export class RateLimiter {
  private clients = new Map<string, ClientRecord>();
  
  constructor(private config: RateLimitConfig) {
    // Clean up old records every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private getClientId(ctx: Context): string {
    // Use combination of IP and User-Agent for client identification
    const ip = ctx.request.ip;
    const userAgent = ctx.request.headers.get('User-Agent') || 'unknown';
    return `${ip}:${userAgent.substring(0, 50)}`;
  }

  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.config.windowMs;
    
    for (const [clientId, record] of this.clients) {
      // Remove old requests
      record.requests = record.requests.filter(timestamp => timestamp > cutoff);
      
      // Remove clients with no recent requests
      if (record.requests.length === 0 && (!record.blockedUntil || record.blockedUntil < now)) {
        this.clients.delete(clientId);
      }
    }
  }

  middleware() {
    return async (ctx: Context, next: Next): Promise<void> => {
      const clientId = this.getClientId(ctx);
      const now = Date.now();
      const windowStart = now - this.config.windowMs;
      
      let record = this.clients.get(clientId);
      if (!record) {
        record = { requests: [], blocked: false };
        this.clients.set(clientId, record);
      }

      // Check if client is currently blocked
      if (record.blocked && record.blockedUntil && record.blockedUntil > now) {
        ctx.response.status = 429;
        ctx.response.headers.set('Retry-After', 
          Math.ceil((record.blockedUntil - now) / 1000).toString()
        );
        ctx.response.body = {
          error: this.config.message || 'Too many requests',
          retryAfter: Math.ceil((record.blockedUntil - now) / 1000)
        };
        return;
      }

      // Clean old requests and check current rate
      record.requests = record.requests.filter(timestamp => timestamp > windowStart);
      
      if (record.requests.length >= this.config.maxRequests) {
        record.blocked = true;
        record.blockedUntil = now + this.config.windowMs;
        
        ctx.response.status = 429;
        ctx.response.headers.set('X-RateLimit-Limit', this.config.maxRequests.toString());
        ctx.response.headers.set('X-RateLimit-Remaining', '0');
        ctx.response.headers.set('X-RateLimit-Reset', 
          Math.ceil(record.blockedUntil / 1000).toString()
        );
        ctx.response.body = {
          error: this.config.message || 'Rate limit exceeded',
          retryAfter: Math.ceil(this.config.windowMs / 1000)
        };
        return;
      }

      // Record this request
      record.requests.push(now);
      record.blocked = false;
      delete record.blockedUntil;

      // Add rate limit headers
      const remaining = this.config.maxRequests - record.requests.length;
      ctx.response.headers.set('X-RateLimit-Limit', this.config.maxRequests.toString());
      ctx.response.headers.set('X-RateLimit-Remaining', remaining.toString());
      ctx.response.headers.set('X-RateLimit-Reset', 
        Math.ceil((windowStart + this.config.windowMs) / 1000).toString()
      );

      await next();
    };
  }
}

// ✅ Usage in site main.ts
import { RateLimiter } from "../../middleware/rate-limit.ts";

const rateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use(rateLimiter.middleware());
```

---

## 📊 **Monitoring and Alerting System**

### **System Health Dashboard**

```typescript
// core/utils/health-dashboard.ts
import { performanceMonitor } from "./performance-monitor.ts";
import { validateFrameworkIntegrity } from "../meta.ts";

export interface SystemHealthDashboard {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  sites: SiteHealth[];
  framework: FrameworkHealth;
  infrastructure: InfrastructureHealth;
  alerts: Alert[];
}

export interface SiteHealth {
  name: string;
  port: number;
  status: 'online' | 'offline' | 'degraded';
  responseTime: number;
  memoryUsage: number;
  requestCount: number;
  errorRate: number;
  uptime: string;
  lastHealthCheck: string;
}

export interface FrameworkHealth {
  version: string;
  integrity: 'valid' | 'invalid' | 'warning';
  integrityDetails: string[];
  lastUpdate: string;
}

export interface InfrastructureHealth {
  database: ServiceHealth;
  nginx: ServiceHealth;
  system: SystemMetrics;
}

export interface ServiceHealth {
  status: 'online' | 'offline' | 'degraded';
  responseTime?: number;
  details?: string;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  loadAverage: number[];
}

export interface Alert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  site?: string;
  acknowledged: boolean;
}

export class HealthDashboard {
  private alerts: Alert[] = [];
  private readonly maxAlerts = 100;

  async generateDashboard(): Promise<SystemHealthDashboard> {
    const timestamp = new Date().toISOString();
    
    // Check all sites
    const sites = await this.checkAllSites();
    
    // Check framework integrity
    const framework = await this.checkFrameworkHealth();
    
    // Check infrastructure
    const infrastructure = await this.checkInfrastructure();
    
    // Generate new alerts based on current state
    this.generateAlerts(sites, framework, infrastructure);
    
    // Determine overall health
    const overall = this.determineOverallHealth(sites, framework, infrastructure);
    
    return {
      overall,
      timestamp,
      sites,
      framework,
      infrastructure,
      alerts: [...this.alerts].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    };
  }

  private async checkAllSites(): Promise<SiteHealth[]> {
    const sites = [
      { name: 'domtech', port: 3000 },
      { name: 'heavenlyroofing', port: 3001 },
      { name: 'okdevs', port: 3002 },
      { name: 'pedromdominguez', port: 3003 },
      { name: 'efficientmovers', port: 3004 }
    ];

    return await Promise.all(sites.map(site => this.checkSiteHealth(site.name, site.port)));
  }

  private async checkSiteHealth(siteName: string, port: number): Promise<SiteHealth> {
    const startTime = Date.now();
    let status: 'online' | 'offline' | 'degraded' = 'offline';
    let responseTime = 0;

    try {
      const response = await fetch(`http://localhost:${port}/health`, {
        signal: AbortSignal.timeout(5000)
      });
      
      responseTime = Date.now() - startTime;
      
      if (response.ok) {
        status = responseTime < 1000 ? 'online' : 'degraded';
      }
    } catch {
      status = 'offline';
      responseTime = Date.now() - startTime;
    }

    // Get performance metrics
    const perfSnapshot = performanceMonitor.getSnapshot(siteName);

    return {
      name: siteName,
      port,
      status,
      responseTime,
      memoryUsage: perfSnapshot.summary.memoryUsageMB,
      requestCount: perfSnapshot.summary.requestCount,
      errorRate: perfSnapshot.summary.errorRate,
      uptime: await this.getSiteUptime(siteName),
      lastHealthCheck: new Date().toISOString()
    };
  }

  private async getSiteUptime(siteName: string): Promise<string> {
    try {
      // Get systemd service status
      const process = new Deno.Command("systemctl", {
        args: ["show", `${siteName}.service`, "--property=ActiveEnterTimestamp"],
        stdout: "piped"
      }).spawn();
      
      const output = await process.output();
      const result = new TextDecoder().decode(output.stdout);
      
      const match = result.match(/ActiveEnterTimestamp=(.+)/);
      if (match) {
        const startTime = new Date(match[1]);
        const uptime = Date.now() - startTime.getTime();
        return this.formatUptime(uptime);
      }
    } catch {
      // Fallback if systemctl is not available
    }
    
    return 'Unknown';
  }

  private formatUptime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private async checkFrameworkHealth(): Promise<FrameworkHealth> {
    try {
      // Read VERSION file
      const versionContent = await Deno.readTextFile('/home/admin/deno-genesis/VERSION');
      const version = versionContent.split('\n')[0];
      
      // Check framework integrity
      const integrityResult = await validateFrameworkIntegrity();
      
      let integrity: 'valid' | 'invalid' | 'warning' = 'valid';
      const details: string[] = [];
      
      if (!integrityResult.valid) {
        integrity = 'invalid';
        details.push(...integrityResult.errors);
      } else if (integrityResult.warnings.length > 0) {
        integrity = 'warning';
        details.push(...integrityResult.warnings);
      }

      return {
        version,
        integrity,
        integrityDetails: details,
        lastUpdate: await this.getFrameworkLastUpdate()
      };
    } catch (error) {
      return {
        version: 'Unknown',
        integrity: 'invalid',
        integrityDetails: [`Framework health check failed: ${error.message}`],
        lastUpdate: 'Unknown'
      };
    }
  }

  private async getFrameworkLastUpdate(): Promise<string> {
    try {
      // Get last git commit timestamp
      const process = new Deno.Command("git", {
        args: ["log", "-1", "--format=%ci"],
        cwd: "/home/admin/deno-genesis",
        stdout: "piped"
      }).spawn();
      
      const output = await process.output();
      const result = new TextDecoder().decode(output.stdout).trim();
      
      return new Date(result).toISOString();
    } catch {
      return 'Unknown';
    }
  }

  private async checkInfrastructure(): Promise<InfrastructureHealth> {
    return {
      database: await this.checkDatabaseHealth(),
      nginx: await this.checkNginxHealth(),
      system: await this.getSystemMetrics()
    };
  }

  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();
      
      // Test database connection (implementation would depend on your database client)
      // This is a placeholder - you'd use your actual database client
      const testQuery = "SELECT 1"; // Simple health check query
      // await dbClient.query(testQuery);
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'online',
        responseTime,
        details: 'Database connection successful'
      };
    } catch (error) {
      return {
        status: 'offline',
        details: `Database connection failed: ${error.message}`
      };
    }
  }

  private async checkNginxHealth(): Promise<ServiceHealth> {
    try {
      const process = new Deno.Command("systemctl", {
        args: ["is-active", "nginx"],
        stdout: "piped"
      }).spawn();
      
      const output = await process.output();
      const result = new TextDecoder().decode(output.stdout).trim();
      
      return {
        status: result === 'active' ? 'online' : 'offline',
        details: `Nginx service is ${result}`
      };
    } catch (error) {
      return {
        status: 'offline',
        details: `Failed to check Nginx status: ${error.message}`
      };
    }
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      // Get system metrics (simplified version)
      const memInfo = await Deno.readTextFile('/proc/meminfo');
      const loadAvg = await Deno.readTextFile('/proc/loadavg');
      
      // Parse memory usage
      const memTotal = parseInt(memInfo.match(/MemTotal:\s+(\d+)/)?.[1] || '0');
      const memAvailable = parseInt(memInfo.match(/MemAvailable:\s+(\d+)/)?.[1] || '0');
      const memoryUsage = memTotal > 0 ? ((memTotal - memAvailable) / memTotal) * 100 : 0;
      
      // Parse load average
      const loadAvgNumbers = loadAvg.split(' ').slice(0, 3).map(parseFloat);
      
      return {
        cpuUsage: 0, // Would need more complex calculation
        memoryUsage: Math.round(memoryUsage * 100) / 100,
        diskUsage: 0, // Would check disk space
        loadAverage: loadAvgNumbers
      };
    } catch {
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        loadAverage: [0, 0, 0]
      };
    }
  }

  private generateAlerts(
    sites: SiteHealth[],
    framework: FrameworkHealth,
    infrastructure: InfrastructureHealth
  ): void {
    const now = new Date().toISOString();

    // Check for site issues
    sites.forEach(site => {
      if (site.status === 'offline') {
        this.addAlert({
          level: 'critical',
          message: `Site ${site.name} is offline`,
          site: site.name,
          timestamp: now
        });
      } else if (site.status === 'degraded') {
        this.addAlert({
          level: 'warning',
          message: `Site ${site.name} is responding slowly (${site.responseTime}ms)`,
          site: site.name,
          timestamp: now
        });
      }

      if (site.errorRate > 5) {
        this.addAlert({
          level: 'warning',
          message: `High error rate on ${site.name}: ${site.errorRate}%`,
          site: site.name,
          timestamp: now
        });
      }

      if (site.memoryUsage > 500) { // 500MB
        this.addAlert({
          level: 'warning',
          message: `High memory usage on ${site.name}: ${site.memoryUsage}MB`,
          site: site.name,
          timestamp: now
        });
      }
    });

    // Check framework issues
    if (framework.integrity === 'invalid') {
      this.addAlert({
        level: 'critical',
        message: 'Framework integrity validation failed',
        timestamp: now
      });
    } else if (framework.integrity === 'warning') {
      this.addAlert({
        level: 'warning',
        message: 'Framework integrity warnings detected',
        timestamp: now
      });
    }

    // Check infrastructure issues
    if (infrastructure.database.status === 'offline') {
      this.addAlert({
        level: 'critical',
        message: 'Database is offline',
        timestamp: now
      });
    }

    if (infrastructure.nginx.status === 'offline') {
      this.addAlert({
        level: 'critical',
        message: 'Nginx is offline',
        timestamp: now
      });
    }

    if (infrastructure.system.memoryUsage > 85) {
      this.addAlert({
        level: 'warning',
        message: `High system memory usage: ${infrastructure.system.memoryUsage}%`,
        timestamp: now
      });
    }
  }

  private addAlert(alert: Omit<Alert, 'id' | 'acknowledged'>): void {
    // Check if similar alert already exists (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const existingAlert = this.alerts.find(a => 
      a.message === alert.message && 
      a.site === alert.site &&
      a.timestamp > fiveMinutesAgo
    );

    if (!existingAlert) {
      const newAlert: Alert = {
        id: crypto.randomUUID(),
        acknowledged: false,
        ...alert
      };
      
      this.alerts.unshift(newAlert);
      
      // Keep only recent alerts
      if (this.alerts.length > this.maxAlerts) {
        this.alerts = this.alerts.slice(0, this.maxAlerts);
      }
    }
  }

  private determineOverallHealth(
    sites: SiteHealth[],
    framework: FrameworkHealth,
    infrastructure: InfrastructureHealth
  ): 'healthy' | 'degraded' | 'unhealthy' {
    // Critical conditions that make system unhealthy
    const criticalIssues = [
      framework.integrity === 'invalid',
      infrastructure.database.status === 'offline',
      infrastructure.nginx.status === 'offline',
      sites.filter(s => s.status === 'offline').length > 1
    ];

    if (criticalIssues.some(issue => issue)) {
      return 'unhealthy';
    }

    // Degraded conditions
    const degradedIssues = [
      framework.integrity === 'warning',
      sites.some(s => s.status === 'degraded'),
      sites.some(s => s.errorRate > 2),
      infrastructure.system.memoryUsage > 80
    ];

    if (degradedIssues.some(issue => issue)) {
      return 'degraded';
    }

    return 'healthy';
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const healthDashboard = new HealthDashboard();
```

---

## 📋 **Summary and Best Practices Checklist**

### **✅ Unix Philosophy Compliance Checklist**

When developing any script or component for DenoGenesis, verify:

- [ ] **Single Responsibility**: Does this module do exactly one thing well?
- [ ] **Composability**: Can this function be easily combined with others?
- [ ] **Structured I/O**: Does it accept structured input and produce structured output?
- [ ] **Error Transparency**: Are errors returned as data rather than thrown when possible?
- [ ] **Minimal Side Effects**: Does it avoid unnecessary state changes or console output?
- [ ] **Text-Based Config**: Are configurations stored in human-readable formats?
- [ ] **Shell Integration**: Can this be used programmatically from shell scripts?

### **✅ DenoGenesis Architecture Compliance**

For framework components:

- [ ] **Core Directory Usage**: Is shared code in `/core/` with proper exports?
- [ ] **Site Isolation**: Are site-specific configurations in site directories?
- [ ] **Port Management**: Does each site have a unique, documented port?
- [ ] **Symbolic Linking**: Are core dependencies linked rather than copied?
- [ ] **Version Consistency**: Does the component respect framework versioning?

For individual sites:

- [ ] **Framework Integration**: Does it use core utilities rather than reimplementing?
- [ ] **Configuration Override**: Site-specific config in `site-config.ts`?
- [ ] **Performance Monitoring**: Integration with centralized monitoring?
- [ ] **Security Implementation**: Following authentication and validation patterns?

### **✅ LLM Collaboration Optimization**

To ensure effective AI-assisted development:

- [ ] **Context Documentation**: Clear ADRs and architectural decisions?
- [ ] **Type Definitions**: Explicit TypeScript interfaces for all data structures?
- [ ] **Error Handling**: Consistent error patterns across all modules?
- [ ] **Testing Integration**: Unit and integration tests following established patterns?
- [ ] **Performance Monitoring**: Automatic metrics collection where appropriate?

### **🎯 Development Workflow Summary**

1. **Plan**: Review Unix Philosophy principles and DenoGenesis patterns
2. **Implement**: Write code following established conventions and types
3. **Test**: Unit tests, integration tests, and framework integrity validation
4. **Document**: Update meta documentation and architectural decision records
5. **Deploy**: Use deployment scripts with proper validation and monitoring
6. **Monitor**: Leverage health dashboard and performance monitoring
7. **Maintain**: Regular updates following centralized architecture principles

---

## 🚀 **Final Notes for LLM Collaboration**

This meta documentation serves as the definitive guide for maintaining Unix Philosophy principles while leveraging the DenoGenesis centralized architecture. Every script, component, and architectural decision should be evaluated against these standards.

Key principles for LLM + Human collaboration:

1. **Consistency**: Follow established patterns rather than inventing new ones
2. **Documentation**: Every decision should be explainable and documented
3. **Testing**: Validate both functionality and architectural compliance
4. **Performance**: Monitor and optimize continuously
5. **Security**: Security-first design in all components
6. **Maintainability**: Code should be understandable and modifiable by both humans and AI

Remember: The framework's strength comes from its coherent architecture and consistent application of Unix Philosophy principles. Deviations should be rare, well-documented, and justified by exceptional circumstances.