# TODO: Decoupling & Architecture Improvements

## Overview
This document tracks remaining architectural improvements to reduce tight coupling and improve modularity in the DenoGenesis codebase.

**Context**: Initial refactoring completed for kernel.ts and server.ts. 21 files with 227 ConsoleStyler usages remain.

---

## ✅ Completed Tasks

### 1. Logging Interface + Dependency Injection
- [x] Create `interfaces/ILogger.ts` interface
- [x] Create `adapters/ConsoleStylerLogger.ts` adapter
- [x] Update `kernel.ts` to use dependency injection
- [x] Update `server.ts` to use dependency injection
- [x] Test kernel and server with new architecture

### 2. Centralized Configuration
- [x] Create `config/defaults.ts` with all default values
- [x] Create `config/environment.ts` with EnvironmentConfig class
- [x] Remove duplicated defaults from kernel.ts and server.ts
- [x] Centralize server script path configuration

---

## ✅ Completed Tasks

### 3. Update Router & Core Middleware Files (Completed 2025-11-05)

**Affected Files:**
- `router.ts` - Direct ConsoleStyler usage
- `middleware/index.ts` - Logger middleware
- `middleware/performanceMonitor.ts` - Multiple ConsoleStyler calls
- `middleware/loggingMiddleware.ts` - Pre-existing type errors

**Tasks:**
- [x] Add ILogger parameter to `createRouter()` function
- [x] Add ILogger parameter to Router class constructor
- [x] Pass logger down to middleware creation functions
- [x] Update `createPerformanceMiddleware()` to accept ILogger
- [x] Update `logger()` middleware factory to accept ILogger
- [x] Update server.ts to use new parameters
- [x] Update route handlers to use context.logger
- [x] Fix type errors in loggingMiddleware.ts (ColorSystem.colorize issue)
- [x] Fix type errors in performanceMonitor.ts (ColorSystem.colorize issue)
- [x] Note: errorHandler() middleware deferred (requires significant work)

**Complexity**: Medium - Required threading logger through middleware pipeline

**Actual Impact**: ~60 ConsoleStyler usages removed

---

## 🔴 HIGH PRIORITY - Remaining Work

---

### 4. Update Utility Files

**Affected Files:**
- `utils/parsers.ts` - 7 ConsoleStyler calls
- `utils/validator.ts` - 4 ConsoleStyler calls
- `utils/response.ts` - 5 ConsoleStyler calls
- `utils/repl.ts` - 2 ConsoleStyler calls + imports Kernel (reverse dependency)

**Tasks:**
- [ ] Make `bodyParser()` accept optional ILogger parameter
- [ ] Make `validate()` accept optional ILogger parameter
- [ ] Consider removing logging from response helpers (single responsibility)
- [ ] Move `utils/repl.ts` to `repl/MetaRepl.ts` (fix reverse dependency)
- [ ] Update REPL to accept ILogger via constructor

**Complexity**: Low-Medium

**Estimated Impact**: ~18 ConsoleStyler usages

---

### 5. Fix Context Structure Coupling (Medium Priority)

**Problem**: Middleware directly manipulates `ctx.state` object structure

**Affected Files:**
- `middleware/performanceMonitor.ts`
- `middleware/index.ts`
- `utils/parsers.ts`
- `utils/validator.ts`

**Tasks:**
- [ ] Add accessor methods to Context interface:
  ```typescript
  interface Context {
    setState(key: string, value: unknown): void;
    getState<T>(key: string): T | undefined;
    getMethod(): string;
    getPathname(): string;
    getBody(): unknown;
    setBody(body: unknown): void;
  }
  ```
- [ ] Update middleware to use accessors instead of direct property access
- [ ] Update parsers to use `ctx.setBody()` instead of `ctx.state.body =`
- [ ] Update validators to use `ctx.getBody()` and `ctx.setBody()`

**Complexity**: Medium - Requires Context interface changes

**Estimated Impact**: Improves maintainability, reduces Law of Demeter violations

---

### 6. Centralize Environment Variable Access (Low Priority)

**Problem**: Direct `Deno.env.get()` calls scattered throughout codebase

**Affected Files:**
- `middleware/index.ts` (lines 132, 197, 219, 242)
- Multiple other files

**Tasks:**
- [ ] Add more helper methods to EnvironmentConfig:
  ```typescript
  get environment(): string
  get isProduction(): boolean
  get isDevelopment(): boolean
  get isTesting(): boolean
  ```
- [ ] Replace direct `Deno.env.get("DENO_ENV")` with `env.environment`
- [ ] Replace environment checks with `env.isProduction`, etc.

**Complexity**: Low - Simple find & replace

**Estimated Impact**: Improved testability and consistency

---

## 🟡 MEDIUM PRIORITY - Architecture Improvements

### 7. Create IContext Interface for Better Testability

**Current Issue**: Context type is concrete, making testing difficult

**Tasks:**
- [ ] Extract IContext interface from Context class
- [ ] Update middleware signatures to use IContext
- [ ] Create MockContext for testing

**Benefits**:
- Easier unit testing of middleware
- Can swap Context implementations
- Follows dependency inversion principle

---

### 8. Add ILogger to IContext (Optional Enhancement)

**Idea**: Include logger in context for per-request logging

**Tasks:**
- [ ] Add `logger: ILogger` to Context interface
- [ ] Create child logger per request with request ID
- [ ] Update middleware to use `ctx.logger` instead of injected logger

**Benefits**:
- Automatic request ID correlation in logs
- Per-request log filtering
- Better observability

**Trade-offs**:
- Adds complexity
- Logger becomes part of request lifecycle
- May not be needed if middleware already has access

---

## 🟢 LOW PRIORITY - Nice to Have

### 9. Extract Specialized Logger Methods

**Current**: ILogger has basic methods, ConsoleStyler has many specialized ones

**Tasks:**
- [ ] Consider creating specialized logger interfaces:
  ```typescript
  interface IPerformanceLogger extends ILogger {
    logMetrics(metrics: PerformanceMetrics): void;
  }

  interface IRouteLogger extends ILogger {
    logRoute(method: string, path: string, ...): void;
  }
  ```
- [ ] Or keep specialized logging in separate formatters/presenters

**Decision Needed**: Discuss whether specialized methods belong in core logger interface

---

### 10. Create Configuration Validation

**Tasks:**
- [ ] Add validation to EnvironmentConfig
- [ ] Throw early errors for invalid port numbers
- [ ] Validate hostname format
- [ ] Add configuration schema with defaults

---

### 11. Process Configuration Abstraction

**Current**: Kernel has hardcoded `./server.ts` path

**Tasks:**
- [ ] Create ProcessConfig interface
- [ ] Extract process definitions to configuration
- [ ] Make kernel process-agnostic (just spawns configured processes)

**Example**:
```typescript
const processConfigs = {
  httpServer: {
    script: "./server.ts",
    autoRestart: true,
    env: {...}
  }
};
```

---

## 📊 Progress Tracking

### Overall Statistics
- **Total Files with ConsoleStyler**: 21 files
- **Total ConsoleStyler Usages**: 227 occurrences
- **Files Updated**: 7/21 (33%)
- **Usages Removed**: ~72/227 (32%)

### By Priority
- **High Priority**: 3 tasks remaining (Utils, Context, Environment)
- **Medium Priority**: 2 tasks remaining (IContext, Logger in Context)
- **Low Priority**: 3 tasks remaining (Specialized loggers, Validation, Process config)

### Recent Updates (2025-11-05)
- ✅ Router & Core Middleware refactoring completed
- ✅ 5 additional files updated (router.ts, middleware/index.ts, performanceMonitor.ts, loggingMiddleware.ts, server.ts)
- ✅ ~60 ConsoleStyler usages removed
- ✅ All TypeScript type errors resolved
- ✅ CHANGES.md created with comprehensive documentation

---

## 🎯 Next Steps (Recommended Order)

1. ~~**Router & Middleware**~~ - ✅ COMPLETED (2025-11-05)
2. **Utils Files** - Update parsers, validators, response helpers (next priority)
3. **Fix REPL Reverse Dependency** - Move repl out of utils
4. **Context Accessors** - Add methods to Context interface
5. **Environment Access** - Centralize remaining Deno.env.get() calls

---

## 📝 Notes

### Why Not Update All Files Immediately?

The gradual approach allows us to:
1. Test each layer independently
2. Identify integration issues early
3. Adjust the abstraction if needed
4. Maintain working system during refactoring

### When to Use Direct ConsoleStyler vs ILogger?

**Use ConsoleStyler directly when:**
- Specialized formatting needed (banners, tables, progress bars)
- One-time initialization code
- CLI/REPL specific formatting

**Use ILogger when:**
- Core application logging
- Code that needs to be testable
- Code that may run in different contexts
- Business logic and middleware

### Pre-existing Issues

The following issues existed before refactoring:
- Type errors in loggingMiddleware.ts (ColorSystem.colorize)
- Type errors in performanceMonitor.ts (ColorSystem.colorize)
- REPL crashes when run in non-TTY environment

These should be fixed as part of the refactoring effort.

---

## 🔗 Related Files

- `/interfaces/ILogger.ts` - Logger interface definition
- `/adapters/ConsoleStylerLogger.ts` - ConsoleStyler adapter
- `/config/` - Configuration module
- Original analysis in project docs (if available)

---

**Last Updated**: 2025-11-05
**Status**: In Progress (Phase 2 Complete)
**Owner**: Development Team
**Phase 1 Completed**: 2025-11-04 (Kernel & Server + Configuration)
**Phase 2 Completed**: 2025-11-05 (Router & Middleware)
