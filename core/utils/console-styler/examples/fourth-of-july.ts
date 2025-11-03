#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write

/**
 * Fourth of July Spectacular Demo
 *
 * A patriotic showcase celebrating Independence Day with Console Styler effects.
 * Features used:
 *   • Banner intro and themed logger output
 *   • Parade preparation progress bar with stage logging
 *   • Synchronization spinner for fireworks choreography
 *   • Timeline callouts rendered inside a festive box
 *   • ASCII-styled flag salute with colorized stripes
 *   • Animated fireworks loop using direct terminal writes
 *   • Event metrics table and bar chart summary
 */

import {
  BannerRenderer,
  BoxRenderer,
  ChartRenderer,
  ColorSystem,
  ConfigBuilder,
  Formatter,
  Logger,
  neonTheme,
  ProgressBar,
  Spinner,
  TableRenderer,
} from "../mod.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const encoder = new TextEncoder();

console.clear();
console.log("\n");

// =============================================================================
// 1. STAR-SPANGLED BANNER
// =============================================================================

BannerRenderer.render({
  title: "🎆 STARS & STRIPES SPECTACULAR",
  subtitle: "Independence Day terminal celebration in vivid color",
  description: "Coordinating parade coverage, patriotic visuals, and synchronized fireworks",
  version: "july-4th-2024",
  author: "Observability Team",
  width: 96,
  color: ColorSystem.codes.brightBlue,
});
console.log("\n");

// =============================================================================
// 2. COMMAND CENTER LOGGER
// =============================================================================

console.log(ColorSystem.colorize("2. Command Center Logger", ColorSystem.codes.bright));

const commandLogger = new Logger(
  new ConfigBuilder()
    .theme(neonTheme)
    .logLevel("debug")
    .timestampFormat("HH:mm:ss")
    .enableHistory(true)
    .build(),
);

commandLogger.info("Fourth of July control tower online");
commandLogger.success("Neon theme engaged with patriotic overrides");
commandLogger.debug("Event toggles", {
  paradeCoverage: true,
  droneFireworks: true,
  crowdAnalytics: true,
});
console.log("\n");

// =============================================================================
// 3. PARADE PREPARATION PROGRESS
// =============================================================================

console.log(ColorSystem.colorize("3. Parade Preparation Progress", ColorSystem.codes.bright));

const paradeBar = new ProgressBar({
  total: 100,
  width: 50,
  showValue: false,
  showPercentage: true,
  colorize: true,
});

const paradeStages = [
  { label: "Route barricades secured", delta: 18 },
  { label: "Grand marshal escorted", delta: 22 },
  { label: "Bands tuned and aligned", delta: 20 },
  { label: "Floats staged in order", delta: 24 },
  { label: "Honor guard ready", delta: 16 },
];

let paradeProgress = 0;
for (const stage of paradeStages) {
  paradeProgress = Math.min(100, paradeProgress + stage.delta);
  paradeBar.update(paradeProgress);
  commandLogger.info(stage.label, { progress: `${paradeProgress}%` });
  await sleep(140);
}
paradeBar.complete();
console.log("\n");

// =============================================================================
// 4. FIREWORKS SYNC SPINNER
// =============================================================================

console.log(ColorSystem.colorize("4. Fireworks Sync Spinner", ColorSystem.codes.bright));

const syncSpinner = new Spinner({
  message: "Calibrating drone choreography...",
  frames: ["✶", "✷", "✸", "✹", "✺", "✻", "✺", "✹", "✸", "✷"],
  interval: 120,
});

syncSpinner.start();
await sleep(680);
syncSpinner.update("Mapping skyline trajectories...");
await sleep(680);
syncSpinner.update("Arming pyrotechnic payloads...");
await sleep(680);
syncSpinner.succeed("Fireworks synchronized • Launch window locked");
console.log("\n");

// =============================================================================
// 5. CELEBRATION TIMELINE
// =============================================================================

console.log(ColorSystem.colorize("5. Celebration Timeline", ColorSystem.codes.bright));

BoxRenderer.render(
  [
    Formatter.pad("19:00", 6) + " • Gates open • Food trucks & live brass band",
    Formatter.pad("20:15", 6) + " • Twilight drone rehearsal above the monument",
    Formatter.pad("21:00", 6) + " • National anthem with combined choirs",
    Formatter.pad("21:30", 6) + " • Fireworks salvo accompanied by drone flag",
  ],
  {
    title: "Evening Schedule",
    style: "double",
    color: ColorSystem.codes.brightWhite,
    padding: 1,
  },
);
console.log("\n");

// =============================================================================
// 6. FLAG SALUTE
// =============================================================================

console.log(ColorSystem.colorize("6. Flag Salute", ColorSystem.codes.bright));

const stripePattern = "███████████████████████████████████████";
const unionPattern = "████████████";
const unionField = ColorSystem.colorize(unionPattern, ColorSystem.codes.brightBlue);
const starRows = [
  "★  ☆  ★  ☆  ★  ☆",
  " ☆  ★  ☆  ★  ☆ ",
];

for (let i = 0; i < 13; i++) {
  const stripeColor = i % 2 === 0
    ? ColorSystem.codes.brightRed
    : ColorSystem.codes.brightWhite;
  const fullStripe = ColorSystem.colorize(stripePattern, stripeColor);
  if (i < 7) {
    const stars = ColorSystem.colorize(
      starRows[i % starRows.length].padEnd(12, " "),
      ColorSystem.codes.brightWhite,
    );
    const remainderPattern = stripePattern.slice(unionPattern.length);
    const remainder = ColorSystem.colorize(remainderPattern, stripeColor);
    console.log(`${unionField}${stars}${remainder}`);
  } else {
    console.log(fullStripe);
  }
}
console.log("\n");

// =============================================================================
// 7. FIREWORKS FINALE
// =============================================================================

console.log(ColorSystem.colorize("7. Fireworks Finale", ColorSystem.codes.bright));

const fireworksFrames = [
  [
    "                ",
    "                ",
    "                ",
    ColorSystem.colorize("        ✶       ", ColorSystem.codes.brightBlue),
    "                ",
    "                ",
    "                ",
    "                ",
  ],
  [
    "                ",
    ColorSystem.colorize("       ✷        ", ColorSystem.codes.brightRed),
    "                ",
    ColorSystem.colorize("     ✦   ✦      ", ColorSystem.codes.brightWhite),
    "                ",
    ColorSystem.colorize("       ✷        ", ColorSystem.codes.brightBlue),
    "                ",
    "                ",
  ],
  [
    ColorSystem.colorize("      ✹         ", ColorSystem.codes.brightBlue),
    "                ",
    ColorSystem.colorize("   ✨  ✨  ✨     ", ColorSystem.codes.brightWhite),
    "                ",
    ColorSystem.colorize("    ✷ ✸ ✷      ", ColorSystem.codes.brightRed),
    "                ",
    ColorSystem.colorize("      ✹         ", ColorSystem.codes.brightWhite),
    "                ",
  ],
  [
    ColorSystem.colorize("    ✶  ✺  ✶     ", ColorSystem.codes.brightRed),
    "                ",
    ColorSystem.colorize("  ✨ ✨ ✨ ✨     ", ColorSystem.codes.brightBlue),
    "                ",
    ColorSystem.colorize("   ✦ ✧ ✦ ✧    ", ColorSystem.codes.brightWhite),
    "                ",
    ColorSystem.colorize("     ✸✺✸       ", ColorSystem.codes.brightRed),
    "                ",
  ],
];

for (let volley = 0; volley < 3; volley++) {
  for (const frame of fireworksFrames) {
    const composite = frame.join("\n");
    Deno.stdout.writeSync(encoder.encode(`\x1B[?25l\x1B7\r${composite}\x1B8`));
    await sleep(190);
  }
  await sleep(160);
}
Deno.stdout.writeSync(encoder.encode("\x1B[?25h\x1B7\r\x1B[J\x1B8"));
console.log(ColorSystem.colorize("Sky ablaze above the reflecting pool!", ColorSystem.codes.brightWhite));
console.log("\n");

// =============================================================================
// 8. EVENT METRICS
// =============================================================================

console.log(ColorSystem.colorize("8. Event Metrics", ColorSystem.codes.bright));

TableRenderer.render(
  [
    {
      metric: "Attendees",
      value: Formatter.number(215_000),
      highlight: "Across the National Mall",
    },
    {
      metric: "Fireworks shells",
      value: Formatter.number(1_240),
      highlight: "Launched in 15 sequences",
    },
    {
      metric: "Drone performers",
      value: Formatter.number(500),
      highlight: "Choreography by lightscript",
    },
  ],
  [
    { key: "metric", label: "Metric", width: 20 },
    { key: "value", label: "Value", width: 18, align: "right" },
    { key: "highlight", label: "Highlights", width: 48 },
  ],
  { showIndex: true },
);
console.log("\n");

// =============================================================================
// 9. CROWD ENERGY BAR CHART
// =============================================================================

console.log(ColorSystem.colorize("9. Crowd Energy Bar Chart", ColorSystem.codes.bright));

ChartRenderer.barChart(
  [
    { label: "Pre-show", value: 58 },
    { label: "Anthem", value: 74 },
    { label: "Finale", value: 95 },
    { label: "Encore", value: 88 },
  ],
  {
    width: 36,
    colorize: true,
    color: ColorSystem.codes.brightBlue,
    showLabels: true,
  },
);
console.log("\n");

commandLogger.success("Fourth of July operations complete");
commandLogger.info("Terminal restored and cursor visible");
