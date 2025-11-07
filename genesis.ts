#!/usr/bin/env -S deno run --allow-all
/**
 * Genesis REPL Launcher
 * Quick entry point to the Genesis interactive shell
 */

import { GenesisRepl } from "./genesis-repl.ts";

const repl = new GenesisRepl();
await repl.start();
