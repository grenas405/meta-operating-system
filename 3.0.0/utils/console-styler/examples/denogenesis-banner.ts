#!/usr/bin/env -S deno run --allow-env --allow-read

/**
 * DenoGenesis ASCII Banner Example
 *
 * This demonstrates the ConsoleStyler.renderBanner() method
 * which creates professional enterprise-grade ASCII art banners
 * perfect for application startup screens.
 */

import { ConsoleStyler } from "../mod.ts";

console.clear();
console.log("\n");

// =============================================================================
// 1. BASIC DENOGENESIS BANNER
// =============================================================================

console.log("1. Basic DenoGenesis Banner\n");

ConsoleStyler.renderBanner({
  version: "1.0.0",
  buildDate: "2024-01-15",
  environment: "development",
  port: 8000,
  author: "Pedro M. Dominguez",
  repository: "https://github.com/grenas405/denogenesis",
  description: "DenoGenesis Enterprise Platform",
});

console.log("\n");

// =============================================================================
// 2. PRODUCTION SERVER BANNER
// =============================================================================

console.log("2. Production Server Configuration\n");

ConsoleStyler.renderBanner({
  version: "2.5.3",
  buildDate: new Date().toISOString(),
  environment: "production",
  port: 443,
  author: "DenoGenesis Team",
  repository: "https://github.com/denogenesis/core",
  description: "DenoGenesis REST API Server",
  features: [
    "REST API",
    "GraphQL",
    "WebSockets",
    "OAuth2",
    "Rate Limiting",
  ],
  database: "PostgreSQL 16.1",
});

console.log("\n");

// =============================================================================
// 3. AI-POWERED APPLICATION
// =============================================================================

console.log("3. AI-Powered Application\n");

ConsoleStyler.renderBanner({
  version: "3.0.0-beta",
  buildDate: "2024-11-03",
  environment: "staging",
  port: 8080,
  author: "AI Research Team",
  repository: "https://github.com/company/ai-platform",
  description: "Intelligent Document Processing System",
  features: [
    "Multi-Model AI",
    "RAG Pipeline",
    "Vector Search",
    "Real-time Processing",
  ],
  database: "PostgreSQL + pgvector",
  ai: {
    enabled: true,
    models: ["GPT-4", "Claude-3-Opus", "Llama-3", "DALL-E-3"],
  },
});

console.log("\n");

// =============================================================================
// 4. MICROSERVICE BANNER
// =============================================================================

console.log("4. Microservice Architecture\n");

ConsoleStyler.renderBanner({
  version: "1.2.0",
  buildDate: "2024-10-28",
  environment: "production",
  port: 3000,
  author: "Platform Team",
  repository: "https://github.com/company/auth-service",
  description: "Authentication Microservice",
  features: ["JWT", "OAuth2", "SAML", "2FA", "SSO"],
  database: "Redis + PostgreSQL",
});

console.log("\n");

// =============================================================================
// 5. DEVELOPMENT ENVIRONMENT
// =============================================================================

console.log("5. Local Development Environment\n");

ConsoleStyler.renderBanner({
  version: "0.1.0-dev",
  buildDate: new Date().toISOString().split("T")[0],
  environment: "development",
  port: 8000,
  author: "Your Name",
  repository: "https://github.com/yourusername/my-app",
  description: "My Awesome Deno Application",
  features: ["Hot Reload", "Debug Mode", "Mock Data"],
  database: "SQLite (dev)",
});

console.log("\n");

// =============================================================================
// 6. MINIMAL CONFIGURATION
// =============================================================================

console.log("6. Minimal Configuration\n");

ConsoleStyler.renderBanner({
  version: "1.0.0",
  buildDate: "2024-01-01",
  environment: "production",
  port: 8000,
  author: "Developer",
  repository: "https://github.com/user/app",
  description: "Simple API Server",
});

console.log("\n");

// =============================================================================
// 7. TESTING ENVIRONMENT
// =============================================================================

console.log("7. Testing Environment\n");

ConsoleStyler.renderBanner({
  version: "1.5.2-test",
  buildDate: new Date().toISOString(),
  environment: "testing",
  port: 9000,
  author: "QA Team",
  repository: "https://github.com/company/app-test",
  description: "Automated Testing Suite Runner",
  features: ["E2E Tests", "Integration Tests", "Load Tests", "Coverage"],
  database: "Test Database (isolated)",
});

console.log("\n");

// =============================================================================
// 8. COMBINED WITH OTHER CONSOLE STYLER FEATURES
// =============================================================================

console.log("8. Combined with Logging\n");

ConsoleStyler.renderBanner({
  version: "1.0.0",
  buildDate: "2024-11-03",
  environment: "production",
  port: 8000,
  author: "DevOps Team",
  repository: "https://github.com/company/platform",
  description: "Full-Stack Platform",
  features: ["REST API", "WebSockets", "Background Jobs"],
  database: "PostgreSQL",
  ai: {
    enabled: true,
    models: ["GPT-4", "Claude-3"],
  },
});

// Use other ConsoleStyler features after banner
console.log("\n");
ConsoleStyler.logSuccess("Server initialization complete");
ConsoleStyler.logInfo("All services are operational");
ConsoleStyler.logSection("📊 System Status", "cyan");
ConsoleStyler.logSuccess("Database: Connected");
ConsoleStyler.logSuccess("Cache: Connected");
ConsoleStyler.logSuccess("Message Queue: Connected");
console.log("\n");
ConsoleStyler.logInfo("Ready to accept connections...");

console.log("\n");

// =============================================================================
// USAGE TIPS
// =============================================================================

ConsoleStyler.logBox(
  [
    "💡 Usage Tips:",
    "",
    "• Use this at application startup",
    "• Environment affects color scheme",
    "• Optional features and AI config",
    "• Automatically detects color support",
    "• Perfect for server logs",
    "",
    "Environments:",
    "  - development (cyan)",
    "  - staging (purple)",
    "  - testing (blue)",
    "  - production (green)",
  ],
  "Tips",
  "blue",
);

console.log("\n");
