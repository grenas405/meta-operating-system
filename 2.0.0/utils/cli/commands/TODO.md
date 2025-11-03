# Changing Output Directory to `dgs_config`

## Overview

Your script currently outputs configuration files to these directories:
- `config/nginx/sites-available/`
- `config/systemd/active/`

To change the output to `dgs_config/`, you need to understand how the path construction works and modify it in one centralized location.

---

## Understanding the Current Implementation

### Path Construction Flow

1. **Context Creation**: The `CLIContext` interface holds the current working directory (`cwd`)
2. **Output Directory Creation**: The `executeConfigGeneration()` function constructs paths using `join()`
3. **File Writing**: Configuration files are written to the constructed paths

### Current Code Path (Lines 305-309)

```typescript
async function executeConfigGeneration(
  config: DeployConfig,
  options: DeployOptions,
  context: CLIContext,
): Promise<void> {
  // Ensure output directories exist
  const nginxDir = join(context.cwd, "config", "nginx", "sites-available");
  const systemdDir = join(context.cwd, "config", "systemd", "active");
```

**What's happening here:**
- `context.cwd` = Current working directory (e.g., `/home/admin/deno-genesis`)
- `join()` = Combines path segments safely across operating systems
- Result: `/home/admin/deno-genesis/config/nginx/sites-available`

---

## Solution: Single Line Change

### The Change

Replace lines 306-307 with:

```typescript
  const nginxDir = join(context.cwd, "dgs_config", "nginx", "sites-available");
  const systemdDir = join(context.cwd, "dgs_config", "systemd", "active");
```

### Complete Modified Function

```typescript
async function executeConfigGeneration(
  config: DeployConfig,
  options: DeployOptions,
  context: CLIContext,
): Promise<void> {
  // Ensure output directories exist
  const nginxDir = join(context.cwd, "dgs_config", "nginx", "sites-available");
  const systemdDir = join(context.cwd, "dgs_config", "systemd", "active");

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
```

---

## Technical Deep Dive

### Why This Works

#### 1. **Path Module (`join` function)**
```typescript
import { join, resolve } from "https://deno.land/std@0.224.0/path/mod.ts";
```

The `join()` function:
- Takes multiple string segments
- Concatenates them with the appropriate path separator (`/` on Unix, `\` on Windows)
- Normalizes the result (removes redundant separators, resolves `.` and `..`)

**Example:**
```typescript
join("/home/admin", "dgs_config", "nginx", "sites-available")
// Result: "/home/admin/dgs_config/nginx/sites-available"
```

#### 2. **Directory Creation (`ensureDir`)**
```typescript
import { ensureDir, exists } from "https://deno.land/std@0.224.0/fs/mod.ts";
```

The `ensureDir()` function:
- Checks if directory exists
- Creates it recursively if it doesn't (like `mkdir -p`)
- Creates all parent directories automatically
- Does nothing if directory already exists

**Example:**
```typescript
await ensureDir("/home/admin/dgs_config/nginx/sites-available");
// Creates: dgs_config/
//          dgs_config/nginx/
//          dgs_config/nginx/sites-available/
```

#### 3. **File Writing**
The actual file writing happens in `generateNginxConfig()` and `generateSystemdService()`:

```typescript
const outputPath = join(outputDir, `${config.siteName}.conf`);
await Deno.writeTextFile(outputPath, nginxConfig);
```

Since `outputDir` is passed from `executeConfigGeneration()`, changing the parent function automatically updates all file writes.

---

## Additional Updates Needed

### 1. Update Success Message (Lines 262-264)

**Before:**
```typescript
Generated Files:
  📄 Nginx: config/nginx/sites-available/${deployConfig.siteName}.conf
  📄 SystemD: config/systemd/active/${deployConfig.siteName}.service
```

**After:**
```typescript
Generated Files:
  📄 Nginx: dgs_config/nginx/sites-available/${deployConfig.siteName}.conf
  📄 SystemD: dgs_config/systemd/active/${deployConfig.siteName}.service
```

### 2. Update Deployment Instructions (Line 270)

**Before:**
```typescript
  2. Copy nginx config: sudo cp config/nginx/sites-available/${deployConfig.siteName}.conf /etc/nginx/sites-available/
```

**After:**
```typescript
  2. Copy nginx config: sudo cp dgs_config/nginx/sites-available/${deployConfig.siteName}.conf /etc/nginx/sites-available/
```

### 3. Update Help Documentation (Line 564)

**Before:**
```typescript
OUTPUT:
  Generated files will be placed in:
  - config/nginx/sites-available/[site-name].conf
  - config/systemd/active/[site-name].service
```

**After:**
```typescript
OUTPUT:
  Generated files will be placed in:
  - dgs_config/nginx/sites-available/[site-name].conf
  - dgs_config/systemd/active/[site-name].service
```

---

## Complete Changeset Summary

Here are all the lines you need to modify:

| Line Numbers | Current Value | New Value |
|--------------|---------------|-----------|
| 306 | `"config", "nginx", "sites-available"` | `"dgs_config", "nginx", "sites-available"` |
| 307 | `"config", "systemd", "active"` | `"dgs_config", "systemd", "active"` |
| 262-264 | `config/nginx/sites-available/` | `dgs_config/nginx/sites-available/` |
| 262-264 | `config/systemd/active/` | `dgs_config/systemd/active/` |
| 270 | `config/nginx/sites-available/` | `dgs_config/nginx/sites-available/` |
| 564-566 | `config/nginx/...` and `config/systemd/...` | `dgs_config/nginx/...` and `dgs_config/systemd/...` |

---

## Making It Configurable (Advanced)

If you want to make the output directory configurable via command-line arguments:

### 1. Add to `DEFAULT_CONFIG`

```typescript
const DEFAULT_CONFIG = {
  basePort: 3000,
  restartDelayBase: 10,
  workingDirBase: "/home/admin/deno-genesis/sites",
  outputDir: "dgs_config",  // ← Add this
  dbHost: "localhost",
  dbUser: "webadmin",
  dbPassword: "Password123!",
  dbName: "universal_db",
};
```

### 2. Update `executeConfigGeneration()`

```typescript
async function executeConfigGeneration(
  config: DeployConfig,
  options: DeployOptions,
  context: CLIContext,
): Promise<void> {
  // Use configurable output directory
  const baseDir = DEFAULT_CONFIG.outputDir;
  const nginxDir = join(context.cwd, baseDir, "nginx", "sites-available");
  const systemdDir = join(context.cwd, baseDir, "systemd", "active");
  
  await ensureDir(nginxDir);
  await ensureDir(systemdDir);
  // ... rest of function
}
```

### 3. Add Command-Line Option

In `parseDeployArgs()`, add:

```typescript
case "--output-dir":
case "-o":
  DEFAULT_CONFIG.outputDir = args[++i];
  break;
```

Now you can use: `genesis deploy example.com --output-dir custom_config`

---

## Testing Your Changes

### 1. Verify Path Construction
```typescript
console.log("Nginx dir:", nginxDir);
console.log("SystemD dir:", systemdDir);
```

### 2. Check Directory Creation
After running the command, verify:
```bash
ls -la dgs_config/
ls -la dgs_config/nginx/sites-available/
ls -la dgs_config/systemd/active/
```

### 3. Verify File Output
```bash
cat dgs_config/nginx/sites-available/example-com.conf
cat dgs_config/systemd/active/example-com.service
```

---

## Why This Design Is Good

### Unix Philosophy Compliance
1. **Single Responsibility**: One function (`executeConfigGeneration`) controls output paths
2. **Composability**: Easy to change behavior without affecting other parts
3. **Predictability**: Clear data flow from context → path construction → file writing

### Maintainability
- Centralized path logic
- Easy to make configurable later
- Self-documenting through variable names

### Security
- Uses `ensureDir()` which safely creates directories
- No shell command injection risks
- Explicit permission model (Deno's `--allow-write`)

---

## Summary

**Minimum change needed:** Replace `"config"` with `"dgs_config"` on lines 306-307.

**Recommended changes:** Also update documentation strings on lines 262-264, 270, and 564-566 to reflect the new path.

The script will automatically:
- Create the `dgs_config` directory structure
- Write configuration files to the new location
- Continue working exactly as before, just with a different output directory

This modification maintains the script's Unix Philosophy principles while giving you the output directory structure you need.