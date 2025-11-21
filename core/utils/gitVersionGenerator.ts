#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env

// version.ts - Git-based version management
const VERSION_FILE_PATH = "./VERSION";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Git version information extracted from repository
 */
interface GitVersionInfo {
  version: string; // From latest tag (e.g., "2.1.0")
  buildDate: string; // From commit timestamp (ISO format)
  commitHash: string; // Short commit hash (7 chars)
  fullHash: string; // Full commit hash (40 chars)
  commitDate: Date; // Parsed commit date object
  isDirty: boolean; // Whether repo has uncommitted changes
}

/**
 * Result of git command execution
 */
interface GitCommandResult {
  success: boolean;
  output: string;
  error?: string;
}

// ============================================================================
// LOW-LEVEL GIT COMMAND EXECUTION
// ============================================================================

/**
 * ⚙️ Execute a git command using Deno native APIs
 *
 * Low-level function that executes git commands and returns structured results.
 * Uses Deno.Command for native command execution without shell.
 *
 * DESIGN:
 * - Pure Deno native API (no external dependencies)
 * - Direct process execution (no shell interpretation)
 * - Captures both stdout and stderr
 * - Trims whitespace from output
 * - Type-safe result structure
 *
 * @param {string[]} args - Git command arguments (without 'git' prefix)
 * @returns {Promise<GitCommandResult>} Structured command result
 *
 * @example
 * ```typescript
 * // Get current branch
 * const result = await executeGitCommand(["branch", "--show-current"]);
 * if (result.success) {
 *   console.log(`Branch: ${result.output}`);
 * }
 *
 * // Get commit hash
 * const hash = await executeGitCommand(["rev-parse", "HEAD"]);
 * ```
 */
async function executeGitCommand(args: string[]): Promise<GitCommandResult> {
  try {
    // Create command using Deno native API
    const command = new Deno.Command("git", {
      args,
      stdout: "piped",
      stderr: "piped",
    });

    // Execute command and wait for completion
    const { code, stdout, stderr } = await command.output();

    // Decode output streams
    const output = new TextDecoder().decode(stdout).trim();
    const error = new TextDecoder().decode(stderr).trim();

    // Return structured result
    return {
      success: code === 0,
      output,
      error: error || undefined,
    };
  } catch (error) {
    // Handle execution errors (e.g., git not found)
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================================
// GIT INFORMATION EXTRACTION
// ============================================================================

/**
 * 🏷️ Get latest git tag from repository
 *
 * Uses `git describe --tags --abbrev=0` to get the most recent tag.
 * If no tags exist, returns "0.0.0" as fallback.
 *
 * @returns {Promise<string>} Latest tag or "0.0.0"
 *
 * @example
 * ```typescript
 * const version = await getLatestGitTag();
 * console.log(version); // "v2.1.0" or "2.1.0"
 * ```
 */
async function getLatestGitTag(): Promise<string> {
  const result = await executeGitCommand(["describe", "--tags", "--abbrev=0"]);

  if (result.success && result.output) {
    return result.output.trim();
  }

  // Fallback if no tags exist
  console.warn("⚠️  No git tags found, using fallback version v1.0.0-dev");
  return "v1.0.0-dev";
}

/**
 * 📅 Get commit date from last commit
 *
 * Uses `git log -1 --format=%cI` to get ISO 8601 format commit date.
 * Returns only the date portion (YYYY-MM-DD) and exports it as BUILD_DATE.
 *
 * @returns {Promise<string>} Commit date in YYYY-MM-DD format
 * @throws {Error} If git command fails or returns no output
 *
 * @example
 * ```typescript
 * const buildDate = await getCommitDate();
 * console.log(buildDate); // "2025-10-26"
 * console.log(BUILD_DATE); // "2025-10-26"
 * ```
 */
export let BUILD_DATE: string;

async function getCommitDate(): Promise<string> {
  try {
    // %cI = committer date in strict ISO 8601 format
    const result = await executeGitCommand(["log", "-1", "--format=%cI"]);

    if (result.success && result.output) {
      // Extract date portion (YYYY-MM-DD) from ISO 8601 timestamp
      BUILD_DATE = result.output.split("T")[0];
      return BUILD_DATE;
    }

    // If command succeeded but no output, throw error with context
    throw new Error(
      `Git command succeeded but returned no output. Result: ${
        JSON.stringify(result)
      }`,
    );
  } catch (error) {
    // Capture and re-throw with stack trace
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : new Error().stack;

    throw new Error(
      `Failed to get commit date: ${errorMessage}\n` +
        `Stack trace:\n${errorStack}`,
    );
  }
}

/**
 * 🔍 Get short commit hash (7 characters)
 *
 * Uses `git rev-parse --short HEAD` to get abbreviated commit hash.
 *
 * @returns {Promise<string>} Short commit hash
 *
 * @example
 * ```typescript
 * const hash = await getCommitHash();
 * console.log(hash); // "abc123d"
 * ```
 */
async function getCommitHash(): Promise<string> {
  const result = await executeGitCommand(["rev-parse", "--short", "HEAD"]);

  if (result.success && result.output) {
    return result.output;
  }

  return "unknown";
}

/**
 * 🔍 Get full commit hash (40 characters)
 *
 * Uses `git rev-parse HEAD` to get complete commit hash.
 *
 * @returns {Promise<string>} Full commit hash
 *
 * @example
 * ```typescript
 * const fullHash = await getFullCommitHash();
 * console.log(fullHash); // "abc123def456..."
 * ```
 */
async function getFullCommitHash(): Promise<string> {
  const result = await executeGitCommand(["rev-parse", "HEAD"]);

  if (result.success && result.output) {
    return result.output;
  }

  return "unknown";
}

/**
 * 🧹 Check if repository has uncommitted changes
 *
 * Uses `git status --porcelain` to detect dirty working directory.
 *
 * @returns {Promise<boolean>} True if there are uncommitted changes
 *
 * @example
 * ```typescript
 * const isDirty = await isRepositoryDirty();
 * if (isDirty) {
 *   console.warn("⚠️  Repository has uncommitted changes");
 * }
 * ```
 */
async function isRepositoryDirty(): Promise<boolean> {
  const result = await executeGitCommand(["status", "--porcelain"]);

  // If there's any output, repo is dirty
  return result.success && result.output.length > 0;
}

// ============================================================================
// HIGH-LEVEL VERSION INFORMATION
// ============================================================================

/**
 * 📦 Extract complete version information from git
 *
 * Gathers all version-related information from git repository:
 * - Version number from latest tag
 * - Build date from last commit
 * - Commit hashes (short and full)
 * - Repository state (clean or dirty)
 *
 * @returns {Promise<GitVersionInfo>} Complete git version information
 *
 * @example
 * ```typescript
 * const info = await getGitVersionInfo();
 * console.log(`Version: ${info.version}`);
 * console.log(`Built: ${info.buildDate}`);
 * console.log(`Commit: ${info.commitHash}`);
 * ```
 */
async function getGitVersionInfo(): Promise<GitVersionInfo> {
  // Execute all git queries in parallel for efficiency
  const [version, buildDate, commitHash, fullHash, isDirty] = await Promise.all(
    [
      getLatestGitTag(),
      getCommitDate(),
      getCommitHash(),
      getFullCommitHash(),
      isRepositoryDirty(),
    ],
  );

  // Get full commit date object for additional processing
  const commitDateResult = await executeGitCommand([
    "log",
    "-1",
    "--format=%cI",
  ]);
  const commitDate = commitDateResult.success
    ? new Date(commitDateResult.output)
    : new Date();

  return {
    version,
    buildDate,
    commitHash,
    fullHash,
    commitDate,
    isDirty,
  };
}

// ============================================================================
// VERSION FILE GENERATION
// ============================================================================

/**
 * 📝 Generate VERSION file from git information
 *
 * UNIX PHILOSOPHY:
 * - Single source of truth: Git is authoritative
 * - Automated: No manual version tracking
 * - Text-based: Human-readable output
 * - Composable: Works with other git operations
 *
 * BEHAVIOR:
 * - Extracts version from latest git tag
 * - Uses commit date as build date
 * - Includes commit hash for traceability
 * - Warns if repository has uncommitted changes
 *
 * @returns {Promise<boolean>} True if successful
 *
 * @example
 * ```typescript
 * // Simple usage - generates from current git state
 * const success = await generateVersionFileFromGit();
 *
 * if (success) {
 *   console.log("✅ VERSION file generated from git");
 * }
 * ```
 */
async function generateVersionFileFromGit(): Promise<boolean> {
  try {
    console.log("📦 Generating VERSION file from git...\n");

    // Extract version information from git
    const gitInfo = await getGitVersionInfo();

    // Warn if repository is dirty
    if (gitInfo.isDirty) {
      console.warn("⚠️  Warning: Repository has uncommitted changes");
      console.warn(
        "   VERSION file will reflect last commit, not current state\n",
      );
    }

    // Build VERSION file content
    const lines: string[] = [
      gitInfo.version,
      `Build Date: ${gitInfo.buildDate}`,
      `Git Hash: ${gitInfo.commitHash}`,
    ];

    // Write to file
    const content = lines.join("\n");
    await Deno.writeTextFile(VERSION_FILE_PATH, content);

    // Success output
    console.log("✅ VERSION file generated successfully:");
    console.log(`   Version:    ${gitInfo.version}`);
    console.log(`   Build Date: ${gitInfo.buildDate}`);
    console.log(`   Git Hash:   ${gitInfo.commitHash}`);
    console.log(`   Full Hash:  ${gitInfo.fullHash}`);
    console.log(
      `   Repo State: ${gitInfo.isDirty ? "⚠️  DIRTY" : "✅ CLEAN"}\n`,
    );

    return true;
  } catch (error) {
    console.error(`❌ Failed to generate VERSION file: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * 📝 Generate VERSION file with extended metadata
 *
 * Enhanced version that includes additional git information.
 *
 * @returns {Promise<boolean>} True if successful
 *
 * @example
 * ```typescript
 * await generateVersionFileFromGitExtended();
 * ```
 */
async function generateVersionFileFromGitExtended(): Promise<boolean> {
  try {
    console.log("📦 Generating extended VERSION file from git...\n");

    const gitInfo = await getGitVersionInfo();

    if (gitInfo.isDirty) {
      console.warn("⚠️  Warning: Repository has uncommitted changes\n");
    }

    // Enhanced content with more metadata
    const lines: string[] = [
      gitInfo.version,
      `Build Date: ${gitInfo.buildDate}`,
      `Git Hash: ${gitInfo.commitHash}`,
      `Full Hash: ${gitInfo.fullHash}`,
      `Commit Date: ${gitInfo.commitDate.toISOString()}`,
      `Repository: ${gitInfo.isDirty ? "dirty" : "clean"}`,
      `Generated: ${new Date().toISOString()}`,
    ];

    const content = lines.join("\n");
    await Deno.writeTextFile(VERSION_FILE_PATH, content);

    console.log("✅ Extended VERSION file generated");
    return true;
  } catch (error) {
    console.error(`❌ Failed to generate VERSION file: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// ============================================================================
// VALIDATION AND VERIFICATION
// ============================================================================

/**
 * ✅ Verify git repository and tags exist
 *
 * Checks prerequisites before generating VERSION file.
 *
 * @returns {Promise<boolean>} True if all checks pass
 */
async function verifyGitRepository(): Promise<boolean> {
  console.log("🔍 Verifying git repository...\n");

  // Check 1: Is this a git repository?
  const gitCheckResult = await executeGitCommand(["rev-parse", "--git-dir"]);
  if (!gitCheckResult.success) {
    console.error("❌ Not a git repository");
    console.error("   Run: git init");
    return false;
  }
  console.log("✅ Git repository detected");

  // Check 2: Are there any commits?
  const commitCheckResult = await executeGitCommand(["rev-parse", "HEAD"]);
  if (!commitCheckResult.success) {
    console.error("❌ No commits found");
    console.error("   Run: git commit -m 'Initial commit'");
    return false;
  }
  console.log("✅ Commits found");

  // Check 3: Are there any tags? (Warning only, not fatal)
  const tagCheckResult = await executeGitCommand(["describe", "--tags"]);
  if (!tagCheckResult.success) {
    console.warn("⚠️  No git tags found");
    console.warn("   Consider creating a tag: git tag v1.0.0");
    console.warn("   Will use fallback version 0.0.0\n");
  } else {
    console.log("✅ Git tags found\n");
  }

  return true;
}

// ============================================================================
// EXPORT PUBLIC API
// ============================================================================

export {
  // Low-level utilities
  executeGitCommand,
  // Main functions
  generateVersionFileFromGit,
  generateVersionFileFromGitExtended,
  getCommitDate,
  getCommitHash,
  getFullCommitHash,
  getGitVersionInfo,
  // Git information functions
  getLatestGitTag,
  type GitCommandResult,
  // Types
  type GitVersionInfo,
  isRepositoryDirty,
  verifyGitRepository,
};
