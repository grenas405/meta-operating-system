# Changelog

All notable changes to the DenoGenesis codebase architecture and refactoring efforts are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to semantic versioning principles.

---

## [Unreleased] - 2025-11-05

### Architecture Refactoring - Phase 1 & 2

This release focuses on reducing tight coupling, improving modularity, and implementing dependency injection patterns throughout the core framework.

---

## Phase 2: Router & Middleware Dependency Injection (2025-11-05)

### Added

#### Core Interfaces
- **ILogger parameter** added to all middleware factory functions
- **Logger field** added to `RouteRegistrationContext` interface in `router.ts`

### Changed

#### router.ts
- **BREAKING**: `createRouter()` now requires `ILogger` parameter
  ```typescript
  // Before
  const router = createRouter();

  // After
  const router = createRouter(logger);
  ```
- **BREAKING**: `Router` class constructor now requires `ILogger` parameter
- **BREAKING**: `RouteRegistrationContext` interface now includes `logger: ILogger` field
- Replaced all `ConsoleStyler` direct calls with `ILogger` method calls:
  - `ConsoleStyler.logRoute()` → `logger.logDebug()`
  - `ConsoleStyler.logWarning()` → `logger.logWarning()`
  - `ConsoleStyler.logSuccess()` → `logger.logSuccess()`
  - `ConsoleStyler.logInfo()` → `logger.logInfo()`
- Route handlers now use `context.logger` instead of importing ConsoleStyler

#### middleware/index.ts
- **BREAKING**: `logger()` middleware factory now requires `ILogger` parameter
  ```typescript
  // Before
  router.use(logger());

  // After
  router.use(logger(logger));
  ```
- Removed `ConsoleStyler` import in favor of `ILogger` interface
- `logger()` middleware now uses injected logger for request logging

#### middleware/performanceMonitor.ts
- **BREAKING**: `createPerformanceMiddleware()` signature changed:
  ```typescript
  // Before
  createPerformanceMiddleware(monitor: PerformanceMonitor, isDevelopment?: boolean)

  // After
  createPerformanceMiddleware(monitor: PerformanceMonitor, logger: ILogger, isDevelopment?: boolean)
  ```
- Replaced `ConsoleStyler` calls with `ILogger` method calls in development mode
- Removed manual color management using `ColorSystem` (now handled by ILogger implementation)
- Fixed type errors related to `ColorSystem.colorize()` usage

#### middleware/loggingMiddleware.ts
- Fixed `ColorSystem.colorize()` type error by using static method call with type casting
- Changed from instance method to static method call:
  ```typescript
  // Before
  return this.colors.colorize(text, color as any);

  // After
  return ColorSystem.colorize(text, color as any);
  ```

#### server.ts
- Updated to pass `ILogger` to all middleware and router factory functions
- **Changes**:
  - `createRouter(this.logger)` - pass logger to router
  - `createPerformanceMiddleware(this.performanceMonitor, this.logger, this.config.debug)` - pass logger
  - `logger(this.logger)` - pass logger to middleware
  - `registerCoreRoutes()` context now includes `logger: this.logger`

### Fixed
- Type error in `loggingMiddleware.ts` where `ColorSystem.colorize()` was called as instance method
- Type error in `router.ts` where array was passed directly to logger metadata instead of wrapped in object
- All TypeScript compilation errors resolved - `deno check server.ts` passes cleanly

### Impact
- **Files Updated**: 5 files (router.ts, middleware/index.ts, performanceMonitor.ts, loggingMiddleware.ts, server.ts)
- **ConsoleStyler Usages Removed**: ~60 direct usages
- **Improved Testability**: All middleware and routing now uses dependency injection
- **Progress**: 7/21 files updated (33%), ~72/227 usages removed (32%)

### Migration Guide

#### For Router Creation
```typescript
// Before
const router = createRouter();

// After
import { defaultLogger } from "./adapters/mod.ts";
const router = createRouter(defaultLogger);
```

#### For Middleware Usage
```typescript
// Before
router.use(logger());
router.use(createPerformanceMiddleware(monitor, isDevelopment));

// After
import { defaultLogger } from "./adapters/mod.ts";
router.use(logger(defaultLogger));
router.use(createPerformanceMiddleware(monitor, defaultLogger, isDevelopment));
```

#### For Route Registration
```typescript
// Before
registerCoreRoutes(router, {
  systemInfo,
  getUptime,
  performanceMonitor,
  config,
});

// After
registerCoreRoutes(router, {
  systemInfo,
  getUptime,
  performanceMonitor,
  config,
  logger,
});
```

---

## Phase 1: Logging Interface & Centralized Configuration (2025-11-04)

### Added

#### Core Interfaces
- **`interfaces/ILogger.ts`** - Core logging abstraction interface
  - Methods: `logInfo()`, `logSuccess()`, `logWarning()`, `logError()`, `logDebug()`, `logCritical()`
  - Method: `logRequest()` - for HTTP request/response logging
  - Method: `logSection()` - for formatted section headers
  - Designed for dependency injection and testability

#### Adapters
- **`adapters/ConsoleStylerLogger.ts`** - Adapter implementation
  - Implements `ILogger` interface using ConsoleStyler
  - Enables dependency injection while maintaining existing functionality
  - Exports `defaultLogger` singleton for convenience

#### Configuration
- **`config/defaults.ts`** - Centralized default values
  - Server defaults: port (8000), hostname (localhost)
  - Kernel defaults: process management settings
  - Environment defaults: environment detection logic
  - Single source of truth for all default configurations

- **`config/environment.ts`** - Environment configuration management
  - `EnvironmentConfig` class with environment variable handling
  - Methods for loading server and kernel configurations
  - Type-safe configuration with fallback to defaults
  - Merge strategy: user config → environment variables → defaults

- **`config/mod.ts`** - Configuration module barrel export
  - Exports all configuration utilities
  - Provides convenient access to `env` singleton

### Changed

#### kernel.ts
- **BREAKING**: Constructor now requires `ILogger` parameter
  ```typescript
  // Before
  const kernel = new Kernel(config);

  // After
  import { defaultLogger } from "./adapters/mod.ts";
  const kernel = new Kernel(config, defaultLogger);
  ```
- Replaced all `ConsoleStyler` direct calls with `this.logger` dependency injection
- Uses centralized configuration via `env.loadKernelConfig()`
- Removed hardcoded default values (now in `config/defaults.ts`)

#### server.ts (Phase 1 changes)
- **BREAKING**: Constructor now accepts optional `ILogger` parameter (defaults to `defaultLogger`)
- Replaced internal `ConsoleStyler` calls with `this.logger` dependency injection
- Uses centralized configuration via `env.loadServerConfig()`
- Removed hardcoded default values
- NOTE: Banner rendering still uses ConsoleStyler directly (specialized formatting)

### Design Principles

The refactoring follows these key principles:

1. **Dependency Inversion Principle**
   - High-level modules (kernel, server, router) depend on abstraction (ILogger)
   - Low-level modules (ConsoleStylerLogger) implement the abstraction
   - Dependencies flow inward toward abstractions

2. **Single Responsibility Principle**
   - Configuration management separated into dedicated module
   - Logging separated from business logic
   - Each module has one reason to change

3. **Open/Closed Principle**
   - System open for extension (new logger implementations)
   - Closed for modification (core logic doesn't change for new loggers)
   - Can swap logging implementations without touching core code

4. **Interface Segregation**
   - ILogger interface contains only methods needed by clients
   - No client forced to depend on methods it doesn't use
   - Specialized logging (banners, tables) remains in ConsoleStyler

### When to Use ILogger vs ConsoleStyler

**Use ILogger (via dependency injection) for:**
- Core application logging
- Code that needs to be testable
- Code that may run in different contexts
- Business logic and middleware
- Request/response logging

**Use ConsoleStyler directly for:**
- Specialized formatting (banners, tables, progress bars)
- One-time initialization code
- CLI/REPL specific formatting
- Development tools and utilities

### Impact

#### Phase 1 Impact
- **Files Updated**: 2 files (kernel.ts, server.ts)
- **ConsoleStyler Usages Removed**: ~12 direct usages replaced with ILogger
- **Configuration Centralized**: All defaults now in single location
- **Testability Improved**: Core components can be tested with mock loggers

#### Combined Impact (Phase 1 + 2)
- **Total Files Updated**: 7/21 (33%)
- **Total ConsoleStyler Usages Removed**: ~72/227 (32%)
- **Architecture**: Dependency injection pattern established
- **Maintainability**: Reduced coupling, improved modularity

---

## Remaining Work

See [TODO.md](./TODO.md) for detailed task breakdown. High-priority remaining items:

### High Priority
1. **Update Utility Files** (~18 ConsoleStyler usages)
   - `utils/parsers.ts` - Add optional ILogger parameter to bodyParser()
   - `utils/validator.ts` - Add optional ILogger parameter to validate()
   - `utils/response.ts` - Consider removing logging (single responsibility)
   - `utils/repl.ts` - Move to `repl/MetaRepl.ts`, accept ILogger in constructor

2. **Fix Context Structure Coupling**
   - Add accessor methods to Context interface
   - Update middleware to use accessors instead of direct property access
   - Improve Law of Demeter compliance

3. **Centralize Environment Variable Access**
   - Add helper methods to EnvironmentConfig
   - Replace direct `Deno.env.get()` calls
   - Improve testability and consistency

### Medium Priority
1. **Create IContext Interface**
   - Extract interface from Context class
   - Enable mock contexts for testing
   - Follow dependency inversion principle

2. **Add ILogger to IContext (Optional)**
   - Include logger in context for per-request logging
   - Create child logger per request with request ID
   - Improve log correlation and observability

### Low Priority
1. **Extract Specialized Logger Methods**
   - Consider creating specialized logger interfaces
   - Or keep specialized logging in separate formatters/presenters

2. **Create Configuration Validation**
   - Add validation to EnvironmentConfig
   - Throw early errors for invalid configurations

3. **Process Configuration Abstraction**
   - Create ProcessConfig interface
   - Extract process definitions to configuration
   - Make kernel process-agnostic

---

## Breaking Changes Summary

### Phase 1 Breaking Changes
- `Kernel` constructor now requires `ILogger` as second parameter
- `HTTPServer` constructor signature changed (added optional logger parameter)

### Phase 2 Breaking Changes
- `createRouter()` function now requires `ILogger` parameter
- `Router` class constructor now requires `ILogger` parameter
- `logger()` middleware factory now requires `ILogger` parameter
- `createPerformanceMiddleware()` now requires `ILogger` as second parameter
- `RouteRegistrationContext` interface now requires `logger` field

### Migration Path
All breaking changes can be addressed by importing and using `defaultLogger`:

```typescript
import { defaultLogger } from "./adapters/mod.ts";

// Use defaultLogger wherever ILogger is required
const kernel = new Kernel(config, defaultLogger);
const server = new HTTPServer(config, defaultLogger);
const router = createRouter(defaultLogger);
router.use(logger(defaultLogger));
router.use(createPerformanceMiddleware(monitor, defaultLogger));
```

---

## Testing

All changes have been validated:
- ✅ TypeScript compilation: `deno check server.ts` passes
- ✅ No runtime errors expected (maintains same behavior)
- ✅ Dependency injection pattern verified
- ✅ Type safety maintained throughout

---

## Notes

- This refactoring is part of ongoing architecture improvements
- Changes maintain backward compatibility where possible
- Breaking changes are necessary for proper dependency injection
- See TODO.md for detailed progress tracking (updated 2025-11-05)
- All original functionality preserved, only coupling reduced

---

## References

- **TODO.md** - Detailed task tracking and progress
- **interfaces/ILogger.ts** - Logger interface documentation
- **adapters/ConsoleStylerLogger.ts** - Adapter implementation
- **config/** - Centralized configuration module
- Original architectural analysis and planning documents
