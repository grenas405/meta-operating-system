#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write

/**
 * Animated Reliability Lab
 *
 * A kinetic showcase that highlights the animation capabilities of Console Styler.
 * Features used:
 *   • Themed logger configuration with rich metadata
 *   • Sequential spinner playlists with live message updates
 *   • Multi-stage progress bars simulating workload pipelines
 *   • Custom wave animation rendered through direct terminal writes
 *   • Summary table of synthetic performance metrics
 */

import {
  BannerRenderer,
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
// 1. LAB WELCOME BANNER
// =============================================================================

BannerRenderer.render({
  title: "⚡ ANIMATED RELIABILITY LAB",
  subtitle: "High-tempo terminal storytelling with Console Styler",
  description: "Orchestrating concurrent diagnostics, load pipelines, and visual pulses",
  version: "build-24.12",
  author: "Observability Team",
  width: 96,
  color: ColorSystem.codes.brightYellow,
});
console.log("\n");

// =============================================================================
// 2. LOGGER INITIALIZATION
// =============================================================================

console.log(ColorSystem.colorize("2. Logger Initialization", ColorSystem.codes.bright));

const labLogger = new Logger(
  new ConfigBuilder()
    .theme(neonTheme)
    .logLevel("debug")
    .timestampFormat("HH:mm:ss.SSS")
    .enableHistory(true)
    .maxHistorySize(200)
    .build(),
);

labLogger.info("Animated Reliability Lab boot sequence engaged");
labLogger.success("Neon theme applied with timestamp granularity set to milliseconds");
labLogger.debug("Feature toggles", {
  progressPipelines: true,
  spinnerPlaylists: true,
  waveVisuals: true,
});
console.log("\n");

// =============================================================================
// 3. CONTROL PLANE SPINNER PLAYLIST
// =============================================================================

console.log(ColorSystem.colorize("3. Control Plane Spinner Playlist", ColorSystem.codes.bright));

const controlSpinner = new Spinner({
  message: "Bootstrapping control plane...",
  frames: ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃", "▂"],
  interval: 90,
});

controlSpinner.start();
await sleep(600);
controlSpinner.update("Seeding telemetry brokers...");
await sleep(600);
controlSpinner.update("Synchronizing edge collectors...");
await sleep(600);
controlSpinner.update("Hardening TLS channels...");
await sleep(600);
controlSpinner.succeed("Control plane stabilized • Ready for workloads");
console.log("\n");

// =============================================================================
// 4. MULTI-STAGE LOAD PIPELINE
// =============================================================================

console.log(ColorSystem.colorize("4. Multi-Stage Load Pipeline", ColorSystem.codes.bright));

const pipelineStages = [
  {
    label: "Baseline Sampling",
    steps: [12, 15, 18, 20, 35],
    delay: 110,
    details: { nodes: 12, variance: "±1.4%" },
  },
  {
    label: "Synthetic Burst Replay",
    steps: [18, 22, 16, 14, 30],
    delay: 90,
    details: { concurrency: 480, peakRps: 12600 },
  },
  {
    label: "Chaos Injection Sweep",
    steps: [14, 16, 12, 17, 41],
    delay: 120,
    details: { faults: ["packet-loss", "latency", "cpu-throttle"] },
  },
];

for (const stage of pipelineStages) {
  console.log(
    `\n${ColorSystem.colorize(stage.label, ColorSystem.codes.brightMagenta)}`,
  );

  const stageBar = new ProgressBar({
    total: 100,
    width: 52,
    showValue: false,
    showPercentage: true,
    colorize: true,
  });

  let progress = 0;
  for (const step of stage.steps) {
    progress = Math.min(100, progress + step);
    stageBar.update(progress);
    labLogger.debug("Stage tick", {
      stage: stage.label,
      progress,
      details: stage.details,
    });
    await sleep(stage.delay);
  }

  stageBar.complete();
  labLogger.info(`${stage.label} complete`, stage.details);
}
console.log("\n");

// =============================================================================
// 5. DIAGNOSTIC SPINNER CAROUSEL
// =============================================================================

console.log(ColorSystem.colorize("5. Diagnostic Spinner Carousel", ColorSystem.codes.bright));

const diagnosticSpinner = new Spinner({
  message: "Scanning reactive nodes...",
  frames: ["◐", "◓", "◑", "◒"],
  interval: 120,
});

const diagnosticMessages = [
  "Calibrating spectral analyzers...",
  "Balancing sensor fusion weights...",
  "Replaying last anomaly signature...",
  "Validating failover lattice...",
];

diagnosticSpinner.start();
for (const message of diagnosticMessages) {
  diagnosticSpinner.update(message);
  await sleep(720);
}
diagnosticSpinner.succeed("Diagnostics green across 128 nodes • 0 anomalies");
console.log("\n");

// =============================================================================
// 6. WAVEFORM LOAD VISUALIZER
// =============================================================================

console.log(ColorSystem.colorize("6. Waveform Load Visualizer", ColorSystem.codes.bright));

const waveFrames = [
  "▁▂▃▄▅▆▇█▇▆▅▄▃▂▁",
  "▂▃▄▅▆▇█▇▆▅▄▃▂▁▂",
  "▃▄▅▆▇█▇▆▅▄▃▂▁▂▃",
  "▄▅▆▇█▇▆▅▄▃▂▁▂▃▄",
  "▅▆▇█▇▆▅▄▃▂▁▂▃▄▅",
  "▆▇█▇▆▅▄▃▂▁▂▃▄▅▆",
  "▇█▇▆▅▄▃▂▁▂▃▄▅▆▇",
  "█▇▆▅▄▃▂▁▂▃▄▅▆▇█",
];

for (let i = 0; i < 32; i++) {
  const frame = waveFrames[i % waveFrames.length];
  const coloredFrame = ColorSystem.colorize(frame, ColorSystem.codes.brightCyan);
  Deno.stdout.writeSync(encoder.encode(`\r${coloredFrame}   `));
  await sleep(95);
}
Deno.stdout.writeSync(encoder.encode("\r" + " ".repeat(40) + "\r"));
console.log(ColorSystem.colorize("Waveform settled at 74% of capacity", ColorSystem.codes.dim));
console.log("\n");

// =============================================================================
// 7. RUN SUMMARY TABLE
// =============================================================================

console.log(ColorSystem.colorize("7. Run Summary", ColorSystem.codes.bright));

TableRenderer.render(
  pipelineStages.map((stage) => ({
    stage: stage.label,
    duration: Formatter.duration(stage.delay * stage.steps.length),
    throughput: stage.details.peakRps ? `${Formatter.number(stage.details.peakRps)} req/s` : "N/A",
    notes: Array.isArray(stage.details.faults)
      ? stage.details.faults.join(", ")
      : stage.details.variance ?? "steady",
  })),
  [
    { key: "stage", label: "Stage", width: 26 },
    { key: "duration", label: "Simulated Duration", width: 20, align: "right" },
    { key: "throughput", label: "Throughput", width: 18, align: "right" },
    { key: "notes", label: "Notes", width: 22 },
  ],
  { showIndex: true },
);
console.log("\n");

labLogger.success("Animated Reliability Lab scenario completed");
labLogger.info("Cursor restored and terminal state normalized");
