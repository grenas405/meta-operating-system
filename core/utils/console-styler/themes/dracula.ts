// themes/dracula.ts
import { Theme } from "./theme-interface.ts";
import { ColorSystem } from "../core/colors.ts";

export const draculaTheme: Theme = {
  name: "dracula",
  colors: {
    primary: ColorSystem.hexToRgb("#bd93f9"), // Purple
    secondary: ColorSystem.hexToRgb("#8be9fd"), // Cyan
    success: ColorSystem.hexToRgb("#50fa7b"), // Green
    warning: ColorSystem.hexToRgb("#ffb86c"), // Orange
    error: ColorSystem.hexToRgb("#ff5555"), // Red
    info: ColorSystem.hexToRgb("#8be9fd"), // Cyan
    debug: ColorSystem.hexToRgb("#6272a4"), // Gray/Blue
    critical: ColorSystem.hexToRgb("#ff5555") + "\x1b[1m",
    muted: ColorSystem.hexToRgb("#6272a4"),
    accent: ColorSystem.hexToRgb("#f1fa8c"), // Yellow
  },
  symbols: {
    success: "✓",
    error: "✗",
    warning: "⚠",
    info: "ⓘ",
    debug: "⊙",
    critical: "⚠",
    bullet: "▪",
    arrow: "➜",
    check: "✓",
    cross: "✗",
  },
  boxDrawing: {
    topLeft: "╭",
    topRight: "╮",
    bottomLeft: "╰",
    bottomRight: "╯",
    horizontal: "─",
    vertical: "│",
    cross: "┼",
    teeLeft: "├",
    teeRight: "┤",
    teeTop: "┬",
    teeBottom: "┴",
  },
};
