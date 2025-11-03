// themes/neon.ts
import { Theme } from "./theme-interface.ts";
import { ColorSystem } from "../core/colors.ts";

export const neonTheme: Theme = {
  name: "neon",
  colors: {
    primary: ColorSystem.color256(201), // Hot pink
    secondary: ColorSystem.color256(51), // Cyan
    success: ColorSystem.color256(46), // Bright green
    warning: ColorSystem.color256(226), // Yellow
    error: ColorSystem.color256(196), // Red
    info: ColorSystem.color256(33), // Blue
    debug: ColorSystem.color256(240), // Gray
    critical: ColorSystem.color256(201) + "\x1b[5m", // Blinking pink
    muted: ColorSystem.color256(240),
    accent: ColorSystem.color256(51),
  },
  symbols: {
    success: "✨",
    error: "💥",
    warning: "⚡",
    info: "💡",
    debug: "🔍",
    critical: "🚨",
    bullet: "▸",
    arrow: "⟶",
    check: "✓",
    cross: "✗",
  },
  boxDrawing: {
    topLeft: "╔",
    topRight: "╗",
    bottomLeft: "╚",
    bottomRight: "╝",
    horizontal: "═",
    vertical: "║",
    cross: "╬",
    teeLeft: "╠",
    teeRight: "╣",
    teeTop: "╦",
    teeBottom: "╩",
  },
};
