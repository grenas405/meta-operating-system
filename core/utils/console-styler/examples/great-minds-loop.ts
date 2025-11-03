#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write

/**
 * Infinite Inspirational Loop
 *
 * Streams a continuous sequence of quotes from foundational computer science
 * thinkers using the Console Styler presentation toolkit.
 */

import {
  BannerRenderer,
  BoxRenderer,
  ColorSystem,
  ConfigBuilder,
  Formatter,
  Logger,
  neonTheme,
  Spinner,
} from "../mod.ts";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

console.clear();
console.log("\n");

BannerRenderer.render({
  title: "INFINITE SIGNAL LOOP",
  subtitle: "Channeling voices that shaped computing",
  description: "Alan Kay • John McCarthy • Claude Shannon",
  version: "v1.0",
  author: "Console Styler Showcase",
  width: 94,
  style: "double",
  color: ColorSystem.codes.brightMagenta,
});
console.log("\n");

const logger = new Logger(
  new ConfigBuilder()
    .theme(neonTheme)
    .timestampFormat("HH:mm:ss")
    .logLevel("info")
    .enableHistory(false)
    .build(),
);

const primer = new Spinner({
  message: "Priming cognitive resonators",
  interval: 85,
  colorize: true,
});
primer.start();
await delay(1500);
primer.succeed("Wisdom relay online");
console.log("\n");

type Insight = {
  author: string;
  quote: string;
  context: string;
};

const insights: Insight[] = [
  {
    author: "Alan Kay",
    quote: "The best way to predict the future is to invent it.",
    context: "Inventive engineering turns speculation into systems.",
  },
  {
    author: "Alan Kay",
    quote: "Simple things should be simple, complex things should be possible.",
    context: "Tooling must empower both elegance and ambition.",
  },
  {
    author: "Alan Kay",
    quote: "Perspective is worth 80 IQ points.",
    context: "Reframing problems unlocks new computational moves.",
  },
  {
    author: "John McCarthy",
    quote: "As soon as it works, no one calls it AI anymore.",
    context: "Yesterday's breakthroughs become tomorrow's baselines.",
  },
  {
    author: "John McCarthy",
    quote: "He who refuses to do arithmetic is doomed to talk nonsense.",
    context: "Quantitative rigor keeps speculation grounded.",
  },
  {
    author: "John McCarthy",
    quote: "Artificial intelligence is the science and engineering of making intelligent machines.",
    context: "A reminder that curiosity drives both theory and craft.",
  },
  {
    author: "Claude Shannon",
    quote: "Information is the resolution of uncertainty.",
    context: "Entropy is the compass guiding decisive communication.",
  },
  {
    author: "Claude Shannon",
    quote:
      "We may fairly regard the present state of the theory of communication as analogous to that of the telephone system about 1890.",
    context: "Every era rediscovered the channels it relies upon.",
  },
  {
    author: "Claude Shannon",
    quote:
      "The fundamental problem of communication is that of reproducing at one point either exactly or approximately a message selected at another point.",
    context: "Fidelity remains the core metric of every signal path.",
  },
];

const palette = [
  ColorSystem.codes.brightCyan,
  ColorSystem.codes.brightMagenta,
  ColorSystem.codes.brightYellow,
];

const rhythm = [5400, 6200, 5800];

let cycle = 0;

while (true) {
  const insight = insights[cycle % insights.length];
  const accent = palette[cycle % palette.length];
  const wait = rhythm[cycle % rhythm.length];
  const stamp = Formatter.timestamp(new Date(), "HH:mm:ss");

  logger.info(
    `${
      ColorSystem.colorize(
        `⟲ Cycle ${String(cycle + 1).padStart(2, "0")}`,
        accent,
      )
    } | ${insight.author} resonance locked | ${stamp}`,
  );

  const wrappedQuote = Formatter.wrap(insight.quote, 72).map((line) =>
    ColorSystem.colorize(line, ColorSystem.codes.bright)
  );

  BoxRenderer.render(
    [
      ...wrappedQuote,
      "",
      ColorSystem.colorize(`— ${insight.author}`, accent),
      ColorSystem.colorize(insight.context, ColorSystem.codes.dim),
    ],
    {
      style: "bold",
      color: accent,
      padding: 1,
      margin: 1,
      minWidth: 80,
      maxWidth: 90,
      title: `✶ SIGNAL ${String((cycle % insights.length) + 1).padStart(2, "0")} ✶`,
    },
  );

  console.log(
    ColorSystem.colorize("━".repeat(90), ColorSystem.codes.dim),
  );

  await delay(wait);
  cycle += 1;
}
