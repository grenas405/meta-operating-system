#!/usr/bin/env -S deno run --allow-env --allow-read --allow-write

/**
 * Unix Philosophy 2.0 — Bell Labs Continuum
 *
 * A dark blue research briefing that presents the lineage of the Unix philosophy,
 * echoes the Plan 9 ideals, and lands on Deno as the modern runtime expression.
 */

import {
  BannerRenderer,
  BoxRenderer,
  ColorSystem,
  ConfigBuilder,
  Logger,
  ProgressBar,
  Spinner,
  TableRenderer,
} from "../mod.ts";
import type { Theme } from "../mod.ts";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

console.clear();
console.log("\n");

const palette = {
  midnight: ColorSystem.colors256.navy,
  cobalt: ColorSystem.colors256.darkBlue,
  deep: ColorSystem.colors256.deepBlue,
  accent: ColorSystem.colors256.royalBlue,
  bright: ColorSystem.codes.brightBlue,
};

const reset = ColorSystem.codes.reset;
const heading = (title: string) =>
  console.log(`${ColorSystem.codes.bright}${palette.accent}${title}${reset}`);

const bellLabsMidnight: Theme = {
  name: "bell-labs-midnight",
  colors: {
    primary: palette.cobalt,
    secondary: palette.accent,
    success: palette.bright,
    warning: ColorSystem.codes.yellow,
    error: ColorSystem.codes.red,
    info: palette.accent,
    debug: ColorSystem.codes.dim,
    critical: ColorSystem.codes.brightRed,
    muted: ColorSystem.codes.dim,
    accent: palette.accent,
  },
  symbols: {
    success: "[OK]",
    error: "[ERR]",
    warning: "[WRN]",
    info: "[INF]",
    debug: "[DBG]",
    critical: "[CRT]",
    bullet: "-",
    arrow: "->",
    check: "[+]",
    cross: "[x]",
  },
  boxDrawing: {
    topLeft: "+",
    topRight: "+",
    bottomLeft: "+",
    bottomRight: "+",
    horizontal: "-",
    vertical: "|",
    cross: "+",
    teeLeft: "+",
    teeRight: "+",
    teeTop: "+",
    teeBottom: "+",
  },
};

BannerRenderer.render({
  title: "UNIX PHILOSOPHY 2.0",
  subtitle: "Bell Labs Continuum • Plan 9 Reverie",
  description:
    "Dark blue research briefing on composability, namespaces, and modern runtimes.",
  version: "midnight-draft",
  author: "Console Styler Examples",
  width: 92,
  color: palette.accent,
});
console.log("\n");

heading("2. Bell Labs Signal Log");

const researchLogger = new Logger(
  new ConfigBuilder()
    .theme(bellLabsMidnight)
    .logLevel("debug")
    .timestampFormat("HH:mm:ss")
    .enableHistory(false)
    .build(),
);

researchLogger.info("1973 • Thompson and Ritchie codify the small-systems charter.");
researchLogger.debug(
  "Pipe-oriented toolchains let research notes remix without ceremony.",
  { primitive: "pipe()", ethos: "composability" },
);
researchLogger.info("Plan 9 reframes namespaces as the campus-wide switchboard.");
researchLogger.warning(
  "Expose primitives, not policy — let craftsmen wire the abstractions.",
);
researchLogger.success(
  "Unix philosophy 2.0 keeps the lab nimble even as the network sprawls.",
);
console.log("\n");

heading("3. Continuum Backplane");

const continuum = [
  {
    era: "1970s",
    system: "UNIX V6",
    focus: "Do one thing well",
    signature: "pipe()",
  },
  {
    era: "1980s",
    system: "8th Edition UNIX",
    focus: "Distributed research clusters",
    signature: "mk + mux",
  },
  {
    era: "1989",
    system: "Plan 9",
    focus: "Namespace as operating principle",
    signature: "9P protocol",
  },
  {
    era: "1995",
    system: "Inferno",
    focus: "Portable runtimes everywhere",
    signature: "Dis VM",
  },
  {
    era: "2024",
    system: "Unix Philosophy 2.0",
    focus: "Runtime as a composable library",
    signature: "Deno",
  },
];

TableRenderer.render(
  continuum,
  [
    { key: "era", label: "Era", width: 10 },
    { key: "system", label: "System", width: 20 },
    { key: "focus", label: "Focus", width: 36 },
    { key: "signature", label: "Signature", width: 16 },
  ],
  { showIndex: true, maxWidth: 94 },
);
console.log("\n");

heading("4. Plan 9 Patterns");

BoxRenderer.render(
  [
    "Namespace is the API: mount services as if they were local files.",
    "9P keeps every workstation in conversation, no matter the distance.",
    "rio and acme stay scriptable; the window system bends to the shell.",
    "The plumber routes intent, letting tools cooperate without coupling.",
  ],
  {
    style: "single",
    padding: 1,
    color: palette.deep,
    title: "Plan 9 Research Notes",
    maxWidth: 92,
  },
);
console.log("\n");

heading("5. Assembly Timeline");

const assemblyBar = new ProgressBar({
  total: 100,
  width: 48,
  complete: "#",
  incomplete: ".",
  showValue: false,
  showPercentage: true,
  colorize: false,
});

const milestones = [25, 50, 70, 85, 100];

for (const value of milestones) {
  assemblyBar.update(value);
  await sleep(220);
}
assemblyBar.complete();

const assemblyNarrative = [
  {
    label: "Bell Labs primitives stay sharp",
    detail: "cat(1), ed(1), pipe() compose the lab cadence",
  },
  {
    label: "Plan 9 exports namespaces over 9P",
    detail: "services mount like ordinary directories",
  },
  {
    label: "Inferno turns runtimes portable",
    detail: "Dis VM keeps code mobile across devices",
  },
  {
    label: "Unix philosophy 2.0 codifies the research loop",
    detail: "shell, editors, and network act as one fabric",
  },
];

assemblyNarrative.forEach((entry, index) => {
  console.log(
    `${palette.midnight}${index + 1}. ${entry.label}${reset} ${
      ColorSystem.colorize(entry.detail, ColorSystem.codes.dim)
    }`,
  );
});
console.log("\n");

heading("6. Introducing Deno");

const denoSpinner = new Spinner({
  message: "Tracing Bell Labs DNA into the modern runtime...",
  frames: ["-", "\\", "|", "/"],
  interval: 110,
  colorize: false,
});

denoSpinner.start();
await sleep(420);
denoSpinner.update("Hardening secure defaults and typed modules...");
await sleep(420);
denoSpinner.update("Shipping Web APIs as first-class primitives...");
await sleep(420);
denoSpinner.succeed(
  `${palette.accent}${ColorSystem.codes.bright}Deno composes the final piece${reset}`,
);

BoxRenderer.render(
  [
    "Deno carries the continuum forward:",
    "- Permissions stay explicit, keeping the runtime trustworthy.",
    "- TypeScript-native modules echo the lab habit of clarity.",
    "- Web-standard APIs treat the network as the default resource map.",
    "- Deploy as a single binary or library — ergonomic for modern shells.",
  ],
  {
    style: "single",
    padding: 1,
    color: palette.accent,
    title: "Deno • Final Assembly",
    maxWidth: 92,
  },
);
console.log("\n");
