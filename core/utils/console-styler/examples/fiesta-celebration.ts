#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write

/**
 * Fiesta Celebration Demo
 *
 * A vibrant example celebrating Mexico's Independence Day with animated
 * sequences powered by Console Styler.
 * Features used:
 *   • Banner intro with themed logger output
 *   • Preparation progress bar and spinner choreography
 *   • Mexican flag rendering with colorized blocks and crest glyphs
 *   • Fireworks animation using sequential terminal frames
 *   • Closing metrics table summarizing festivities
 */

import {
  BannerRenderer,
  BoxRenderer,
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
// 1. BANNER & WELCOME
// =============================================================================

BannerRenderer.render({
  title: "🎉 FIESTA PATRIA CELEBRATION",
  subtitle: "Viva México • Animated flag and fireworks showcase",
  description: "Console Styler orchestrates terminal festivities with color, rhythm, and sparks",
  version: "grito-2024",
  author: "Observability Team",
  width: 96,
  color: ColorSystem.codes.brightGreen,
});
console.log("\n");

// =============================================================================
// 2. LOGGER CONFIGURATION
// =============================================================================

console.log(ColorSystem.colorize("2. Logger Configuration", ColorSystem.codes.bright));

const fiestaLogger = new Logger(
  new ConfigBuilder()
    .theme(neonTheme)
    .logLevel("debug")
    .timestampFormat("HH:mm:ss")
    .enableHistory(true)
    .build(),
);

fiestaLogger.info("Fiesta control center online");
fiestaLogger.success("Neon theme engaged for celebratory palette");
fiestaLogger.debug("Scene toggles", {
  bandera: true,
  fuegosArtificiales: true,
  mariachiSpinner: true,
});
console.log("\n");

// =============================================================================
// 3. CELEBRATION PREPARATIONS
// =============================================================================

console.log(ColorSystem.colorize("3. Celebration Preparations", ColorSystem.codes.bright));

const prepBar = new ProgressBar({
  total: 100,
  width: 48,
  showValue: false,
  showPercentage: true,
  colorize: true,
});

const prepStages = [
  { label: "Plaza lights synced", delta: 18 },
  { label: "Mariachi tuned", delta: 22 },
  { label: "Floats positioned", delta: 28 },
  { label: "Crowd assembled", delta: 18 },
  { label: "Torch lit", delta: 14 },
];

let prepProgress = 0;
for (const stage of prepStages) {
  prepProgress = Math.min(100, prepProgress + stage.delta);
  prepBar.update(prepProgress);
  fiestaLogger.info(stage.label, { progress: `${prepProgress}%` });
  await sleep(160);
}
prepBar.complete();
console.log("\n");

// =============================================================================
// 4. MARIACHI SPINNER INTERLUDE
// =============================================================================

console.log(ColorSystem.colorize("4. Mariachi Spinner Interlude", ColorSystem.codes.bright));

const mariachiSpinner = new Spinner({
  message: "Afinando guitarrones...",
  frames: ["♩", "♪", "♬", "♩", "♪", "♬", "♫"],
  interval: 140,
});

mariachiSpinner.start();
await sleep(720);
mariachiSpinner.update("Calibrando trompetas...");
await sleep(720);
mariachiSpinner.update("Coordinando grito colectivo...");
await sleep(720);
mariachiSpinner.succeed("Mariachi listo • ¡Que comience la fiesta!");
console.log("\n");

// =============================================================================
// 5. MEXICAN FLAG RENDERING
// =============================================================================

console.log(ColorSystem.colorize("5. Bandera Mexicana", ColorSystem.codes.bright));

const crest = ColorSystem.colorize("🦅", ColorSystem.codes.brightYellow);
const cactus = ColorSystem.colorize("🌵", ColorSystem.codes.brightGreen);
const serpent = ColorSystem.colorize("🐍", ColorSystem.codes.brightRed);

const flagRows = [
  { crest: "      " },
  { crest: `  ${crest}   ` },
  { crest: ` ${crest}${cactus}${serpent}  ` },
  { crest: `  ${crest}   ` },
  { crest: "      " },
];

for (const row of flagRows) {
  const left = ColorSystem.colorize("██████████", ColorSystem.codes.brightGreen);
  const center = ColorSystem.colorize(row.crest.padEnd(10, " "), ColorSystem.codes.brightWhite);
  const right = ColorSystem.colorize("██████████", ColorSystem.codes.brightRed);
  console.log(`${left}${center}${right}`);
}

BoxRenderer.render(
  [
    "Colores patrios: verde, blanco y rojo",
    "Escudo nacional representado con el águila devorando la serpiente",
    "Símbolo de independencia y orgullo cultural",
  ],
  {
    style: "rounded",
    title: "Significado",
    color: ColorSystem.codes.brightGreen,
    padding: 1,
  },
);
console.log("\n");

// =============================================================================
// 6. FIREWORKS SPECTACULAR
// =============================================================================

console.log(ColorSystem.colorize("6. Fuegos Artificiales", ColorSystem.codes.bright));

const fireworksFrames = [
  [
    "            ",
    "            ",
    "            ",
    "            ",
    "            ",
    ColorSystem.colorize("      ✶     ", ColorSystem.codes.brightGreen),
    "            ",
    "            ",
  ],
  [
    "            ",
    "            ",
    ColorSystem.colorize("     ✷      ", ColorSystem.codes.brightRed),
    "            ",
    ColorSystem.colorize("   ✵   ✵    ", ColorSystem.codes.brightYellow),
    "            ",
    "            ",
    "            ",
  ],
  [
    ColorSystem.colorize("     ✺      ", ColorSystem.codes.brightGreen),
    "            ",
    ColorSystem.colorize("   ✨   ✨   ", ColorSystem.codes.brightCyan),
    "            ",
    ColorSystem.colorize("  ✦  ✶  ✦   ", ColorSystem.codes.brightMagenta),
    "            ",
    ColorSystem.colorize("    ✨      ", ColorSystem.codes.brightWhite),
    "            ",
  ],
  [
    ColorSystem.colorize("  ✳    ✳    ", ColorSystem.codes.brightYellow),
    "            ",
    ColorSystem.colorize(" ✨ ✨ ✨ ✨  ", ColorSystem.codes.brightGreen),
    "            ",
    ColorSystem.colorize("  ✵  ✷  ✵   ", ColorSystem.codes.brightRed),
    "            ",
    ColorSystem.colorize("     ✨     ", ColorSystem.codes.brightWhite),
    "            ",
  ],
  [
    ColorSystem.colorize("     ✸      ", ColorSystem.codes.brightMagenta),
    "            ",
    ColorSystem.colorize("   ✨✺✨    ", ColorSystem.codes.brightYellow),
    "            ",
    ColorSystem.colorize(" ✦ ✶ ✦ ✶  ", ColorSystem.codes.brightGreen),
    "            ",
    ColorSystem.colorize("    ✨      ", ColorSystem.codes.brightRed),
    "            ",
  ],
];

for (let burst = 0; burst < 3; burst++) {
  for (const frame of fireworksFrames) {
    const multistring = frame.join("\n");
    Deno.stdout.writeSync(encoder.encode(`\x1B[?25l\x1B7\r${multistring}\x1B8`));
    await sleep(180);
  }
  await sleep(150);
}
Deno.stdout.writeSync(encoder.encode("\x1B[?25h\x1B7\r\x1B[J\x1B8"));
console.log(
  ColorSystem.colorize("¡Cielo iluminado sobre el Zócalo!", ColorSystem.codes.brightWhite),
);
console.log("\n");

// =============================================================================
// 7. FESTIVITY METRICS
// =============================================================================

console.log(ColorSystem.colorize("7. Festivity Metrics", ColorSystem.codes.bright));

TableRenderer.render(
  [
    {
      metric: "Asistentes",
      value: Formatter.number(125_000),
      highlight: "Récord de los últimos 5 años",
    },
    {
      metric: "Fuegos lanzados",
      value: Formatter.number(480),
      highlight: "Coordinados en 12 secuencias",
    },
    {
      metric: "Duración grito",
      value: Formatter.duration(3_600_000),
      highlight: "Incluye serenata nocturna",
    },
  ],
  [
    { key: "metric", label: "Métrica", width: 20 },
    { key: "value", label: "Valor", width: 16, align: "right" },
    { key: "highlight", label: "Notas", width: 48 },
  ],
  { showIndex: true },
);
console.log("\n");

fiestaLogger.success("Celebración concluida con alegría y color");
fiestaLogger.info("Terminal restaurada y cursor visible");
