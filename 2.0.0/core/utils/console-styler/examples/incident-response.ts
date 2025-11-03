#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write

/**
 * Incident Response Command Center
 *
 * Simulates a live operations war room handling a critical production incident.
 * Demonstrates:
 *   • Themed logging with child namespaces and structured metadata
 *   • At-a-glance status tables, charts, and formatted analytics
 *   • Progress indicators to communicate mitigation phases
 *   • Summary callouts capturing lessons learned
 */

import {
  BannerRenderer,
  BoxRenderer,
  ChartRenderer,
  ColorSystem,
  ConfigBuilder,
  Formatter,
  JsonLoggerPlugin,
  Logger,
  ProgressBar,
  Spinner,
  TableRenderer,
  neonTheme,
} from "../mod.ts";

console.clear();
console.log("\n");

// =============================================================================
// 1. INCIDENT OVERVIEW BANNER
// =============================================================================

BannerRenderer.render({
  title: "🛡️  P1 INCIDENT WAR ROOM",
  subtitle: "Realtime Command Console",
  description: "Service: payments-gateway • Severity: CRITICAL • SLA: 15 min",
  version: "playbook v3.2",
  author: "SRE Guild",
  width: 92,
  color: ColorSystem.codes.brightMagenta,
});
console.log("\n");

// =============================================================================
// 2. LOGGER SETUP & SIGNAL BOOST
// =============================================================================

console.log(ColorSystem.colorize("2. Logging Pipeline", ColorSystem.codes.bright));

const incidentLogger = new Logger(
  new ConfigBuilder()
    .theme(neonTheme)
    .logLevel("debug")
    .maxHistorySize(250)
    .plugin(new JsonLoggerPlugin({ filepath: "./logs/incident-war-room.json", pretty: true }))
    .build(),
);

incidentLogger.critical("Gateway latency spiked above SLA", {
  service: "payments-gateway",
  alertPolicy: "latency-p99",
  observed: "1850ms",
  threshold: "1200ms",
});

const combatLogger = incidentLogger.child("combat-room");
const commsLogger = incidentLogger.child("comms");

combatLogger.error("Primary EU-West cluster unreachable", { region: "eu-west-1", cause: "unknown" });
commsLogger.info("Exec leadership notified", { channel: "#incident-bridge", bridge: "zoom" });
incidentLogger.debug("JsonLogger plugin armed", { destination: "./logs/incident-war-room.json" });
console.log("\n");

// =============================================================================
// 3. IMPACT SNAPSHOT
// =============================================================================

console.log(ColorSystem.colorize("3. Impact Snapshot", ColorSystem.codes.bright));

TableRenderer.render(
  [
    {
      segment: "Checkout API",
      requests: 4250,
      errorRate: 0.34,
      latencyP99: 1850,
    },
    {
      segment: "Card Vault",
      requests: 1700,
      errorRate: 0.12,
      latencyP99: 980,
    },
    {
      segment: "Fraud Service",
      requests: 960,
      errorRate: 0.41,
      latencyP99: 2100,
    },
    {
      segment: "Webhook Dispatcher",
      requests: 3120,
      errorRate: 0.05,
      latencyP99: 640,
    },
  ],
  [
    { key: "segment", label: "Service Segment", width: 24 },
    {
      key: "requests",
      label: "Requests/min",
      width: 14,
      align: "right",
      formatter: (value) => Formatter.number(value),
    },
    {
      key: "errorRate",
      label: "Error %",
      width: 10,
      align: "right",
      formatter: (value) => `${(value * 100).toFixed(1)}%`,
    },
    {
      key: "latencyP99",
      label: "P99 (ms)",
      width: 10,
      align: "right",
      formatter: (value) => Formatter.number(value),
    },
  ],
  { showIndex: true, sortBy: "errorRate", sortOrder: "desc" },
);
console.log("\n");

BoxRenderer.render(
  [
    `${ColorSystem.codes.brightYellow}Customer Impact${ColorSystem.codes.reset}`,
    "",
    `• ${Formatter.number(18_400)} checkout attempts degraded`,
    `• ${Formatter.percentage(0.27)} of payments auto-retried`,
    `• ${Formatter.number(9)} enterprise merchants opened tickets`,
    "",
    `${ColorSystem.codes.brightRed}SLA breach imminent in ${Formatter.duration(8 * 60 * 1000)}${ColorSystem.codes.reset}`,
  ],
  { style: "double", color: ColorSystem.codes.brightYellow, padding: 1, title: "Signal Boost" },
);
console.log("\n");

// =============================================================================
// 4. TELEMETRY CURVES
// =============================================================================

console.log(ColorSystem.colorize("4. Telemetry Curves", ColorSystem.codes.bright));

const latencySeries = [420, 610, 780, 960, 1120, 1350, 1480, 1850, 1790, 1620, 1500, 1380];
const failureSeries = [0.02, 0.04, 0.05, 0.09, 0.12, 0.21, 0.33, 0.41, 0.32, 0.28, 0.18, 0.11];

console.log(`${ColorSystem.codes.brightBlue}P99 Latency Trend (ms):${ColorSystem.codes.reset}`);
ChartRenderer.lineChart(latencySeries, { colorize: true });

console.log(`${ColorSystem.codes.brightBlue}\nError Probability Sparkline:${ColorSystem.codes.reset} ${
  ChartRenderer.sparkline(failureSeries.map((value) => value * 100))
}`);
console.log("\n");

// =============================================================================
// 5. MITIGATION STATUS
// =============================================================================

console.log(ColorSystem.colorize("5. Mitigation Checklist", ColorSystem.codes.bright));

const tasks = [
  { label: "Fail traffic to US-East cluster", duration: 45 },
  { label: "Lock card token rotations", duration: 30 },
  { label: "Apply circuit breaker to fraud calls", duration: 50 },
  { label: "Purge stale cache entries", duration: 35 },
  { label: "Replay deferred transactions", duration: 40 },
];

const mitigationBar = new ProgressBar({
  total: tasks.length,
  width: 30,
  showPercentage: true,
  showValue: false,
});

for (const task of tasks) {
  mitigationBar.increment();
  combatLogger.success(task.label, {
    duration: `${task.duration}s`,
    owner: ["SRE", "Payments", "Platform"][Math.floor(Math.random() * 3)],
  });
  await new Promise((resolve) => setTimeout(resolve, 140));
}

mitigationBar.complete();
console.log("\n");

// =============================================================================
// 6. FORENSICS SPINNER
// =============================================================================

console.log(ColorSystem.colorize("6. Forensics Deep Dive", ColorSystem.codes.bright));

const forensicsSpinner = new Spinner({ message: "Collecting kernel traces..." });
forensicsSpinner.start();
await new Promise((resolve) => setTimeout(resolve, 1600));
forensicsSpinner.update("Diffing routing tables...");
await new Promise((resolve) => setTimeout(resolve, 1200));
forensicsSpinner.succeed("Root cause isolated: BGP mis-propagation");
console.log("\n");

// =============================================================================
// 7. POST-INCIDENT LEARNINGS
// =============================================================================

console.log(ColorSystem.colorize("7. Debrief & Learnings", ColorSystem.codes.bright));

BoxRenderer.render(
  [
    "Immediate Actions:",
    "  • Harden regional spillover automation",
    "  • Add alerting for BGP path churn > 8%",
    "  • Codify manual circuit breaker runbook",
    "",
    "Follow-up Metrics:",
    `  • Error budget burned: ${Formatter.percentage(0.19)}`,
    `  • Total disruption: ${Formatter.duration(22 * 60 * 1000)}`,
    `  • Incident declared: ${Formatter.relativeTime(new Date(Date.now() - 22 * 60 * 1000))}`,
  ],
  { style: "rounded", color: ColorSystem.codes.brightGreen, title: "Continuous Improvement" },
);
console.log("\n");

// =============================================================================
// 8. SUMMARY SNAPSHOT
// =============================================================================

console.log(ColorSystem.colorize("8. Summary Snapshot", ColorSystem.codes.bright));

const criticalHistory = incidentLogger.getHistory({ level: "critical" });
const errorHistory = incidentLogger.getHistory({ level: "error" });

TableRenderer.renderKeyValue(
  [
    { label: "Critical Signals", value: Formatter.number(criticalHistory.length) },
    { label: "Errors Logged", value: Formatter.number(errorHistory.length) },
    { label: "Captured Playbook", value: "bgp_route_leak.md" },
    { label: "Incident State", value: `${ColorSystem.codes.brightGreen}Monitoring${ColorSystem.codes.reset}` },
  ],
  { colorize: true },
);

console.log("\n");
