# ADR-002: Consolidate Logging Middleware (Unix Philosophy Correction)

## Status
**ACCEPTED** - Implemented 2025-11-07

## Context
The framework previously had **two separate logging middleware functions**:
1. `logger()` - Simple middleware using ILogger interface
2. `logging()` - Comprehensive middleware with advanced features

This violated Unix Philosophy's **"Do One Thing Well"** principle by having two functions doing essentially the same thing, creating confusion about which to use.

## Problem Statement
- **Duplication**: Two middleware performing the same core function (request/response logging)
- **Confusion**: Developers had to choose between two similar options
- **Inconsistency**: The comprehensive `loggingMiddleware.ts` file existed but wasn't being fully utilized
- **Philosophy Violation**: Unix Philosophy mandates ONE tool that does the job well

## Decision
**Consolidate to a single logging middleware**: `logging()`

- **Deprecated** `logger()` but maintained for backward compatibility
- `logger()` now delegates to `logging()` internally
- Updated `core/server.ts` to use `logging()` directly
- `logging()` becomes the canonical logging middleware

## Rationale

### Why Keep `logging()` over `logger()`?

1. **Comprehensive Features**:
   - Header sanitization (security)
   - Environment-aware configuration
   - Debug mode with detailed logging
   - Request/response correlation
   - Proper log levels (debug, info, warn, error)

2. **Better Security**:
   - Sanitizes sensitive headers (Authorization, Cookie, etc.)
   - Prevents credential leakage in logs
   - Follows security best practices

3. **Framework Patterns**:
   - Uses `LoggingConfig` interface
   - Environment-based defaults
   - Consistent with other middleware (cors, security, etc.)

4. **Unix Philosophy Alignment**:
   - **Does ONE thing well**: Comprehensive request/response logging
   - **Composable**: Can be combined with other middleware
   - **Explicit**: Clear configuration, no magic
   - **Text-based**: All logs are readable text

### Why Deprecate Instead of Delete `logger()`?

- **Backward Compatibility**: Existing code may reference `logger()`
- **Graceful Migration**: Allows gradual transition
- **No Breaking Changes**: Sites continue to work
- **Clear Deprecation Path**: Marked with `@deprecated` JSDoc tag

## Implementation

### Before (WRONG - Violates Unix Philosophy):
```typescript
// Two separate implementations
export function logger(logger: ILogger): Middleware {
  // Simple logging implementation
}

export function logging(config?: LoggingConfig): Middleware {
  // Comprehensive logging implementation
}

// Server uses the simple one
router.use(logger(this.logger));
```

### After (CORRECT - Follows Unix Philosophy):
```typescript
// One canonical implementation
export function logging(config?: LoggingConfig): Middleware {
  // Comprehensive logging with all features
}

// Deprecated wrapper for compatibility
/** @deprecated Use logging() instead */
export function logger(logger: ILogger): Middleware {
  return logging({ /* config */ });
}

// Server uses the comprehensive one
router.use(logging({
  environment: this.config.environment,
  logLevel: this.config.debug ? "debug" : "info",
  logRequests: true,
  logResponses: this.config.debug,
}));
```

## Consequences

### Positive
- ✅ **Follows Unix Philosophy**: One middleware, one purpose
- ✅ **Better Security**: Automatic header sanitization
- ✅ **More Features**: Debug mode, log levels, response logging
- ✅ **Clearer Intent**: `logging()` is the obvious choice
- ✅ **Better Documentation**: Single middleware to document
- ✅ **Consistent Patterns**: Matches other middleware conventions

### Negative
- ⚠️ **Deprecation Warning**: Sites using `logger()` will see deprecation notice
- ⚠️ **Migration Path**: Teams need to update to `logging()`

### Mitigation
- Backward compatibility maintained through delegation
- Clear deprecation notice with migration instructions
- Documentation updated to reference `logging()`

## Migration Guide

### For Existing Code Using `logger()`:

**Old Code:**
```typescript
import { logger } from "./core/middleware/index.ts";

router.use(logger(myLogger));
```

**New Code:**
```typescript
import { logging } from "./core/middleware/index.ts";

router.use(logging({
  environment: "production",
  logLevel: "info",
  logRequests: true,
  logResponses: false,
}));
```

### Benefits of Migration:
- Header sanitization (prevents credential leakage)
- Environment-aware configuration
- Debug mode for development
- Log levels for filtering
- Request/response correlation with IDs

## Related Documentation
- [Unix Philosophy](./philosophy.md) - Core framework principles
- [Meta Documentation](./meta-documentation.md) - "Do One Thing Well" pattern
- [Middleware Guide](../04-api-reference/core/middleware.md) - Middleware patterns

## Review Date
**Next Review**: Q1 2026 (or when breaking changes are planned)

## Lessons Learned

### For Future Development:
1. **One Tool, One Job**: Before adding new functionality, check if existing tool can be extended
2. **Question Duplication**: If two tools seem similar, they probably violate Unix Philosophy
3. **User Feedback**: Users will catch philosophy violations we miss
4. **AI Review**: Even AI-generated code should be reviewed against framework principles

### For AI Collaboration:
This ADR was triggered by a **user observation** that correctly identified a Unix Philosophy violation. This demonstrates:
- Human review is essential, even for AI-generated code
- Framework principles should be checked on every PR
- Meta-documentation helps maintain consistency
- Community feedback improves the framework

---

**Author**: Pedro M. Dominguez
**Reviewer**: [Framework User Community]
**Date**: November 7, 2025
**ADR Number**: 002

---

*This decision aligns DenoGenesis with Unix Philosophy by ensuring ONE logging middleware does the job well, rather than having confusing alternatives.*
