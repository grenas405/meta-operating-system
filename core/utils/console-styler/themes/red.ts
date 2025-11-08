// themes/red.ts
import { Theme } from "./theme-interface.ts";
import { ColorSystem } from "../core/colors.ts";

export const redAlertTheme: Theme = {
  name: "red-alert",
  colors: {
    primary: ColorSystem.hexToRgb("#d50000"), // Deep red
    secondary: ColorSystem.hexToRgb("#ff5252"), // Soft red accent
    success: ColorSystem.hexToRgb("#ff8a80"), // Warm highlight for success
    warning: ColorSystem.hexToRgb("#ffab40"), // Amber
    error: ColorSystem.hexToRgb("#ff1744"), // Bright alert red
    info: ColorSystem.hexToRgb("#ff6e6e"), // Pastel red for info
    debug: ColorSystem.hexToRgb("#784d4d"), // Muted red-brown
    critical: ColorSystem.hexToRgb("#b71c1c") + "\x1b[1m", // Bold crimson
    muted: ColorSystem.hexToRgb("#4e2727"), // Dark muted red
    accent: ColorSystem.hexToRgb("#ff4081"), // Vibrant pink accent
  },
  symbols: {
    success: "✔",
    error: "✖",
    warning: "▲",
    info: "ⓘ",
    debug: "◆",
    critical: "⛔",
    bullet: "•",
    arrow: "➤",
    check: "✔",
    cross: "✖",
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
