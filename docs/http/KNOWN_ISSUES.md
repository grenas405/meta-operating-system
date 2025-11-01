# Known Issues - HTTP Server Framework

**Last Updated:** 2025-10-31

## Critical Issues Preventing Production Use

### 🔴 Issue #1: Middleware Adapter Pattern Causes "next() called multiple times"
**Severity:** CRITICAL
**Status:** ✅ Resolved
**Resolution:**
- Middleware stack now uses the shared `http/context.ts` helpers to operate directly on Request/Response primitives
- `security()`, `logging()`, and `healthCheck()` were rewritten to return `Response` objects without Oak adapters, eliminating duplicate `next()` calls

**Impact:** Middleware pipeline runs in native mode with no Oak compatibility shims. Existing applications should verify custom middleware still returns a `Response` when appropriate.

---

### 🔴 Issue #2: Health Check Route Not Registered
**Severity:** HIGH
**Status:** ✅ Resolved
**Resolution:**
- `createHealthCheckMiddleware()` now responds with a `Response` directly when the configured endpoint is requested
- Global `healthCheck()` middleware can intercept `/health` without an explicit router entry, while still supporting explicit route registration when desired

**Impact:** Health checks succeed out of the box. Applications may continue to register dedicated routes for clarity but are no longer required to do so.

---

## Medium Severity Issues

### 🟡 Issue #3: Missing Request Context Properties
**Severity:** MEDIUM
**Status:** ✅ Resolved

**Resolution:**
- Middleware now operates on the actual `Request` object provided by Deno, exposing the full API (including `formData()`, `blob()`, `arrayBuffer()`, and `signal`)
- Logging middleware captures request metadata without creating mock Oak contexts

**Impact:** Custom middleware can safely rely on the standard Request interface. No additional workarounds required.

**Timeline:** Medium priority

---

### 🟡 Issue #4: Security Middleware May Not Detect Blocks Properly
**Severity:** MEDIUM
**Status:** POTENTIAL BUG
**Affects:** Security middleware blocking malicious requests

**Description:**
The security adapter checks if a request was blocked by looking at `responseBody !== null && nextResponse === null`, but async timing might cause this check to fail.

**Impact:**
Blocked requests might still pass through to handlers.

**Workaround:**
None currently.

**Timeline:** Medium priority - requires investigation

---

## Low Severity / Cosmetic Issues

### 🟢 Issue #5: Health Check Middleware Returns Void
**Severity:** LOW
**Status:** CODE SMELL
**Affects:** Type safety

**Description:**
In healthCheck.ts line 706:
```typescript
// Don't call next() - we've handled the response
return;  // Returns void, but middleware expects Response
```

**Impact:**
Type checker might complain, though it works in practice.

**Fix:**
Return a dummy Response instead of void.

**Timeline:** Low priority - cosmetic issue

---

## Issues from Code TODOs

### 📝 TODO #1: Error Reporting Integration
**Location:** errorHandler.ts:1030-1032
**Priority:** MEDIUM

```typescript
// TODO: Implement actual reporting
// For now, just log that we would report
console.log('📊 Error reported to monitoring service');
```

**Requirement:** Integrate with Sentry, DataDog, or other monitoring services

---

### 📝 TODO #2: Graceful Shutdown Hooks
**Location:** errorHandler.ts:787-789
**Priority:** MEDIUM

```typescript
// TODO: In production, you might want to:
// 1. Close database connections
// 2. Finish in-flight requests (with timeout)
// 3. Stop accepting new requests
```

**Requirement:** Implement proper cleanup on shutdown

---

## Testing Gaps

### Missing Integration Tests
- ❌ No tests for middleware chain execution
- ❌ No tests for error handling paths
- ❌ No tests for security protections
- ❌ No tests for health check endpoints

### Missing Unit Tests
- ❌ Router path matching not fully tested
- ❌ Validator functions lack coverage
- ❌ Error classification needs tests

---

## Documentation Gaps

- ❌ No migration guide from Oak/Express
- ❌ No performance tuning guide
- ❌ Limited example applications
- ⚠️ API reference incomplete

---

## Performance Concerns

### Potential Issues (Unverified)
1. **Middleware Overhead:** Multiple context creations per request
2. **Memory Leaks:** Oak context mocks may not be GC'd properly
3. **Response Cloning:** Security middleware clones response body/headers

**Status:** Needs benchmarking and profiling

---

## Browser Compatibility

Not applicable - this is a server-side framework.

---

## Dependency Issues

### Current Status
✅ Zero external dependencies (uses only Deno std library)

This is a strength, but means:
- No battle-tested libraries for security
- Custom implementations may have edge cases
- More maintenance burden

---

## Security Concerns

### Unverified Security Measures
The following security features are implemented but not penetration-tested:
- Path traversal protection
- XSS protection headers
- CSRF token generation
- SQL injection pattern detection
- IP blocking logic

**Recommendation:** Third-party security audit before production use

---

## Upgrade Path Concerns

### Breaking Changes Expected
When fixing Issue #1 (middleware adapters), the API will change:
- `security()` function signature may change
- `logging()` function signature may change
- `healthCheck()` function signature may change

**Migration Impact:** MAJOR - all users will need to update code

---

## Platform-Specific Issues

### Deno-Specific
- Only tested on Deno 2.x
- May not work on older Deno versions
- Relies on Deno.serve() which is relatively new

### Operating System
- Primarily tested on Linux
- MacOS support unknown
- Windows support unknown

---

## Workarounds Summary

| Issue | Temporary Workaround | Permanent Fix ETA |
|-------|---------------------|-------------------|
| #1 Middleware adapters | None | TBD |
| #2 Health check route | Manual route registration | TBD |
| #3 Missing Request props | Avoid advanced features | TBD |
| #4 Security block detection | None | TBD |

---

## How to Report New Issues

1. Check this document first
2. Check TODO.md for known planned work
3. Search existing issues (if using issue tracker)
4. Provide:
   - Deno version
   - OS and version
   - Minimal reproduction case
   - Expected vs actual behavior
   - Stack trace if applicable

---

## Issue Priority Legend

- 🔴 **CRITICAL** - Blocks core functionality
- 🟡 **MEDIUM** - Impacts features but has workarounds
- 🟢 **LOW** - Minor issues, cosmetic, or edge cases
- 📝 **TODO** - Planned work, not yet implemented

---

*For full TODO list and implementation roadmap, see TODO.md*
