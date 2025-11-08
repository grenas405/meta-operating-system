// ==============================================================================
// 🌐 Adapter Showcase Example
// ------------------------------------------------------------------------------
// Spins up mini Oak, Hono, and Express servers to demonstrate the HTTP adapters.
// Run with `deno run --allow-net examples/framework-adapters.ts`.
// Select a single framework with `ADAPTER_DEMO_TARGET=oak|hono|express`.
// ==============================================================================

import { Application as OakApplication, Router as OakRouter } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { Hono } from "https://deno.land/x/hono@v3.11.7/mod.ts";
import express, { type Request, type Response } from "npm:express@4.19.2";

import {
  Logger,
  expressLogger,
  honoLogger,
  oakLogger,
} from "../mod.ts";

const sharedLogger = new Logger().child("http");
const demoDurationMs = Number(Deno.env.get("ADAPTER_DEMO_DURATION_MS") ?? "5000");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runOakDemo() {
  const app = new OakApplication();
  const router = new OakRouter();

  app.use(oakLogger({
    logger: sharedLogger.child("oak"),
    skipPaths: ["/health"],
  }));

  router.get("/", (ctx) => {
    ctx.response.type = "json";
    ctx.response.body = { framework: "oak", message: "Console Styler adapter demo" };
  });

  router.get("/health", (ctx) => {
    ctx.response.body = "ok";
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  const controller = new AbortController();
  const port = 4510;

  console.log(`⚡ Oak demo listening on http://localhost:${port}`);
  const serverPromise = app.listen({ port, signal: controller.signal });

  await sleep(demoDurationMs);
  controller.abort();

  try {
    await serverPromise;
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      throw error;
    }
  }

  console.log("⏹️  Oak demo stopped\n");
}

async function runHonoDemo() {
  const app = new Hono();

  app.use("*", honoLogger({
    logger: sharedLogger.child("hono"),
    skipPaths: ["/healthz"],
  }));

  app.get("/", (c) => c.json({ framework: "hono", message: "Console Styler adapter demo" }));
  app.get("/healthz", (c) => c.text("healthy"));

  const port = 4511;
  console.log(`⚡ Hono demo listening on http://localhost:${port}`);

  const server = Deno.serve({
    port,
    hostname: "127.0.0.1",
    onListen: () => {
      // No-op, just ensure the server starts eagerly.
    },
  }, app.fetch);

  await sleep(demoDurationMs);
  await server.shutdown();
  await server.finished;

  console.log("⏹️  Hono demo stopped\n");
}

async function runExpressDemo() {
  const app = express();

  app.use(express.json());
  app.use(expressLogger({
    logger: sharedLogger.child("express"),
    skipPaths: ["/health"],
  }));

  app.get("/", (_req: Request, res: Response) => {
    res.json({ framework: "express", message: "Console Styler adapter demo" });
  });

  app.get("/health", (_req: Request, res: Response) => {
    res.send("ok");
  });

  const port = 4512;

  await new Promise<void>((resolve) => {
    const server = app.listen(port, () => {
      console.log(`⚡ Express demo listening on http://localhost:${port}`);
    });

    setTimeout(() => {
      server.close(() => {
        console.log("⏹️  Express demo stopped\n");
        resolve();
      });
    }, demoDurationMs);
  });
}

async function main() {
  const target = (Deno.env.get("ADAPTER_DEMO_TARGET") ?? "all").toLowerCase();

  if (target === "oak" || target === "all") {
    await runOakDemo();
  }

  if (target === "hono" || target === "all") {
    await runHonoDemo();
  }

  if (target === "express" || target === "all") {
    await runExpressDemo();
  }

  console.log("✅ Adapter showcase complete");
}

if (import.meta.main) {
  await main();
}
