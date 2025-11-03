// themes/theme-interface.ts
export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    debug: string;
    critical: string;
    muted: string;
    accent: string;
  };
  symbols: {
    success: string;
    error: string;
    warning: string;
    info: string;
    debug: string;
    critical: string;
    bullet: string;
    arrow: string;
    check: string;
    cross: string;
  };
  boxDrawing: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
    horizontal: string;
    vertical: string;
    cross: string;
    teeLeft: string;
    teeRight: string;
    teeTop: string;
    teeBottom: string;
  };
}
