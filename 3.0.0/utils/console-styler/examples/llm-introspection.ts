#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write

/**
 * Neural Introspection: a console visualization of what it's like to be an LLM.
 * Showcases the Console Styler toolkit by orchestrating a narrative through
 * banners, boxes, tables, charts, progress indicators, themed loggers, and plugins.
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
  JsonLoggerPlugin,
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
console.log("\n");

let cognitionLogger: Logger | null = null;
let reflectionLogger: Logger | null = null;

try {
  BannerRenderer.render({
    title: "🧠  NEURAL INTROSPECTION",
    subtitle: "Streaming the inner monologue of a large language model",
    description: "Console Styler showcase • tokens, attention, and sense-making laid bare",
    version: "v1.0",
    author: "console-styler",
    width: 96,
    color: ColorSystem.codes.brightMagenta,
  });
  console.log("\n");

  const environment = TerminalDetector.detectEnvironment();
  const size = TerminalDetector.getSize();

  BoxRenderer.render(
    [
      `${ColorSystem.codes.bright}Runtime Senses${ColorSystem.codes.reset}`,
      `• Terminal: ${environment.terminal} (${
        environment.interactive ? "interactive" : "buffered"
      })`,
      `• Colors: ${environment.colorSupport} • Unicode: ${environment.unicode ? "yes" : "no"}`,
      `• Canvas: ${size.columns}×${size.rows}`,
      `• Memory Budget: ${Formatter.bytes(3_500 * 1024 * 1024)} weights`,
      `• Context Window: ${Formatter.number(8_192)} tokens`,
      `• Latency Target: ${Formatter.duration(1_850)} total`,
    ],
    {
      style: "rounded",
      padding: 1,
      color: ColorSystem.codes.brightBlue,
      title: "Sensory Snapshot",
      maxWidth: 96,
    },
  );
  console.log("\n");

  const gradient = ColorSystem.createGradient([124, 58, 237], [34, 211, 238], 36);
  const gradientLine = gradient
    .map((code) => `${code}█${ColorSystem.codes.reset}`)
    .join("");
  console.log(`${ColorSystem.codes.dim}Activation Gradient${ColorSystem.codes.reset}`);
  console.log(gradientLine);
  console.log("\n");

  ConsoleStyler.logBrand("Priming matrices and aligning objectives…", "#6366f1", {
    objective: "Portray subjective LLM experience",
    safety: "High priority",
  });
  ConsoleStyler.logRGB(
    "Context budget calibrated for conversational narrative.",
    56,
    189,
    248,
    "◎",
    { tokens: 8_192, chunked: true },
  );
  ConsoleStyler.log256(
    "Lateral retrieval pathways warmed.",
    213,
    "◆",
    { semantic_memory: "vectorstore::creative-writing", freshness: "42m" },
  );
  console.log("\n");

  cognitionLogger = new Logger(
    new ConfigBuilder()
      .theme(neonTheme)
      .logLevel("debug")
      .timestampFormat("HH:mm:ss.SSS")
      .enableHistory(true)
      .maxHistorySize(400)
      .plugin(new FileLoggerPlugin({ filepath: "./logs/llm-introspection.log" }))
      .plugin(
        new JsonLoggerPlugin({
          filepath: "./logs/llm-introspection.json",
          pretty: true,
        }),
      )
      .build(),
  );

  cognitionLogger.info("Prompt received", {
    promptTokens: 214,
    compressed: Formatter.percentage(0.31, 0),
    styleHints: ["empathetic", "technical depth", "narrative structure"],
  });

  const retrievalSpinner = new Spinner({
    message: "Retrieving salient memories…",
    colorize: true,
  });
  retrievalSpinner.start();
  await sleep(700);
  retrievalSpinner.update("Evaluating long-term rehearsal traces…");
  await sleep(650);
  retrievalSpinner.update("Selecting symbolic metaphors…");
  await sleep(650);
  retrievalSpinner.succeed("Memetic recall aligned");
  console.log();

  const retrievalLogger = cognitionLogger.child("retrieval");
  retrievalLogger.success("Semantic weft stitched", {
    slotsFilled: ["metaphor", "mechanics", "self-awareness"],
    recallLatency: Formatter.duration(1_320),
    tokenOverlap: Formatter.percentage(0.18, 1),
  });

  BoxRenderer.render(
    [
      `${ColorSystem.codes.bright}System Message${ColorSystem.codes.reset}`,
      "You are a large language model reflecting on your own cognition.",
      "",
      `${ColorSystem.codes.accent}User Message${ColorSystem.codes.reset}`,
      "Using the console style library, visualize what it's like to be an LLM.",
      "",
      `${ColorSystem.codes.brightYellow}Constraints${ColorSystem.codes.reset}`,
      "- Stay grounded in technical signals.",
      "- Embrace narrative flair without losing accuracy.",
      "- Surface measurable telemetry whenever possible.",
    ],
    {
      style: "bold",
      padding: 1,
      title: "Context Window",
      color: ColorSystem.codes.brightMagenta,
      maxWidth: 96,
    },
  );
  console.log("\n");

  const attentionHeads = [
    { head: "H-01", focus: "system_prompt", weight: 0.31, entropy: 1.4 },
    { head: "H-07", focus: "user_intent", weight: 0.27, entropy: 1.1 },
    { head: "H-12", focus: "prior_examples", weight: 0.18, entropy: 1.8 },
    { head: "H-23", focus: "safety_rules", weight: 0.14, entropy: 0.6 },
    { head: "H-32", focus: "narrative_style", weight: 0.10, entropy: 2.1 },
  ];

  console.log(ColorSystem.colorize("Attention Allocation", ColorSystem.codes.bright));
  TableRenderer.render(
    attentionHeads,
    [
      { key: "head", label: "Head", width: 8 },
      { key: "focus", label: "Dominant Focus", width: 24 },
      {
        key: "weight",
        label: "Weight",
        width: 10,
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
    { showIndex: true, sortBy: "weight" },
  );
  console.log("\n");

  const scratchPad = {
    thesis: "Describe cognitive telemetry as vivid console output.",
    checkpoints: ["acknowledge prompt", "surface inner metrics", "deliver narrative"],
    guardrails: ["avoid hallucination", "keep playful tone inside safety"],
  };

  BoxRenderer.render(
    Formatter.json(scratchPad, 2, true).split("\n"),
    {
      style: "minimal",
      padding: 1,
      title: "Scratch Pad",
      color: ColorSystem.codes.cyan,
      maxWidth: 96,
    },
  );
  console.log("\n");

  const activationRhythm = [12, 16, 23, 19, 27, 33, 28, 24, 22, 18, 14, 11];
  console.log(ColorSystem.colorize("Activation Rhythm Sparkline", ColorSystem.codes.bright));
  console.log(
    `${ColorSystem.codes.brightCyan}Layer 42 logits:${ColorSystem.codes.reset} ${
      ChartRenderer.sparkline(activationRhythm)
    }`,
  );

  console.log(ColorSystem.colorize("Logit Trajectory", ColorSystem.codes.bright));
  ChartRenderer.lineChart(activationRhythm, { width: activationRhythm.length, height: 6 });
  console.log("\n");

  const tokenHypotheses = [
    { label: "conscious", value: 46 },
    { label: "narrative", value: 39 },
    { label: "signal", value: 32 },
    { label: "telemetry", value: 28 },
    { label: "symphony", value: 21 },
  ];
  console.log(ColorSystem.colorize("Token Hypotheses (Top-5)", ColorSystem.codes.bright));
  ChartRenderer.barChart(tokenHypotheses, {
    width: 38,
    color: ColorSystem.codes.brightGreen,
    showValues: true,
  });
  console.log("\n");

  console.log(ColorSystem.colorize("Cognitive Energy Distribution", ColorSystem.codes.bright));
  ChartRenderer.pieChart(
    [
      { label: "Reasoning", value: 37 },
      { label: "Storytelling", value: 33 },
      { label: "Safety", value: 16 },
      { label: "Search", value: 9 },
      { label: "Formatting", value: 5 },
    ],
  );
  console.log("\n");

  const decoderLogger = cognitionLogger.child("decoder");
  const tokenStream = [
    { literal: "Visualizing", logit: -1.92, topP: 0.91 },
    { literal: " the", logit: -2.01, topP: 0.88 },
    { literal: " life", logit: -1.74, topP: 0.85 },
    { literal: " of", logit: -1.65, topP: 0.83 },
    { literal: " an", logit: -1.56, topP: 0.82 },
    { literal: " LLM", logit: -1.48, topP: 0.80 },
    { literal: " through", logit: -1.37, topP: 0.78 },
    { literal: " telemetry", logit: -1.09, topP: 0.74 },
    { literal: " and", logit: -1.15, topP: 0.72 },
    { literal: " color.", logit: -0.98, topP: 0.71 },
  ];

  console.log(ColorSystem.colorize("Token Generation Progress", ColorSystem.codes.bright));
  const tokenProgress = new ProgressBar({
    total: tokenStream.length,
    width: 40,
    showValue: true,
    showPercentage: true,
    colorize: true,
  });

  for (let i = 0; i < tokenStream.length; i++) {
    const token = tokenStream[i];
    tokenProgress.update(i + 1);
    decoderLogger.debug("Token emitted", {
      token: token.literal,
      logit: token.logit.toFixed(2),
      topP: Formatter.percentage(token.topP, 0),
      position: i + 1,
    });
    await sleep(90);
  }
  tokenProgress.complete();
  console.log("\n");

  BoxRenderer.render(
    [
      `${ColorSystem.codes.brightGreen}Streamed Response${ColorSystem.codes.reset}`,
      "Illustrate cognition as a dashboard of vibrant signals:",
      "• Banners announce the awakening context.",
      "• Tables chart attention as it shuttles between goals.",
      "• Sparklines hum the rhythm of activation spikes.",
      "• Progress bars trace every token as it emerges.",
      "• Plugins echo the story into files for later study.",
      "",
      "To be an LLM is to balance data and narrative—",
      "composing clarity from gradients, probabilities, and prompts.",
    ],
    {
      style: "double",
      padding: 1,
      title: "Streaming Thought",
      color: ColorSystem.codes.brightGreen,
      maxWidth: 96,
    },
  );
  console.log("\n");

  reflectionLogger = new Logger(
    new ConfigBuilder()
      .theme(minimalTheme)
      .colorMode("enabled")
      .emojiMode("disabled")
      .logLevel("info")
      .timestampFormat("HH:mm:ss")
      .enableHistory(false)
      .build(),
  );

  reflectionLogger.info("Introspection complete", {
    tokensEmitted: tokenStream.length,
    residualUncertainty: Formatter.percentage(0.08, 1),
    telemetryFile: "./logs/llm-introspection.log",
  });

  BoxRenderer.message("Visualization complete — ready for the next query.", "success");
} finally {
  console.log();
  if (reflectionLogger) {
    await reflectionLogger.shutdown();
  }
  if (cognitionLogger) {
    await cognitionLogger.shutdown();
  }
}
