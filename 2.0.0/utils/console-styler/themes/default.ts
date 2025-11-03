// themes/default.ts
import { Theme } from "./theme-interface.ts";

export const defaultTheme: Theme = {
  name: "default",
  colors: {
    primary: "\x1b[34m", // Blue
    secondary: "\x1b[36m", // Cyan
    success: "\x1b[32m", // Green
    warning: "\x1b[33m", // Yellow
    error: "\x1b[31m", // Red
    info: "\x1b[34m", // Blue
    debug: "\x1b[90m", // Gray
    critical: "\x1b[91m\x1b[1m", // Bright red + bold
    muted: "\x1b[90m", // Gray
    accent: "\x1b[96m", // Bright cyan
  },
  symbols: {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
    debug: "🔍",
    critical: "🚨",
    bullet: "•",
    arrow: "→",
    check: "✓",
    cross: "✗",
  },
  boxDrawing: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    vertical: "│",
    cross: "┼",
    teeLeft: "├",
    teeRight: "┤",
    teeTop: "┬",
    teeBottom: "┴",
  },
};
