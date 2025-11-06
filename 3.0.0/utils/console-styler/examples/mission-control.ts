#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write

/**
 * Orbital Mission Control Simulation
 *
 * A narrative-driven example that demonstrates how the Console Styler toolkit
 * can orchestrate rich terminal dashboards for operations and SRE teams.
 * Features used:
 *   • Advanced logger configuration with theming and plugins
 *   • Tables, charts, and formatted metrics for telemetry data
 *   • Progress indicators to mimic launch sequences
 *   • Banners and boxes for status call-outs
 */

import {
  BannerRenderer,
  BoxRenderer,
  ChartRenderer,
  ConfigBuilder,
  FileLoggerPlugin,
  Formatter,
  Logger,
  ProgressBar,
  Spinner,
  TableRenderer,
  ColorSystem,
  draculaTheme,
  neonTheme,
} from "../mod.ts";

console.clear();
console.log("\n");

// =============================================================================
// 1. MISSION INITIALIZATION BANNER
// =============================================================================

BannerRenderer.render({
  title: "🚀 ORBITAL OPS: MISSION CONTROL",
  subtitle: "Live Launch Readiness Dashboard",
  description: "Powered by Console Styler • Resilient tooling for space-grade SREs",
  version: "v0.9-beta",
  author: "Mission Systems Guild",
  width: 94,
  color: ColorSystem.codes.brightCyan,
});
console.log("\n");

// =============================================================================
// 2. LOGGER CONFIGURATION
// =============================================================================

console.log(ColorSystem.colorize("2. Logger Configuration", ColorSystem.codes.bright));

const missionLogger = new Logger(
  new ConfigBuilder()
    .theme(draculaTheme)
    .logLevel("debug")
    .enableHistory(true)
    .plugin(new FileLoggerPlugin({ filepath: "./logs/mission-control.log" }))
    .build(),
);

missionLogger.info("Mission control boot sequence initiated");
missionLogger.success("Telemetry uplink established with Orbiter-7");
missionLogger.warning("Solar array output fluctuating (±4%)");
missionLogger.error("Secondary cooling loop reports delayed telemetry packets");
missionLogger.debug("Active plugins: file-logger");
console.log("\n");

// =============================================================================
// 3. CREW & PAYLOAD MANIFEST
// =============================================================================

console.log(ColorSystem.colorize("3. Crew & Payload Manifest", ColorSystem.codes.bright));

TableRenderer.render(
  [
    { role: "Commander", name: "Nova Reyes", badge: "CR-01", flightHours: 4320 },
    { role: "Pilot", name: "Arun Malik", badge: "PL-17", flightHours: 3187 },
    { role: "Science Officer", name: "Dr. Keiko Sato", badge: "SO-09", flightHours: 1520 },
    { role: "Payload Specialist", name: "Mina Kovács", badge: "PS-21", flightHours: 980 },
  ],
  [
    { key: "role", label: "Role", width: 18 },
    { key: "name", label: "Name", width: 20 },
    { key: "badge", label: "Badge", width: 8, align: "center" },
    {
      key: "flightHours",
      label: "Flight Hours",
      width: 14,
      align: "right",
      formatter: (value) => Formatter.number(value),
    },
  ],
  { showIndex: true, sortBy: "role" },
);
console.log("\n");

BoxRenderer.render(
  [
    "Payload Summary:",
    `• Microgravity Lab Kits: ${Formatter.number(12)}`,
    `• Quantum Communication Nodes: ${Formatter.number(4)}`,
    `• Autonomous Repair Drones: ${Formatter.number(6)}`,
    `• Supplies: ${Formatter.bytes(745 * 1024 * 1024)}`,
  ],
  {
    style: "rounded",
    title: "Cargo Bay Alpha",
    color: ColorSystem.codes.brightMagenta,
    padding: 1,
  },
);
console.log("\n");

// =============================================================================
// 4. TELEMETRY OVERVIEW
// =============================================================================

console.log(ColorSystem.colorize("4. Telemetry Overview", ColorSystem.codes.bright));

const powerLevels = [98, 97, 97, 96, 96, 95, 96, 97, 98, 99, 98, 97, 96];
const coolantPressures = [72, 71, 70, 69, 70, 71, 72, 72, 71, 70, 68, 69, 70];
const networkLatency = [42, 39, 37, 40, 41, 45, 58, 52, 47, 43, 40, 38, 36];

console.log(
  `${ColorSystem.codes.brightBlue}Power Output Sparkline:${ColorSystem.codes.reset} ${
    ChartRenderer.sparkline(powerLevels)
  }`,
);
console.log(
  `${ColorSystem.codes.brightBlue}Coolant Pressure Sparkline:${ColorSystem.codes.reset} ${
    ChartRenderer.sparkline(coolantPressures)
  }`,
);
console.log(
  `${ColorSystem.codes.brightBlue}Network Latency Sparkline:${ColorSystem.codes.reset} ${
    ChartRenderer.sparkline(networkLatency)
  }`,
);
console.log("\n");

console.log(ColorSystem.colorize("Subsystem Load (kN)", ColorSystem.codes.dim));
ChartRenderer.barChart(
  [
    { label: "Main Engine", value: 680 },
    { label: "RCS Thrusters", value: 210 },
    { label: "Life Support", value: 140 },
    { label: "Scientific Payload", value: 95 },
    { label: "Thermal Control", value: 160 },
  ],
  { showValues: true, width: 40, color: ColorSystem.codes.brightGreen },
);
console.log("\n");

// =============================================================================
// 5. COUNTDOWN & AUTONOMOUS CHECKS
// =============================================================================

console.log(ColorSystem.colorize("5. Countdown Sequence", ColorSystem.codes.bright));

const countdown = new ProgressBar({
  total: 100,
  width: 50,
  showValue: false,
  colorize: true,
});

for (let t = 0; t <= 100; t += 10) {
  countdown.update(t);
  missionLogger.info("Autonomous check complete", {
    stage: `T-${(100 - t) / 10} min`,
    subsystem: ["Propulsion", "Avionics", "Guidance", "Telemetry"][t / 10] ?? "Thermals",
    status: t === 100 ? "GO" : "Nominal",
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
}

countdown.complete();
console.log("\n");

// =============================================================================
// 6. LIVE BOOSTER SYNC SPINNER
// =============================================================================

console.log(ColorSystem.colorize("6. Booster Synchronization", ColorSystem.codes.bright));

const boosterSpinner = new Spinner({ message: "Aligning booster phase..." });
boosterSpinner.start();
await new Promise((resolve) => setTimeout(resolve, 1800));
boosterSpinner.update("Calibrating nozzle gimbals...");
await new Promise((resolve) => setTimeout(resolve, 1200));
boosterSpinner.succeed("Booster synchronization confirmed");
console.log("\n");

// =============================================================================
// 7. GO/NO-GO DECISION MATRIX
// =============================================================================

console.log(ColorSystem.colorize("7. Go/No-Go Poll", ColorSystem.codes.bright));

TableRenderer.render(
  [
    { team: "Propulsion", status: "GO", notes: "Chamber pressure stable" },
    { team: "Avionics", status: "GO", notes: "Redundant bus nominal" },
    { team: "Weather", status: "NO-GO", notes: "Anvil cloud detected west" },
    { team: "Flight Dynamics", status: "GO", notes: "Trajectory window optimal" },
    { team: "Recovery", status: "GO", notes: "Fleet in position" },
  ],
  [
    { key: "team", label: "Discipline", width: 18 },
    { key: "status", label: "Status", width: 8, align: "center" },
    { key: "notes", label: "Notes", width: 42 },
  ],
  { showIndex: true },
);
console.log("\n");

BoxRenderer.render(
  [
    `${ColorSystem.codes.brightYellow}Weather team requests 5-minute hold${ColorSystem.codes.reset}`,
    "Tracking upper-atmosphere cell drift at 18 km altitude.",
    "",
    "Proposed action:",
    "  1. Extend hold timer",
    "  2. Re-sample upper air data",
    "  3. Re-run ascent corridor simulation",
  ],
  {
    style: "bold",
    title: "⚠️  HOLD REQUEST",
    color: ColorSystem.codes.brightYellow,
    padding: 1,
  },
);
console.log("\n");

// =============================================================================
// 8. FINAL SUMMARY
// =============================================================================

console.log(ColorSystem.colorize("8. Final Summary", ColorSystem.codes.bright));

const history = missionLogger.getHistory({ level: "warning" });
const errors = missionLogger.getHistory({ level: "error" });

BoxRenderer.render(
  [
    `${ColorSystem.codes.bright}Launch Readiness Summary${ColorSystem.codes.reset}`,
    "",
    `Warnings logged: ${Formatter.number(history.length)}`,
    `Errors logged: ${Formatter.number(errors.length)}`,
    `Last telemetry packet: ${new Date().toLocaleTimeString()}`,
    "",
    `${ColorSystem.codes.brightGreen}Decision: HOLD (pending weather clearance)${ColorSystem.codes.reset}`,
  ],
  {
    style: "double",
    color: ColorSystem.codes.brightCyan,
    padding: 1,
    title: "Mission Control",
  },
);

console.log("\n");
