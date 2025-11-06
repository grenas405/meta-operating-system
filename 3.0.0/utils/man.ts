#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env

/**
 * DENO GENESIS MANUAL SYSTEM
 * =========================
 *
 * Unix Philosophy Implementation:
 * - Do one thing well: Provide comprehensive, navigable documentation
 * - Text-based interface: Terminal-native manual pages with modern features
 * - Composable: Can be piped, scripted, and integrated with other tools
 * - Self-documenting: The manual system documents itself
 *
 * Philosophy:
 * "Documentation is not separate from the system; it IS the system"
 * - Every command is self-describing
 * - Every function tells its story
 * - Every module explains its purpose
 * - The code and documentation converge into one truth
 */

import { parse } from "https://deno.land/std@0.224.0/flags/mod.ts";
import {
  bold,
  brightRed,
  dim,
  italic,
  red,
  rgb24,
} from "https://deno.land/std@0.224.0/fmt/colors.ts";
import { readKeypress } from "https://deno.land/x/keypress@0.0.11/mod.ts";
// =============================================================================
// COLOR SCHEME: FUTURISTIC CYBERPUNK
// =============================================================================

const colors = {
  // Primary neon palette
  neonCyan: (text: string) => rgb24(text, 0x00FFFF),
  electricBlue: (text: string) => rgb24(text, 0x0080FF),
  deepPurple: (text: string) => rgb24(text, 0x8B00FF),

  // Accent colors
  neonPink: (text: string) => bold(rgb24(text, 0xFF00FF)),
  plasma: (text: string) => rgb24(text, 0x00FF88),

  // UI elements
  border: (text: string) => rgb24(text, 0x004466),
  highlight: (text: string) => bold(rgb24(text, 0x00FFAA)),
  dimCyan: (text: string) => rgb24(text, 0x006666),

  // Text variations
  header: (text: string) => bold(rgb24(text, 0x00DDFF)),
  subheader: (text: string) => italic(rgb24(text, 0x88AAFF)),
  command: (text: string) => bold(rgb24(text, 0xAAFFFF)),
  option: (text: string) => rgb24(text, 0x66CCFF),

  // Special effects
  pulse: (text: string, frame: number) => {
    const intensity = Math.sin(frame * 0.1) * 0.5 + 0.5;
    const color = Math.floor(0x00 + intensity * 0xFF);
    return rgb24(text, (color << 8) | 0xFF);
  },
};
// =============================================================================
// MANUAL PAGE STRUCTURE
// =============================================================================

interface ManualSection {
  title: string;
  content: string[];
  subsections?: ManualSection[];
}

interface ManualPage {
  command: string;
  synopsis: string;
  description: string[];
  sections: ManualSection[];
  seeAlso?: string[];
  author?: string;
  version?: string;
  philosophy?: string[];
}

// =============================================================================
// MANUAL CONTENT DATABASE
// =============================================================================

const MANUAL_PAGES: Map<string, ManualPage> = new Map([
  ["genesis", {
    command: "genesis",
    synopsis: "genesis <command> [options]",
    description: [
      "The Deno Genesis CLI - where Unix Philosophy meets Modern Runtime.",
      "",
      "A revolutionary framework proving that timeless principles + modern",
      "technology = unprecedented developer empowerment.",
    ],
    philosophy: [
      '"Make each program do one thing well." - Doug McIlroy',
      "",
      "Genesis embodies this principle: One framework, one runtime,",
      "infinite possibilities. No webpack. No npm. No complexity.",
      "Just pure, composable TypeScript that runs everywhere.",
    ],
    sections: [
      {
        title: "CORE COMMANDS",
        content: [
          "init       Initialize new Genesis project with hub-and-spoke architecture",
          "dev        Start development server with hot reload and file watching",
          "deploy     Generate nginx and systemd configs for production deployment",
          "db         Setup MariaDB with multi-tenant architecture",
          "new        Generate industry-specific frontend from business info",
          "man        Display this manual system (you are here)",
        ],
      },
      {
        title: "UNIX PHILOSOPHY IMPLEMENTATION",
        content: [
          "• Do One Thing Well",
          "  Each command has a single, focused responsibility",
          "",
          "• Text Streams as Universal Interface",
          "  All output is parseable, pipeable, scriptable",
          "",
          "• Composability Over Monoliths",
          "  Commands work together through standard interfaces",
          "",
          "• Explicit Over Implicit",
          "  Every permission, every dependency, every action is visible",
        ],
      },
      {
        title: "SECURITY MODEL",
        content: [
          "Deno's permission system ensures complete security:",
          "",
          "--allow-read      File system read access",
          "--allow-write     File system write access",
          "--allow-net       Network access",
          "--allow-env       Environment variable access",
          "--allow-run       Subprocess execution",
          "",
          "No permission is ever granted implicitly.",
          "Every action requires explicit user consent.",
        ],
      },
      {
        title: "EXAMPLES",
        content: [
          "# Initialize new project",
          "genesis init my-project",
          "",
          "# Start development server",
          "genesis dev --port=3000",
          "",
          "# Generate production configs",
          "genesis deploy example.com",
          "",
          "# View command help",
          "genesis man init",
        ],
      },
    ],
    seeAlso: ["init", "dev", "deploy", "db", "new"],
    author: "Pedro M. Dominguez, Dominguez Tech Solutions LLC",
    version: "2.0.0",
  }],

  ["init", {
    command: "genesis init",
    synopsis:
      "genesis init [site-name] [--template=basic|full|enterprise] [--port=N]",
    description: [
      "Initialize a new site within the Genesis hub-and-spoke project structure.",
      "",
      "Creates a complete site instance with symbolic links to the centralized",
      "core framework, enabling instant updates across all sites while maintaining",
      "site-specific configuration and assets. Each site operates independently",
      "on its own port but shares the core framework code via Unix symlinks.",
      "",
      "The command creates:",
      "  • Site directory structure (public/, config/, pages/)",
      "  • Symbolic links to core framework (utils, middleware, routes)",
      "  • Site-specific configuration file (site.config.ts)",
      "  • Default landing page and README documentation",
      "  • Port configuration (defaults to auto-assigned)",
      "",
      "Zero-configuration philosophy: Sensible defaults for everything,",
      "interactive prompts for essential details, no manual setup required.",
      "Run 'genesis dev' immediately after init to start developing.",
    ],
    philosophy: [
      '"Write programs that do one thing and do it well."',
      "",
      "The init command creates structure, nothing more.",
      "It doesn't install packages, compile code, or configure services.",
      "It creates directories and symbolic links. Pure. Simple. Unix.",
      "",
      "Each site is an independent instance sharing a common core.",
      "Update once, benefit everywhere. No version drift. No complexity.",
    ],
    sections: [
      {
        title: "ARCHITECTURE CREATED",
        content: [
          "project-root/",
          "├── core/              # Centralized framework (single source)",
          "├── sites/             # Individual site directories",
          "│   └── your-site/     # New site created by init command",
          "│       ├── public/    # Static assets (HTML, CSS, images)",
          "│       ├── utils →    # Symlink to ../../core/utils",
          "│       ├── middleware → ../../core/middleware",
          "│       ├── main.ts →  # Symlink to ../../core/main.ts",
          "│       └── site.config.ts  # Site-specific configuration",
          "├── shared/            # Shared resources across sites",
          "├── config/            # Global configuration",
          "├── logs/              # Centralized logging",
          "└── docs/              # Framework documentation",
        ],
      },
      {
        title: "INTERACTIVE PROMPTS",
        content: [
          "The init command guides you through setup with smart defaults:",
          "",
          "Site name:        Your site's identifier (required)",
          "Port number:      HTTP port (default: auto-assigned)",
          "Template type:    basic, full, or enterprise",
          "Description:      Optional site description",
          "",
          "All prompts include sensible defaults - just press Enter to accept.",
          "Use --skip-prompts flag with CLI arguments for non-interactive setup.",
        ],
      },
      {
        title: "OPTIONS",
        content: [
          "--template=basic       Minimal setup for simple projects",
          "--template=full        Complete setup with all features",
          "--template=enterprise  Enterprise features and monitoring",
          "",
          "--port=N               Specify custom port number",
          "--name=NAME            Set site name non-interactively",
          "--skip-prompts         Use defaults without prompting",
          "",
          "--verbose              Show detailed initialization steps",
          "--dry-run              Preview without creating files",
        ],
      },
      {
        title: "SYMBOLIC LINKING EXPLAINED",
        content: [
          "Sites use symbolic links (symlinks) to the core framework.",
          "This creates a 'single source of truth' architecture:",
          "",
          "sites/example/",
          "├── utils → ../../core/utils",
          "├── middleware → ../../core/middleware",
          "└── main.ts → ../../core/main.ts",
          "",
          "What this means:",
          "",
          "• Single Source: Core framework exists in one location only",
          "• Instant Updates: Changes to core immediately affect all sites",
          "• Zero Duplication: No copied code, no version drift",
          "• Reduced Disk Usage: Share code instead of duplicating it",
          "• Independent Sites: Each site has unique config and assets",
          "",
          "The symlink targets are:",
          "  utils, middleware, config, database, routes, controllers,",
          "  main.ts, VERSION, meta.ts, mod.ts",
        ],
      },
      {
        title: "AFTER INITIALIZATION",
        content: [
          "Once init completes, you'll see:",
          "",
          "✅ Genesis project initialized successfully!",
          "",
          "Site Details:",
          "  📁 Name: your-site",
          "  🌐 Port: 3000",
          "  📂 Path: sites/your-site",
          "  🔗 Core Links: 10 symlinks created",
          "",
          "Next Steps:",
          "  1. cd sites/your-site",
          "  2. genesis dev --port=3000",
          "  3. Open http://localhost:3000 in your browser",
          "",
          "Your site is ready to develop immediately - no build step,",
          "no package installation, no configuration required.",
        ],
      },
      {
        title: "EXAMPLES",
        content: [
          "# Basic usage with prompts",
          "genesis init",
          "",
          "# Specify site name directly",
          "genesis init my-awesome-site",
          "",
          "# Non-interactive with custom port",
          "genesis init my-site --port=3005 --skip-prompts",
          "",
          "# Enterprise template",
          "genesis init enterprise-app --template=enterprise",
          "",
          "# Preview without creating files",
          "genesis init test-site --dry-run --verbose",
        ],
      },
    ],
    seeAlso: ["new", "dev", "deploy"],
    version: "2.0.0",
  }],

  ["dev", {
    command: "genesis dev",
    synopsis: "genesis dev [--port=3000] [--host=localhost] [--watch]",
    description: [
      "Start the development server with hot reload capabilities.",
      "",
      "Monitors file changes, automatically restarts on modifications,",
      "and provides real-time feedback for rapid development cycles.",
    ],
    philosophy: [
      '"Design and build software, even operating systems,',
      'to be tried early, ideally within weeks."',
      "",
      "The dev command enables immediate feedback. No build step.",
      "No compilation wait. Change code, see results. Instantly.",
    ],
    sections: [
      {
        title: "FEATURES",
        content: [
          "• Hot Module Reload    Changes apply without restart",
          "• File Watching        Automatic detection of modifications",
          "• Error Recovery       Graceful handling of syntax errors",
          "• Performance Monitor  Real-time metrics display",
          "• Request Logging      Structured, parseable log output",
        ],
      },
      {
        title: "OPTIONS",
        content: [
          "--port=NUMBER         Set development server port (default: 3000)",
          "--host=ADDRESS        Set host address (default: localhost)",
          "--watch=PATHS         Additional paths to watch",
          "--no-clear            Don't clear terminal on restart",
          "--open                Open browser on start",
        ],
      },
      {
        title: "KEYBOARD SHORTCUTS",
        content: [
          "r    Restart server manually",
          "c    Clear console",
          "q    Quit development server",
          "h    Show help",
          "m    Display memory usage",
        ],
      },
    ],
    seeAlso: ["deploy", "init"],
    version: "2.0.0",
  }],
]);

// =============================================================================
// PAGER SYSTEM
// =============================================================================

class ManualPager {
  private lines: string[] = [];
  private currentLine = 0;
  private terminalHeight = 24;
  private terminalWidth = 80;
  private searchTerm = "";
  private searchResults: number[] = [];
  private currentSearchIndex = 0;
  private animationFrame = 0;

  constructor() {
    const size = Deno.consoleSize();
    this.terminalHeight = size.rows - 4; // Leave space for status bar
    this.terminalWidth = size.columns;
  }

  async display(page: ManualPage): Promise<void> {
    this.lines = this.renderPage(page);
    this.currentLine = 0;

    // Clear screen and hide cursor
    await this.clearScreen();
    console.log("\x1B[?25l"); // Hide cursor

    try {
      await this.renderLoop();
    } finally {
      console.log("\x1B[?25h"); // Show cursor
    }
  }

  private renderPage(page: ManualPage): string[] {
    const lines: string[] = [];
    const width = this.terminalWidth;

    // Header with animation
    lines.push(this.renderBorder("top"));
    lines.push(
      this.centerText(
        colors.header(`GENESIS MANUAL - ${page.command.toUpperCase()}`),
      ),
    );
    lines.push(this.centerText(colors.subheader(page.synopsis)));
    lines.push(this.renderBorder("middle"));
    lines.push("");

    // Philosophy quote if present
    if (page.philosophy) {
      lines.push(colors.plasma("◆ PHILOSOPHY ◆"));
      lines.push("");
      page.philosophy.forEach((line) => {
        lines.push(colors.dimCyan(line));
      });
      lines.push("");
      lines.push(this.renderBorder("thin"));
      lines.push("");
    }

    // Description
    lines.push(colors.electricBlue("◆ DESCRIPTION ◆"));
    lines.push("");
    page.description.forEach((line) => {
      lines.push(this.wrapText(line));
    });
    lines.push("");

    // Main sections
    page.sections.forEach((section) => {
      lines.push(this.renderBorder("thin"));
      lines.push("");
      lines.push(colors.electricBlue(`◆ ${section.title} ◆`));
      lines.push("");

      section.content.forEach((line) => {
        if (line.includes("  ")) {
          // Indented content
          const [cmd, desc] = line.split(/\s{2,}/);
          if (desc) {
            lines.push(
              `  ${colors.command(cmd.padEnd(20))} ${colors.dimCyan(desc)}`,
            );
          } else {
            lines.push(`  ${colors.option(line.trim())}`);
          }
        } else {
          lines.push(this.wrapText(line));
        }
      });
      lines.push("");
    });

    // See also section
    if (page.seeAlso) {
      lines.push(this.renderBorder("thin"));
      lines.push("");
      lines.push(colors.electricBlue("◆ SEE ALSO ◆"));
      lines.push("");
      lines.push(
        `  ${page.seeAlso.map((cmd) => colors.command(cmd)).join(", ")}`,
      );
      lines.push("");
    }

    // Footer
    if (page.author || page.version) {
      lines.push(this.renderBorder("thin"));
      lines.push("");
      if (page.author) lines.push(colors.dimCyan(`Author: ${page.author}`));
      if (page.version) lines.push(colors.dimCyan(`Version: ${page.version}`));
    }

    return lines;
  }

  private renderBorder(type: "top" | "middle" | "bottom" | "thin"): string {
    const width = this.terminalWidth;
    const chars = {
      top: ["╔", "═", "╗"],
      middle: ["╠", "═", "╣"],
      bottom: ["╚", "═", "╝"],
      thin: ["─", "─", "─"],
    };

    const [left, mid, right] = chars[type];
    const border = type === "thin"
      ? colors.border(mid.repeat(width))
      : colors.border(left + mid.repeat(width - 2) + right);

    return border;
  }

  private centerText(text: string): string {
    const strippedLength = text.replace(/\x1B\[[0-9;]*m/g, "").length;
    const padding = Math.max(
      0,
      Math.floor((this.terminalWidth - strippedLength) / 2),
    );
    return " ".repeat(padding) + text;
  }

  private wrapText(text: string): string {
    if (text.length <= this.terminalWidth) return text;
    // Simple wrapping - could be enhanced
    return text;
  }

  private async renderLoop(): Promise<void> {
    const animInterval = setInterval(() => {
      this.animationFrame++;
    }, 50);

    while (true) {
      await this.render();

      const key = await this.readKey();

      switch (key) {
        case "q":
          clearInterval(animInterval);
          return;
        case "j":
        case "down":
          if (this.currentLine + this.terminalHeight < this.lines.length) {
            this.currentLine++;
          }
          break;
        case "k":
        case "up":
          if (this.currentLine > 0) {
            this.currentLine--;
          }
          break;
        case " ":
        case "pagedown":
          this.currentLine = Math.min(
            this.currentLine + this.terminalHeight,
            Math.max(0, this.lines.length - this.terminalHeight),
          );
          break;
        case "b":
        case "pageup":
          this.currentLine = Math.max(
            this.currentLine - this.terminalHeight,
            0,
          );
          break;
        case "g":
        case "home":
          this.currentLine = 0;
          break;
        case "G":
        case "end":
          this.currentLine = Math.max(
            0,
            this.lines.length - this.terminalHeight,
          );
          break;
        case "/":
          await this.search();
          break;
        case "n":
          this.nextSearchResult();
          break;
        case "N":
          this.prevSearchResult();
          break;
        case "h":
        case "?":
          await this.showHelp();
          break;
      }
    }

    clearInterval(animInterval);
  }

  private async render(): Promise<void> {
    await this.clearScreen();

    // Display visible lines
    const visibleLines = this.lines.slice(
      this.currentLine,
      this.currentLine + this.terminalHeight,
    );

    visibleLines.forEach((line) => {
      console.log(this.highlightSearch(line));
    });

    // Fill remaining space
    const remaining = this.terminalHeight - visibleLines.length;
    for (let i = 0; i < remaining; i++) {
      console.log(colors.dimCyan("~"));
    }

    // Status bar
    this.renderStatusBar();
  }

  private renderStatusBar(): void {
    const percent = this.lines.length > 0
      ? Math.floor(
        (this.currentLine + this.terminalHeight) / this.lines.length * 100,
      )
      : 100;

    const position = `Lines ${this.currentLine + 1}-${
      Math.min(this.currentLine + this.terminalHeight, this.lines.length)
    }/${this.lines.length}`;
    const searchInfo = this.searchTerm
      ? ` | Search: "${this.searchTerm}" (${this.searchResults.length} matches)`
      : "";

    const leftStatus = colors.neonPink(`▓▓▓ GENESIS MANUAL ▓▓▓`);
    const rightStatus = colors.highlight(
      `${position} (${percent}%)${searchInfo}`,
    );
    const help = colors.dimCyan("[q:quit j/k:scroll /:search ?:help]");

    console.log(this.renderBorder("bottom"));
    console.log(`${leftStatus}  ${help}  ${rightStatus}`);
  }

  private highlightSearch(line: string): string {
    if (!this.searchTerm) return line;

    const regex = new RegExp(this.searchTerm, "gi");
    return line.replace(regex, (match) => colors.highlight(match));
  }

  private async search(): Promise<void> {
    console.log(colors.electricBlue("\nSearch: "));
    this.searchTerm = prompt("") || "";

    if (this.searchTerm) {
      this.searchResults = [];
      this.lines.forEach((line, index) => {
        if (line.toLowerCase().includes(this.searchTerm.toLowerCase())) {
          this.searchResults.push(index);
        }
      });

      if (this.searchResults.length > 0) {
        this.currentSearchIndex = 0;
        this.currentLine = this.searchResults[0];
      }
    }
  }

  private nextSearchResult(): void {
    if (this.searchResults.length === 0) return;

    this.currentSearchIndex = (this.currentSearchIndex + 1) %
      this.searchResults.length;
    this.currentLine = this.searchResults[this.currentSearchIndex];
  }

  private prevSearchResult(): void {
    if (this.searchResults.length === 0) return;

    this.currentSearchIndex = this.currentSearchIndex === 0
      ? this.searchResults.length - 1
      : this.currentSearchIndex - 1;
    this.currentLine = this.searchResults[this.currentSearchIndex];
  }

  private async showHelp(): Promise<void> {
    await this.clearScreen();

    const helpText = [
      colors.header("MANUAL PAGER CONTROLS"),
      "",
      colors.electricBlue("◆ NAVIGATION ◆"),
      "",
      "  j, ↓         " + colors.dimCyan("Scroll down one line"),
      "  k, ↑         " + colors.dimCyan("Scroll up one line"),
      "  Space, PgDn  " + colors.dimCyan("Page down"),
      "  b, PgUp      " + colors.dimCyan("Page up"),
      "  g, Home      " + colors.dimCyan("Go to top"),
      "  G, End       " + colors.dimCyan("Go to bottom"),
      "",
      colors.electricBlue("◆ SEARCH ◆"),
      "",
      "  /            " + colors.dimCyan("Search forward"),
      "  n            " + colors.dimCyan("Next search result"),
      "  N            " + colors.dimCyan("Previous search result"),
      "",
      colors.electricBlue("◆ OTHER ◆"),
      "",
      "  h, ?         " + colors.dimCyan("Show this help"),
      "  q            " + colors.dimCyan("Quit pager"),
      "",
      colors.dimCyan("Press any key to continue..."),
    ];

    helpText.forEach((line) => console.log(line));
    await this.readKey();
  }

  private async clearScreen(): Promise<void> {
    console.log("\x1B[2J\x1B[H"); // Clear screen and move to top
  }

  private async readKey(): Promise<string> {
    for await (const keypress of readKeypress()) {
      if (keypress.key) return keypress.key;
      if ("char" in keypress && typeof keypress.char === "string") return keypress.char;
    }
    return "";
  }
}

// =============================================================================
// COMMAND LINE INTERFACE
// =============================================================================

async function showManual(topic: string): Promise<void> {
  const page = MANUAL_PAGES.get(topic.toLowerCase());

  if (!page) {
    console.log(colors.neonPink(`◆ ERROR ◆`));
    console.log(colors.electricBlue(`No manual entry for '${topic}'`));
    console.log("");
    console.log(colors.dimCyan("Available manual pages:"));
    MANUAL_PAGES.forEach((_, key) => {
      console.log(`  ${colors.command(key)}`);
    });
    return;
  }

  const pager = new ManualPager();
  await pager.display(page);
}

async function listAllCommands(): Promise<void> {
  console.log(colors.header("◆ GENESIS MANUAL SYSTEM ◆"));
  console.log("");
  console.log(colors.electricBlue("Available manual pages:"));
  console.log("");

  const maxWidth = Math.max(
    ...Array.from(MANUAL_PAGES.keys()).map((k) => k.length),
  );

  MANUAL_PAGES.forEach((page, key) => {
    const padding = " ".repeat(maxWidth - key.length + 4);
    console.log(
      `  ${colors.command(key)}${padding}${colors.dimCyan(page.description[0])}`,
    );
  });

  console.log("");
  console.log(colors.dimCyan("Usage: genesis man <command>"));
  console.log(colors.dimCyan("   or: deno run man.ts <command>"));
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main(): Promise<void> {
  const args = parse(Deno.args, {
    boolean: ["help", "list", "version"],
    alias: { h: "help", l: "list", v: "version" },
  });

  if (args.version) {
    console.log(colors.header("Genesis Manual System v2.0.0"));
    console.log(colors.dimCyan("Built with Unix Philosophy and Deno"));
    return;
  }

  if (args.help) {
    console.log(colors.header("◆ GENESIS MANUAL SYSTEM ◆"));
    console.log("");
    console.log(colors.electricBlue("Usage:"));
    console.log("  genesis man <command>     View manual for command");
    console.log("  genesis man --list        List all available manuals");
    console.log("  genesis man --help        Show this help");
    console.log("");
    console.log(colors.electricBlue("Pager Controls:"));
    console.log("  j/k or arrows  Navigate line by line");
    console.log("  space/b        Page down/up");
    console.log("  /              Search");
    console.log("  q              Quit");
    return;
  }

  if (args.list || args._.length === 0) {
    await listAllCommands();
    return;
  }

  const topic = String(args._[0]);
  await showManual(topic);
}

// Self-documenting export for CLI integration
export async function manCommand(args: string[]): Promise<number> {
  try {
    const topic = args[0] || "genesis";
    await showManual(topic);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(colors.neonPink(`Error: ${message}`));
    return 1;
  }
}

// Execute if run directly
if (import.meta.main) {
  await main();
}
