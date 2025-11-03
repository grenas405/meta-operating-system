// middleware/staticFiles.ts → Advanced Static File System
// ================================================================================
// 📁 DenoGenesis Framework - Enterprise Static File Middleware
// Optimized caching, compression, security, and performance for static assets
// ================================================================================
//
// UNIX PHILOSOPHY IMPLEMENTATION:
// --------------------------------
// 1. DO ONE THING WELL:
//    - This module ONLY handles static file serving
//    - Does NOT handle routing, authentication, or business logic
//    - Single, focused responsibility: serve files efficiently and securely
//
// 2. COMPOSABILITY:
//    - Designed as middleware that integrates with Oak framework
//    - Can be combined with caching, compression, security
//    - Analytics can be used independently
//
// 3. TEXT-BASED:
//    - File paths are text
//    - MIME types are text
//    - HTTP headers are text
//
// 4. EXPLICIT:
//    - Clear file paths
//    - Explicit caching rules
//    - No magic behavior
//
// ARCHITECTURE:
// -------------
// Static File Flow:
//   1. Request arrives (GET /styles/app.css)
//   2. Security validation (path traversal, hidden files)
//   3. File resolution (find actual file)
//   4. Conditional request check (304 Not Modified?)
//   5. File reading
//   6. Compression (if enabled)
//   7. Response with headers
//
// STATIC FILES EXPLAINED (FOR NON-PROGRAMMERS):
// ----------------------------------------------
// WHAT ARE STATIC FILES?
// Files that don't change per request
//
// EXAMPLES:
// - HTML files (landing pages)
// - CSS stylesheets
// - JavaScript files
// - Images (PNG, JPG)
// - Fonts (WOFF, TTF)
// - Documents (PDF)
//
// DYNAMIC vs STATIC:
// Dynamic: Generated per request (user profile, search results)
// Static: Same for everyone (logo, stylesheet)
//
// WHY SPECIAL HANDLING?
// - Can be cached (don't re-download)
// - Can be compressed (smaller files)
// - Can use CDN (served from nearby server)
// - No computation needed
//
// CACHING EXPLAINED:
// ------------------
// THE PROBLEM:
// User visits your site → Downloads 2MB of assets
// User visits again → Downloads same 2MB again (waste!)
//
// THE SOLUTION:
// Browser cache:
// 1. First visit: Download and save to cache
// 2. Second visit: Use cached version (instant!)
//
// CACHE CONTROL:
// Server tells browser: "Cache this for 1 year"
// Browser: "OK, won't ask again for 1 year"
//
// CONDITIONAL REQUESTS:
// ---------------------
// SMARTER CACHING:
// Instead of "cache forever", use conditional requests
//
// HOW IT WORKS:
// 1. Server sends: ETag: "abc123" (file fingerprint)
// 2. Browser saves file with ETag
// 3. Next visit: "If-None-Match: abc123"
// 4. Server checks: File unchanged?
// 5. Server: "304 Not Modified" (no body sent!)
// 6. Browser uses cached version
//
// RESULT:
// - Tiny request (just headers)
// - No file transfer
// - Fast response
//
// COMPRESSION:
// ------------
// THE PROBLEM:
// Large JavaScript file: 500KB
// On slow connection: 10 seconds to download
//
// THE SOLUTION:
// Gzip compression:
// - Server compresses: 500KB → 100KB
// - Browser downloads: 100KB (2 seconds!)
// - Browser decompresses automatically
//
// COMPRESSION TYPES:
// - Gzip: Standard, widely supported
// - Brotli: Newer, better compression
// - None: Small files or images (already compressed)
//
// MIME TYPES:
// -----------
// WHAT ARE MIME TYPES?
// Tell browser what type of file
//
// EXAMPLES:
// - text/html: HTML document
// - text/css: Stylesheet
// - application/javascript: JavaScript
// - image/png: PNG image
// - font/woff2: Web font
//
// WHY IMPORTANT?
// - Browser treats files correctly
// - CSS applied as stylesheet
// - JavaScript executed
// - Images displayed
//
// SECURITY:
// ---------
// PATH TRAVERSAL ATTACK:
// Attacker tries: GET /../../../etc/passwd
// Goal: Access files outside web root
//
// PROTECTION:
// - Validate all paths
// - Block ../ patterns
// - Stay within root directory
//
// HIDDEN FILES:
// Files starting with . (dot)
// Examples: .env, .git, .htaccess
//
// PROTECTION:
// - Never serve hidden files
// - Contains secrets, configs
//
// FILE SIZE LIMITS:
// - Prevent serving huge files
// - Avoid memory exhaustion
// - Typical limit: 50MB
//
// PERFORMANCE:
// ------------
// OPTIMIZATION STRATEGIES:
// 1. Caching: Avoid repeated file reads
// 2. Compression: Reduce transfer size
// 3. ETags: Enable conditional requests
// 4. Parallel: Serve multiple files simultaneously
//
// ANALYTICS:
// - Track popular files
// - Monitor bandwidth usage
// - Optimize delivery
//
// CDN INTEGRATION:
// - Static files → CDN
// - CDN → Edge servers (worldwide)
// - User downloads from nearby server
// - Faster, cheaper
//
// USAGE:
// ------
// ```typescript
// import { StaticFileHandler, StaticFilePresets } from "./middleware/staticFiles.ts";
//
// const app = new Application();
//
// // Development setup
// app.use(StaticFileHandler.createMiddleware({
//   ...StaticFilePresets.DEVELOPMENT
// }));
//
// // Production setup
// app.use(StaticFileHandler.createMiddleware({
//   ...StaticFilePresets.PRODUCTION,
//   root: './public',
//   maxFileSize: 50 * 1024 * 1024  // 50MB
// }));
//
// // SPA (Single Page Application) setup
// app.use(StaticFileHandler.createMiddleware({
//   ...StaticFilePresets.SPA,
//   fallbackFile: 'index.html'  // For React, Vue, etc.
// }));
// ```
//
// RELATED DOCUMENTATION:
// ----------------------
// - Framework Philosophy: docs/02-framework/philosophy.md
// - HTTP Caching: https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
// - MIME Types: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
// - Compression: https://developer.mozilla.org/en-US/docs/Web/HTTP/Compression
//
// ================================================================================

import type { Context } from "../utils/context.ts";
import { commitResponse } from "../utils/context.ts";

// ================================================================================
// 📦 TYPE DEFINITIONS
// ================================================================================

/**
 * Static file configuration object
 * 
 * DESIGN PHILOSOPHY:
 * - Secure by default (no hidden files, path validation)
 * - Performance-focused (caching, compression)
 * - Flexible (development vs production modes)
 * - Production-ready (file size limits, analytics)
 * 
 * @interface StaticFileConfig
 */
export interface StaticFileConfig {
  /**
   * Root directory for static files
   * 
   * ROOT DIRECTORY EXPLAINED:
   * --------------------------
   * Base directory containing all static files
   * All requests resolved relative to this path
   * 
   * SECURITY:
   * Files outside root cannot be accessed
   * Provides isolation and security boundary
   * 
   * EXAMPLES:
   * - ./public (common for public assets)
   * - ./dist (for built SPA applications)
   * - ./static (alternative naming)
   * - /var/www/html (absolute path)
   * 
   * STRUCTURE EXAMPLE:
   * ./public/
   *   ├── index.html
   *   ├── css/
   *   │   └── style.css
   *   ├── js/
   *   │   └── app.js
   *   └── images/
   *       └── logo.png
   * 
   * @type {string}
   */
  root: string;
  
  /**
   * Enable HTTP caching
   * 
   * CACHING EXPLAINED:
   * ------------------
   * When true: Browser caches files (faster subsequent loads)
   * When false: Browser always downloads fresh (development)
   * 
   * CACHE-CONTROL HEADER:
   * Cache-Control: public, max-age=31536000, immutable
   * 
   * BREAKDOWN:
   * - public: Can be cached by anyone (browser, CDN, proxy)
   * - max-age=31536000: Cache for 1 year (in seconds)
   * - immutable: File never changes (optimal caching)
   * 
   * WHEN TO ENABLE:
   * - Production: Always (performance)
   * - Development: Never (see changes immediately)
   * - Testing: Depends on test scenario
   * 
   * @default false
   * @type {boolean}
   */
  enableCaching: boolean;
  
  /**
   * Cache duration in seconds
   * 
   * MAX-AGE VALUES:
   * ---------------
   * Common durations:
   * - 0: No caching (always fresh)
   * - 3600: 1 hour (HTML files)
   * - 86400: 1 day (frequently updated assets)
   * - 604800: 1 week (images)
   * - 2592000: 30 days (stable assets)
   * - 31536000: 1 year (immutable assets with hash)
   * 
   * FILE TYPE STRATEGY:
   * - HTML: Short (1 hour) - content updates
   * - CSS/JS with hash: Long (1 year) - immutable
   * - CSS/JS without hash: Medium (1 day) - may update
   * - Images: Long (30 days) - rarely change
   * - Fonts: Very long (1 year) - never change
   * 
   * CACHE BUSTING:
   * With long caching, use versioned filenames:
   * - app.js → app.v123.js
   * - style.css → style.abc456.css
   * Change filename to invalidate cache
   * 
   * @default 0
   * @type {number}
   */
  maxAge?: number;
  
  /**
   * Compression level (1-9)
   * 
   * COMPRESSION LEVELS:
   * -------------------
   * 1: Fastest, least compression
   * 5: Balanced (default)
   * 9: Slowest, best compression
   * 
   * TRADE-OFFS:
   * - Higher level: Better compression, more CPU
   * - Lower level: Faster, less CPU, larger files
   * 
   * RECOMMENDATIONS:
   * - Development: 1 (speed over size)
   * - Production: 6 (balanced)
   * - CDN: 9 (compress once, serve many)
   * 
   * @default 6
   * @type {number}
   */
  compressionLevel?: number;
  
  /**
   * Enable Gzip compression
   * 
   * GZIP EXPLAINED:
   * ---------------
   * Standard compression algorithm
   * 
   * HOW IT WORKS:
   * 1. Browser sends: Accept-Encoding: gzip
   * 2. Server compresses file
   * 3. Server sends: Content-Encoding: gzip
   * 4. Browser decompresses automatically
   * 
   * COMPRESSION RATIOS:
   * - Text files: 70-90% reduction (HTML, CSS, JS)
   * - JSON/XML: 80-95% reduction
   * - Images: Already compressed (skip)
   * - Videos: Already compressed (skip)
   * 
   * WHEN TO USE:
   * - Text-based files: Always
   * - Large files (>1KB): Always
   * - Small files (<1KB): Skip (overhead not worth it)
   * - Already compressed: Skip (PNG, JPG, MP4)
   * 
   * BROWSER SUPPORT:
   * - Universal (all modern browsers)
   * - Safe to always enable
   * 
   * @default true
   * @type {boolean}
   */
  enableGzip?: boolean;
  
  /**
   * Enable Brotli compression
   * 
   * BROTLI EXPLAINED:
   * -----------------
   * Newer compression algorithm
   * Better than Gzip (10-20% smaller)
   * 
   * HOW IT WORKS:
   * Same as Gzip but better algorithm
   * 
   * BROWSER SUPPORT:
   * - All modern browsers (2017+)
   * - Falls back to Gzip for older browsers
   * 
   * WHEN TO USE:
   * - Production: Yes (better compression)
   * - Development: No (slower, not worth it)
   * 
   * FALLBACK STRATEGY:
   * 1. Client: Accept-Encoding: br, gzip
   * 2. Server: Try Brotli first
   * 3. Server: Fall back to Gzip if needed
   * 4. Server: Uncompressed as last resort
   * 
   * @default false
   * @type {boolean}
   */
  enableBrotli?: boolean;
  
  /**
   * Enable ETag generation
   * 
   * ETAG EXPLAINED:
   * ---------------
   * ETag = Entity Tag = File fingerprint
   * 
   * HOW IT WORKS:
   * 1. Server generates ETag: "abc123"
   * 2. Server sends: ETag: "abc123"
   * 3. Browser caches file with ETag
   * 4. Next request: If-None-Match: "abc123"
   * 5. Server compares ETags
   * 6. Match? → 304 Not Modified (no body)
   * 7. Different? → 200 OK (send new file)
   * 
   * ETAG GENERATION:
   * - Weak: Based on file modification time
   * - Strong: Based on file content (hash)
   * 
   * EXAMPLE:
   * W/"1234567890" - Weak ETag (timestamp-based)
   * "abc123def456" - Strong ETag (content hash)
   * 
   * BENEFITS:
   * - Saves bandwidth (no file transfer)
   * - Faster (304 vs full download)
   * - Works with dynamic content
   * 
   * WHEN TO USE:
   * - Production: Always
   * - Development: Optional (helpful for debugging)
   * 
   * @default true
   * @type {boolean}
   */
  enableEtag?: boolean;
  
  /**
   * Index files to serve for directories
   * 
   * INDEX FILES EXPLAINED:
   * ----------------------
   * When requesting a directory, serve these files
   * 
   * EXAMPLES:
   * Request: GET /docs/
   * Tries:
   * 1. /docs/index.html (if exists, serve this)
   * 2. /docs/index.htm (if exists, serve this)
   * 3. Not found → 404
   * 
   * COMMON INDEX FILES:
   * - index.html (standard web)
   * - index.htm (alternative)
   * - default.html (some servers)
   * - home.html (custom)
   * 
   * ORDER MATTERS:
   * First match wins
   * 
   * SPA BEHAVIOR:
   * For SPAs, typically just ['index.html']
   * All routes serve the same index.html
   * 
   * @default ['index.html', 'index.htm']
   * @type {string[]}
   */
  indexFiles?: string[];
  
  /**
   * Fallback file for SPA (Single Page Applications)
   * 
   * SPA ROUTING EXPLAINED:
   * ----------------------
   * SPAs handle routing in JavaScript
   * All routes should serve the same HTML
   * 
   * EXAMPLE:
   * User navigates to: /users/profile
   * This path doesn't exist on server
   * Serve fallback: index.html
   * React/Vue router handles /users/profile
   * 
   * HOW IT WORKS:
   * 1. Request: GET /users/profile
   * 2. File not found
   * 3. Serve fallbackFile (index.html)
   * 4. SPA JavaScript takes over
   * 
   * WHEN TO USE:
   * - React apps: Yes
   * - Vue apps: Yes
   * - Angular apps: Yes
   * - Traditional sites: No
   * 
   * @type {string}
   */
  fallbackFile?: string;
  
  /**
   * Serve hidden files (files starting with .)
   * 
   * HIDDEN FILES EXPLAINED:
   * -----------------------
   * Files/directories starting with dot
   * 
   * EXAMPLES:
   * - .env (environment variables)
   * - .git (git repository)
   * - .htaccess (Apache config)
   * - .DS_Store (Mac metadata)
   * - .npmrc (npm config)
   * 
   * SECURITY WARNING:
   * Hidden files often contain:
   * - Passwords
   * - API keys
   * - Configuration
   * - Source code
   * 
   * RECOMMENDATIONS:
   * - Development: true (convenient)
   * - Production: FALSE (security!)
   * - Never: true in production
   * 
   * @default false
   * @type {boolean}
   */
  serveHidden?: boolean;
  
  /**
   * Maximum file size to serve (in bytes)
   * 
   * FILE SIZE LIMITS:
   * -----------------
   * Prevent serving huge files
   * 
   * WHY LIMIT?
   * - Memory exhaustion
   * - Slow response times
   * - Bandwidth abuse
   * - DoS attacks
   * 
   * COMMON LIMITS:
   * - 10MB: Conservative
   * - 50MB: Balanced
   * - 100MB: Generous
   * - Unlimited: Dangerous
   * 
   * SIZE CALCULATIONS:
   * - 1 KB = 1,024 bytes
   * - 1 MB = 1,024 KB = 1,048,576 bytes
   * - 10 MB = 10 * 1024 * 1024 = 10,485,760 bytes
   * 
   * EXAMPLES:
   * - Small image: 50 KB
   * - Large image: 2 MB
   * - PDF document: 5 MB
   * - Video file: 100 MB (too large!)
   * 
   * @default 50MB
   * @type {number}
   */
  maxFileSize?: number;
}

/**
 * Cache configuration per file type
 * 
 * @interface CacheConfig
 */
interface CacheConfig {
  /**
   * Cache duration in seconds
   * @type {number}
   */
  maxAge: number;
  
  /**
   * Public caching (CDN, proxies can cache)
   * 
   * PUBLIC vs PRIVATE:
   * - public: Anyone can cache (CDN, proxy, browser)
   * - private: Only browser can cache
   * 
   * USE CASES:
   * - public: Static assets (CSS, JS, images)
   * - private: User-specific content (profile page)
   * 
   * @type {boolean}
   */
  public: boolean;
  
  /**
   * Immutable flag (file never changes)
   * 
   * IMMUTABLE EXPLAINED:
   * --------------------
   * Tells browser: "This file will NEVER change"
   * 
   * BROWSER BEHAVIOR:
   * - Won't revalidate (no conditional requests)
   * - Uses cache until expired
   * - Maximum performance
   * 
   * WHEN TO USE:
   * - Versioned assets: app.v123.js ✓
   * - Hashed assets: style.abc456.css ✓
   * - Regular assets: style.css ✗ (might update)
   * 
   * HEADER:
   * Cache-Control: public, max-age=31536000, immutable
   * 
   * @type {boolean}
   */
  immutable?: boolean;
}

// ================================================================================
// 🎯 STATIC FILE HANDLER CLASS
// ================================================================================

/**
 * Static file handler implementation
 * 
 * RESPONSIBILITY:
 * - Serve static files securely
 * - Implement caching strategies
 * - Handle compression
 * - Validate requests
 * - Track analytics
 * 
 * DESIGN PRINCIPLES:
 * - Security first (path validation, size limits)
 * - Performance focused (caching, compression)
 * - Standards compliant (HTTP specs)
 * - Production ready (error handling, monitoring)
 * 
 * @class StaticFileHandler
 * @static
 * 
 * @example
 * ```typescript
 * const middleware = StaticFileHandler.createMiddleware({
 *   root: './public',
 *   enableCaching: true,
 *   enableGzip: true,
 *   maxAge: 31536000
 * });
 * 
 * app.use(middleware);
 * ```
 */
export class StaticFileHandler {
  // ===========================================================================
  // ALLOWED FILE EXTENSIONS
  // ===========================================================================
  
  /**
   * Allowed file extensions for security
   * 
   * SECURITY BY WHITELIST:
   * Only serve known, safe file types
   * 
   * CATEGORIES:
   * - Web: HTML, CSS, JS, JSON
   * - Images: PNG, JPG, GIF, SVG
   * - Fonts: WOFF, TTF, OTF
   * - Documents: PDF, Office files
   * - Media: Audio, Video
   * - Archives: ZIP, TAR (be careful)
   * - Development: Source maps, TypeScript
   * 
   * WHY WHITELIST?
   * - Block executable files (.exe, .sh)
   * - Block server scripts (.php, .cgi)
   * - Block sensitive files (.env, .config)
   * 
   * @private
   * @static
   * @type {Set<string>}
   */
  private static readonly ALLOWED_EXTENSIONS = new Set([
    // -------------------------------------------------------------------------
    // WEB ASSETS
    // -------------------------------------------------------------------------
    '.html',    // HTML documents
    '.htm',     // HTML alternative
    '.css',     // Stylesheets
    '.js',      // JavaScript
    '.mjs',     // ES6 modules
    '.json',    // JSON data
    '.xml',     // XML documents
    '.txt',     // Text files
    '.md',      // Markdown
    
    // -------------------------------------------------------------------------
    // IMAGES
    // -------------------------------------------------------------------------
    '.png',     // PNG images
    '.jpg',     // JPEG images
    '.jpeg',    // JPEG alternative
    '.gif',     // GIF images
    '.webp',    // WebP images (modern format)
    '.svg',     // SVG vectors
    '.ico',     // Favicons
    '.bmp',     // Bitmap images
    '.tiff',    // TIFF images
    
    // -------------------------------------------------------------------------
    // FONTS
    // -------------------------------------------------------------------------
    '.ttf',     // TrueType fonts
    '.otf',     // OpenType fonts
    '.woff',    // Web Open Font Format
    '.woff2',   // WOFF2 (better compression)
    '.eot',     // Embedded OpenType (IE)
    
    // -------------------------------------------------------------------------
    // DOCUMENTS
    // -------------------------------------------------------------------------
    '.pdf',     // PDF documents
    '.doc',     // Word (old)
    '.docx',    // Word (new)
    '.xls',     // Excel (old)
    '.xlsx',    // Excel (new)
    '.ppt',     // PowerPoint (old)
    '.pptx',    // PowerPoint (new)
    
    // -------------------------------------------------------------------------
    // MEDIA
    // -------------------------------------------------------------------------
    '.mp3',     // Audio (MP3)
    '.mp4',     // Video (MP4)
    '.wav',     // Audio (WAV)
    '.ogg',     // Audio/Video (OGG)
    '.webm',    // Video (WebM)
    '.avi',     // Video (AVI)
    '.mov',     // Video (QuickTime)
    
    // -------------------------------------------------------------------------
    // ARCHIVES (USE WITH CAUTION)
    // -------------------------------------------------------------------------
    '.zip',     // ZIP archives
    '.tar',     // TAR archives
    '.gz',      // Gzip archives
    
    // -------------------------------------------------------------------------
    // DEVELOPMENT (DEVELOPMENT ONLY)
    // -------------------------------------------------------------------------
    '.map',     // Source maps
    '.ts'       // TypeScript (for dev servers)
  ]);

  // ===========================================================================
  // CACHE CONFIGURATION BY FILE TYPE
  // ===========================================================================
  
  /**
   * Cache headers per file extension
   * 
   * CACHING STRATEGY:
   * Different file types have different caching needs
   * 
   * IMMUTABLE ASSETS (1 year):
   * - CSS/JS with versioning
   * - Fonts (never change)
   * 
   * LONG CACHE (30 days):
   * - Images
   * - Media files
   * 
   * SHORT CACHE (1 hour):
   * - HTML (content updates)
   * - JSON data
   * 
   * NO CACHE:
   * - Source maps (development)
   * - Dynamic content
   * 
   * @private
   * @static
   * @type {Map<string, CacheConfig>}
   */
  private static readonly CACHE_HEADERS = new Map<string, CacheConfig>([
    // -------------------------------------------------------------------------
    // LONG-TERM CACHING (1 YEAR) - IMMUTABLE ASSETS
    // -------------------------------------------------------------------------
    ['.css', { maxAge: 31536000, public: true, immutable: true }],
    ['.js', { maxAge: 31536000, public: true, immutable: true }],
    ['.mjs', { maxAge: 31536000, public: true, immutable: true }],
    
    // -------------------------------------------------------------------------
    // MEDIUM-TERM CACHING (30 DAYS) - IMAGES
    // -------------------------------------------------------------------------
    ['.png', { maxAge: 2592000, public: true }],
    ['.jpg', { maxAge: 2592000, public: true }],
    ['.jpeg', { maxAge: 2592000, public: true }],
    ['.gif', { maxAge: 2592000, public: true }],
    ['.webp', { maxAge: 2592000, public: true }],
    ['.svg', { maxAge: 2592000, public: true }],
    
    // -------------------------------------------------------------------------
    // LONG-TERM CACHING (1 YEAR) - FONTS
    // -------------------------------------------------------------------------
    ['.ttf', { maxAge: 31536000, public: true, immutable: true }],
    ['.otf', { maxAge: 31536000, public: true, immutable: true }],
    ['.woff', { maxAge: 31536000, public: true, immutable: true }],
    ['.woff2', { maxAge: 31536000, public: true, immutable: true }],
    ['.eot', { maxAge: 31536000, public: true, immutable: true }],
    
    // -------------------------------------------------------------------------
    // SHORT-TERM CACHING (1 HOUR) - HTML & DATA
    // -------------------------------------------------------------------------
    ['.html', { maxAge: 3600, public: true }],
    ['.htm', { maxAge: 3600, public: true }],
    ['.json', { maxAge: 3600, public: true }],
    ['.xml', { maxAge: 3600, public: true }],
    ['.txt', { maxAge: 3600, public: true }],
    ['.md', { maxAge: 3600, public: true }],
    
    // -------------------------------------------------------------------------
    // MEDIUM-TERM (1 WEEK) - ICONS & MISC
    // -------------------------------------------------------------------------
    ['.ico', { maxAge: 604800, public: true }],
    
    // -------------------------------------------------------------------------
    // NO CACHING - SOURCE MAPS (DEVELOPMENT)
    // -------------------------------------------------------------------------
    ['.map', { maxAge: 0, public: false }]
  ]);

  // ===========================================================================
  // COMPRESSIBLE FILE TYPES
  // ===========================================================================
  
  /**
   * File types that benefit from compression
   * 
   * TEXT-BASED FILES:
   * Compress very well (70-90% reduction)
   * 
   * BINARY FILES:
   * Already compressed, skip compression
   * - Images: PNG, JPG (already compressed)
   * - Videos: MP4, WebM (already compressed)
   * - Archives: ZIP (already compressed)
   * 
   * COMPRESSION WORTH IT:
   * - HTML: 5KB → 1KB (80% reduction)
   * - CSS: 50KB → 10KB (80% reduction)
   * - JS: 200KB → 50KB (75% reduction)
   * - JSON: 10KB → 2KB (80% reduction)
   * 
   * COMPRESSION NOT WORTH IT:
   * - PNG: 100KB → 99KB (1% reduction)
   * - JPG: 200KB → 198KB (1% reduction)
   * - MP4: 10MB → 10MB (0% reduction)
   * 
   * @private
   * @static
   * @type {Set<string>}
   */
  private static readonly COMPRESSIBLE_TYPES = new Set([
    '.html',
    '.htm',
    '.css',
    '.js',
    '.mjs',
    '.json',
    '.xml',
    '.txt',
    '.md',
    '.svg'  // SVG is XML-based, compresses well
  ]);

  // ===========================================================================
  // MIME TYPES
  // ===========================================================================
  
  /**
   * MIME type mappings
   * 
   * MIME TYPE FORMAT:
   * type/subtype
   * 
   * COMMON TYPES:
   * - text: Text-based content
   * - application: Binary or structured data
   * - image: Image files
   * - video: Video files
   * - audio: Audio files
   * - font: Font files
   * 
   * @private
   * @static
   * @type {Record<string, string>}
   */
  private static readonly MIME_TYPES: Record<string, string> = {
    // Text
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    
    // Images
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    
    // Fonts
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.eot': 'application/vnd.ms-fontobject',
    
    // Documents
    '.pdf': 'application/pdf',
    
    // Media
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.webm': 'video/webm',
    
    // Archives
    '.zip': 'application/zip',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    
    // Development
    '.map': 'application/json'
  };

  /**
   * Create static file middleware
   * 
   * MIDDLEWARE FLOW:
   * 1. Extract file path from URL
   * 2. Validate extension (whitelist)
   * 3. Check for hidden files
   * 4. Validate path (no traversal)
   * 5. Resolve file path
   * 6. Check file size
   * 7. Handle conditional requests
   * 8. Serve file with headers
   * 
   * @public
   * @static
   * @param {StaticFileConfig} config - Configuration
   * @returns {Function} Oak middleware function
   */
  static createMiddleware(config: StaticFileConfig) {
    return async (ctx: Context, next: () => Promise<Response>) => {
      const filePath = ctx.url.pathname;
      const extension = this.getFileExtension(filePath);

      // =======================================================================
      // PHASE 1: SECURITY VALIDATION
      // =======================================================================
      
      /**
       * EXTENSION VALIDATION:
       * Only serve whitelisted file types
       * 
       * WHY?
       * - Block executable files
       * - Block server scripts
       * - Block config files
       */
      if (!this.ALLOWED_EXTENSIONS.has(extension)) {
        await next();  // Not a static file, pass to next middleware
        return;
      }
      
      /**
       * HIDDEN FILE CHECK:
       * Block hidden files unless explicitly allowed
       * 
       * HIDDEN FILES:
       * - .env (secrets)
       * - .git (source control)
       * - .htaccess (config)
       */
      if (!config.serveHidden && this.isHiddenFile(filePath)) {
        await next();
        return;
      }
      
      /**
       * PATH TRAVERSAL CHECK:
       * Block directory traversal attempts
       * 
       * ATTACK EXAMPLES:
       * - /../../etc/passwd
       * - /static/../../../secrets.txt
       * 
       * PROTECTION:
       * Check for ../ patterns
      */
      if (this.hasDirectoryTraversal(filePath)) {
        console.warn(`🚨 Directory traversal attempt blocked: ${filePath}`);
        commitResponse(ctx, { status: 403, body: "Forbidden" });
        return;
      }

      try {
        // =====================================================================
        // PHASE 2: FILE RESOLUTION
        // =====================================================================
        
        /**
         * FILE RESOLUTION:
         * Find actual file on disk
         * 
         * STEPS:
         * 1. Join root + path
         * 2. Check if directory
         * 3. If directory, try index files
         * 4. If not found, try fallback (SPA)
         */
        const resolvedPath = await this.resolveFilePath(
          config.root,
          filePath,
          config.indexFiles
        );
        
        if (!resolvedPath) {
          // File not found, check for SPA fallback
          if (config.fallbackFile) {
            const fallbackPath = await this.resolveFallbackFile(
              config.root,
              config.fallbackFile
            );
            if (fallbackPath) {
              await this.serveFile(ctx, fallbackPath, config);
              return;
            }
          }
          await next();
          return;
        }

        // =====================================================================
        // PHASE 3: FILE VALIDATION
        // =====================================================================
        
        /**
         * GET FILE STATS:
         * - Size
         * - Modification time
         * - Permissions
         */
        const stats = await this.getFileStats(resolvedPath);
        if (!stats) {
          await next();
          return;
        }

        /**
         * FILE SIZE VALIDATION:
         * Prevent serving huge files
         * 
         * WHY?
         * - Memory exhaustion
         * - Slow response
         * - Bandwidth abuse
         */
        if (config.maxFileSize && stats.size > config.maxFileSize) {
          console.warn(`📏 File too large: ${filePath} (${stats.size} bytes)`);
          commitResponse(ctx, { status: 413, body: "File too large" });
          return;
        }

        // =====================================================================
        // PHASE 4: CONDITIONAL REQUESTS
        // =====================================================================
        
        /**
         * CONDITIONAL REQUEST HANDLING:
         * Check if client has fresh cached version
         * 
         * IF FRESH:
         * - Send 304 Not Modified
         * - No body sent (save bandwidth)
         * - Client uses cache
         * 
         * IF STALE:
         * - Send full file
         */
        if (await this.handleConditionalRequest(ctx, stats, resolvedPath, config)) {
          return;  // 304 sent, done
        }

        // =====================================================================
        // PHASE 5: SERVE FILE
        // =====================================================================
        
      await this.serveFile(ctx, resolvedPath, config, stats);

    } catch (error) {
      console.error(`❌ Static file error for ${filePath}:`, error);
      commitResponse(ctx, { status: 500, body: "Internal Server Error" });
    }
  };
}

  /**
   * Serve file with headers and optimization
   * 
   * SERVING PROCESS:
   * 1. Set MIME type
   * 2. Set cache headers
   * 3. Set ETag
   * 4. Set Last-Modified
   * 5. Set security headers
   * 6. Read file
   * 7. Compress (if needed)
   * 8. Send response
   * 9. Track analytics
   * 
   * @private
   * @static
   * @param {Context} ctx - Oak context
   * @param {string} filePath - File path on disk
   * @param {StaticFileConfig} config - Configuration
   * @param {Deno.FileInfo} stats - File stats
   * @returns {Promise<void>}
   */
  private static async serveFile(
    ctx: Context,
    filePath: string,
    config: StaticFileConfig,
    stats?: Deno.FileInfo
  ) {
    const extension = this.getFileExtension(filePath);
    
    // =========================================================================
    // SET MIME TYPE
    // =========================================================================
    
    /**
     * MIME TYPE:
     * Tells browser how to handle file
     * 
     * EXAMPLES:
     * - text/html → Render as HTML
     * - text/css → Apply as stylesheet
     * - image/png → Display as image
     */
    const mimeType = this.MIME_TYPES[extension] || 'application/octet-stream';
    ctx.response.headers.set('Content-Type', mimeType);

    // =========================================================================
    // SET CACHE HEADERS
    // =========================================================================
    
    /**
     * CACHE-CONTROL HEADER:
     * Tells browser how long to cache
     * 
     * FORMAT:
     * Cache-Control: public, max-age=31536000, immutable
     */
    this.setCacheHeaders(ctx, extension, config);

    // =========================================================================
    // SET ETAG
    // =========================================================================
    
    /**
     * ETAG:
     * File fingerprint for conditional requests
     * 
     * GENERATION:
     * Based on file size + modification time
     */
    if (config.enableEtag !== false && stats) {
      const etag = await this.generateETag(stats, filePath);
      ctx.response.headers.set('ETag', etag);
    }

    // =========================================================================
    // SET LAST-MODIFIED
    // =========================================================================
    
    /**
     * LAST-MODIFIED:
     * When file was last changed
     * 
     * FORMAT:
     * Last-Modified: Wed, 21 Oct 2015 07:28:00 GMT
     * 
     * USE:
     * For If-Modified-Since conditional requests
     */
    if (stats && stats.mtime) {
      ctx.response.headers.set('Last-Modified', stats.mtime.toUTCString());
    }

    // =========================================================================
    // SET COMPRESSION HEADERS
    // =========================================================================
    
    /**
     * COMPRESSION:
     * If file is compressible and compression enabled
     */
    if (this.shouldCompress(extension, config)) {
      this.setCompressionHeaders(ctx, config);
    }

    // =========================================================================
    // SET SECURITY HEADERS
    // =========================================================================
    
    /**
     * SECURITY HEADERS:
     * Additional protection based on file type
     * 
     * EXAMPLES:
     * - X-Content-Type-Options: nosniff
     * - Content-Security-Policy (for HTML)
     */
    this.setSecurityHeaders(ctx, extension);

    // =========================================================================
    // READ FILE
    // =========================================================================
    
    /**
     * READ FILE FROM DISK:
     * Load entire file into memory
     * 
     * ALTERNATIVE:
     * Streaming for very large files
     */
    const fileContent = await Deno.readFile(filePath);
    
    // =========================================================================
    // COMPRESS
    // =========================================================================
    
    /**
     * COMPRESSION:
     * Apply gzip or brotli if enabled
     * 
     * AUTOMATIC:
     * Browser decompresses automatically
     */
    const compressedContent = await this.compressContent(fileContent, ctx, config);
    
    // =========================================================================
    // SEND RESPONSE
    // =========================================================================
    
    commitResponse(ctx, { status: 200, body: compressedContent });

    // =========================================================================
    // ANALYTICS
    // =========================================================================
    
    /**
     * TRACK REQUEST:
     * Record for analytics
     * - File path
     * - Bytes transferred
     * - Request count
     */
    StaticFileAnalytics.recordRequest(filePath, fileContent.length);
  }

  /**
   * Handle conditional requests (304 Not Modified)
   * 
   * CONDITIONAL REQUEST EXPLAINED:
   * ------------------------------
   * Client asks: "Has file changed since I cached it?"
   * 
   * TWO METHODS:
   * 1. If-None-Match (ETag-based)
   * 2. If-Modified-Since (time-based)
   * 
   * FLOW:
   * 1. Client sends: If-None-Match: "abc123"
   * 2. Server checks current ETag
   * 3. Match? → 304 Not Modified (no body)
   * 4. Different? → Continue (send full file)
   * 
   * BENEFITS:
   * - Saves bandwidth (no file transfer)
   * - Faster response
   * - Reduces server load
   * 
   * @private
   * @static
   * @param {Context} ctx - Oak context
   * @param {Deno.FileInfo} stats - File stats
   * @param {string} filePath - File path
   * @param {StaticFileConfig} config - Configuration
   * @returns {Promise<boolean>} True if 304 sent
   */
  private static async handleConditionalRequest(
    ctx: Context,
    stats: Deno.FileInfo,
    filePath: string,
    config: StaticFileConfig
  ): Promise<boolean> {
    // =========================================================================
    // CHECK IF-NONE-MATCH (ETAG)
    // =========================================================================
    
    /**
     * ETAG VALIDATION:
     * Most reliable method
     * 
     * PROCESS:
     * 1. Get If-None-Match header
     * 2. Generate current ETag
     * 3. Compare
     * 4. If match → 304
     */
    if (config.enableEtag !== false) {
      const ifNoneMatch = ctx.request.headers.get('If-None-Match');
      if (ifNoneMatch) {
        const currentEtag = await this.generateETag(stats, filePath);
        if (ifNoneMatch === currentEtag) {
          // File hasn't changed
          commitResponse(ctx, { status: 304, body: null });
          return true;
        }
      }
    }

    // =========================================================================
    // CHECK IF-MODIFIED-SINCE (TIME-BASED)
    // =========================================================================
    
    /**
     * TIME-BASED VALIDATION:
     * Fallback method
     * 
     * PROCESS:
     * 1. Get If-Modified-Since header
     * 2. Compare with file mtime
     * 3. If not modified → 304
     */
    const ifModifiedSince = ctx.request.headers.get('If-Modified-Since');
    if (ifModifiedSince && stats.mtime) {
      const modifiedSince = new Date(ifModifiedSince);
      const fileTime = stats.mtime;
      
      // Remove milliseconds for comparison
      modifiedSince.setMilliseconds(0);
      fileTime.setMilliseconds(0);
      
      if (fileTime <= modifiedSince) {
        // File not modified since cached
        commitResponse(ctx, { status: 304, body: null });
        return true;
      }
    }

    // File has changed or no conditional headers
    return false;
  }

  /**
   * Set cache headers based on file type
   * 
   * @private
   * @static
   */
  private static setCacheHeaders(
    ctx: Context,
    extension: string,
    config: StaticFileConfig
  ) {
    if (!config.enableCaching) {
      // No caching
      ctx.response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      ctx.response.headers.set('Pragma', 'no-cache');
      ctx.response.headers.set('Expires', '0');
      return;
    }

    // Get cache config for this file type
    const cacheConfig = this.CACHE_HEADERS.get(extension) || {
      maxAge: config.maxAge || 3600,
      public: true
    };

    // Build Cache-Control header
    const parts = [];
    parts.push(cacheConfig.public ? 'public' : 'private');
    parts.push(`max-age=${cacheConfig.maxAge}`);
    if (cacheConfig.immutable) {
      parts.push('immutable');
    }

    ctx.response.headers.set('Cache-Control', parts.join(', '));
  }

  /**
   * Generate ETag for file
   * 
   * ETAG GENERATION:
   * ----------------
   * Weak ETag based on:
   * - File size
   * - Modification time
   * 
   * FORMAT:
   * W/"size-timestamp"
   * 
   * EXAMPLE:
   * W/"1024-1634567890000"
   * 
   * WEAK vs STRONG:
   * - Weak: Based on metadata (fast)
   * - Strong: Based on content hash (slow but accurate)
   * 
   * @private
   * @static
   * @param {Deno.FileInfo} stats - File stats
   * @param {string} filePath - File path
   * @returns {Promise<string>} ETag value
   */
  private static async generateETag(stats: Deno.FileInfo, filePath: string): Promise<string> {
    // Use weak ETag (metadata-based)
    const size = stats.size;
    const mtime = stats.mtime?.getTime() || 0;
    return `W/"${size}-${mtime}"`;
  }

  /**
   * Compress content if applicable
   * 
   * COMPRESSION DECISION:
   * 1. Check if browser accepts compression
   * 2. Check if file type is compressible
   * 3. Check if compression enabled
   * 4. Apply compression
   * 
   * COMPRESSION PRIORITY:
   * 1. Brotli (best compression)
   * 2. Gzip (fallback)
   * 3. None (no compression)
   * 
   * @private
   * @static
   * @param {Uint8Array} content - File content
   * @param {Context} ctx - Oak context
   * @param {StaticFileConfig} config - Configuration
   * @returns {Promise<Uint8Array>} Compressed or original content
   */
  private static async compressContent(
    content: Uint8Array,
    ctx: Context,
    config: StaticFileConfig
  ): Promise<Uint8Array> {
    const acceptEncoding = ctx.request.headers.get('Accept-Encoding') || '';
    
    // Check for Brotli support
    if (config.enableBrotli && acceptEncoding.includes('br')) {
      // Brotli compression (would need compression library)
      // ctx.response.headers.set('Content-Encoding', 'br');
      // return await compressBrotli(content);
    }
    
    // Check for Gzip support
    if (config.enableGzip !== false && acceptEncoding.includes('gzip')) {
      // Gzip compression (would need compression library)
      // ctx.response.headers.set('Content-Encoding', 'gzip');
      // return await compressGzip(content);
    }
    
    // No compression
    return content;
  }

  /**
   * Set compression-related headers
   * 
   * @private
   * @static
   */
  private static setCompressionHeaders(ctx: Context, config: StaticFileConfig) {
    // Vary header for caching with compression
    ctx.response.headers.set('Vary', 'Accept-Encoding');
  }

  /**
   * Set security headers based on file type
   * 
   * SECURITY HEADERS:
   * -----------------
   * Additional protection per file type
   * 
   * HTML FILES:
   * - X-Content-Type-Options: nosniff
   * - Content-Security-Policy
   * 
   * ALL FILES:
   * - X-Content-Type-Options: nosniff
   * 
   * @private
   * @static
   */
  private static setSecurityHeaders(ctx: Context, extension: string) {
    // Prevent MIME type sniffing
    ctx.response.headers.set('X-Content-Type-Options', 'nosniff');
    
    // Additional headers for HTML
    if (extension === '.html' || extension === '.htm') {
      // Basic CSP for static HTML
      ctx.response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
      );
    }
  }

  /**
   * Resolve file path
   * 
   * FILE RESOLUTION:
   * 1. Join root + requested path
   * 2. Check if file exists
   * 3. If directory, try index files
   * 4. Return resolved path or null
   * 
   * @private
   * @static
   * @param {string} root - Root directory
   * @param {string} path - Requested path
   * @param {string[]} indexFiles - Index file names
   * @returns {Promise<string | null>} Resolved path or null
   */
  private static async resolveFilePath(
    root: string,
    path: string,
    indexFiles?: string[]
  ): Promise<string | null> {
    const fullPath = this.joinPaths(root, path);
    
    try {
      const stats = await Deno.stat(fullPath);
      
      if (stats.isFile) {
        return fullPath;
      }
      
      if (stats.isDirectory && indexFiles) {
        // Try index files
        for (const indexFile of indexFiles) {
          const indexPath = this.joinPaths(fullPath, indexFile);
          try {
            const indexStats = await Deno.stat(indexPath);
            if (indexStats.isFile) {
              return indexPath;
            }
          } catch {
            // Index file doesn't exist, continue
          }
        }
      }
    } catch {
      // File doesn't exist
    }
    
    return null;
  }

  /**
   * Resolve fallback file (for SPAs)
   * 
   * @private
   * @static
   */
  private static async resolveFallbackFile(
    root: string,
    fallbackFile: string
  ): Promise<string | null> {
    const fallbackPath = this.joinPaths(root, fallbackFile);
    try {
      const stats = await Deno.stat(fallbackPath);
      if (stats.isFile) {
        return fallbackPath;
      }
    } catch {
      // Fallback file doesn't exist
    }
    return null;
  }

  /**
   * Get file extension from path
   * 
   * @private
   * @static
   * @param {string} path - File path
   * @returns {string} Extension (including dot)
   */
  private static getFileExtension(path: string): string {
    const lastDot = path.lastIndexOf('.');
    if (lastDot === -1) return '';
    return path.substring(lastDot).toLowerCase();
  }

  /**
   * Check if file is hidden
   * 
   * HIDDEN FILES:
   * Files or directories starting with dot
   * 
   * EXAMPLES:
   * - /.git/config (hidden)
   * - /path/.env (hidden)
   * - /normal.txt (not hidden)
   * 
   * @private
   * @static
   * @param {string} path - File path
   * @returns {boolean} True if hidden
   */
  private static isHiddenFile(path: string): boolean {
    const parts = path.split('/').filter(p => p.length > 0);
    return parts.some(part => part.startsWith('.'));
  }

  /**
   * Check for directory traversal attempt
   * 
   * DIRECTORY TRAVERSAL:
   * Attempt to access files outside root
   * 
   * ATTACK PATTERNS:
   * - ../../../etc/passwd
   * - ..\/..\/windows/system32
   * - ..%2F..%2Fetc%2Fpasswd
   * 
   * @private
   * @static
   * @param {string} path - Requested path
   * @returns {boolean} True if traversal detected
   */
  private static hasDirectoryTraversal(path: string): boolean {
    const normalized = decodeURIComponent(path).toLowerCase();
    return normalized.includes('../') || 
           normalized.includes('..\\') || 
           normalized.includes('..%2F');
  }

  /**
   * Join paths safely
   * 
   * @private
   * @static
   */
  private static joinPaths(root: string, path: string): string {
    const normalizedRoot = root.replace(/\\/g, '/').replace(/\/+$/, '');
    const normalizedPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${normalizedRoot}/${normalizedPath}`;
  }

  /**
   * Get file stats
   * 
   * @private
   * @static
   */
  private static async getFileStats(filePath: string): Promise<Deno.FileInfo | null> {
    try {
      return await Deno.stat(filePath);
    } catch {
      return null;
    }
  }

  /**
   * Check if file should be compressed
   * 
   * @private
   * @static
   */
  private static shouldCompress(extension: string, config: StaticFileConfig): boolean {
    return (config.enableGzip !== false || config.enableBrotli) && 
           this.COMPRESSIBLE_TYPES.has(extension);
  }
}

// ================================================================================
// 📊 ANALYTICS AND MONITORING
// ================================================================================

/**
 * Static file analytics
 * 
 * TRACKS:
 * - Request counts per file
 * - Bandwidth usage per file
 * - Last access time
 * - Popular files
 * 
 * USE CASES:
 * - Identify popular content
 * - Monitor bandwidth usage
 * - Optimize caching strategy
 * - Detect unused files
 * 
 * @class StaticFileAnalytics
 * @static
 */
export class StaticFileAnalytics {
  /**
   * Request count per file
   * @private
   * @static
   */
  private static requestCounts = new Map<string, number>();
  
  /**
   * Bandwidth used per file (bytes)
   * @private
   * @static
   */
  private static bandwidthUsed = new Map<string, number>();
  
  /**
   * Last access timestamp per file
   * @private
   * @static
   */
  private static lastAccess = new Map<string, number>();

  /**
   * Record a file request
   * 
   * @public
   * @static
   * @param {string} filePath - File path
   * @param {number} bytes - Bytes transferred
   */
  static recordRequest(filePath: string, bytes: number) {
    this.requestCounts.set(filePath, (this.requestCounts.get(filePath) || 0) + 1);
    this.bandwidthUsed.set(filePath, (this.bandwidthUsed.get(filePath) || 0) + bytes);
    this.lastAccess.set(filePath, Date.now());
  }

  /**
   * Get total statistics
   * 
   * @public
   * @static
   * @returns {Object} Total stats
   */
  static getTotalStats() {
    const totalRequests = Array.from(this.requestCounts.values()).reduce((a, b) => a + b, 0);
    const totalBandwidth = Array.from(this.bandwidthUsed.values()).reduce((a, b) => a + b, 0);
    return {
      totalRequests,
      totalBandwidth,
      totalBandwidthMB: (totalBandwidth / 1024 / 1024).toFixed(2),
      uniqueFiles: this.requestCounts.size
    };
  }

  /**
   * Get most popular files
   * 
   * @public
   * @static
   * @param {number} limit - Number of files to return
   * @returns {Array} Popular files
   */
  static getPopularFiles(limit = 10) {
    return Array.from(this.requestCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([path, count]) => ({
        path,
        requests: count,
        bandwidth: this.bandwidthUsed.get(path) || 0,
        bandwidthMB: ((this.bandwidthUsed.get(path) || 0) / 1024 / 1024).toFixed(2)
      }));
  }

  /**
   * Reset analytics
   * 
   * @public
   * @static
   */
  static reset() {
    this.requestCounts.clear();
    this.bandwidthUsed.clear();
    this.lastAccess.clear();
  }
}

// ================================================================================
// 🎯 CONFIGURATION PRESETS
// ================================================================================

/**
 * Pre-configured static file setups
 * 
 * @example
 * ```typescript
 * // Development
 * app.use(StaticFileHandler.createMiddleware({
 *   ...StaticFilePresets.DEVELOPMENT
 * }));
 * 
 * // Production
 * app.use(StaticFileHandler.createMiddleware({
 *   ...StaticFilePresets.PRODUCTION
 * }));
 * ```
 */
export const StaticFilePresets = {
  /**
   * Development preset
   * 
   * CHARACTERISTICS:
   * - No caching
   * - No compression
   * - Serve hidden files
   * - Fast refresh
   */
  DEVELOPMENT: {
    root: "./public",
    enableCaching: false,
    enableEtag: false,
    enableGzip: false,
    enableBrotli: false,
    maxAge: 0,
    serveHidden: true,
    maxFileSize: 10 * 1024 * 1024,  // 10MB
    indexFiles: ['index.html', 'index.htm']
  } as StaticFileConfig,

  /**
   * Production preset
   * 
   * CHARACTERISTICS:
   * - Long caching
   * - Compression enabled
   * - Hidden files blocked
   * - Optimized delivery
   */
  PRODUCTION: {
    root: "./public",
    enableCaching: true,
    enableEtag: true,
    enableGzip: true,
    enableBrotli: true,
    maxAge: 31536000,  // 1 year
    serveHidden: false,
    maxFileSize: 50 * 1024 * 1024,  // 50MB
    indexFiles: ['index.html', 'index.htm']
  } as StaticFileConfig,

  /**
   * SPA preset (React, Vue, Angular)
   * 
   * CHARACTERISTICS:
   * - Fallback to index.html
   * - Medium caching
   * - Compression enabled
   * - SPA routing support
   */
  SPA: {
    root: "./dist",
    enableCaching: true,
    enableEtag: true,
    enableGzip: true,
    enableBrotli: false,
    maxAge: 3600,  // 1 hour
    serveHidden: false,
    maxFileSize: 25 * 1024 * 1024,  // 25MB
    indexFiles: ['index.html'],
    fallbackFile: 'index.html'  // SPA fallback
  } as StaticFileConfig
};

// ================================================================================
// 🔧 UTILITY FUNCTIONS
// ================================================================================

/**
 * Static file utilities
 * 
 * @class StaticFileUtils
 * @static
 */
export class StaticFileUtils {
  /**
   * Generate analytics report
   * 
   * @public
   * @static
   * @param {string} rootPath - Root directory
   * @returns {Promise<Object>} Analytics report
   */
  static async generateReport(rootPath: string): Promise<any> {
    const report = {
      timestamp: new Date().toISOString(),
      rootPath,
      analytics: StaticFileAnalytics.getTotalStats(),
      popularFiles: StaticFileAnalytics.getPopularFiles(),
      systemInfo: {
        supportedExtensions: Array.from(StaticFileHandler['ALLOWED_EXTENSIONS']),
        compressibleTypes: Array.from(StaticFileHandler['COMPRESSIBLE_TYPES'])
      }
    };
    return report;
  }

  /**
   * Validate configuration
   * 
   * @public
   * @static
   * @param {StaticFileConfig} config - Configuration to validate
   * @returns {Object} Validation result
   */
  static validateConfig(config: StaticFileConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.root) errors.push('Root path is required');
    if (config.maxFileSize && config.maxFileSize < 0) errors.push('Max file size must be positive');
    if (config.indexFiles && config.indexFiles.length === 0) errors.push('Index files array cannot be empty');
    if (config.compressionLevel && (config.compressionLevel < 1 || config.compressionLevel > 9)) {
      errors.push('Compression level must be between 1-9');
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Get file statistics
   * 
   * @public
   * @static
   * @param {string} path - File path
   * @returns {Object} File stats
   */
  static getFileStats(path: string) {
    return {
      requests: StaticFileAnalytics['requestCounts'].get(path) || 0,
      bandwidth: StaticFileAnalytics['bandwidthUsed'].get(path) || 0,
      bandwidthMB: ((StaticFileAnalytics['bandwidthUsed'].get(path) || 0) / 1024 / 1024).toFixed(2),
      lastAccess: StaticFileAnalytics['lastAccess'].get(path) 
        ? new Date(StaticFileAnalytics['lastAccess'].get(path)!).toISOString() 
        : null
    };
  }

  /**
   * Check if extension is supported
   * 
   * @public
   * @static
   * @param {string} extension - File extension
   * @returns {boolean} True if supported
   */
  static isExtensionSupported(extension: string): boolean {
    return StaticFileHandler['ALLOWED_EXTENSIONS'].has(extension.toLowerCase());
  }

  /**
   * Get MIME type for extension
   * 
   * @public
   * @static
   * @param {string} extension - File extension
   * @returns {string} MIME type
   */
  static getMimeType(extension: string): string {
    return StaticFileHandler['MIME_TYPES'][extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Check if extension is compressible
   * 
   * @public
   * @static
   * @param {string} extension - File extension
   * @returns {boolean} True if compressible
   */
  static isCompressible(extension: string): boolean {
    return StaticFileHandler['COMPRESSIBLE_TYPES'].has(extension.toLowerCase());
  }
}

// ================================================================================
// 🚀 EXPORT ALL COMPONENTS
// ================================================================================

/**
 * Default export
 * 
 * @example
 * ```typescript
 * import staticFiles from "./middleware/staticFiles.ts";
 * 
 * app.use(staticFiles.StaticFileHandler.createMiddleware(config));
 * const stats = staticFiles.StaticFileAnalytics.getTotalStats();
 * const report = await staticFiles.StaticFileUtils.generateReport('./public');
 * ```
 */
export default {
  StaticFileHandler,
  StaticFileAnalytics,
  StaticFilePresets,
  StaticFileUtils
};

// ================================================================================
// END OF FILE
// ================================================================================
