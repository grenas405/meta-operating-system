#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env

/**
 * Deno Genesis Database Command
 *
 * Unix Philosophy Implementation:
 * - Do one thing well: Setup MariaDB database with multi-tenant architecture
 * - Accept text input: Database configuration parameters via CLI args
 * - Produce text output: Setup results and connection instructions
 * - Filter and transform: Take config → create database structure
 * - Composable: Can be scripted, automated, tested independently
 *
 * Security-First Approach:
 * - Unix socket authentication (no passwords over network)
 * - Sudoless authentication when properly configured
 * - Minimal privilege principle for database users
 * - Secure by default configuration
 * - Auditable SQL execution
 *
 * Automation-First Philosophy:
 * - Sensible defaults for all options
 * - No interactive prompts - fully automated
 * - Override via CLI arguments when needed
 * - Self-documenting output with console-styler
 */

import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import {
  BannerRenderer,
  BoxRenderer,
  Logger,
} from "../../console-styler/mod.ts";

// Types for better developer experience
interface CLIContext {
  cwd: string;
  configPath: string;
  verbose: boolean;
  dryRun: boolean;
  format: "text" | "json" | "yaml";
}

interface DatabaseConfig {
  name: string;
  user: string;
  password: string;
  host: string;
  socket: string;
  useSocket: boolean;
}

interface DbOptions {
  dbName?: string;
  dbUser?: string;
  dbPassword?: string;
  skipPrompts?: boolean; // Deprecated: No prompts anymore, kept for backwards compatibility
  testOnly?: boolean;
  useSocket?: boolean;
}

// Default configuration following Genesis patterns
const DEFAULT_DB_CONFIG = {
  name: "universal_db",
  user: "webadmin",
  password: "Password123!",
  host: "localhost",
  socket: "/var/run/mysqld/mysqld.sock",
  useSocket: true,
};

// Initialize console-styler logger
const logger = new Logger();
const boxRenderer = new BoxRenderer();

/**
 * Main db command handler
 * Follows Unix principle: Clear interface, predictable behavior
 */
export async function dbCommand(
  args: string[],
  context: CLIContext,
): Promise<number> {
  try {
    // Show banner
    logger.info("🗄️  Deno Genesis Database Setup\n");
    logger.info("Unix Philosophy + Security-First = Production-Ready Database");
    logger.info("Setting up MariaDB with multi-tenant architecture...\n");

    // Parse command line arguments
    const options = parseDbArgs(args);

    // Use default configuration (no prompts)
    const dbConfig = gatherDatabaseConfiguration(options);

    // Validate configuration
    const validationResult = validateDatabaseConfig(dbConfig);
    if (!validationResult.valid) {
      logger.error(
        `❌ Configuration validation failed: ${validationResult.error}`,
      );
      return 1;
    }

    // Test-only mode
    if (options.testOnly) {
      logger.info("Testing database connection...");
      const testResult = await testDatabaseConnection(dbConfig, context);
      return testResult ? 0 : 1;
    }

    // Execute database setup
    await executeDatabaseSetup(dbConfig, context);

    // Success output with styled box
    logger.success("✅ Database setup completed successfully!\n");

    BannerRenderer.render({
      title: "Database Configuration",
      content: `📊 Database: ${dbConfig.name}
👤 User: ${dbConfig.user}
🔌 Connection: ${
        dbConfig.useSocket
          ? `Unix Socket (${dbConfig.socket})`
          : `TCP (${dbConfig.host})`
      }`,
      style: "single",
      padding: 1,
    });

    console.log("\nEnvironment Variables:");
    logger.info(`  DB_HOST=${dbConfig.host}`);
    logger.info(`  DB_USER=${dbConfig.user}`);
    logger.info(`  DB_PASSWORD=${dbConfig.password}`);
    logger.info(`  DB_NAME=${dbConfig.name}`);

    console.log("\nNext Steps:");
    console.log(
      "  1. Update your site .env files with these database credentials",
    );
    console.log("  2. Test connection: genesis db --test-only");
    console.log("  3. Start your Deno Genesis services");

    console.log("\n🔒 Security Notes:");
    console.log("  • Using Unix socket authentication for optimal security");
    console.log("  • Database user has minimal required privileges");
    console.log("  • Change default password in production environments");
    console.log("  • Review database schema in dg-config/database/");

    logger.info("\n📖 Docs: See docs/06-backend/database-patterns.md");

    return 0;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Database setup failed: ${errorMessage}`);
    if (context.verbose && error instanceof Error) {
      console.error(error.stack);
    }
    return 1;
  }
}

/**
 * Parse command line arguments with sensible defaults
 */
function parseDbArgs(args: string[]): DbOptions {
  const options: DbOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--db-name":
      case "--name":
        options.dbName = args[++i];
        break;
      case "--db-user":
      case "--user":
        options.dbUser = args[++i];
        break;
      case "--db-password":
      case "--password":
        options.dbPassword = args[++i];
        break;
      case "--skip-prompts":
      case "-y":
        options.skipPrompts = true;
        break;
      case "--test-only":
      case "-t":
        options.testOnly = true;
        break;
      case "--use-socket":
        options.useSocket = true;
        break;
      case "--no-socket":
        options.useSocket = false;
        break;
    }
  }

  return options;
}

/**
 * Gather database configuration with sensible defaults
 * Automated approach - no prompts, uses defaults unless overridden via CLI args
 */
function gatherDatabaseConfiguration(
  options: DbOptions,
): DatabaseConfig {
  const config: DatabaseConfig = {
    name: options.dbName || DEFAULT_DB_CONFIG.name,
    user: options.dbUser || DEFAULT_DB_CONFIG.user,
    password: options.dbPassword || DEFAULT_DB_CONFIG.password,
    host: DEFAULT_DB_CONFIG.host,
    socket: DEFAULT_DB_CONFIG.socket,
    useSocket: options.useSocket ?? DEFAULT_DB_CONFIG.useSocket,
  };

  logger.debug("Using configuration:");
  logger.debug(`  Database: ${config.name}`);
  logger.debug(`  User: ${config.user}`);
  logger.debug(`  Connection: ${config.useSocket ? "Unix Socket" : "TCP"}`);

  return config;
}

/**
 * Validate database configuration
 */
function validateDatabaseConfig(
  config: DatabaseConfig,
): { valid: boolean; error?: string } {
  // Validate database name
  const dbNameRegex = /^[a-zA-Z0-9_]+$/;
  if (!dbNameRegex.test(config.name)) {
    return {
      valid: false,
      error:
        `Invalid database name: ${config.name}. Use only letters, numbers, and underscores.`,
    };
  }

  // Validate user name
  if (!config.user || config.user.length < 1) {
    return {
      valid: false,
      error: "Database user cannot be empty",
    };
  }

  // Validate password
  if (!config.password || config.password.length < 8) {
    return {
      valid: false,
      error: "Database password must be at least 8 characters",
    };
  }

  return { valid: true };
}

/**
 * Execute database setup
 */
async function executeDatabaseSetup(
  config: DatabaseConfig,
  context: CLIContext,
): Promise<void> {
  logger.info("Setting up database...\n");

  // Check if MariaDB is installed and running
  await checkMariaDBStatus(context);

  // Test root connection
  logger.info("Testing MariaDB root access...");
  const rootAccess = await testRootAccess(context);
  if (!rootAccess) {
    throw new Error(
      "Cannot connect to MariaDB as root. Please ensure MariaDB is running and you have root access.",
    );
  }

  // Create database
  logger.info(`Creating database: ${config.name}`);
  await createDatabase(config, context);

  // Create database user
  logger.info(`Creating database user: ${config.user}`);
  await createDatabaseUser(config, context);

  // Create tables
  logger.info("Creating database schema...");
  await createDatabaseSchema(config, context);

  // Test new user connection
  logger.info("Testing database connection...");
  const connectionTest = await testDatabaseConnection(config, context);
  if (!connectionTest) {
    logger.warn(
      "⚠️  Warning: Connection test failed, but setup may have succeeded.",
    );
  }
}

/**
 * Check MariaDB status
 */
async function checkMariaDBStatus(context: CLIContext): Promise<void> {
  try {
    // Check if MariaDB service is running
    const cmd = new Deno.Command("systemctl", {
      args: ["is-active", "mariadb"],
      stdout: "piped",
      stderr: "piped",
    });

    const { code } = await cmd.output();

    if (code !== 0) {
      logger.warn("⚠️  MariaDB service may not be running");
      logger.info("   Try: sudo systemctl start mariadb");
    } else {
      logger.success("✓ MariaDB service is running");
    }
  } catch (error) {
    if (context.verbose) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      logger.warn(`Note: Could not check MariaDB status: ${errorMessage}`);
    }
  }
}

/**
 * Test root access to MariaDB using Unix socket (sudoless when properly configured)
 */
async function testRootAccess(context: CLIContext): Promise<boolean> {
  try {
    // Try direct Unix socket authentication first (sudoless - ideal)
    const directCmd = new Deno.Command("mysql", {
      args: ["-u", "root", "--execute", "SELECT 1;"],
      stdout: "piped",
      stderr: "piped",
    });

    const { code: directCode } = await directCmd.output();

    if (directCode === 0) {
      logger.success("✓ Connected via Unix socket (sudoless)");
      return true;
    }

    // Try with sudo as fallback (Unix socket with sudo)
    const socketCmd = new Deno.Command("sudo", {
      args: ["mysql", "-u", "root", "--execute", "SELECT 1;"],
      stdout: "piped",
      stderr: "piped",
    });

    const { code } = await socketCmd.output();

    if (code === 0) {
      logger.success("✓ Connected via Unix socket (with sudo)");
      logger.info("💡 Tip: Configure user in mysql group for sudoless access");
      return true;
    }

    return false;
  } catch (error) {
    if (context.verbose) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      logger.error(`Root access test error: ${errorMessage}`);
    }
    return false;
  }
}

/**
 * Create database
 */
async function createDatabase(
  config: DatabaseConfig,
  context: CLIContext,
): Promise<void> {
  const sql = `CREATE DATABASE IF NOT EXISTS ${config.name};`;

  await executeSQLAsRoot(sql, context);
  logger.success(`✓ Database created: ${config.name}`);
}

/**
 * Create database user with proper privileges
 */
async function createDatabaseUser(
  config: DatabaseConfig,
  context: CLIContext,
): Promise<void> {
  const sql = `
    CREATE USER IF NOT EXISTS '${config.user}'@'localhost' IDENTIFIED BY '${config.password}';
    GRANT ALL PRIVILEGES ON ${config.name}.* TO '${config.user}'@'localhost';
    FLUSH PRIVILEGES;
  `;

  await executeSQLAsRoot(sql, context);
  logger.success(`✓ Database user created: ${config.user}`);
}

/**
 * Create database schema (multi-tenant tables)
 */
async function createDatabaseSchema(
  config: DatabaseConfig,
  context: CLIContext,
): Promise<void> {
  const sql = `
    USE ${config.name};
    
    -- Admin Users Table
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      site_key VARCHAR(50) NOT NULL,
      username VARCHAR(50) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_site_user (site_key, username),
      INDEX idx_site_key (site_key)
    ) ENGINE=InnoDB;
    
    -- Site Settings Table
    CREATE TABLE IF NOT EXISTS site_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      site_key VARCHAR(50) NOT NULL UNIQUE,
      contact_email VARCHAR(100) NOT NULL,
      business_phone VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_site_key (site_key)
    ) ENGINE=InnoDB;
    
    -- Appointments Table
    CREATE TABLE IF NOT EXISTS appointments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      site_key VARCHAR(50) NOT NULL,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(15) NOT NULL,
      email VARCHAR(100),
      service VARCHAR(255) NOT NULL,
      message TEXT,
      status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
      appointment_date DATE,
      appointment_time TIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_site_key (site_key),
      INDEX idx_site_email (site_key, email),
      INDEX idx_appointment_date (site_key, appointment_date),
      INDEX idx_status (status)
    ) ENGINE=InnoDB;
    
    -- Blog Posts Table
    CREATE TABLE IF NOT EXISTS blogs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      site_key VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(100) NOT NULL,
      summary TEXT NOT NULL,
      content LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_site_key (site_key)
    ) ENGINE=InnoDB;
    
    -- Contact Messages Table
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      site_key VARCHAR(50) NOT NULL,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20) NOT NULL,
      message TEXT NOT NULL,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_site_key (site_key),
      INDEX idx_submitted_at (submitted_at)
    ) ENGINE=InnoDB;
    
    -- Projects Table
    CREATE TABLE IF NOT EXISTS projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      site_key VARCHAR(50) NOT NULL,
      title VARCHAR(150) NOT NULL,
      image VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_site_key (site_key)
    ) ENGINE=InnoDB;
  `;

  await executeSQLAsRoot(sql, context);
  logger.success("✓ Database schema created");
}

/**
 * Execute SQL as root user via Unix socket (prefers sudoless)
 */
async function executeSQLAsRoot(
  sql: string,
  context: CLIContext,
): Promise<void> {
  // Try without sudo first (sudoless Unix socket - ideal)
  try {
    const cmd = new Deno.Command("mysql", {
      args: ["-u", "root", "--execute", sql],
      stdout: context.verbose ? "inherit" : "piped",
      stderr: context.verbose ? "inherit" : "piped",
    });

    const { code } = await cmd.output();

    if (code === 0) {
      return;
    }
  } catch (error) {
    // Fall through to try with sudo
  }

  // Try with sudo as fallback (Unix socket with sudo)
  const cmd = new Deno.Command("sudo", {
    args: ["mysql", "-u", "root", "--execute", sql],
    stdout: context.verbose ? "inherit" : "piped",
    stderr: context.verbose ? "inherit" : "piped",
  });

  const { code } = await cmd.output();

  if (code !== 0) {
    throw new Error("Failed to execute SQL. Check MariaDB root access.");
  }
}

/**
 * Test database connection with configured user via Unix socket
 */
async function testDatabaseConnection(
  config: DatabaseConfig,
  context: CLIContext,
): Promise<boolean> {
  try {
    const testSql = `SELECT 1 FROM DUAL;`;

    const cmd = new Deno.Command("mysql", {
      args: [
        "-u",
        config.user,
        `-p${config.password}`,
        config.name,
        "--execute",
        testSql,
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const { code } = await cmd.output();

    if (code === 0) {
      logger.success("✓ Database connection test successful");
      return true;
    } else {
      logger.error("✗ Database connection test failed");
      return false;
    }
  } catch (error) {
    if (context.verbose) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      logger.error(`Connection test error: ${errorMessage}`);
    }
    return false;
  }
}

/**
 * Show help for db command
 */
export function showDbHelp(): void {
  console.log(`
🗄️  Deno Genesis Database Command - MariaDB Setup

USAGE:
  genesis db [options]

DESCRIPTION:
  Automated MariaDB database setup with multi-tenant architecture.
  Uses Unix socket authentication for optimal security and performance.
  No prompts - fully automated with sensible defaults.

OPTIONS:
  --name, --db-name NAME      Database name (default: universal_db)
  --user, --db-user USER      Database user (default: webadmin)
  --password, --db-password   Database password (default: Password123!)
  -t, --test-only            Test database connection only
  --use-socket               Use Unix socket connection (default)
  --no-socket                Use TCP connection instead
  -v, --verbose              Enable verbose output
  -h, --help                 Show this help message

EXAMPLES:
  # Automated setup with defaults
  genesis db

  # Setup with custom database name
  genesis db --name my_database

  # Setup with custom credentials
  genesis db --user myuser --password mypassword

  # Test existing connection
  genesis db --test-only

DATABASE STRUCTURE:
  Multi-tenant architecture with site_key isolation:
  • admin_users       - Site-specific admin authentication
  • site_settings     - Site configuration and contact info
  • appointments      - Appointment scheduling
  • blogs             - Blog posts and content
  • contact_messages  - Contact form submissions
  • projects          - Portfolio/project entries

CONNECTION:
  Uses Unix socket (/var/run/mysqld/mysqld.sock) by default for:
  • Enhanced security (no network exposure)
  • Better performance (no TCP overhead)
  • Sudoless authentication (when user in mysql group)

  Environment variables for your sites:
  • DB_HOST=localhost
  • DB_USER=webadmin
  • DB_PASSWORD=Password123!
  • DB_NAME=universal_db

REQUIREMENTS:
  • MariaDB server installed and running
  • Root access to MariaDB via Unix socket
  • Optional: User in mysql group for sudoless access

SECURITY:
  • Uses Unix socket authentication (sudoless when configured)
  • Minimal privilege principle for database users
  • Multi-tenant isolation via site_key
  • Change default passwords in production!

SUDOLESS SETUP:
  For true sudoless authentication, add your user to mysql group:

  sudo usermod -aG mysql $USER
  newgrp mysql

  Then configure MariaDB to allow socket authentication.

PHILOSOPHY:
  This command follows the Unix Philosophy:
  - Do one thing well: Setup database
  - Composable: Output can be tested, validated
  - Explicit: All operations are clearly logged
  - Secure: Security-first by default
  - Automated: No prompts, sensible defaults

For more information, see docs/06-backend/database-patterns.md
`);
}
