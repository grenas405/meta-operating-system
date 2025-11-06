// authKeys.ts
// ============================================================================
// 🔐 JWT Secret Key Management (Auto-Generate if Missing)
// ----------------------------------------------------------------------------
// This utility loads JWT_SECRET from .env using jose library, or generates
// a secure secret automatically if missing, then persists it to .env.
// ============================================================================
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";
import { ConsoleStyler } from "./console-styler/mod.ts";

// ============================================================================
// ============================================================================
// 📂 Load Environment Variables from .env

const env = await load();
let JWT_SECRET = env.JWT_SECRET;

// ============================================================================
// 🔑 Generate Secure Secret if Missing
// ============================================================================

if (!JWT_SECRET) {
  ConsoleStyler.logWarning("JWT_SECRET not found in .env — generating a new one...");

  // Generate cryptographically secure 256-bit (32-byte) random key
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));

  // Encode to base64url format (URL-safe, no padding)
  JWT_SECRET = jose.base64url.encode(randomBytes);

  const envPath = ".env";
  let existingContent = "";

  try {
    existingContent = await Deno.readTextFile(envPath);
  } catch (_error) {
    ConsoleStyler.logInfo("No existing .env file found. Creating one...");
  }

  // Update or append JWT_SECRET
  const updatedContent = existingContent.includes("JWT_SECRET=")
    ? existingContent.replace(/JWT_SECRET=.*/g, `JWT_SECRET=${JWT_SECRET}`)
    : `${existingContent.trim()}\nJWT_SECRET=${JWT_SECRET}\n`;

  await Deno.writeTextFile(envPath, updatedContent);
  ConsoleStyler.logSuccess("New JWT_SECRET generated and written to .env");
}

// ============================================================================
// 🔐 Import Key for HMAC-SHA256 Operations
// ============================================================================

const secretBytes = new TextEncoder().encode(JWT_SECRET);

export const jwtKey = await crypto.subtle.importKey(
  "raw",
  secretBytes,
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["sign", "verify"],
);

export { JWT_SECRET };
