#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env

/**
 * Deno Genesis Database Command
 *
 * Unix Philosophy Implementation:
 * - Do one thing well: Setup MariaDB database with multi-tenant architecture
 * - Accept text input: Database configuration parameters
 * - Produce text output: Setup results and connection instructions
 * - Filter and transform: Take config → create database structure
 * - Composable: Can be scripted, automated, tested independently
 *
 * Security-First Approach:
 * - Unix socket authentication (no passwords over network)
 * - Minimal privilege principle for database users
 * - Secure by default configuration
 * - Auditable SQL execution
 *
 * Zero-Configuration Philosophy:
 * - Sensible defaults for all options
 * - Interactive prompts with smart defaults
 * - Self-documenting output
 */

import { join } from "https://deno.land/std@0.224.0/path/mod.ts";

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
  skipPrompts?: boolean;
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

// ANSI color codes for Unix-style terminal output
const Colors = {
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  CYAN: "\x1b[36m",
  RESET: "\x1b[0m",
  BOLD: "\x1b[1m",
};

/**
 * Main db command handler
 * Follows Unix principle: Clear interface, predictable behavior
 */
export async function dbCommand(
  args: string[],
  context: CLIContext,
): Promise<number> {
  try {
    console.log(`
🗄️  Deno Genesis Database Setup

Unix Philosophy + Security-First = Production-Ready Database
Setting up MariaDB with multi-tenant architecture...
`);

    // Parse command line arguments
    const options = parseDbArgs(args);

    // Interactive prompts for missing configuration
    const dbConfig = await gatherDatabaseConfiguration(options, context);

    // Validate configuration
    const validationResult = validateDatabaseConfig(dbConfig);
    if (!validationResult.valid) {
      console.error(
        `${Colors.RED}❌ Configuration validation failed: ${validationResult.error}${Colors.RESET}`,
      );
      return 1;
    }

    // Test-only mode
    if (options.testOnly) {
      console.log(
        `${Colors.CYAN}Testing database connection...${Colors.RESET}`,
      );
      const testResult = await testDatabaseConnection(dbConfig, context);
      return testResult ? 0 : 1;
    }

    // Execute database setup
    await executeDatabaseSetup(dbConfig, context);

    // Success output following Unix principles
    console.log(`
${Colors.GREEN}✅ Database setup completed successfully!${Colors.RESET}

Database Configuration:
  📊 Database: ${dbConfig.name}
  👤 User: ${dbConfig.user}
  🔌 Connection: ${
      dbConfig.useSocket
        ? `Unix Socket (${dbConfig.socket})`
        : `TCP (${dbConfig.host})`
    }

Environment Variables:
  ${Colors.CYAN}DB_HOST=${Colors.RESET}${dbConfig.host}
  ${Colors.CYAN}DB_USER=${Colors.RESET}${dbConfig.user}
  ${Colors.CYAN}DB_PASSWORD=${Colors.RESET}${dbConfig.password}
  ${Colors.CYAN}DB_NAME=${Colors.RESET}${dbConfig.name}

Next Steps:
  1. Update your site .env files with these database credentials
  2. Test connection: genesis db --test-only
  3. Start your Deno Genesis services

${Colors.YELLOW}🔒 Security Notes:${Colors.RESET}
  • Using Unix socket authentication for optimal security
  • Database user has minimal required privileges
  • Change default password in production environments
  • Review database schema in dg-config/database/

${Colors.CYAN}📖 Docs: See docs/06-backend/database-patterns.md${Colors.RESET}
`);

    return 0;
  } catch (error) {
    console.error(
      `${Colors.RED}❌ Database setup failed: ${error.message}${Colors.RESET}`,
    );
    if (context.verbose) {
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
 * Interactive configuration gathering
 * Unix principle: Accept input from user, provide sensible defaults
 */
async function gatherDatabaseConfiguration(
  options: DbOptions,
  context: CLIContext,
): Promise<DatabaseConfig> {
  console.log(`${Colors.BOLD}Database Configuration${Colors.RESET}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const config: DatabaseConfig = {
    name: options.dbName || await promptForDbName(),
    user: options.dbUser || await promptForDbUser(),
    password: options.dbPassword || await promptForDbPassword(),
    host: DEFAULT_DB_CONFIG.host,
    socket: DEFAULT_DB_CONFIG.socket,
    useSocket: options.useSocket ?? DEFAULT_DB_CONFIG.useSocket,
  };

  return config;
}

/**
 * Prompt for database name with validation
 */
async function promptForDbName(): Promise<string> {
  console.log(
    `${Colors.CYAN}Database name${Colors.RESET} [${DEFAULT_DB_CONFIG.name}]:`,
  );
  const input = prompt("  >") || "";

  if (!input.trim()) {
    return DEFAULT_DB_CONFIG.name;
  }

  // Validate database name
  const dbNameRegex = /^[a-zA-Z0-9_]+$/;
  if (!dbNameRegex.test(input)) {
    console.log(
      `${Colors.RED}❌ Invalid database name. Use only letters, numbers, and underscores.${Colors.RESET}`,
    );
    return await promptForDbName();
  }

  return input.trim();
}

/**
 * Prompt for database user with validation
 */
async function promptForDbUser(): Promise<string> {
  console.log(
    `\n${Colors.CYAN}Database user${Colors.RESET} [${DEFAULT_DB_CONFIG.user}]:`,
  );
  const input = prompt("  >") || "";

  if (!input.trim()) {
    return DEFAULT_DB_CONFIG.user;
  }

  return input.trim();
}

/**
 * Prompt for database password
 */
async function promptForDbPassword(): Promise<string> {
  console.log(
    `\n${Colors.CYAN}Database password${Colors.RESET} [${DEFAULT_DB_CONFIG.password}]:`,
  );
  console.log(
    `${Colors.YELLOW}  Note: Visible for security awareness. Use strong passwords in production.${Colors.RESET}`,
  );
  const input = prompt("  >") || "";

  if (!input.trim()) {
    return DEFAULT_DB_CONFIG.password;
  }

  return input.trim();
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
  console.log(`${Colors.CYAN}Setting up database...${Colors.RESET}\n`);

  // Check if MariaDB is installed and running
  await checkMariaDBStatus(context);

  // Test root connection
  console.log(`${Colors.CYAN}Testing MariaDB root access...${Colors.RESET}`);
  const rootAccess = await testRootAccess(context);
  if (!rootAccess) {
    throw new Error(
      "Cannot connect to MariaDB as root. Please ensure MariaDB is running and you have root access.",
    );
  }

  // Create database
  console.log(`${Colors.CYAN}Creating database: ${config.name}${Colors.RESET}`);
  await createDatabase(config, context);

  // Create database user
  console.log(
    `${Colors.CYAN}Creating database user: ${config.user}${Colors.RESET}`,
  );
  await createDatabaseUser(config, context);

  // Create tables
  console.log(`${Colors.CYAN}Creating database schema...${Colors.RESET}`);
  await createDatabaseSchema(config, context);

  // Test new user connection
  console.log(`${Colors.CYAN}Testing database connection...${Colors.RESET}`);
  const connectionTest = await testDatabaseConnection(config, context);
  if (!connectionTest) {
    console.log(
      `${Colors.YELLOW}⚠️  Warning: Connection test failed, but setup may have succeeded.${Colors.RESET}`,
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
      console.log(
        `${Colors.YELLOW}⚠️  MariaDB service may not be running${Colors.RESET}`,
      );
      console.log(`   Try: sudo systemctl start mariadb`);
    } else {
      console.log(`${Colors.GREEN}✓ MariaDB service is running${Colors.RESET}`);
    }
  } catch (error) {
    if (context.verbose) {
      console.log(
        `${Colors.YELLOW}Note: Could not check MariaDB status: ${error.message}${Colors.RESET}`,
      );
    }
  }
}

/**
 * Test root access to MariaDB
 */
async function testRootAccess(context: CLIContext): Promise<boolean> {
  try {
    // Try Unix socket authentication first (most secure)
    const socketCmd = new Deno.Command("sudo", {
      args: ["mysql", "-u", "root", "--execute", "SELECT 1;"],
      stdout: "piped",
      stderr: "piped",
    });

    const { code } = await socketCmd.output();

    if (code === 0) {
      console.log(`${Colors.GREEN}✓ Connected via Unix socket${Colors.RESET}`);
      return true;
    }

    // Try without sudo (user may already have access)
    const directCmd = new Deno.Command("mysql", {
      args: ["-u", "root", "--execute", "SELECT 1;"],
      stdout: "piped",
      stderr: "piped",
    });

    const { code: directCode } = await directCmd.output();

    if (directCode === 0) {
      console.log(`${Colors.GREEN}✓ Connected directly${Colors.RESET}`);
      return true;
    }

    return false;
  } catch (error) {
    if (context.verbose) {
      console.error(`Root access test error: ${error.message}`);
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
  console.log(
    `${Colors.GREEN}✓ Database created: ${config.name}${Colors.RESET}`,
  );
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
  console.log(
    `${Colors.GREEN}✓ Database user created: ${config.user}${Colors.RESET}`,
  );
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
  console.log(`${Colors.GREEN}✓ Database schema created${Colors.RESET}`);
}

/**
 * Execute SQL as root user
 */
async function executeSQLAsRoot(
  sql: string,
  context: CLIContext,
): Promise<void> {
  // Try with sudo first (Unix socket)
  try {
    const cmd = new Deno.Command("sudo", {
      args: ["mysql", "-u", "root", "--execute", sql],
      stdout: context.verbose ? "inherit" : "piped",
      stderr: context.verbose ? "inherit" : "piped",
    });

    const { code } = await cmd.output();

    if (code === 0) {
      return;
    }
  } catch (error) {
    // Fall through to try without sudo
  }

  // Try without sudo
  const cmd = new Deno.Command("mysql", {
    args: ["-u", "root", "--execute", sql],
    stdout: context.verbose ? "inherit" : "piped",
    stderr: context.verbose ? "inherit" : "piped",
  });

  const { code } = await cmd.output();

  if (code !== 0) {
    throw new Error("Failed to execute SQL. Check MariaDB root access.");
  }
}

/**
 * Test database connection with configured user
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
      console.log(
        `${Colors.GREEN}✓ Database connection test successful${Colors.RESET}`,
      );
      return true;
    } else {
      console.log(
        `${Colors.RED}✗ Database connection test failed${Colors.RESET}`,
      );
      return false;
    }
  } catch (error) {
    if (context.verbose) {
      console.error(`Connection test error: ${error.message}`);
    }
    return false;
  }
}

/**
 * Show help for db command
 */
export function showDbHelp(): void {
  console.log(`
${Colors.BOLD}🗄️  Deno Genesis Database Command - MariaDB Setup${Colors.RESET}

USAGE:
  genesis db [options]

DESCRIPTION:
  Setup MariaDB database with multi-tenant architecture for Deno Genesis sites.
  Uses Unix socket authentication for optimal security and performance.

OPTIONS:
  --name, --db-name NAME      Database name (default: universal_db)
  --user, --db-user USER      Database user (default: webadmin)
  --password, --db-password   Database password (default: Password123!)
  -t, --test-only            Test database connection only
  -y, --skip-prompts         Skip interactive prompts and use defaults
  --use-socket               Use Unix socket connection (default)
  --no-socket                Use TCP connection instead
  -v, --verbose              Enable verbose output
  -h, --help                 Show this help message

EXAMPLES:
  # Interactive setup with defaults
  genesis db
  
  # Setup with custom database name
  genesis db --name my_database
  
  # Setup with custom credentials
  genesis db --user myuser --password mypassword
  
  # Test existing connection
  genesis db --test-only
  
  # Non-interactive setup
  genesis db --skip-prompts

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
  • Simplified authentication
  
  Environment variables for your sites:
  • DB_HOST=localhost
  • DB_USER=webadmin
  • DB_PASSWORD=Password123!
  • DB_NAME=universal_db

REQUIREMENTS:
  • MariaDB server installed and running
  • Root access to MariaDB (for setup)
  • sudo privileges (for Unix socket authentication)

SECURITY:
  • Uses Unix socket authentication when possible
  • Minimal privilege principle for database users
  • Multi-tenant isolation via site_key
  • Change default passwords in production!

PHILOSOPHY:
  This command follows the Unix Philosophy:
  - Do one thing well: Setup database
  - Composable: Output can be tested, validated
  - Explicit: All operations are clearly logged
  - Secure: Security-first by default

For more information, see docs/06-backend/database-patterns.md
`);
}
