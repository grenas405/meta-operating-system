#!/usr/bin/env -S deno run --allow-env

/**
 * SLM + LLM Productivity Guide
 *
 * Illustrates how teams can combine small language models (SLMs) and large language
 * models (LLMs) for successful, productive, and economical outcomes using Console Styler.
 *
 * Run with:
 *    deno run --allow-env examples/slm-llm-productivity-guide.ts
 */

import {
  BannerRenderer,
  BoxRenderer,
  ChartRenderer,
  ColorSystem,
  ConsoleStyler,
  Formatter,
  ProgressBar,
  TableRenderer,
} from "../mod.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

console.clear();
console.log("\n");

BannerRenderer.render({
  title: "🤖  SLM + LLM PLAYBOOK",
  subtitle: "Successful • Productive • Economical",
  description: "Choose the right model tier, prove value, and control spend.",
  version: "field-guide",
  author: "@console-styler",
  width: 100,
  color: ColorSystem.hexToRgb("#5DE0E6"),
});
console.log("\n");

ConsoleStyler.logSection("📈 Success Signals", "brightCyan", "double");

BoxRenderer.render(
  [
    `${ColorSystem.codes.bright}SLM Wins${ColorSystem.codes.reset}`,
    "• Stable, short-form answers (FAQ, auto-replies).",
    "• Deterministic workflows with small ontologies.",
    "• On-device or edge deployments with strict SLAs.",
    "",
    `${ColorSystem.codes.bright}LLM Wins${ColorSystem.codes.reset}`,
    "• Multi-step reasoning or narrative synthesis.",
    "• Rapid prototyping of new workflows and agents.",
    "• Tool orchestration or policy-aware copilots.",
    "",
    `${ColorSystem.codes.bright}Shared Success Metrics${ColorSystem.codes.reset}`,
    "- < 60s integration loops for new skills.",
    "- Guardrailed outputs logged with metadata.",
    "- Benchmarks align to business KPIs, not vibes.",
  ],
  { style: "rounded", padding: 1, color: ColorSystem.hexToRgb("#7F7FD5"), maxWidth: 92 },
);
console.log("\n");

ConsoleStyler.logSection("⚖️ Model Selection Matrix", "brightMagenta");

const matrix = [
  {
    track: "Customer Summaries",
    slm: "Template + embeddings; deterministic tone",
    llm: "Escalation narratives, subjective nuance",
    decision: "SLM default, LLM for VIP wrap-ups",
  },
  {
    track: "Compliance Checks",
    slm: "Policy regex + lightweight classifier",
    llm: "Explainability + corrective suggestions",
    decision: "Parallel. SLM gates, LLM explains",
  },
  {
    track: "Product Discovery",
    slm: "Feature flags, structured Q&A",
    llm: "Storyboards, speculative UX copy",
    decision: "LLM primary w/ SLM scoring drafts",
  },
  {
    track: "Internal Automation",
    slm: "Calendars, approvals, formatting",
    llm: "Cross-tool agentic workflows",
    decision: "Blend: SLM for rules, LLM for glue",
  },
];

TableRenderer.render(
  matrix,
  [
    { key: "track", label: "Track", width: 20 },
    { key: "slm", label: "SLM Sweet Spot", width: 24 },
    { key: "llm", label: "LLM Sweet Spot", width: 24 },
    { key: "decision", label: "Operating Model", width: 28 },
  ],
  { showIndex: true },
);
console.log("\n");

ConsoleStyler.logSection("🚀 Productivity Pipeline", "brightGreen");

const phases = [
  { name: "Data Health & Taxonomy", tip: "Unify schemas & dedupe sources", color: [58, 123, 213] as [number, number, number] },
  { name: "Prompt / Contract Design", tip: "Pair SLM controls with LLM creativity", color: [123, 213, 58] as [number, number, number] },
  { name: "Evaluation Harness", tip: "Automate regression suites & red teaming", color: [255, 170, 51] as [number, number, number] },
  { name: "Deployment & Feedback", tip: "Ship dashboards + human-in-loop hooks", color: [255, 95, 109] as [number, number, number] },
];

const pipelineBar = new ProgressBar({
  total: phases.length,
  width: 40,
  colorize: true,
  showValue: false,
});

for (let i = 0; i < phases.length; i++) {
  pipelineBar.update(i + 1);
  const phase = phases[i];
  ConsoleStyler.logRGB(
    phase.name,
    phase.color[0],
    phase.color[1],
    phase.color[2],
    "◆",
    { insight: phase.tip },
  );
  await sleep(200);
}
pipelineBar.complete();
console.log("\n");

ConsoleStyler.logSection("💸 Economics Dashboard", "brightYellow");

const economics = [
  { label: "SLM batch scoring (1k tokens)", value: 0.0009 },
  { label: "SLM on-device inference", value: 0.0025 },
  { label: "LLM hosted (1k tokens)", value: 0.012 },
  { label: "LLM tool-using agent", value: 0.032 },
];

ChartRenderer.barChart(
  economics.map((item) => ({ label: item.label, value: Number((item.value * 1000).toFixed(2)) })), // milli-cents
  {
    showValues: true,
    width: 48,
    color: ColorSystem.hexToRgb("#FDC830"),
  },
);
console.log(
  `${ColorSystem.codes.dim}Tip:${ColorSystem.codes.reset} divide values by 1000 to read $ per 1k tokens / actions.`,
);
console.log("");

BoxRenderer.render(
  [
    `${ColorSystem.codes.bright}Economy Patterns${ColorSystem.codes.reset}`,
    "• Push high-frequency work (triage, routing, linting) into SLMs.",
    "• Use LLM chains only when additional revenue or retention is provable.",
    "• Attach every LLM workflow to a unit metric: ARR, NPS, resolution time.",
    "• Decay experiments quickly — sunset LLM paths that miss 2 consecutive targets.",
  ],
  { style: "bold", padding: 1, color: ColorSystem.hexToRgb("#F37335"), maxWidth: 92 },
);
console.log("\n");

ConsoleStyler.logSection("🧪 Experiments & Proofs", "brightBlue");
ConsoleStyler.logGradient("Model Continuum", [93, 230, 230], [253, 88, 73], 60);
console.log("");

TableRenderer.render(
  [
    {
      experiment: "LLM-guided QA triage",
      hypothesis: "Reduce hand-offs 30%",
      cost: "$120/day",
      status: "Scaling",
    },
    {
      experiment: "SLM auto-moderation",
      hypothesis: "Block 95% low-risk tickets",
      cost: "$8/day",
      status: "Production",
    },
    {
      experiment: "Hybrid meeting notes",
      hypothesis: "Cut prep by 40 min/week",
      cost: "$34/day",
      status: "Pilot",
    },
  ],
  [
    { key: "experiment", label: "Experiment", width: 26 },
    { key: "hypothesis", label: "Hypothesis", width: 28 },
    { key: "cost", label: "Daily Spend", width: 12, align: "right" },
    { key: "status", label: "Status", width: 12 },
  ],
);
console.log("\n");

ConsoleStyler.logSection("📝 Field Notes", "brightWhite", "simple");
ConsoleStyler.logRGB("Lead with problem statements, not model hype.", 72, 219, 251, "✳", {
  ritual: "Every build starts with KPI + constraint",
});
ConsoleStyler.logRGB("Pair UX demos with cost telemetry to keep funding.", 255, 195, 113, "✦", {
  ritual: "Screenshot + $/interaction in every update",
});
ConsoleStyler.logRGB("Teach teams a graded response pattern.", 165, 177, 194, "✢", {
  ritual: "SLM -> LLM -> Human escalation ladder",
});

console.log("\n" + ColorSystem.colorize("Guide complete. Share the dashboard recording with your AI guild.", ColorSystem.codes.bright));
