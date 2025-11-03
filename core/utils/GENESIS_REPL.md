# Genesis REPL - Futuristic Unix-Style Command Interface

> "Where Unix Philosophy meets Cyberpunk Aesthetics"

## Overview

The **Genesis REPL** is a dedicated interactive command-line interface for the Deno Genesis framework, featuring a stunning cyberpunk-inspired design with neon colors and modern developer experience.

## Features

### 🎨 Futuristic Aesthetics
- **Neon color palette**: Cyan, pink, green, and electric blue
- **ASCII art banner**: Bold Genesis logo on startup
- **Categorized commands**: Organized by function
- **Beautiful borders**: Unicode box-drawing characters
- **Dim text**: For subtle hints and secondary info

### ⚡ Command Categories

#### Site Management
- `init` - Initialize a new Genesis site with hub-and-spoke architecture
- `new` - Generate industry-specific frontend with AI-powered templates

#### Database Operations
- `db` - Setup MariaDB with multi-tenant architecture

#### Development Tools
- `dev` (aliases: `serve`, `start`) - Start development server with hot reload

#### Deployment & Infrastructure
- `deploy` - Generate nginx and systemd configuration files

#### System Commands
- `help` (aliases: `h`, `?`) - Display available commands
- `status` - Show Genesis framework and site status
- `version` (alias: `v`) - Display version information
- `history` - Show command history
- `clear` (alias: `cls`) - Clear screen
- `exit` (aliases: `quit`, `q`) - Exit the REPL

## Usage

### Starting the REPL

```bash
# From the core directory
./genesis

# Or run directly with Deno
deno run --allow-all utils/genesis-repl.ts
```

### Example Session

```
genesis ▸ init my-awesome-site
🚀 Initializing Deno Genesis Project...

genesis ▸ new
🎨 Deno Genesis - Frontend Generator...

genesis ▸ dev --port 3000
🔥 Development Server with Hot Reload...

genesis ▸ status
╭─── GENESIS STATUS ───╮
  Working Directory:  /home/user/project
  Commands Executed:  3
  Timestamp:         2025-01-03T...
╰──────────────────────╯

genesis ▸ exit
╭────────────────────────────────────────────────────────────╮
│  Exiting Genesis REPL...
│  May your code be elegant and your deploys swift.
╰────────────────────────────────────────────────────────────╯
```

## Differences from Kernel REPL

The Genesis REPL is **separate** from the Meta-OS kernel REPL:

| Feature | Genesis REPL | Kernel REPL |
|---------|--------------|-------------|
| **Purpose** | Site/project management | Process/kernel management |
| **Commands** | init, new, db, dev, deploy | ps, kill, info, shutdown |
| **Aesthetics** | Cyberpunk neon colors | Standard ConsoleStyler |
| **Use Case** | Building & deploying sites | Managing running processes |
| **Entry Point** | `./genesis` | Kernel REPL mode |

## Architecture

### Clean Separation of Concerns

```
Genesis Framework
├── genesis-repl.ts      ← Site/project management (THIS)
│   ├── init, new, db
│   ├── dev, deploy
│   └── Futuristic UI
│
└── repl.ts              ← Kernel/process management
    ├── ps, kill, info
    └── Kernel integration
```

### Command Integration

All CLI commands from `core/utils/cli/commands/` are integrated:
- Error handling with proper TypeScript typing
- Context passing with `--verbose` flag support
- Consistent async/await patterns

## Color Palette

```typescript
const colors = {
  neonCyan:     RGB(0, 255, 255)    // Main UI elements
  neonPink:     RGB(255, 0, 255)    // Highlights & prompts
  neonGreen:    RGB(0, 255, 136)    // Success & labels
  electricBlue: RGB(0, 128, 255)    // Info messages
  plasma:       RGB(138, 43, 226)   // Special effects
  gold:         RGB(255, 215, 0)    // Warnings
  orange:       RGB(255, 165, 0)    // Accents
  red:          RGB(255, 0, 80)     // Errors
}
```

## Prompt Design

The Genesis prompt uses a distinctive style:

```
genesis ▸
```

- **genesis**: Neon cyan color
- **▸**: Neon pink prompt symbol (Unicode U+25B8)

## Philosophy

Following Unix principles with modern flair:

1. **Do one thing well**: Manage Genesis sites and infrastructure
2. **Text-based interface**: Terminal-native with stunning visuals
3. **Composable**: Every command is a building block
4. **Self-documenting**: The system explains itself

## Future Enhancements

Potential additions:
- Command autocompletion
- Syntax highlighting for arguments
- Interactive command builders
- Real-time site monitoring
- Integration with git workflows
- Plugin system for custom commands

## Contributing

When adding new commands to the Genesis REPL:

1. Add the command handler to `genesis-repl.ts`
2. Categorize it appropriately (site/database/development/deployment/system)
3. Include aliases if appropriate
4. Update this documentation

---

**Built with ❤️ using Deno Genesis Framework**
*Unix Philosophy + Modern Runtime = Revolutionary Development*
