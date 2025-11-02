/**
 * @fileoverview ANSI color code definitions with full spectrum support
 * @philosophy Semantic color naming for business context
 *
 * Supports three color modes:
 * - 16 colors (basic ANSI - universal compatibility)
 * - 256 colors (extended palette - modern terminals)
 * - 16.7M colors (true color RGB - latest terminals)
 */

// =============================================================================
// 16 BASIC ANSI COLORS (Universal Support)
// =============================================================================

/**
 * Core ANSI escape sequences - 16 color mode
 * These work on ALL terminals, even ancient ones
 *
 * @example
 * ```typescript
 * console.log(`${colors.red}Error!${colors.reset}`);
 * console.log(`${colors.brightGreen}Success!${colors.reset}`);
 * ```
 */
export const colors = {
  // Reset and modifiers
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  strikethrough: "\x1b[9m",

  // Standard foreground colors (30-37)
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",

  // Bright foreground colors (90-97)
  gray: "\x1b[90m", // Also called "bright black"
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",

  // Background colors (40-47)
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",

  // Bright background colors (100-107)
  bgGray: "\x1b[100m",
  bgBrightRed: "\x1b[101m",
  bgBrightGreen: "\x1b[102m",
  bgBrightYellow: "\x1b[103m",
  bgBrightBlue: "\x1b[104m",
  bgBrightMagenta: "\x1b[105m",
  bgBrightCyan: "\x1b[106m",
  bgBrightWhite: "\x1b[107m",

  // Semantic colors (business context)
  success: "\x1b[32m", // Green - successful operations
  error: "\x1b[31m", // Red - error conditions
  warning: "\x1b[33m", // Yellow - warnings
  info: "\x1b[36m", // Cyan - informational
  critical: "\x1b[91m", // Bright red - critical issues
  accent: "\x1b[95m", // Bright magenta - highlights
  gold: "\x1b[93m", // Bright yellow - premium/important

  // True color RGB function (16.7M colors)
  rgb: (r: number, g: number, b: number): string => {
    validateRGB(r, g, b);
    return `\x1b[38;2;${r};${g};${b}m`;
  },

  bgRgb: (r: number, g: number, b: number): string => {
    validateRGB(r, g, b);
    return `\x1b[48;2;${r};${g};${b}m`;
  },
} as const;

// =============================================================================
// 256 COLOR PALETTE SUPPORT
// =============================================================================

/**
 * Generate ANSI code for 256-color foreground
 *
 * Color ranges:
 * - 0-15: Standard ANSI colors (same as 16-color mode)
 * - 16-231: 6×6×6 RGB cube (216 colors)
 * - 232-255: Grayscale ramp (24 shades)
 *
 * @param colorNumber - Color index (0-255)
 * @returns ANSI escape code
 *
 * @example
 * ```typescript
 * console.log(`${color256(196)}Bright red${colors.reset}`);
 * console.log(`${color256(21)}Deep blue${colors.reset}`);
 * ```
 */
export function color256(colorNumber: number): string {
  if (!Number.isInteger(colorNumber) || colorNumber < 0 || colorNumber > 255) {
    throw new Error(`Color number must be an integer between 0-255, got: ${colorNumber}`);
  }
  return `\x1b[38;5;${colorNumber}m`;
}

/**
 * Generate ANSI code for 256-color background
 *
 * @param colorNumber - Color index (0-255)
 * @returns ANSI escape code
 *
 * @example
 * ```typescript
 * console.log(`${bgColor256(196)}Red background${colors.reset}`);
 * ```
 */
export function bgColor256(colorNumber: number): string {
  if (!Number.isInteger(colorNumber) || colorNumber < 0 || colorNumber > 255) {
    throw new Error(`Color number must be an integer between 0-255, got: ${colorNumber}`);
  }
  return `\x1b[48;5;${colorNumber}m`;
}

/**
 * Predefined popular 256 colors with semantic names
 *
 * @example
 * ```typescript
 * console.log(`${colors256.orange}Warning!${colors.reset}`);
 * console.log(`${colors256.deepBlue}Info${colors.reset}`);
 * ```
 */
export const colors256 = {
  // Reds (various shades)
  maroon: color256(52),
  darkRed: color256(88),
  red: color256(124),
  crimson: color256(160),
  brightRed: color256(196),
  lightRed: color256(203),
  pink: color256(218),

  // Greens
  darkGreen: color256(22),
  forestGreen: color256(28),
  green: color256(34),
  limeGreen: color256(40),
  brightGreen: color256(46),
  springGreen: color256(48),
  lightGreen: color256(82),
  mint: color256(121),

  // Blues
  navy: color256(17),
  darkBlue: color256(18),
  deepBlue: color256(19),
  blue: color256(21),
  royalBlue: color256(27),
  dodgerBlue: color256(33),
  brightBlue: color256(39),
  skyBlue: color256(45),
  lightBlue: color256(81),
  aqua: color256(51),

  // Purples and Magentas
  darkPurple: color256(54),
  purple: color256(93),
  violet: color256(99),
  orchid: color256(134),
  brightPurple: color256(129),
  lightPurple: color256(141),
  magenta: color256(165),
  brightMagenta: color256(201),

  // Oranges and Yellows
  brown: color256(94),
  darkOrange: color256(130),
  orange: color256(166),
  brightOrange: color256(208),
  lightOrange: color256(214),
  gold: color256(220),
  yellow: color256(226),
  lightYellow: color256(229),

  // Cyans and Teals
  teal: color256(30),
  darkCyan: color256(36),
  cyan: color256(51),
  brightCyan: color256(87),
  lightCyan: color256(123),
  turquoise: color256(80),

  // Grayscale (24 shades from dark to light)
  gray1: color256(232), // Almost black
  gray2: color256(233),
  gray3: color256(234),
  gray4: color256(235),
  gray5: color256(236),
  gray6: color256(237),
  gray7: color256(238),
  gray8: color256(239),
  gray9: color256(240),
  gray10: color256(241),
  gray11: color256(242),
  gray12: color256(243),
  gray13: color256(244),
  gray14: color256(245),
  gray15: color256(246),
  gray16: color256(247),
  gray17: color256(248),
  gray18: color256(249),
  gray19: color256(250),
  gray20: color256(251),
  gray21: color256(252),
  gray22: color256(253),
  gray23: color256(254),
  gray24: color256(255), // Almost white

  // Semantic colors using 256 palette
  successDark: color256(22),
  successBright: color256(46),
  errorDark: color256(88),
  errorBright: color256(196),
  warningDark: color256(130),
  warningBright: color256(226),
  infoDark: color256(24),
  infoBright: color256(51),
} as const;

// =============================================================================
// RGB COLOR SPACE UTILITIES
// =============================================================================

/**
 * Validate RGB values
 */
function validateRGB(r: number, g: number, b: number): void {
  if (!Number.isInteger(r) || r < 0 || r > 255) {
    throw new Error(`Red value must be an integer between 0-255, got: ${r}`);
  }
  if (!Number.isInteger(g) || g < 0 || g > 255) {
    throw new Error(`Green value must be an integer between 0-255, got: ${g}`);
  }
  if (!Number.isInteger(b) || b < 0 || b > 255) {
    throw new Error(`Blue value must be an integer between 0-255, got: ${b}`);
  }
}

/**
 * Convert hex color to RGB ANSI code
 *
 * @param hex - Hex color string (e.g., "#FF5733" or "FF5733")
 * @returns ANSI escape code for true color
 *
 * @example
 * ```typescript
 * console.log(`${hexToRgb('#FF5733')}Custom color${colors.reset}`);
 * console.log(`${hexToRgb('00FF00')}Green${colors.reset}`);
 * ```
 */
export function hexToRgb(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Validate hex string
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    throw new Error(`Invalid hex color: ${hex}. Must be 6 hexadecimal digits.`);
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return colors.rgb(r, g, b);
}

/**
 * Convert hex color to RGB background ANSI code
 *
 * @param hex - Hex color string
 * @returns ANSI escape code for true color background
 */
export function hexToBgRgb(hex: string): string {
  hex = hex.replace(/^#/, "");

  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
    throw new Error(`Invalid hex color: ${hex}. Must be 6 hexadecimal digits.`);
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return colors.bgRgb(r, g, b);
}

/**
 * Convert RGB values to closest 256-color palette index
 * Useful for fallback when true color is not supported
 *
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Color index in 256-color palette (16-231)
 *
 * @example
 * ```typescript
 * const colorIndex = rgbTo256(255, 87, 51);
 * console.log(`${color256(colorIndex)}Approximate color${colors.reset}`);
 * ```
 */
export function rgbTo256(r: number, g: number, b: number): number {
  validateRGB(r, g, b);

  // 6×6×6 color cube starts at index 16
  // Each component is quantized to 6 levels: 0, 95, 135, 175, 215, 255
  const levels = [0, 95, 135, 175, 215, 255];

  // Find closest level for each component
  const rIndex = findClosestLevel(r, levels);
  const gIndex = findClosestLevel(g, levels);
  const bIndex = findClosestLevel(b, levels);

  // Calculate color index: 16 + 36×r + 6×g + b
  return 16 + (36 * rIndex) + (6 * gIndex) + bIndex;
}

/**
 * Find closest value in array
 */
function findClosestLevel(value: number, levels: number[]): number {
  let minDistance = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < levels.length; i++) {
    const distance = Math.abs(value - levels[i]);
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }

  return closestIndex;
}

/**
 * Create a gradient between two RGB colors
 *
 * @param startRgb - Starting RGB color [r, g, b]
 * @param endRgb - Ending RGB color [r, g, b]
 * @param steps - Number of gradient steps
 * @returns Array of ANSI color codes
 *
 * @example
 * ```typescript
 * const gradient = createGradient([255, 0, 0], [0, 0, 255], 10);
 * gradient.forEach((color, i) => {
 *   console.log(`${color}Gradient step ${i}${colors.reset}`);
 * });
 * ```
 */
export function createGradient(
  startRgb: [number, number, number],
  endRgb: [number, number, number],
  steps: number,
): string[] {
  if (steps < 2) {
    throw new Error("Gradient must have at least 2 steps");
  }

  const [r1, g1, b1] = startRgb;
  const [r2, g2, b2] = endRgb;

  validateRGB(r1, g1, b1);
  validateRGB(r2, g2, b2);

  const gradient: string[] = [];

  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);

    gradient.push(colors.rgb(r, g, b));
  }

  return gradient;
}

// =============================================================================
// TERMINAL CAPABILITY DETECTION
// =============================================================================

/**
 * Detect terminal color capabilities
 *
 * @returns Color support level
 */
export type ColorSupport = "none" | "basic" | "256" | "truecolor";

export function detectColorSupport(): ColorSupport {
  // Check for NO_COLOR environment variable
  if (typeof Deno !== "undefined" && Deno.env.get("NO_COLOR")) {
    return "none";
  }

  // Check if stdout is a TTY
  if (typeof Deno !== "undefined" && !Deno.stdout.isTerminal()) {
    return "none";
  }

  // Check COLORTERM for true color support
  if (typeof Deno !== "undefined") {
    const colorterm = Deno.env.get("COLORTERM");
    if (colorterm === "truecolor" || colorterm === "24bit") {
      return "truecolor";
    }
  }

  // Check TERM for 256 color support
  if (typeof Deno !== "undefined") {
    const term = Deno.env.get("TERM") || "";
    if (term.includes("256") || term.includes("256color")) {
      return "256";
    }
  }

  // Default to basic color support
  return "basic";
}

/**
 * Check if terminal supports colors
 */
export function supportsColor(): boolean {
  return detectColorSupport() !== "none";
}

/**
 * Check if terminal supports 256 colors
 */
export function supports256Color(): boolean {
  const support = detectColorSupport();
  return support === "256" || support === "truecolor";
}

/**
 * Check if terminal supports true color (16.7M colors)
 */
export function supportsTrueColor(): boolean {
  return detectColorSupport() === "truecolor";
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Color type for type-safe color references
 */
export type ColorName = keyof typeof colors;
export type Color256Name = keyof typeof colors256;

/**
 * Utility function to colorize text
 *
 * @param text - Text to colorize
 * @param color - Color name or ANSI code
 * @returns Colorized text with reset
 *
 * @example
 * ```typescript
 * console.log(colorize('Success!', 'green'));
 * console.log(colorize('Error!', colors.red));
 * ```
 */
export function colorize(text: string, color: ColorName | string): string {
  const colorCode = typeof color === "string" && color in colors
    ? colors[color as ColorName]
    : color;

  return `${colorCode}${text}${colors.reset}`;
}

/**
 * Apply multiple text modifiers
 *
 * @param text - Text to modify
 * @param modifiers - Array of modifiers
 * @returns Modified text
 *
 * @example
 * ```typescript
 * console.log(applyModifiers('Important!', ['bright', 'red', 'underscore']));
 * ```
 */
export function applyModifiers(text: string, modifiers: ColorName[]): string {
  const codes = modifiers.map((mod) => colors[mod]).join("");
  return `${codes}${text}${colors.reset}`;
}

/**
 * Strip all ANSI escape codes from text
 * Essential for calculating actual text width
 *
 * @param text - Text with ANSI codes
 * @returns Plain text
 *
 * @example
 * ```typescript
 * const colored = `${colors.red}Hello${colors.reset}`;
 * console.log(colored.length);        // 17 (with codes)
 * console.log(stripAnsi(colored).length);  // 5 (without codes)
 * ```
 */
export function stripAnsi(text: string): string {
  // Matches all ANSI escape sequences
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

// =============================================================================
// PREDEFINED COLOR PALETTES
// =============================================================================

/**
 * Predefined color palettes for common use cases
 */
export const palettes = {
  /**
   * Solarized color scheme (popular among developers)
   */
  solarized: {
    base03: hexToRgb("#002b36"),
    base02: hexToRgb("#073642"),
    base01: hexToRgb("#586e75"),
    base00: hexToRgb("#657b83"),
    base0: hexToRgb("#839496"),
    base1: hexToRgb("#93a1a1"),
    base2: hexToRgb("#eee8d5"),
    base3: hexToRgb("#fdf6e3"),
    yellow: hexToRgb("#b58900"),
    orange: hexToRgb("#cb4b16"),
    red: hexToRgb("#dc322f"),
    magenta: hexToRgb("#d33682"),
    violet: hexToRgb("#6c71c4"),
    blue: hexToRgb("#268bd2"),
    cyan: hexToRgb("#2aa198"),
    green: hexToRgb("#859900"),
  },

  /**
   * Nord color scheme (popular Arctic-inspired palette)
   */
  nord: {
    // Polar Night
    nord0: hexToRgb("#2e3440"),
    nord1: hexToRgb("#3b4252"),
    nord2: hexToRgb("#434c5e"),
    nord3: hexToRgb("#4c566a"),
    // Snow Storm
    nord4: hexToRgb("#d8dee9"),
    nord5: hexToRgb("#e5e9f0"),
    nord6: hexToRgb("#eceff4"),
    // Frost
    nord7: hexToRgb("#8fbcbb"),
    nord8: hexToRgb("#88c0d0"),
    nord9: hexToRgb("#81a1c1"),
    nord10: hexToRgb("#5e81ac"),
    // Aurora
    nord11: hexToRgb("#bf616a"),
    nord12: hexToRgb("#d08770"),
    nord13: hexToRgb("#ebcb8b"),
    nord14: hexToRgb("#a3be8c"),
    nord15: hexToRgb("#b48ead"),
  },

  /**
   * Dracula color scheme
   */
  dracula: {
    background: hexToRgb("#282a36"),
    currentLine: hexToRgb("#44475a"),
    foreground: hexToRgb("#f8f8f2"),
    comment: hexToRgb("#6272a4"),
    cyan: hexToRgb("#8be9fd"),
    green: hexToRgb("#50fa7b"),
    orange: hexToRgb("#ffb86c"),
    pink: hexToRgb("#ff79c6"),
    purple: hexToRgb("#bd93f9"),
    red: hexToRgb("#ff5555"),
    yellow: hexToRgb("#f1fa8c"),
  },

  /**
   * Monokai color scheme
   */
  monokai: {
    background: hexToRgb("#272822"),
    foreground: hexToRgb("#f8f8f2"),
    red: hexToRgb("#f92672"),
    orange: hexToRgb("#fd971f"),
    yellow: hexToRgb("#e6db74"),
    green: hexToRgb("#a6e22e"),
    cyan: hexToRgb("#66d9ef"),
    blue: hexToRgb("#66d9ef"),
    purple: hexToRgb("#ae81ff"),
  },
} as const;

// =============================================================================
// DEMO AND TESTING
// =============================================================================

/**
 * Display all available colors (useful for testing)
 */
export function displayColorPalette(): void {
  console.log("\n=== 16 BASIC ANSI COLORS ===\n");

  console.log("Standard colors:");
  console.log(
    `${colors.black}${colors.bgWhite}black${colors.reset}  ${colors.red}red${colors.reset}  ${colors.green}green${colors.reset}  ${colors.yellow}yellow${colors.reset}  ${colors.blue}blue${colors.reset}  ${colors.magenta}magenta${colors.reset}  ${colors.cyan}cyan${colors.reset}  ${colors.white}white${colors.reset}`,
  );

  console.log("\nBright colors:");
  console.log(
    `${colors.gray}gray${colors.reset}  ${colors.brightRed}brightRed${colors.reset}  ${colors.brightGreen}brightGreen${colors.reset}  ${colors.brightYellow}brightYellow${colors.reset}  ${colors.brightBlue}brightBlue${colors.reset}  ${colors.brightMagenta}brightMagenta${colors.reset}  ${colors.brightCyan}brightCyan${colors.reset}  ${colors.brightWhite}brightWhite${colors.reset}`,
  );

  console.log("\n=== 256 COLOR PALETTE (Sample) ===\n");

  // Display color cube (simplified)
  for (let i = 16; i < 232; i += 36) {
    let line = "";
    for (let j = 0; j < 36; j++) {
      const colorNum = i + j;
      line += `${color256(colorNum)}●${colors.reset}`;
    }
    console.log(line);
  }

  console.log("\nGrayscale:");
  let grayscale = "";
  for (let i = 232; i <= 255; i++) {
    grayscale += `${color256(i)}█${colors.reset}`;
  }
  console.log(grayscale);

  console.log("\n=== TRUE COLOR (RGB) ===\n");

  // Display RGB gradient
  const gradient = createGradient([255, 0, 0], [0, 0, 255], 50);
  let gradientLine = "";
  for (const color of gradient) {
    gradientLine += `${color}█${colors.reset}`;
  }
  console.log(`Red → Blue gradient:\n${gradientLine}`);

  console.log("\n");
}

/**
 * Test color support and display capabilities
 */
export function testColorSupport(): void {
  const support = detectColorSupport();

  console.log("\n=== TERMINAL COLOR SUPPORT ===\n");
  console.log(`Color support level: ${support}`);
  console.log(`Supports colors: ${supportsColor()}`);
  console.log(`Supports 256 colors: ${supports256Color()}`);
  console.log(`Supports true color: ${supportsTrueColor()}`);

  if (typeof Deno !== "undefined") {
    console.log(`\nEnvironment:`);
    console.log(`  TERM: ${Deno.env.get("TERM") || "not set"}`);
    console.log(`  COLORTERM: ${Deno.env.get("COLORTERM") || "not set"}`);
    console.log(`  NO_COLOR: ${Deno.env.get("NO_COLOR") || "not set"}`);
    console.log(`  Is TTY: ${Deno.stdout.isTerminal()}`);
  }

  console.log("\n");
}
