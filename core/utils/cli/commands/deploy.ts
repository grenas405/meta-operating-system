#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env

/**
 * Deno Genesis Deploy Command
 *
 * Unix Philosophy Implementation:
 * - Do one thing well: Generate infrastructure configuration files
 * - Accept text input: Domain names and configuration parameters
 * - Produce text output: Nginx and SystemD configuration files
 * - Filter and transform: Take user intent → create deployment configs
 * - Composable: Can be piped, scripted, automated
 *
 * Security-First Approach:
 * - Explicit permissions for file operations
 * - Safe directory creation with validation
 * - Auditable configuration generation
 *
 * Zero-Configuration Philosophy:
 * - Sensible defaults for all options
 * - Interactive prompts with smart defaults
 * - Self-documenting output
 */

import { join, resolve } from "https://deno.land/std@0.224.0/path/mod.ts";
import { ensureDir, exists } from "https://deno.land/std@0.224.0/fs/mod.ts";

// Types for better developer experience
interface CLIContext {
  cwd: string;
  configPath: string;
  verbose: boolean;
  dryRun: boolean;
  format: "text" | "json" | "yaml";
}

interface DeployConfig {
  domain: string;
  siteName: string;
  siteKey: string;
  port: number;
  workingDirectory: string;
  businessDescription: string;
  restartDelay: number;
}

interface DeployOptions {
  domain?: string;
  port?: number;
  skipPrompts?: boolean;
  nginxOnly?: boolean;
  systemdOnly?: boolean;
}

// Default configuration following Genesis patterns
const DEFAULT_CONFIG = {
  basePort: 3000,
  restartDelayBase: 10,
  workingDirBase: "/home/admin/deno-genesis/sites",
  dbHost: "localhost",
  dbUser: "webadmin",
  dbPassword: "Password123!",
  dbName: "universal_db",
};

// Port range for Deno Genesis services
const PORT_RANGE = {
  min: 3000,
  max: 3010,
};

/**
 * Main deploy command handler
 * Follows Unix principle: Clear interface, predictable behavior
 */
export async function deployCommand(
  args: string[],
  context: CLIContext,
): Promise<number> {
  try {
    console.log(`
🚀 Deno Genesis Deploy Configuration Generator

Unix Philosophy + Infrastructure as Code = Reliable Deployments
Generating nginx and systemd configuration files for deployment...
`);

    // Parse command line arguments
    const options = parseDeployArgs(args);

    // Interactive prompts for missing configuration
    const deployConfig = await gatherDeployConfiguration(options, context);

    // Validate configuration
    const validationResult = validateDeployConfig(deployConfig, context);
    if (!validationResult.valid) {
      console.error(
        `❌ Configuration validation failed: ${validationResult.error}`,
      );
      return 1;
    }

    // Execute configuration generation
    await executeConfigGeneration(deployConfig, options, context);

    // Success output following Unix principles
    console.log(`
✅ Deployment configuration generated successfully!

Configuration Details:
  🌐 Domain: ${deployConfig.domain}
  📁 Site Name: ${deployConfig.siteName}
  🔑 Site Key: ${deployConfig.siteKey}
  🚪 Port: ${deployConfig.port}
  📂 Working Directory: ${deployConfig.workingDirectory}

Generated Files:
  ${
      !options.systemdOnly
        ? `📄 Nginx: config/nginx/sites-available/${deployConfig.siteName}.conf`
        : ""
    }
  ${
      !options.nginxOnly
        ? `📄 SystemD: config/systemd/active/${deployConfig.siteName}.service`
        : ""
    }

Next Steps:
  1. Review generated configuration files
  2. Copy nginx config: sudo cp config/nginx/sites-available/${deployConfig.siteName}.conf /etc/nginx/sites-available/
  3. Enable nginx site: sudo ln -s /etc/nginx/sites-available/${deployConfig.siteName}.conf /etc/nginx/sites-enabled/
  4. Test nginx: sudo nginx -t
  5. Reload nginx: sudo systemctl reload nginx
  6. Copy systemd service: sudo cp config/systemd/active/${deployConfig.siteName}.service /etc/systemd/system/
  7. Enable service: sudo systemctl enable ${deployConfig.siteName}.service
  8. Start service: sudo systemctl start ${deployConfig.siteName}.service
  
🔒 Security: All configurations follow DenoGenesis security patterns
📖 Docs: See docs/07-deployment/ for deployment guides
`);

    return 0;
  } catch (error) {
    console.error(`❌ Deploy command failed: ${error.message}`);
    if (context.verbose) {
      console.error(error.stack);
    }
    return 1;
  }
}

/**
 * Parse command line arguments with sensible defaults
 */
function parseDeployArgs(args: string[]): DeployOptions {
  const options: DeployOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--domain":
      case "-d":
        options.domain = args[++i];
        break;
      case "--port":
      case "-p":
        options.port = parseInt(args[++i]) || DEFAULT_CONFIG.basePort;
        break;
      case "--skip-prompts":
      case "-y":
        options.skipPrompts = true;
        break;
      case "--nginx-only":
        options.nginxOnly = true;
        break;
      case "--systemd-only":
        options.systemdOnly = true;
        break;
    }
  }

  // Use first positional argument as domain if provided
  if (args[0] && !args[0].startsWith("--") && !args[0].startsWith("-")) {
    options.domain = args[0];
  }

  return options;
}

/**
 * Interactive configuration gathering
 * Unix principle: Accept input from user, provide sensible defaults
 */
async function gatherDeployConfiguration(
  options: DeployOptions,
  context: CLIContext,
): Promise<DeployConfig> {
  const domain = options.domain || await promptForDomain();
  const siteName = deriveSiteName(domain);
  const siteKey = deriveSiteKey(siteName);

  const config: DeployConfig = {
    domain: domain,
    siteName: siteName,
    siteKey: siteKey,
    port: options.port || await promptForPort(),
    workingDirectory: join(DEFAULT_CONFIG.workingDirBase, siteName),
    businessDescription: await promptForDescription(domain),
    restartDelay: calculateRestartDelay(
      options.port || DEFAULT_CONFIG.basePort,
    ),
  };

  return config;
}

/**
 * Prompt for domain name with validation
 */
async function promptForDomain(): Promise<string> {
  console.log("\n📝 Enter the domain name for this site:");
  console.log("   Example: example.com or subdomain.example.com");

  const input = prompt("Domain:") || "";
  const cleaned = input.trim().toLowerCase().replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (!cleaned || !isValidDomain(cleaned)) {
    console.error("❌ Invalid domain name. Please try again.");
    return await promptForDomain();
  }

  return cleaned;
}

/**
 * Prompt for port number with validation
 */
async function promptForPort(): Promise<number> {
  console.log(
    `\n🚪 Enter the port number (${PORT_RANGE.min}-${PORT_RANGE.max}):`,
  );
  console.log(`   Default: ${DEFAULT_CONFIG.basePort}`);

  const input = prompt(`Port [${DEFAULT_CONFIG.basePort}]:`);

  if (!input || input.trim() === "") {
    return DEFAULT_CONFIG.basePort;
  }

  const port = parseInt(input.trim());

  if (isNaN(port) || port < PORT_RANGE.min || port > PORT_RANGE.max) {
    console.error(
      `❌ Port must be between ${PORT_RANGE.min} and ${PORT_RANGE.max}. Please try again.`,
    );
    return await promptForPort();
  }

  return port;
}

/**
 * Prompt for business description
 */
async function promptForDescription(domain: string): Promise<string> {
  console.log("\n📝 Enter a brief description for this service:");
  console.log(`   This will appear in the systemd service file`);

  const input = prompt(`Description [Genesis site for ${domain}]:`);

  if (!input || input.trim() === "") {
    return `Genesis site for ${domain}`;
  }

  return input.trim();
}

/**
 * Domain validation following RFC standards
 */
function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false;

  const domainRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain) && !domain.includes("..");
}

/**
 * Derive site name from domain (filesystem-safe)
 */
function deriveSiteName(domain: string): string {
  return domain
    .replace(/[^a-zA-Z0-9.-]/g, "")
    .replace(/\./g, "-")
    .toLowerCase();
}

/**
 * Derive site key from site name (database-safe)
 */
function deriveSiteKey(siteName: string): string {
  return siteName.replace(/-/g, "_");
}

/**
 * Calculate restart delay based on port (higher port = longer delay)
 */
function calculateRestartDelay(port: number): number {
  return DEFAULT_CONFIG.restartDelayBase + (port - PORT_RANGE.min);
}

/**
 * Validate deployment configuration
 */
function validateDeployConfig(
  config: DeployConfig,
  context: CLIContext,
): { valid: boolean; error?: string } {
  if (!config.domain) {
    return { valid: false, error: "Domain is required" };
  }

  if (!isValidDomain(config.domain)) {
    return { valid: false, error: "Invalid domain format" };
  }

  if (config.port < PORT_RANGE.min || config.port > PORT_RANGE.max) {
    return {
      valid: false,
      error: `Port must be between ${PORT_RANGE.min} and ${PORT_RANGE.max}`,
    };
  }

  return { valid: true };
}

/**
 * Execute configuration generation
 */
async function executeConfigGeneration(
  config: DeployConfig,
  options: DeployOptions,
  context: CLIContext,
): Promise<void> {
  // Ensure output directories exist
  const nginxDir = join(context.cwd, "config", "nginx", "sites-available");
  const systemdDir = join(context.cwd, "config", "systemd", "active");

  await ensureDir(nginxDir);
  await ensureDir(systemdDir);

  // Generate nginx configuration
  if (!options.systemdOnly) {
    await generateNginxConfig(config, nginxDir, context);
  }

  // Generate systemd service
  if (!options.nginxOnly) {
    await generateSystemdService(config, systemdDir, context);
  }
}

/**
 * Generate nginx configuration file
 */
async function generateNginxConfig(
  config: DeployConfig,
  outputDir: string,
  context: CLIContext,
): Promise<void> {
  const nginxConfig =
    `# =============================================================================
# NGINX CONFIGURATION - ${config.domain.toUpperCase()}
# =============================================================================
# Generated by: Deno Genesis CLI (deploy command)
# Generated on: ${new Date().toISOString()}
# Site: ${config.domain}
# Backend Port: ${config.port}
# =============================================================================

# Rate limiting configuration
limit_req_zone $binary_remote_addr zone=${config.siteKey}_limit:10m rate=10r/s;

# Main server block for HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${config.domain};

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/${config.domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${config.domain}/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Genesis application proxy
    location / {
        limit_req zone=${config.siteKey}_limit burst=20 nodelay;
        
        proxy_pass http://127.0.0.1:${config.port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout configuration
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /nginx-health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }

    # Logging
    access_log /var/log/nginx/${config.siteName}_access.log;
    error_log /var/log/nginx/${config.siteName}_error.log;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name ${config.domain};
    return 301 https://$server_name$request_uri;
}

# Optional: WWW to non-WWW redirect (uncomment if needed)
# server {
#     listen 443 ssl http2;
#     listen [::]:443 ssl http2;
#     server_name www.${config.domain};
#     return 301 https://${config.domain}$request_uri;
# }
`;

  const outputPath = join(outputDir, `${config.siteName}.conf`);
  await Deno.writeTextFile(outputPath, nginxConfig);

  if (context.verbose) {
    console.log(`✅ Generated nginx configuration: ${outputPath}`);
  }
}

/**
 * Generate systemd service file
 */
async function generateSystemdService(
  config: DeployConfig,
  outputDir: string,
  context: CLIContext,
): Promise<void> {
  const systemdService =
    `# =============================================================================
# ${config.siteName.toUpperCase()} - SYSTEMD SERVICE UNIT
# =============================================================================
# Generated by: Deno Genesis CLI (deploy command)
# Generated on: ${new Date().toISOString()}
# Site: ${config.domain}
# Port: ${config.port}
# =============================================================================

[Unit]
Description=${config.businessDescription}
Documentation=https://${config.domain}
After=network.target mariadb.service nginx.service
Wants=network-online.target
Requires=mariadb.service nginx.service

[Service]
Type=simple
User=admin
Group=admin

# Site-specific working directory
WorkingDirectory=${config.workingDirectory}

# Standard DenoGenesis environment variables
Environment=DENO_ENV=production
Environment=PORT=${config.port}
Environment=DB_HOST=${DEFAULT_CONFIG.dbHost}
Environment=DB_USER=${DEFAULT_CONFIG.dbUser}
Environment=DB_PASSWORD=${DEFAULT_CONFIG.dbPassword}
Environment=DB_NAME=${DEFAULT_CONFIG.dbName}
Environment=SITE_KEY=${config.siteKey}

# Deno execution with comprehensive permissions for DenoGenesis framework
ExecStart=/home/admin/.deno/bin/deno run \\
  --allow-net \\
  --allow-read \\
  --allow-write \\
  --allow-env \\
  --allow-run \\
  --unstable \\
  --lock=deno.lock \\
  --cached-only \\
  main.ts

# Failure recovery configuration
Restart=on-failure
RestartSec=${config.restartDelay}
StartLimitBurst=3
StartLimitInterval=60

# Resource limits for production stability
LimitNOFILE=65536
LimitNPROC=4096

# Security hardening measures
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes

# File system access permissions
ReadWritePaths=${config.workingDirectory}
ReadWritePaths=/tmp
ReadWritePaths=/var/log

# Process management configuration
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30
TimeoutStartSec=60

# Logging configuration for systemd journal
StandardOutput=journal
StandardError=journal
SyslogIdentifier=denogenesis-${config.siteKey}

[Install]
WantedBy=multi-user.target
Alias=${config.siteName}.service

# =============================================================================
# DenoGenesis Framework Service - End
# =============================================================================

# DEPLOYMENT COMMANDS:
# 1. sudo cp ${config.siteName}.service /etc/systemd/system/
# 2. sudo systemctl daemon-reload
# 3. sudo systemctl enable ${config.siteName}.service
# 4. sudo systemctl start ${config.siteName}.service
# 5. sudo systemctl status ${config.siteName}.service
#
# LOG MONITORING:
# sudo journalctl -u ${config.siteName}.service -f
#
# HEALTH CHECK:
# curl https://${config.domain}/nginx-health
`;

  const outputPath = join(outputDir, `${config.siteName}.service`);
  await Deno.writeTextFile(outputPath, systemdService);

  if (context.verbose) {
    console.log(`✅ Generated systemd service: ${outputPath}`);
  }
}

/**
 * Show help for deploy command
 */
export function showDeployHelp(): void {
  console.log(`
🚀 Deno Genesis Deploy Command - Infrastructure Configuration Generator

USAGE:
  genesis deploy [domain] [options]

DESCRIPTION:
  Generate nginx and systemd configuration files for a Deno Genesis site deployment.
  Follows Unix Philosophy and DenoGenesis security patterns.

ARGUMENTS:
  domain              Domain name for the site (e.g., example.com)

OPTIONS:
  -d, --domain        Specify domain name
  -p, --port          Specify port number (${PORT_RANGE.min}-${PORT_RANGE.max})
  -y, --skip-prompts  Skip interactive prompts and use defaults
  --nginx-only        Generate only nginx configuration
  --systemd-only      Generate only systemd service configuration
  -v, --verbose       Enable verbose output
  -h, --help          Show this help message

EXAMPLES:
  # Interactive mode
  genesis deploy
  
  # Generate configs for specific domain
  genesis deploy example.com
  
  # Specify domain and port
  genesis deploy example.com --port 3005
  
  # Generate only nginx config
  genesis deploy example.com --nginx-only
  
  # Generate only systemd service
  genesis deploy example.com --systemd-only --port 3003
  
  # Skip prompts with defaults
  genesis deploy example.com --skip-prompts

OUTPUT:
  Generated files will be placed in:
  - config/nginx/sites-available/[site-name].conf
  - config/systemd/active/[site-name].service

DEPLOYMENT:
  After generating configurations:
  1. Review the generated files
  2. Copy nginx config to /etc/nginx/sites-available/
  3. Create symlink in /etc/nginx/sites-enabled/
  4. Test nginx configuration: sudo nginx -t
  5. Reload nginx: sudo systemctl reload nginx
  6. Copy systemd service to /etc/systemd/system/
  7. Enable and start the service

PHILOSOPHY:
  This command follows the Unix Philosophy:
  - Do one thing well: Generate infrastructure configs
  - Composable: Output can be piped to other tools
  - Explicit: All parameters are clearly specified
  - Secure: Follows DenoGenesis security patterns

For more information, see docs/07-deployment/
`);
}
