#!/usr/bin/env -S deno run --allow-env

/**
 * Truecolor Showcase
 *
 * Demonstrates 16.7M color rendering with Console Styler using gradients,
 * pitch-style presentations, and quick proof-of-concept visuals.
 *
 * Run with: `deno run --allow-env examples/truecolor-showcase.ts`
 */

import {
  BannerRenderer,
  BoxRenderer,
  ColorSystem,
  ConsoleStyler,
  Formatter,
} from "../mod.ts";

type RGB = [number, number, number];

const reset = ColorSystem.codes.reset;

const gradientText = (text: string, start: RGB, end: RGB): string => {
  const gradient = ColorSystem.createGradient(start, end, text.length);
  return [...text].map((char, idx) => `${gradient[idx]}${char}${reset}`).join("");
};

const renderGradientBar = (label: string, start: RGB, end: RGB, width = 56): void => {
  const gradient = ColorSystem.createGradient(start, end, width);
  const bar = gradient.map((color) => `${color}█${reset}`).join("");
  console.log(`${ColorSystem.codes.dim}${label.padEnd(20)}${reset} ${bar}`);
};

const lerp = (start: number, end: number, t: number) => Math.round(start + (end - start) * t);
const mixColor = (start: RGB, end: RGB, t: number): string =>
  ColorSystem.rgb(lerp(start[0], end[0], t), lerp(start[1], end[1], t), lerp(start[2], end[2], t));

const renderHeatmap = (rows: number[][], start: RGB, end: RGB): void => {
  for (const row of rows) {
    const line = row.map((value) => `${mixColor(start, end, value)}██${reset}`).join("");
    console.log(line);
  }
};

const renderGradientColumn = (title: string, copy: string, start: RGB, end: RGB): void => {
  const hero = gradientText(title, start, end);
  BoxRenderer.render(
    [
      hero,
      "",
      ...copy.split("\n").map((line) => gradientText(line, start, end)),
    ],
    {
      title: "Presentation Concept",
      style: "rounded",
      color: start === end ? ColorSystem.hexToRgb("#ffffff") : mixColor(start, end, 0.4),
      minWidth: 56,
      maxWidth: 56,
    },
  );
};

console.clear();
console.log("\n");

const hero = gradientText("🌈 TRUECOLOR EXPERIENCE LAB", [255, 94, 98], [49, 213, 220]);
console.log(hero);
console.log(gradientText("Gradients • Presentations • Proofs of Concept\n", [49, 213, 220], [255, 247, 174]));

BannerRenderer.render({
  title: "Console Styler Truecolor Showcase",
  subtitle: "Design palettes, product pitches, and data concepts",
  description: "16.7M colors • Adaptive gradients • Terminal-native storytelling",
  version: "demo",
  author: "@grenas405",
  width: 96,
  color: ColorSystem.hexToRgb("#FF7EB3"),
});
console.log("\n");

ConsoleStyler.logSection("🎯 Terminal Capability Snapshot", "brightMagenta", "double");

const support = ColorSystem.detectColorSupport();
BoxRenderer.render(
  [
    `Detected Mode: ${support.toUpperCase()}`,
    `Supports 256 Colors: ${ColorSystem.supports256Color() ? "Yes" : "No"}`,
    `Supports Truecolor: ${ColorSystem.supportsTrueColor() ? "Yes" : "No"}`,
    `Timestamp: ${Formatter.timestamp(new Date())}`,
    "",
    gradientText(
      "Tip: Use gradients to separate sections, highlight states, and brand CLI tooling.",
      [255, 180, 162],
      [67, 198, 172],
    ),
  ],
  {
    style: "rounded",
    title: "Runtime Insight",
    color: ColorSystem.hexToRgb("#A18CD1"),
    minWidth: 70,
    maxWidth: 70,
  },
);
console.log("\n");

ConsoleStyler.logSection("🌈 Gradient Gallery", "brightCyan");

const palettes: Array<{ name: string; start: RGB; end: RGB }> = [
  { name: "Aurora Pulse", start: [123, 67, 151], end: [33, 147, 176] },
  { name: "Neon Sundown", start: [255, 94, 98], end: [255, 247, 174] },
  { name: "Cobalt Arc", start: [0, 210, 255], end: [58, 123, 213] },
  { name: "Solar Ember", start: [255, 154, 90], end: [255, 68, 128] },
  { name: "Infrawave", start: [252, 92, 125], end: [106, 130, 251] },
];

for (const palette of palettes) {
  renderGradientBar(palette.name, palette.start, palette.end);
}
console.log("");

ConsoleStyler.logSection("🖥 Presentation Concepts", "brightGreen");

renderGradientColumn(
  "Aurora KPI Deck",
  "Quarterly review decks gain personality with aurora bands.\nBlend gradients per slide to reinforce product pillars.",
  [67, 206, 162],
  [24, 90, 157],
);
console.log("");

renderGradientColumn(
  "Neon Product Pitch",
  "Pair electric pink to blue gradients with motion-like ASCII.\nIdeal for launch-day CLIs or realtime dashboards.",
  [255, 0, 204],
  [51, 255, 255],
);
console.log("");

renderGradientColumn(
  "Heatmap Ops Brief",
  "Forge heatmaps straight in the terminal.\nUse truecolor tiles to explain saturation, health, or load.",
  [255, 118, 117],
  [9, 132, 227],
);
console.log("\n");

ConsoleStyler.logSection("🧪 Proofs of Concept", "brightYellow");

ConsoleStyler.logGradient("Gradient Fiber Timeline", [255, 138, 120], [75, 123, 236], 60);
ConsoleStyler.logGradient("Experimental Sunset Ramp", [255, 203, 112], [255, 71, 87], 60);
console.log("");

console.log(ColorSystem.codes.bright + "Realtime Heatmap:" + reset);
renderHeatmap(
  [
    [0.1, 0.2, 0.4, 0.5, 0.7, 0.85],
    [0.05, 0.25, 0.45, 0.6, 0.8, 0.95],
    [0.0, 0.15, 0.3, 0.55, 0.75, 1.0],
  ],
  [32, 201, 151],
  [255, 92, 88],
);
console.log("");

ConsoleStyler.logSection("📡 Logistics Pulse", "brightBlue");
ConsoleStyler.logRGB("Palette registry synced", 72, 219, 251, "✔", { gradientCount: palettes.length });
ConsoleStyler.logRGB("Stage lighting recalibrated", 255, 94, 98, "★", { fixtures: 12 });
ConsoleStyler.logRGB("Heatmap proof exported", 255, 159, 67, "⚙", { tiles: 18, format: "PNG + GIF" });

console.log("\n" + gradientText("✓ Truecolor explorations complete", [58, 123, 213], [58, 213, 158]));
