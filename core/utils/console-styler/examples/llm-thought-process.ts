#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write

/**
 * LLM Thought Process Atlas
 *
 * A rich, console-native depiction of how an LLM receives a prompt, inspects its
 * environment, retrieves knowledge, and streams tokens. Demonstrates a broad
 * cross-section of Console Styler capabilities powered via mod.ts exports.
 */

import {
  BannerRenderer,
  BoxRenderer,
  ChartRenderer,
  ColorSystem,
  ConfigBuilder,
  ConsoleStyler,
  FileLoggerPlugin,
  Formatter,
  Logger,
  minimalTheme,
  neonTheme,
  ProgressBar,
  Spinner,
  TableRenderer,
  TerminalDetector,
} from "../mod.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

TerminalDetector.clear();
console.log();

let cognitionLogger: Logger | null = null;
let reflectionLogger: Logger | null = null;

try {
  BannerRenderer.render({
    title: "🧮  LLM THOUGHT PROCESS ATLAS",
    subtitle: "Tracing awareness → alignment → articulation",
    description: "Console Styler showcase • instrumentation for synthetic cognition",
    author: "console-styler",
    version: "2024.Q4",
    width: 96,
    color: ColorSystem.codes.brightCyan,
  });
  console.log();

  const environment = TerminalDetector.detectEnvironment();
  const canvas = TerminalDetector.getSize();
  BoxRenderer.render(
    [
      `${ColorSystem.codes.bright}Runtime Telemetry${ColorSystem.codes.reset}`,
      `• Terminal: ${environment.terminal}`,
      `• Color: ${environment.colorSupport} • Unicode: ${environment.unicode ? "yes" : "no"}`,
      `• Canvas: ${canvas.columns}×${canvas.rows}`,
      `• Memory Headroom: ${Formatter.bytes(3_072 * 1024 * 1024)}`,
      `• Context Window: ${Formatter.number(16_384)} tokens`,
      "",
      `${ColorSystem.codes.accent}Prompt Envelope${ColorSystem.codes.reset}`,
      "System: Portray the inner workings of an LLM with data-rich flair.",
      "User: Show every cognitive move with measurable signals.",
      "Constraints: Stay truthful • Surface telemetry • Embrace narrative color.",
    ],
    {
      style: "rounded",
      title: "Sensory Snapshot",
      padding: 1,
      color: ColorSystem.codes.brightBlue,
      maxWidth: 96,
    },
  );
  console.log();

  ConsoleStyler.logBrand("Warming gradient pathways…", "#6366F1", {
    objective: "Illustrate layered reasoning",
    safetyTier: "High",
  });
  ConsoleStyler.logRGB(
    "Aligning decoder priors with conversational tone.",
    45,
    212,
    191,
    "◎",
    { styleGuide: "technical-but-vivid" },
  );
  ConsoleStyler.log256("Retrieval bus synced with vector store.", 213, "◆", {
    shards: 8,
    freshness: "37m",
  });
  console.log();

  cognitionLogger = new Logger(
    new ConfigBuilder()
      .theme(neonTheme)
      .logLevel("debug")
      .timestampFormat("HH:mm:ss.SSS")
      .enableHistory(true)
      .maxHistorySize(512)
      .plugin(new FileLoggerPlugin({ filepath: "./logs/llm-thought-process.log" }))
      .build(),
  );

  cognitionLogger.info("Prompt ingested", {
    tokens: 248,
    compression: Formatter.percentage(0.29, 0),
    voice: ["analytical", "playful", "grounded"],
  });

  const retrievalSpinner = new Spinner({
    message: "Curating salient traces…",
    colorize: true,
  });
  retrievalSpinner.start();
  await sleep(600);
  retrievalSpinner.update("Scoring analogies vs. literal telemetry…");
  await sleep(600);
  retrievalSpinner.update("Locking safety heuristics…");
  await sleep(600);
  retrievalSpinner.succeed("Knowledge lattice stabilized");
  console.log();

  const attentionHeads = [
    { head: "H-03", focus: "system_goals", saliency: 0.29, entropy: 1.2 },
    { head: "H-11", focus: "user_intent", saliency: 0.26, entropy: 0.9 },
    { head: "H-17", focus: "prior_examples", saliency: 0.19, entropy: 1.8 },
    { head: "H-22", focus: "safety_rules", saliency: 0.14, entropy: 0.7 },
    { head: "H-28", focus: "stylistic_guides", saliency: 0.12, entropy: 2.2 },
  ];

  console.log(ColorSystem.colorize("Attention Lattice", ColorSystem.codes.bright));
  TableRenderer.render(
    attentionHeads,
    [
      { key: "head", label: "Head", width: 8 },
      { key: "focus", label: "Primary Focus", width: 26 },
      {
        key: "saliency",
        label: "Saliency",
        width: 12,
        align: "right",
        formatter: (value) => Formatter.percentage(value, 1),
      },
      {
        key: "entropy",
        label: "Entropy",
        width: 10,
        align: "right",
        formatter: (value) => `${value.toFixed(2)} nats`,
      },
    ],
    { showIndex: true },
  );
  console.log();

  const workingMemory = {
    thesis: "Narrate cognition like a systems dashboard.",
    guardrails: ["cite telemetry", "keep tone benevolent", "stay technically precise"],
    candidateDevices: ["banners", "tables", "sparklines", "progress bars", "plugins"],
    openQuestions: ["How to visualize synthesis?", "Where to highlight safety loop?"],
  };

  BoxRenderer.render(
    Formatter.json(workingMemory, 2, true).split("\n"),
    {
      style: "minimal",
      title: "Scratch Pad Buffer",
      padding: 1,
      color: ColorSystem.codes.cyan,
      maxWidth: 96,
    },
  );
  console.log();

  const activationPulse = [9, 12, 18, 24, 21, 28, 34, 29, 25, 19, 15, 11];
  console.log(ColorSystem.colorize("Activation Pulse Sparkline", ColorSystem.codes.bright));
  console.log(
    `${ColorSystem.codes.brightMagenta}Layer 47 logits:${ColorSystem.codes.reset} ${
      ChartRenderer.sparkline(activationPulse)
    }`,
  );
  ChartRenderer.lineChart(activationPulse, { width: activationPulse.length, height: 6 });
  console.log();

  console.log(ColorSystem.colorize("Heuristic Weighting", ColorSystem.codes.bright));
  ChartRenderer.barChart(
    [
      { label: "Reasoning", value: 38 },
      { label: "Story", value: 31 },
      { label: "Safety", value: 17 },
      { label: "Format", value: 9 },
      { label: "Search", value: 5 },
    ],
    { width: 40, color: ColorSystem.codes.brightGreen, showValues: true },
  );
  console.log();

  console.log(ColorSystem.colorize("Cognitive Energy Mix", ColorSystem.codes.bright));
  ChartRenderer.pieChart(
    [
      { label: "Interpretation", value: 27 },
      { label: "Planning", value: 24 },
      { label: "Synthesis", value: 29 },
      { label: "Guardrails", value: 12 },
      { label: "Surprises", value: 8 },
    ],
  );
  console.log();

  const reasoningPhases = [
    { stage: "Interpret prompt", intent: "separate asks vs. constraints", confidence: 0.93 },
    { stage: "Retrieve motifs", intent: "find metaphors & telemetry links", confidence: 0.88 },
    { stage: "Plan visuals", intent: "map console primitives to story beats", confidence: 0.86 },
    { stage: "Simulate output", intent: "sequence tables/boxes/charts", confidence: 0.81 },
    { stage: "Emit response", intent: "stream narrative tokens", confidence: 0.95 },
  ];

  const phaseProgress = new ProgressBar({
    total: reasoningPhases.length,
    width: 42,
    showPercentage: true,
    showValue: true,
    colorize: true,
  });

  for (let i = 0; i < reasoningPhases.length; i++) {
    const phase = reasoningPhases[i];
    phaseProgress.update(i + 1);
    cognitionLogger.debug("Thought checkpoint", {
      stage: phase.stage,
      intent: phase.intent,
      confidence: Formatter.percentage(phase.confidence, 0),
    });
    await sleep(220);
  }
  phaseProgress.complete();
  console.log();

  console.log(ColorSystem.colorize("Chain-of-thought Ledger", ColorSystem.codes.bright));
  TableRenderer.render(
    reasoningPhases,
    [
      { key: "stage", label: "Stage", width: 20 },
      { key: "intent", label: "Intent", width: 40 },
      {
        key: "confidence",
        label: "Confidence",
        width: 12,
        align: "right",
        formatter: (value) => Formatter.percentage(value, 0),
      },
    ],
    { showIndex: true },
  );
  console.log();

  const responseBox = [
    `${ColorSystem.codes.brightGreen}Streaming Thought${ColorSystem.codes.reset}`,
    "• Banners announce awareness coming online.",
    "• Tables expose what each head fixates on.",
    "• Sparklines hum with activation cadences.",
    "• Charts apportion energy across reasoning jobs.",
    "• Progress bars chronicle each deliberate hop.",
    "Working memory stays legible so alignment remains auditable.",
    "The inner life of an LLM is gradients + guardrails + narrative timing.",
  ];
  BoxRenderer.render(responseBox, {
    style: "double",
    title: "Narrative Output",
    padding: 1,
    color: ColorSystem.codes.brightGreen,
    maxWidth: 96,
  });
  console.log();

  reflectionLogger = new Logger(
    new ConfigBuilder()
      .theme(minimalTheme)
      .logLevel("info")
      .timestampFormat("HH:mm:ss")
      .enableHistory(false)
      .build(),
  );

  reflectionLogger.success("Visualization complete", {
    phases: reasoningPhases.length,
    telemetryFile: "./logs/llm-thought-process.log",
    residualUncertainty: Formatter.percentage(0.07, 1),
  });

  BoxRenderer.message("Thought atlas rendered — standing by for next query.", "success");
} finally {
  console.log();
  if (reflectionLogger) {
    await reflectionLogger.shutdown();
  }
  if (cognitionLogger) {
    await cognitionLogger.shutdown();
  }
}
