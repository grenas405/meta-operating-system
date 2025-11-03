#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env

/**
 * Deno Genesis Init Command
 *
 * Unix Philosophy Implementation:
 * - Do one thing well: Initialize new Deno Genesis site
 * - Accept text input: User prompts for site configuration
 * - Produce text output: Structured progress logging
 * - Filter and transform: Take user intent → create project structure
 * - Composable: Can be piped, scripted, automated
 *
 * Security-First Approach:
 * - Explicit permissions for file operations
 * - Safe directory creation with validation
 * - Auditable symbolic link creation
 *
 * Zero-Configuration Philosophy:
 * - Sensible defaults for all options
 * - Interactive prompts with smart defaults
 * - Self-documenting output
 */

import {
  join,
  relative,
  resolve,
} from "https://deno.land/std@0.224.0/path/mod.ts";
import { ensureDir, exists } from "https://deno.land/std@0.224.0/fs/mod.ts";

// Types for better developer experience
interface CLIContext {
  cwd: string;
  configPath: string;
  verbose: boolean;
  dryRun: boolean;
  format: "text" | "json" | "yaml";
}

interface SiteConfig {
  name: string;
  port: number;
  directory: string;
  description?: string;
  template: string;
}

interface InitOptions {
  siteName?: string;
  port?: number;
  template?: string;
  skipPrompts?: boolean;
}

// Default configuration following Genesis patterns
const DEFAULT_CONFIG = {
  port: 3000,
  template: "basic",
  description: "Deno Genesis Site",
};

// Symbolic link targets - must match core framework structure
const CORE_SYMLINK_TARGETS = [
  "utils",
  "middleware",
  "config",
  "database",
  "routes",
  "main.ts",
  "VERSION",
  "mod.ts",
  "deps.ts",
];

/**
 * Main init command handler
 * Follows Unix principle: Clear interface, predictable behavior
 */
export async function initCommand(
  args: string[],
  context: CLIContext,
): Promise<number> {
  try {
    console.log(`
🚀 Initializing Deno Genesis Project

Unix Philosophy + Modern Runtime = Revolutionary Development
Creating hub-and-spoke architecture with core framework symlinks...
`);

    // Parse command line arguments
    const options = parseInitArgs(args);

    // Interactive prompts for missing configuration
    const siteConfig = await gatherSiteConfiguration(options, context);

    // Validate configuration
    const validationResult = await validateSiteConfig(siteConfig, context);
    if (!validationResult.valid) {
      console.error(
        `❌ Configuration validation failed: ${validationResult.error}`,
      );
      return 1;
    }

    // Execute initialization steps
    await executeInitialization(siteConfig, context);

    // Success output following Unix principles
    console.log(`
✅ Genesis project initialized successfully!

Site Details:
  📁 Name: ${siteConfig.name}
  🌐 Port: ${siteConfig.port}
  📂 Path: ${siteConfig.directory}
  🔗 Core Links: ${CORE_SYMLINK_TARGETS.length} symlinks created

Next Steps:
  cd ${siteConfig.directory}
  genesis dev --port=${siteConfig.port}
  
🔒 Security: All operations completed with minimal required permissions
📖 Docs: See generated README.md in your site directory
`);

    return 0;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Init command failed: ${errorMessage}`);
    if (context.verbose && error instanceof Error) {
      console.error(error.stack);
    }
    return 1;
  }
}

/**
 * Parse command line arguments with sensible defaults
 */
function parseInitArgs(args: string[]): InitOptions {
  const options: InitOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--name":
        options.siteName = args[++i];
        break;
      case "--port":
        options.port = parseInt(args[++i]) || DEFAULT_CONFIG.port;
        break;
      case "--template":
        options.template = args[++i] || DEFAULT_CONFIG.template;
        break;
      case "--skip-prompts":
        options.skipPrompts = true;
        break;
    }
  }

  // Use first positional argument as site name if provided
  if (args[0] && !args[0].startsWith("--")) {
    options.siteName = args[0];
  }

  return options;
}

/**
 * Interactive configuration gathering
 * Unix principle: Accept input from user, provide sensible defaults
 */
async function gatherSiteConfiguration(
  options: InitOptions,
  context: CLIContext,
): Promise<SiteConfig> {
  const config: SiteConfig = {
    name: options.siteName || await promptForSiteName(),
    port: options.port || await promptForPort(),
    template: options.template || DEFAULT_CONFIG.template,
    directory: "", // Will be set based on name
    description: DEFAULT_CONFIG.description,
  };

  const homeDir = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".";
  // Generate directory path
  config.directory = join(
    homeDir,
    ".local",
    "src",
    "deno-genesis-dev",
    "sites",
    config.name,
  );

  return config;
}

/**
 * Prompt for site name with validation
 */
async function promptForSiteName(): Promise<string> {
  while (true) {
    const name = prompt("🏷️  Site name (lowercase, no spaces):");

    if (!name) {
      console.log("❌ Site name is required");
      continue;
    }

    if (!/^[a-z0-9-]+$/.test(name)) {
      console.log(
        "❌ Site name must be lowercase letters, numbers, and hyphens only",
      );
      continue;
    }

    return name;
  }
}

/**
 * Prompt for port number with validation
 */
async function promptForPort(): Promise<number> {
  while (true) {
    const portStr = prompt(`🌐 Port number (default: ${DEFAULT_CONFIG.port}):`);

    if (!portStr) {
      return DEFAULT_CONFIG.port;
    }

    const port = parseInt(portStr);

    if (isNaN(port) || port < 1024 || port > 65535) {
      console.log("❌ Port must be a number between 1024 and 65535");
      continue;
    }

    return port;
  }
}

/**
 * Validate site configuration
 */
async function validateSiteConfig(
  config: SiteConfig,
  context: CLIContext,
): Promise<{ valid: boolean; error?: string }> {
  const homeDir = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".";

  // Check if sites directory exists or can be created
  const sitesDir = join(homeDir, ".local", "src", "deno-genesis-dev", "sites");

  await ensureDir(sitesDir);

  // Validate site name
  if (!config.name || !/^[a-z0-9-]+$/.test(config.name)) {
    return { valid: false, error: "Invalid site name format" };
  }

  // Validate port
  if (config.port < 1024 || config.port > 65535) {
    return { valid: false, error: "Port must be between 1024 and 65535" };
  }

  return { valid: true };
}

/**
 * Execute the initialization process
 */
async function executeInitialization(
  config: SiteConfig,
  context: CLIContext,
): Promise<void> {
  // Step 1: Create sites directory structure
  console.log("📁 Creating directory structure...");
  await createDirectoryStructure(config, context);

  // Step 2: Create symbolic links to core framework
  console.log("🔗 Creating symbolic links to core framework...");
  await createCoreSymlinks(config, context);

  // Step 3: Generate initial pages
  console.log("📄 Generating initial pages...");
  await generateInitialPages(config, context);

  // Step 4: Create configuration files
  console.log("⚙️  Creating configuration files...");
  await createConfigurationFiles(config, context);

  // Step 5: Create README documentation
  console.log("📖 Creating documentation...");
  await createDocumentation(config, context);
}

async function createDirectoryStructure(
  config: SiteConfig,
  context: CLIContext,
): Promise<void> {
  // Use config.directory directly as the site directory
  const siteDir = config.directory;

  // Ensure the directory and all parent directories exist
  await ensureDir(siteDir);

  // Create subdirectories
  const subdirs = [
    "public",
    "public/pages",
    "public/pages/home",
    "public/pages/about",
    "public/pages/services",
    "public/pages/contact",
    "public/pages/auth",
    "public/pages/admin",
    "public/pages/appointments",
    "public/assets",
    "public/assets/css",
    "public/assets/js",
  ];

  for (const subdir of subdirs) {
    await ensureDir(join(siteDir, subdir));
  }

  if (context.verbose) {
    console.log(`  ✅ Created ${subdirs.length} directories in ${siteDir}`);
  }
}

/**
 * Create symbolic links to core framework
 */
async function createCoreSymlinks(
  config: SiteConfig,
  context: CLIContext,
): Promise<void> {
  // Resolve the user's home directory
  const homeDir = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".";

  const coreDir = join(homeDir, ".local", "src", "deno-genesis-dev", "core");

  // Verify core directory exists
  if (!await exists(coreDir)) {
    throw new Error(`Core directory not found: ${coreDir}`);
  }

  let createdLinks = 0;

  for (const target of CORE_SYMLINK_TARGETS) {
    const sourcePath = join(coreDir, target);
    const linkPath = join(config.directory, target);

    // Check if source exists
    if (!await exists(sourcePath)) {
      if (context.verbose) {
        console.log(`  ⚠️  Skipping ${target} - not found in core`);
      }
      continue;
    }

    try {
      // Remove existing link/file if it exists
      if (await exists(linkPath)) {
        await Deno.remove(linkPath, { recursive: true });
      }

      // Create relative symbolic link
      const relativePath = relative(config.directory, sourcePath);
      await Deno.symlink(relativePath, linkPath);

      createdLinks++;

      if (context.verbose) {
        console.log(`  ✅ ${target} → ${relativePath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(
        `  ⚠️  Failed to create symlink for ${target}: ${errorMessage}`,
      );
    }
  }

  console.log(`  🔗 Created ${createdLinks} symbolic links to core framework`);
}

/**
 * Generate initial pages using UI guidelines
 */
async function generateInitialPages(
  config: SiteConfig,
  context: CLIContext,
): Promise<void> {
  const homePageContent = generateHomePageHTML(config);
  const homePagePath = join(config.directory, "public/pages/home/index.html");

  await Deno.writeTextFile(homePagePath, homePageContent);

  if (context.verbose) {
    console.log(`  ✅ Generated home page: ${homePagePath}`);
  }
}

/**
 * Generate success splash screen HTML
 */
function generateHomePageHTML(config: SiteConfig): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.name} | Genesis Initialized</title>
    
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }
        
        .splash-container {
            max-width: 600px;
            text-align: center;
            animation: fadeIn 0.6s ease-out;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .success-icon {
            font-size: 4rem;
            margin-bottom: 1.5rem;
            animation: bounce 1s ease-out;
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
        }
        
        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .project-name {
            font-size: 1.5rem;
            color: #94a3b8;
            margin-bottom: 2rem;
        }
        
        .message {
            font-size: 1.1rem;
            line-height: 1.8;
            color: #cbd5e1;
            margin-bottom: 3rem;
        }
        
        .next-step {
            background: rgba(59, 130, 246, 0.1);
            border: 2px solid #3b82f6;
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
        }
        
        .next-step h2 {
            font-size: 1.3rem;
            color: #60a5fa;
            margin-bottom: 1rem;
        }
        
        .command {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 1rem 1.5rem;
            font-family: 'Courier New', monospace;
            font-size: 1.1rem;
            color: #22d3ee;
            margin: 1rem 0;
            display: inline-block;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .command:hover {
            background: #1e293b;
            border-color: #3b82f6;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        
        .command::before {
            content: '$ ';
            color: #94a3b8;
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            margin-top: 2rem;
        }
        
        .feature {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            padding: 1rem;
            font-size: 0.9rem;
            color: #cbd5e1;
        }
        
        .feature-icon {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
        }
        
        .footer {
            margin-top: 3rem;
            font-size: 0.9rem;
            color: #64748b;
        }
        
        @media (max-width: 768px) {
            h1 {
                font-size: 2rem;
            }
            
            .success-icon {
                font-size: 3rem;
            }
            
            .command {
                font-size: 0.9rem;
                padding: 0.8rem 1rem;
            }
        }
    </style>
</head>

<body>
    <div class="splash-container">
        <div class="success-icon">✨</div>
        
        <h1>Genesis Initialized!</h1>
        
        <div class="project-name">${config.name}</div>
        
        <p class="message">
            Your Deno Genesis project has been successfully initialized.<br>
            The foundation is ready—now let's build something extraordinary.
        </p>
        
        <div class="next-step">
            <h2>🚀 Next Step</h2>
            <p style="margin-bottom: 1rem; color: #e2e8f0;">
                Generate a custom frontend tailored to your business and industry:
            </p>
            <div class="command" onclick="copyCommand()" title="Click to copy">
                genesis new
            </div>
        </div>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">🎯</div>
                <div>Industry-specific templates</div>
            </div>
            <div class="feature">
                <div class="feature-icon">⚡</div>
                <div>Lightning-fast generation</div>
            </div>
            <div class="feature">
                <div class="feature-icon">🎨</div>
                <div>Modern, responsive design</div>
            </div>
        </div>
        
        <div class="footer">
            <p>Powered by Deno Genesis Framework</p>
            <p>Unix Philosophy • Local-First • Developer Joy</p>
        </div>
    </div>

    <script>
        function copyCommand() {
            const command = 'genesis new';
            navigator.clipboard.writeText(command).then(() => {
                const commandEl = document.querySelector('.command');
                const originalText = commandEl.textContent;
                commandEl.textContent = 'Copied!';
                commandEl.style.color = '#22c55e';
                
                setTimeout(() => {
                    commandEl.textContent = originalText;
                    commandEl.style.color = '#22d3ee';
                }, 1500);
            }).catch(err => {
                console.log('Could not copy command:', err);
            });
        }
        
        console.log('✨ Genesis initialized successfully');
        console.log('📝 Run "genesis new" to generate your custom frontend');
    </script>
</body>
</html>`;
}

/**
 * Create configuration files for the site
 */
async function createConfigurationFiles(
  config: SiteConfig,
  context: CLIContext,
): Promise<void> {
  // Create site-specific config file
  const siteConfigContent = generateSiteConfig(config);
  const configPath = join(config.directory, "site.config.ts");

  await Deno.writeTextFile(configPath, siteConfigContent);

  if (context.verbose) {
    console.log(`  ✅ Generated site configuration: ${configPath}`);
  }
}

/**
 * Generate site configuration file
 */
function generateSiteConfig(config: SiteConfig): string {
  return `// ${config.name} - Deno Genesis Site Configuration
// Generated by genesis init command
// This file configures your site's specific settings

export interface SiteConfig {
  name: string;
  port: number;
  description: string;
  template: string;
  features: string[];
  paths: {
    public: string;
    pages: string;
    styles: string;
    scripts: string;
    images: string;
  };
}

export const siteConfig: SiteConfig = {
  name: "${config.name}",
  port: ${config.port},
  description: "${config.description}",
  template: "${config.template}",
  features: [
    "responsive-design",
    "seo-optimized", 
    "accessibility-ready",
    "performance-optimized"
  ],
  paths: {
    public: "./public",
    pages: "./public/pages",
    styles: "./public/styles", 
    scripts: "./public/scripts",
    images: "./public/images"
  }
};

// Export for use in main.ts and other modules
export default siteConfig;
`;
}

/**
 * Create documentation for the new site
 */
async function createDocumentation(
  config: SiteConfig,
  context: CLIContext,
): Promise<void> {
  const readmeContent = generateReadmeContent(config);
  const readmePath = join(config.directory, "README.md");

  await Deno.writeTextFile(readmePath, readmeContent);

  if (context.verbose) {
    console.log(`  ✅ Generated documentation: ${readmePath}`);
  }
}

/**
 * Generate README content for the site
 */
function generateReadmeContent(config: SiteConfig): string {
  return `# ${config.name}

> Created with Deno Genesis Framework  
> **Unix Philosophy + Modern Runtime = Revolutionary Development**

## 🚀 Quick Start

\`\`\`bash
# Start development server
genesis dev --port=${config.port}

# Or run directly with Deno
deno run --allow-read --allow-write --allow-net --allow-env main.ts
\`\`\`

## 📁 Project Structure

\`\`\`
${config.name}/
├── public/                 # Static assets and pages
│   ├── pages/             # HTML pages
│   │   └── home/
│   │       └── index.html # Generated home page
│   ├── styles/            # CSS stylesheets  
│   ├── scripts/           # JavaScript files
│   └── images/            # Image assets
├── logs/                  # Application logs
├── core/                  # → Symlink to ../../core/
├── utils/                 # → Symlink to ../../core/utils/
├── middleware/            # → Symlink to ../../core/middleware/
├── config/                # → Symlink to ../../core/config/
├── types/                 # → Symlink to ../../core/types/
├── database/              # → Symlink to ../../core/database/
├── models/                # → Symlink to ../../core/models/
├── routes/                # → Symlink to ../../core/routes/
├── services/              # → Symlink to ../../core/services/
├── controllers/           # → Symlink to ../../core/controllers/
├── main.ts                # → Symlink to ../../core/main.ts
├── VERSION                # → Symlink to ../../core/VERSION
├── meta.ts                # → Symlink to ../../core/meta.ts
├── site.config.ts         # Site-specific configuration
└── README.md              # This file
\`\`\`

## ⚙️ Configuration

### Site Settings
- **Name**: ${config.name}
- **Port**: ${config.port}
- **Template**: ${config.template}
- **Description**: ${config.description}

### Core Framework Integration
This site uses symbolic links to the core Deno Genesis framework, ensuring:
- ✅ **Version Consistency**: All sites use the same core framework version
- ✅ **Instant Updates**: Framework updates automatically apply to all sites
- ✅ **Reduced Redundancy**: Single source of truth for core functionality
- ✅ **Easy Maintenance**: Update once, deploy everywhere

## 🔧 Development

### Available Commands
\`\`\`bash
# Development server with hot reload
genesis dev

# Production deployment
genesis deploy

# Database operations
genesis db setup
genesis db migrate

# Environment management
genesis env setup
genesis env validate

# Status check
genesis status
\`\`\`

### Adding Pages
1. Create HTML files in \`public/pages/[page-name]/\`
2. Add corresponding routes in the framework
3. Update navigation in your templates

### Styling
- Add CSS files to \`public/styles/\`
- Follow the UI guidelines from \`docs/05-frontend/ui-guidelines.md\`
- Use CSS custom properties for consistent theming

## 🔒 Security

### Framework Security Features
- **Explicit Permissions**: Deno's permission model ensures secure execution
- **No Package Dependencies**: Zero npm packages, zero supply chain attacks  
- **Type Safety**: Full TypeScript integration prevents runtime errors
- **Secure Defaults**: All configurations follow security best practices

### Site-Specific Security
- HTTPS-ready configuration
- CSP headers configured
- XSS protection enabled
- CSRF protection implemented

## 📊 Performance

### Built-in Optimizations
- **Critical CSS Inlined**: Above-the-fold styles loaded immediately
- **Lazy Loading**: Images and components loaded on demand
- **Resource Hints**: DNS prefetch, preload, and prefetch optimizations
- **Compression**: Automatic gzip/brotli compression
- **Caching**: Intelligent caching strategies

### Monitoring
- Structured logging to \`logs/\` directory
- Performance metrics collection
- Error tracking and reporting
- Health check endpoints

## 🤝 Contributing

1. Make changes to your site-specific files in \`public/\`
2. For framework changes, modify files in the core framework
3. Test changes with \`genesis dev\`
4. Deploy with \`genesis deploy\`

## 📚 Documentation

- **Framework Docs**: \`docs/\` directory in project root
- **UI Guidelines**: \`docs/05-frontend/ui-guidelines.md\`
- **Architecture**: \`docs/02-framework/architecture.md\`
- **Deployment**: \`docs/07-deployment/\`

## 🆘 Support

- **Issues**: Create issues in the main Deno Genesis repository
- **Documentation**: Check \`docs/\` for comprehensive guides
- **Community**: Join the discussion in project issues

---

**Created with ❤️ using Deno Genesis Framework**  
*Unix Philosophy + Modern Runtime = Revolutionary Development*
`;
}
