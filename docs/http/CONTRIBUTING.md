# Contributing to HTTP Server Framework

Thank you for your interest in contributing! This guide will help you get started.

## 📋 Before You Start

1. **Read the documentation:**
   - `TODO.md` - Planned features and improvements
   - `KNOWN_ISSUES.md` - Current bugs and limitations
   - `MIDDLEWARE_INTEGRATION.md` - How middleware works
   - `INTEGRATION_SUMMARY.md` - Current integration status

2. **Check existing work:**
   - Review open issues/TODOs
   - Avoid duplicate effort
   - Comment on issues you want to work on

3. **Understand the architecture:**
   - Zero external dependencies (Deno std only)
   - Standard Request/Response (not Oak-style)
   - Middleware composition pattern
   - Router with path parameter support

## 🚀 Quick Start

### Prerequisites

- Deno 2.x or later
- Basic understanding of HTTP servers
- Familiarity with TypeScript
- Understanding of async/await patterns

### Setup

```bash
# Clone the repository
cd /path/to/meta-os/http

# Run the example (currently broken - see KNOWN_ISSUES.md)
deno run --allow-net --allow-read --allow-env example-usage.ts

# Run tests (when available)
deno test

# Type check
deno check middleware.ts mod.ts server.ts
```

## 📂 Project Structure

```
http/
├── server.ts              # Core HTTP server
├── router.ts              # URL routing and path parameters
├── middleware.ts          # Middleware composition and utilities
├── mod.ts                 # Public API exports
├── response.ts            # Response helper functions
├── parsers.ts             # Body parsing (JSON, form data)
├── validator.ts           # Request validation
├── errorHandler.ts        # Error handling and classification
├── healthCheck.ts         # Health monitoring
├── logging.ts             # Request/response logging
├── security.ts            # Security headers and protections
├── performanceMonitor.ts  # Performance metrics
├── staticFiles.ts         # Static file serving
├── example-usage.ts       # Example application
└── docs/
    ├── TODO.md
    ├── KNOWN_ISSUES.md
    ├── MIDDLEWARE_INTEGRATION.md
    └── INTEGRATION_SUMMARY.md
```

## 🎯 Good First Issues

### Easy (1-2 hours)
- Add missing Request properties to Oak adapters (TODO.md #3)
- Write unit tests for validator functions
- Add JSDoc comments to exported functions
- Fix type errors and add stricter types

### Medium (2-4 hours)
- Implement error reporting integration (TODO.md #4)
- Create example applications
- Write integration tests
- Add graceful shutdown hooks (TODO.md #5)

### Hard (4+ hours)
- Fix middleware adapter pattern (TODO.md #1) ⚠️ **Critical**
- Fix health check route registration (TODO.md #2) ⚠️ **Critical**
- Refactor Oak-style middleware to Request/Response
- Add WebSocket support

## 🔧 Development Guidelines

### Code Style

1. **TypeScript strict mode:**
   ```typescript
   // Use explicit types
   function handler(ctx: Context): Response {
     return new Response("Hello");
   }

   // Avoid 'any'
   function bad(data: any) { } // ❌
   function good(data: unknown) { } // ✅
   ```

2. **Naming conventions:**
   - `camelCase` for variables and functions
   - `PascalCase` for classes and interfaces
   - `UPPER_CASE` for constants
   - Descriptive names (avoid abbreviations)

3. **File organization:**
   - One primary export per file
   - Group related functions
   - Exports at the bottom of file
   - Imports at the top

4. **Comments:**
   - JSDoc for public APIs
   - Inline comments for complex logic
   - TODO comments for future work
   - Explain "why" not "what"

### Example:

```typescript
/**
 * Creates a middleware function that logs all requests
 *
 * @param config - Optional configuration for logging behavior
 * @returns Middleware function that can be used with server.use()
 *
 * @example
 * ```typescript
 * const server = createServer({ port: 8000 });
 * server.use(logging({ logLevel: 'info' }));
 * ```
 */
export function logging(config?: LoggingConfig): Middleware {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return async (ctx: Context, next: () => Promise<Response>): Promise<Response> => {
    const start = Date.now();

    // Call next middleware/handler
    const response = await next();

    const duration = Date.now() - start;
    logRequest(ctx, response, duration);

    return response;
  };
}
```

## 🧪 Testing Guidelines

### Unit Tests

```typescript
import { assertEquals } from "https://deno.land/std/assert/mod.ts";

Deno.test("router should match exact path", () => {
  const router = createRouter();
  router.get("/users", () => new Response("Users"));

  const match = router.match("GET", "/users");
  assertEquals(match !== null, true);
});
```

### Integration Tests

```typescript
Deno.test("server should handle middleware chain", async () => {
  const server = createServer({ port: 8001 });

  let middlewareCalled = false;
  server.use(async (ctx, next) => {
    middlewareCalled = true;
    return await next();
  });

  server.get("/", () => new Response("OK"));

  // Start server, make request, verify middleware ran
  // ...
});
```

### What to Test

- ✅ Happy path scenarios
- ✅ Error cases
- ✅ Edge cases (empty strings, null, undefined)
- ✅ Async behavior
- ✅ Middleware composition
- ✅ Security protections

## 📝 Documentation Guidelines

### JSDoc Format

```typescript
/**
 * Brief one-line description
 *
 * Longer description with details about behavior,
 * edge cases, and important notes.
 *
 * @param paramName - Description of parameter
 * @param optionalParam - Description (optional)
 * @returns Description of return value
 * @throws {ErrorType} When this error occurs
 *
 * @example
 * ```typescript
 * const result = myFunction("input");
 * console.log(result); // "output"
 * ```
 */
```

### README Updates

When adding new features:
1. Update `mod.ts` exports
2. Add entry to `MIDDLEWARE_INTEGRATION.md`
3. Update `INTEGRATION_SUMMARY.md`
4. Add example to `example-usage.ts` (when it works)

## 🐛 Bug Fix Process

1. **Reproduce the bug:**
   - Create minimal test case
   - Document steps to reproduce
   - Note expected vs actual behavior

2. **Write a failing test:**
   ```typescript
   Deno.test("bug #123: should not crash on empty body", async () => {
     const response = await handleRequest(new Request("http://localhost/"));
     assertEquals(response.status, 200);
   });
   ```

3. **Fix the bug:**
   - Make the test pass
   - Don't introduce new issues
   - Keep changes minimal

4. **Verify the fix:**
   - All tests pass
   - No regressions
   - Manual testing if needed

## ✨ Feature Addition Process

1. **Discuss first:**
   - Is this feature needed?
   - Does it fit the project goals?
   - Are there alternative approaches?

2. **Design the API:**
   - Simple and intuitive
   - Consistent with existing patterns
   - TypeScript-friendly

3. **Implement incrementally:**
   - Start with core functionality
   - Add tests as you go
   - Refactor when needed

4. **Document thoroughly:**
   - JSDoc comments
   - Usage examples
   - Update guides

## 🚫 What to Avoid

### Don't:
- ❌ Add external dependencies without discussion
- ❌ Use `any` type
- ❌ Commit commented-out code
- ❌ Break existing APIs without migration path
- ❌ Ignore TypeScript errors
- ❌ Skip tests for new features
- ❌ Copy large code blocks from other projects

### Do:
- ✅ Use Deno standard library when possible
- ✅ Write types for everything
- ✅ Delete unused code
- ✅ Provide deprecation warnings for breaking changes
- ✅ Fix all TypeScript errors
- ✅ Add tests for bug fixes and features
- ✅ Write original code or properly attribute sources

## 🔍 Code Review Checklist

Before submitting:

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] New tests added for new functionality
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] No console.log() calls (use proper logging)
- [ ] Error handling is present
- [ ] Edge cases are handled

## 📊 Performance Considerations

When making changes:

1. **Measure before optimizing:**
   ```typescript
   const start = performance.now();
   // ... code to measure
   const duration = performance.now() - start;
   console.log(`Operation took ${duration}ms`);
   ```

2. **Avoid premature optimization:**
   - Readability first
   - Optimize hot paths only
   - Profile to find bottlenecks

3. **Common performance issues:**
   - Unnecessary async/await
   - Large object creation in loops
   - Blocking operations
   - Memory leaks (unclosed connections)

## 🎓 Learning Resources

### Deno
- [Deno Manual](https://deno.land/manual)
- [Deno Standard Library](https://deno.land/std)
- [Deno Deploy Docs](https://deno.com/deploy/docs)

### HTTP Concepts
- [MDN HTTP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP)
- [HTTP/1.1 Specification](https://tools.ietf.org/html/rfc2616)
- [REST API Best Practices](https://restfulapi.net/)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

## 🤝 Getting Help

- **General questions:** Open a discussion
- **Bug reports:** Create an issue with reproduction steps
- **Feature requests:** Open an issue describing the use case
- **Security issues:** Report privately (see SECURITY.md if available)

## 📜 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## 🙏 Thank You!

Every contribution helps make this project better. Whether it's:
- Reporting a bug
- Fixing a typo
- Adding a feature
- Improving documentation
- Helping others

**Your efforts are appreciated!**

---

## Quick Reference: Key Files to Modify

| Task | Files to Update |
|------|-----------------|
| Add middleware | `middleware.ts`, `mod.ts`, `example-usage.ts` |
| Fix router | `router.ts`, tests |
| Add validator | `validator.ts`, tests |
| Fix error handling | `errorHandler.ts` |
| Add response helper | `response.ts`, `mod.ts` |
| Security fix | `security.ts` |
| Performance improvement | `performanceMonitor.ts` |

---

*Happy coding! 🚀*
