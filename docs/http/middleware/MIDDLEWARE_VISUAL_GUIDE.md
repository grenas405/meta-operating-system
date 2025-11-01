# Middleware System - Visual Architecture Guide

> **Update (2025-11):** The diagrams referencing Oak adapters capture the previous compatibility layer. The active codebase now uses native Request/Response context helpers without Oak mocks.

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DenoGenesis HTTP Framework                       │
│                     (Zero External Dependencies)                    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
              ┌─────▼────────┐    ┌──────▼──────────┐
              │  Server.ts   │    │   Router.ts    │
              │ (HTTP Server)│    │ (Route Matching)│
              └──────┬───────┘    └────────┬────────┘
                     │                     │
              ┌──────▼──────────────────────▼──────┐
              │    middleware.ts (Orchestration)   │
              │  - Context management             │
              │  - Middleware composition          │
              │  - Oak adapters                    │
              └──────┬──────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
    ┌───▼─────┐  ┌──▼────┐  ┌────▼──────┐
    │ Built-in│  │ Oak-   │  │Supporting │
    │ Simple  │  │ Style  │  │Components │
    │ Mware   │  │ Mware  │  │           │
    └─────────┘  └────────┘  └───────────┘
        │            │           │
    ┌───▼──────┐ ┌───▼────────┐ ┌─▼─────────┐
    │- logger()│ │- security()│ │- parsers  │
    │- cors()  │ │- logging() │ │- validator│
    │- timing()│ │- healthChk │ │- staticFS │
    │- reqId() │ │- errorHndl │ │- response │
    └──────────┘ └────────────┘ └───────────┘
```

## Middleware Execution Flow

```
       REQUEST ARRIVES
            │
            ▼
    ┌───────────────────┐
    │ Security Mware    │◄─── Header injection, path validation
    │ (Lines 344-409)   │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ RequestID Mware   │◄─── UUID generation, context setup
    │ (Lines 196-212)   │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Logging Mware     │◄─── Log request details, sanitize headers
    │ (Lines 284-337)   │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Performance Mware │◄─── Start timing, setup metrics
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Timing Mware      │◄─── Calculate duration
    │ (Lines 176-191)   │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ HealthCheck Mware │◄─── Check health endpoint, run checks
    │ (Lines 220-277)   │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ CORS Mware        │◄─── Add CORS headers, handle preflight
    │ (Lines 114-151)   │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Body Parsers      │◄─── Parse JSON, forms, multipart
    │ (parsers.ts)      │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Router            │◄─── Find matching route, extract params
    │ (router.ts)       │
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Route Handler     │◄─── Business logic, create response
    └────────┬──────────┘
             │
             ▼
    ┌───────────────────┐
    │ Error Handler     │◄─── Catch errors, classify, sanitize
    │ (Lines 159-171)   │
    └────────┬──────────┘
             │
             ▼
        RESPONSE SENT TO CLIENT
    (Middleware chain unwinds, each adds to response)
```

## Middleware Composition Mechanism

```
Input: Array of Middleware Functions
       ↓
    ┌────────────────────────────┐
    │ compose([mw1, mw2, ...])   │
    └────────────┬───────────────┘
                 │
                 ▼
    ┌────────────────────────────────────────┐
    │ Returns a single composed Handler       │
    │ that chains all middleware             │
    └────────────┬───────────────────────────┘
                 │
    When handler called:
                 │
                 ▼
    ┌────────────────────────────────────────┐
    │ dispatch(0) - Start with mw[0]         │
    │   mw[0](ctx, () => dispatch(1))        │
    │     mw[1](ctx, () => dispatch(2))      │
    │       mw[2](ctx, () => dispatch(3))    │
    │         ... final handler()            │
    └────────────┬───────────────────────────┘
                 │
    Response bubbles back:
                 │
                 ▼
    ┌────────────────────────────────────────┐
    │ mw[2] receives response from handler   │
    │ can modify, wrap, or pass through      │
    │   mw[1] receives response from mw[2]   │
    │   mw[0] receives response from mw[1]   │
    └────────────┬───────────────────────────┘
                 │
                 ▼
         FINAL RESPONSE SENT
```

## Oak Adapter Pattern

```
┌──────────────────────┐
│   OUR MIDDLEWARE     │
│  (This Framework)    │
│                      │
│ Signature:           │
│ (ctx, next) =>       │
│   Response           │
│                      │
│ Returns Response obj │
└──────────┬───────────┘
           │
           │ adapter bridges
           │
           ▼
┌──────────────────────┐
│   OAK MIDDLEWARE     │
│  (Oak Framework)     │
│                      │
│ Signature:           │
│ (ctx, next) =>       │
│   Promise<void>      │
│                      │
│ Sets ctx.response    │
└──────────────────────┘

HOW THE ADAPTER WORKS:
═══════════════════════

1. Our middleware calls Oak-style function
2. Adapter creates MOCK Oak context:
   {
     ...originalContext,
     response: {
       status: 200,
       body: null,
       headers: new Headers()
     }
   }

3. Calls Oak middleware with mock context:
   await oakMiddleware(mockCtx, next)

4. Oak middleware sets ctx.response.status/body

5. Adapter extracts modified values:
   status, body, headers = mockCtx.response.*

6. Converts to Response object:
   return new Response(body, { status, headers })

EXAMPLE - Security Middleware Adapter:
═════════════════════════════════════

Input:  Oak-style security middleware
        (expects ctx.response object)

Process:
  1. Create mock Oak context
  2. Call Oak middleware
  3. Middleware sets security headers on
     ctx.response.headers
  4. Extract headers from mock
  5. Merge with actual response headers
  6. Return modified Response

Result: Works with both styles seamlessly
```

## Component Dependency Map

```
┌─────────────────────────────────────────────────────┐
│  mod.ts (Main Export Hub)                           │
│  - Re-exports everything needed                     │
└─────┬──────────┬──────────────┬────────┬────────────┘
      │          │              │        │
      ▼          ▼              ▼        ▼
   server.ts   router.ts   middleware.ts ←──┐
     │            │             │            │
     │            ├─────────────┤            │
     │            │             │            │
     │            ▼             ▼            │
     │        Requires:    Uses imports    Uses
     │        Context,     from:           imports
     │        Handler,       │             from:
     │        Middleware  ┌──┴────────┐  errorHandler
     │        types       │           │  healthCheck
     │                    ▼           ▼  logging.ts
     │              ┌─────────────────────────┐
     │              │ Core Middleware Config  │
     │              │ (Error, Health, Log,    │
     │              │  Security, Perf Monitor)│
     │              └────────────┬────────────┘
     │                           │
     │ Uses URLPattern           │ Re-exports
     │ from Deno stdlib          │ + creates
     │                           │ adapters
     ▼                           ▼
  Deno.serve()     ┌───────────────────────────┐
                   │ createErrorMiddleware()   │
                   │ createHealthCheck()       │
                   │ createLoggingMiddleware() │
                   │ createSecurityMiddleware()│
                   └───────────────────────────┘

ADDITIONAL COMPONENTS:
─────────────────────
- parsers.ts (body parsing)
- validator.ts (validation)
- response.ts (response helpers)
- staticFiles.ts (static serving)
- performanceMonitor.ts (metrics)
- ConsoleStyler (utilities)

All are independent, can be used standalone
or composed together via middleware.ts
```

## Configuration Hierarchy

```
┌────────────────────────────────────┐
│   Environment Variables            │
│   DENO_ENV, ENV                    │
│   "development" | "production"     │
└────────────────────┬───────────────┘
                     │
        ┌────────────▼────────────┐
        │                         │
   ┌────▼──────┐         ┌───────▼───┐
   │Development│         │Production │
   │ Preset    │         │ Preset    │
   │ Config    │         │ Config    │
   └────┬──────┘         └───────┬───┘
        │                        │
   ┌────▼─────────────────────────▼─────┐
   │ Preset-based defaults merged        │
   │ (ErrorHandlerPresets, etc.)         │
   └────────┬──────────────────────┬─────┘
            │                      │
      ┌─────▼────┐          ┌─────▼─────┐
      │Middleware│          │Middleware │
      │ Instance │          │ Instance  │
      │ Created  │          │ Created   │
      └──────────┘          └───────────┘
            │                      │
      ┌─────▼──────────────────────▼─────┐
      │ Can Override with Custom Config  │
      │ server.use(errorHandler({...}))  │
      └─────────────────────────────────┘
```

## File Size Distribution

```
Code Distribution (14,082 total lines)

errorHandler.ts ██████████████ (2300+ lines)
healthCheck.ts  ██████████████ (2500+ lines)
security.ts     ███████████    (1800+ lines)
logging.ts      █████████      (1300+ lines)
performanceMonitor.ts ██████████ (1800+ lines)
staticFiles.ts  ████████       (1000+ lines)
parsers.ts      █████          (500+ lines)
validator.ts    █████          (500+ lines)
middleware.ts   ██             (410 lines)
server.ts       █              (238 lines)
router.ts       █              (194 lines)
response.ts     █              (100 lines)
example-usage.ts███████████████ (1500+ lines)
docs/comments    ░░░░░░░░░░░░░░░ (extensive)

Legend: █ = code, ░ = documentation
```

## Request Lifecycle Timeline

```
Time    │ Component          │ Action
────────┼──────────────────┼─────────────────────────────
  0ms   │ HTTP Server      │ Receive request from client
  1ms   │ Router.handle()  │ Match route, extract params
  2ms   │ Security Mware   │ Check headers, validate path
  3ms   │ RequestID Mware  │ Generate UUID, add to state
  4ms   │ Logging Mware    │ Start timing, log request
  5ms   │ Performance Mware│ Record request start
  6ms   │ Timing Mware     │ Start response timer
  7ms   │ HealthCheck Mware│ Skip (not /health endpoint)
  8ms   │ CORS Mware       │ Add CORS headers
  9ms   │ BodyParsers      │ Parse request body
 10ms   │ Route Handler    │ Business logic starts
        │                  │ (Application code runs here)
 50ms   │ Route Handler    │ Business logic completes
 51ms   │ Handler          │ Create Response object
 52ms   │ Timing Mware     │ Calculate duration (52ms)
 53ms   │ Timing Mware     │ Add X-Response-Time header
 54ms   │ Performance Mware│ Update metrics
 55ms   │ Logging Mware    │ Log response details
 56ms   │ RequestID Mware  │ Request context available
 57ms   │ Security Mware   │ Response passes through
 58ms   │ Error Handler    │ No errors, pass through
 59ms   │ HTTP Server      │ Send response to client
 60ms   │ Complete         │ Connection closed

Note: Most middleware just pass through when no action needed.
      Execution is fast (< 1ms overhead typical).
```

## Memory Management - Circular Buffers

```
ErrorHandler - Recent Errors Buffer:
═══════════════════════════════════
Max size: 100 errors

[error_1] [error_2] [error_3] ... [error_99] [error_100]
     ↑                                            ↑
     │                                            │
  oldest                                       newest
  
When 101st error arrives:
[error_2] [error_3] [error_4] ... [error_100] [error_101]
  ↑ overwrites oldest error_1

Fixed memory footprint - prevents unbounded growth


PerformanceMonitor - Request Log Buffer:
════════════════════════════════════════
Max size: configurable (default ~1000)

Request objects stored:
{
  timestamp: ms,
  method: GET,
  path: /api/users,
  duration: 45,
  status: 200
}

Circular buffer prevents memory leaks
Typical footprint: 5-10KB per component
```

## Security Layer - OWASP Coverage

```
Attack Type      │ Protection Mechanism          │ Header/Setting
─────────────────┼──────────────────────────────┼────────────────
XSS              │ Content Security Policy      │ CSP
                 │ XSS Protection Header        │ X-XSS-Protection
                 │ Input Sanitization           │ + validation

Clickjacking     │ Frame Options Header         │ X-Frame-Options
                 │ CORS Policy                  │ Access-Control-*

MIME Sniffing    │ Content-Type-Options         │ X-Content-Type-Options

MITM/Protocol    │ HSTS (Force HTTPS)           │ Strict-Transport-Security
Downgrade        │ Secure Cookies               │ Set-Cookie attributes

Path Traversal   │ Path Validation              │ ../ detection

Data Exposure    │ Referrer Policy              │ Referrer-Policy

Bot/Scanner      │ User-Agent Detection         │ IP blocking after 10 attempts

Feature Control  │ Permissions Policy           │ Permissions-Policy

Misconfiguration │ Defaults to secure settings  │ All headers by default
```

---

## Quick Architecture Summary

```
    HTTP Request
         │
         ▼
    ┌─────────────────────────────────────┐
    │ MIDDLEWARE COMPOSITION LAYER        │
    │ (middleware.ts - Orchestration)     │
    │                                     │
    │ Security → RequestID → Logging →    │
    │ Performance → Timing → HealthCheck →│
    │ CORS → BodyParsers → Router →       │
    │ Handler → ErrorHandler              │
    └─────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────┐
    │ CORE FRAMEWORK LAYER                │
    │                                     │
    │ - Server (Deno.serve)               │
    │ - Router (URLPattern matching)      │
    │ - Response helpers                  │
    │ - Validation & Parsing              │
    └─────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────┐
    │ ENTERPRISE FEATURES (Optional)      │
    │                                     │
    │ - Error Handler (advanced)          │
    │ - Health Check (Kubernetes)         │
    │ - Logging (file/structured)         │
    │ - Security (advanced headers)       │
    │ - Performance Monitor (metrics)     │
    └─────────────────────────────────────┘
         │
         ▼
    HTTP Response

Key Design:
- Zero dependencies on external frameworks
- Modular - use only what you need
- Composable - combine in any order
- Extensible - add custom middleware
- Type-safe - full TypeScript support
```
