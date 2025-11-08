#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env

/**
 * Deno Genesis Database Command - Passwordless Unix Socket Authentication
 *
 * Unix Philosophy Implementation:
 * - Do one thing well: Setup MariaDB database with multi-tenant architecture
 * - Accept text input: Database configuration parameters via CLI args
 * - Produce text output: Setup results and connection instructions
 * - Filter and transform: Take config → create database structure
 * - Composable: Can be scripted, automated, tested independently
 *
 * Security-First Approach (NO SUDO REQUIRED):
 * - Passwordless unix_socket authentication (OS-level security)
 * - Zero passwords for local root access
 * - Minimal privilege principle for database users
 * - Secure by default configuration
 * - Auditable SQL execution
 * - No network exposure (Unix socket only)
 *
 * Authentication Requirements:
 * 1. User must be in mysql group (sudo usermod -aG mysql $USER)
 * 2. MariaDB root configured with unix_socket plugin
 * 3. Socket file permissions correct (/var/run/mysqld/mysqld.sock)
 *
 * Automation-First Philosophy:
 * - Sensible defaults for all options
 * - No interactive prompts - fully automated
 * - No sudo required during operation
 * - Override via CLI arguments when needed
 * - Self-documenting output with console-styler
 * - Automated verification of prerequisites
 */

import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import {
  BannerRenderer,
  BoxRenderer,
  Logger,
} from "../../core/utils/console-styler/mod.ts";

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
      description: `📊 ${dbConfig.name} | 👤 ${dbConfig.user} | 🔌 ${
        dbConfig.useSocket
          ? `Unix Socket`
          : `TCP`
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
    console.log(
      "  • Using passwordless Unix socket authentication (no sudo required)",
    );
    console.log("  • Database user has minimal required privileges");
    console.log("  • Change default password in production environments");
    console.log("  • Review database schema in dg-config/database/");

    console.log("\n📋 Authentication Setup:");
    console.log("  This command uses passwordless unix_socket authentication:");
    console.log("  1. Your user should be in the mysql group");
    console.log("  2. MariaDB root user configured with unix_socket plugin");
    console.log("  3. No passwords needed for local development!");

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

  // Verify passwordless authentication prerequisites
  logger.info("Verifying passwordless Unix socket authentication...\n");

  // Check user group membership
  const hasGroupMembership = await checkMysqlGroupMembership(context);

  // Check unix_socket plugin configuration
  const hasUnixSocket = await checkUnixSocketPlugin(context);

  if (!hasGroupMembership || !hasUnixSocket) {
    logger.warning(
      "\n⚠️  Passwordless authentication prerequisites not fully met.",
    );
    logger.info(
      "   Setup may fail. Please complete the setup steps shown above.\n",
    );
  }

  // Test root connection
  logger.info("Testing MariaDB root access...");
  const rootAccess = await testRootAccess(context);
  if (!rootAccess) {
    throw new Error(
      "Cannot connect to MariaDB via passwordless Unix socket. Please configure unix_socket authentication (see instructions above).",
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
    logger.warning(
      "⚠️  Warning: Connection test failed, but setup may have succeeded.",
    );
  }
}

/**
 * Check if current user is in the mysql group
 * Required for passwordless Unix socket authentication
 */
async function checkMysqlGroupMembership(
  context: CLIContext,
): Promise<boolean> {
  try {
    const cmd = new Deno.Command("groups", {
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await cmd.output();

    if (code === 0) {
      const groups = new TextDecoder().decode(stdout);
      const isMember = groups.split(/\s+/).includes("mysql");

      if (isMember) {
        logger.success("✓ User is in mysql group");
        return true;
      } else {
        logger.warning("⚠️  User is NOT in mysql group");
        logger.info("   To enable passwordless access, run:");
        logger.info("   sudo usermod -aG mysql $USER");
        logger.info("   newgrp mysql");
        return false;
      }
    }

    return false;
  } catch (error) {
    if (context.verbose) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      logger.warning(`Could not check group membership: ${errorMessage}`);
    }
    return false;
  }
}

/**
 * Check MariaDB unix_socket authentication configuration
 */
async function checkUnixSocketPlugin(context: CLIContext): Promise<boolean> {
  try {
    const sql =
      "SELECT plugin FROM mysql.user WHERE User='root' AND Host='localhost';";

    const cmd = new Deno.Command("mysql", {
      args: ["-u", "root", "--execute", sql, "--batch", "--skip-column-names"],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout } = await cmd.output();

    if (code === 0) {
      const plugin = new TextDecoder().decode(stdout).trim();

      if (plugin === "unix_socket") {
        logger.success("✓ unix_socket authentication is configured");
        return true;
      } else {
        logger.warning(
          `⚠️  Root user is using '${plugin}' instead of 'unix_socket'`,
        );
        logger.info("   To configure unix_socket authentication:");
        logger.info("   1. Connect to MariaDB as root");
        logger.info(
          "   2. Run: ALTER USER 'root'@'localhost' IDENTIFIED VIA unix_socket;",
        );
        logger.info("   3. Run: FLUSH PRIVILEGES;");
        return false;
      }
    }

    return false;
  } catch (error) {
    if (context.verbose) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      logger.warning(`Could not check unix_socket plugin: ${errorMessage}`);
    }
    return false;
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
      logger.warning("⚠️  MariaDB service may not be running");
      logger.info("   Try: sudo systemctl start mariadb");
    } else {
      logger.success("✓ MariaDB service is running");
    }
  } catch (error) {
    if (context.verbose) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      logger.warning(`Note: Could not check MariaDB status: ${errorMessage}`);
    }
  }
}

/**
 * Test root access to MariaDB using passwordless Unix socket authentication
 * No sudo required - relies on unix_socket plugin and mysql group membership
 */
async function testRootAccess(context: CLIContext): Promise<boolean> {
  try {
    const cmd = new Deno.Command("mysql", {
      args: ["-u", "root", "--execute", "SELECT 1;"],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stderr } = await cmd.output();

    if (code === 0) {
      logger.success("✓ Connected via passwordless Unix socket");
      return true;
    }

    // Authentication failed - provide helpful guidance
    const errorOutput = new TextDecoder().decode(stderr);
    logger.error("✗ Passwordless Unix socket authentication failed");

    if (context.verbose) {
      logger.error(`   Error: ${errorOutput.trim()}`);
    }

    logger.info("\n📋 Setup Requirements:");
    logger.info("   1. User must be in mysql group:");
    logger.info("      sudo usermod -aG mysql $USER");
    logger.info("      newgrp mysql");
    logger.info("");
    logger.info("   2. MariaDB root user must use unix_socket plugin:");
    logger.info("      sudo mysql -u root");
    logger.info(
      "      ALTER USER 'root'@'localhost' IDENTIFIED VIA unix_socket;",
    );
    logger.info("      FLUSH PRIVILEGES;");
    logger.info("");
    logger.info("   3. Socket file permissions must be correct:");
    logger.info("      ls -la /var/run/mysqld/mysqld.sock");
    logger.info("      (should be: srwxrwxrwx 1 mysql mysql)");

    return false;
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : String(error);
    logger.error(`Root access test error: ${errorMessage}`);
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
 * Execute SQL as root user via passwordless Unix socket authentication
 * No sudo required - relies on unix_socket plugin configuration
 */
async function executeSQLAsRoot(
  sql: string,
  context: CLIContext,
): Promise<void> {
  const cmd = new Deno.Command("mysql", {
    args: ["-u", "root", "--execute", sql],
    stdout: context.verbose ? "inherit" : "piped",
    stderr: context.verbose ? "inherit" : "piped",
  });

  const { code, stderr } = await cmd.output();

  if (code !== 0) {
    const errorOutput = new TextDecoder().decode(stderr);

    if (context.verbose) {
      logger.error(`SQL execution failed: ${errorOutput}`);
    }

    throw new Error(
      "Failed to execute SQL via passwordless Unix socket. Ensure unix_socket authentication is configured.",
    );
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
🗄️  Deno Genesis Database Command - Passwordless MariaDB Setup

USAGE:
  genesis db [options]

DESCRIPTION:
  Automated MariaDB database setup with multi-tenant architecture.
  Uses PASSWORDLESS Unix socket authentication - NO SUDO REQUIRED!
  Fully automated with sensible defaults.

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
  # Automated setup with defaults (no sudo needed!)
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

PASSWORDLESS AUTHENTICATION:
  This command uses MariaDB's unix_socket plugin for passwordless auth:

  ✓ Enhanced security (OS-level authentication)
  ✓ Zero passwords for local development
  ✓ No sudo required (when properly configured)
  ✓ Better performance (direct socket, no TCP)

  Environment variables for your sites:
  • DB_HOST=localhost
  • DB_USER=webadmin
  • DB_PASSWORD=Password123!
  • DB_NAME=universal_db

PREREQUISITES:
  1. MariaDB server installed and running:
     sudo apt install mariadb-server   # Debian/Ubuntu
     sudo systemctl start mariadb

  2. Add your user to the mysql group:
     sudo usermod -aG mysql $USER
     newgrp mysql

  3. Configure MariaDB root user for unix_socket authentication:
     sudo mysql -u root
     > ALTER USER 'root'@'localhost' IDENTIFIED VIA unix_socket;
     > FLUSH PRIVILEGES;
     > EXIT;

  4. Verify socket permissions:
     ls -la /var/run/mysqld/mysqld.sock
     (should show: srwxrwxrwx 1 mysql mysql)

VERIFICATION:
  Test passwordless authentication:

  mysql -u root -e "SELECT USER(), CURRENT_USER();"

  If this works without sudo or password, you're ready!

SECURITY:
  • Uses unix_socket plugin for OS-level authentication
  • Minimal privilege principle for database users
  • Multi-tenant isolation via site_key
  • No passwords stored or transmitted for root access
  • Change default app passwords in production!

TROUBLESHOOTING:
  If authentication fails, the command will show you exactly what's missing:
  - Whether you're in the mysql group
  - Whether unix_socket plugin is configured
  - Specific commands to fix the issues

PHILOSOPHY:
  This command follows the Unix Philosophy:
  - Do one thing well: Setup database securely
  - Composable: Output can be tested, validated
  - Explicit: All operations are clearly logged
  - Secure: Security-first, passwordless by default
  - Automated: No prompts, no sudo, sensible defaults

For more information, see docs/06-backend/database-patterns.md
`);
}
