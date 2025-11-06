// utils/terminal.ts
export class TerminalDetector {
  /**
   * Check if terminal supports colors
   */
  static supportsColor(): boolean {
    // Check if running in CI
    if (Deno.env.get("CI") === "true") return false;

    // Check NO_COLOR environment variable
    if (Deno.env.get("NO_COLOR")) return false;

    // Check FORCE_COLOR environment variable
    if (Deno.env.get("FORCE_COLOR")) return true;

    // Check TERM variable
    const term = Deno.env.get("TERM");
    if (term === "dumb") return false;

    // Check if stdout is TTY
    try {
      return Deno.stdout.isTerminal();
    } catch {
      return false;
    }
  }

  /**
   * Check if terminal supports 256 colors
   */
  static supports256Colors(): boolean {
    if (!this.supportsColor()) return false;

    const term = Deno.env.get("TERM") || "";
    return term.includes("256color") ||
      term.includes("xterm") ||
      term.includes("screen");
  }

  /**
   * Check if terminal supports true color (16 million colors)
   */
  static supportsTrueColor(): boolean {
    if (!this.supports256Colors()) return false;

    const colorterm = Deno.env.get("COLORTERM");
    return colorterm === "truecolor" || colorterm === "24bit";
  }

  /**
   * Check if terminal supports Unicode
   */
  static supportsUnicode(): boolean {
    const lang = Deno.env.get("LANG") || "";
    const lcAll = Deno.env.get("LC_ALL") || "";

    return lang.includes("UTF-8") ||
      lang.includes("utf8") ||
      lcAll.includes("UTF-8") ||
      lcAll.includes("utf8");
  }

  /**
   * Get terminal size
   */
  static getSize(): { columns: number; rows: number } {
    try {
      return Deno.consoleSize();
    } catch {
      return { columns: 80, rows: 24 }; // Defaults
    }
  }

  /**
   * Check if terminal is interactive
   */
  static isInteractive(): boolean {
    try {
      return Deno.stdin.isTerminal() && Deno.stdout.isTerminal();
    } catch {
      return false;
    }
  }

  /**
   * Detect terminal environment
   */
  static detectEnvironment(): {
    ci: boolean;
    terminal: string;
    colorSupport: "none" | "basic" | "256" | "truecolor";
    unicode: boolean;
    interactive: boolean;
    size: { columns: number; rows: number };
  } {
    return {
      ci: !!Deno.env.get("CI"),
      terminal: Deno.env.get("TERM") || "unknown",
      colorSupport: this.supportsTrueColor()
        ? "truecolor"
        : this.supports256Colors()
        ? "256"
        : this.supportsColor()
        ? "basic"
        : "none",
      unicode: this.supportsUnicode(),
      interactive: this.isInteractive(),
      size: this.getSize(),
    };
  }

  /**
   * Clear terminal screen
   */
  static clear(): void {
    console.clear();
  }

  /**
   * Move cursor to position
   */
  static moveCursor(x: number, y: number): void {
    Deno.stdout.writeSync(new TextEncoder().encode(`\x1b[${y};${x}H`));
  }

  /**
   * Hide cursor
   */
  static hideCursor(): void {
    Deno.stdout.writeSync(new TextEncoder().encode("\x1B[?25l"));
  }

  /**
   * Show cursor
   */
  static showCursor(): void {
    Deno.stdout.writeSync(new TextEncoder().encode("\x1B[?25h"));
  }

  /**
   * Clear current line
   */
  static clearLine(): void {
    Deno.stdout.writeSync(new TextEncoder().encode("\r\x1B[K"));
  }

  /**
   * Move cursor up n lines
   */
  static cursorUp(n = 1): void {
    Deno.stdout.writeSync(new TextEncoder().encode(`\x1b[${n}A`));
  }

  /**
   * Move cursor down n lines
   */
  static cursorDown(n = 1): void {
    Deno.stdout.writeSync(new TextEncoder().encode(`\x1b[${n}B`));
  }
}
