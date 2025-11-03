// themes/minimal.ts
import { Theme } from "./theme-interface.ts";

export const minimalTheme: Theme = {
  name: "minimal",
  colors: {
    primary: "\x1b[0m",
    secondary: "\x1b[0m",
    success: "\x1b[0m",
    warning: "\x1b[0m",
    error: "\x1b[0m",
    info: "\x1b[0m",
    debug: "\x1b[2m",
    critical: "\x1b[0m",
    muted: "\x1b[2m",
    accent: "\x1b[0m",
  },
  symbols: {
    success: "[OK]",
    error: "[ERR]",
    warning: "[WRN]",
    info: "[INF]",
    debug: "[DBG]",
    critical: "[CRT]",
    bullet: "-",
    arrow: "->",
    check: "+",
    cross: "x",
  },
  boxDrawing: {
    topLeft: "+",
    topRight: "+",
    bottomLeft: "+",
    bottomRight: "+",
    horizontal: "-",
    vertical: "|",
    cross: "+",
    teeLeft: "+",
    teeRight: "+",
    teeTop: "+",
    teeBottom: "+",
  },
};
