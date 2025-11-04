import { Kernel } from "./kernel.ts";

// Create a kernel instance with custom config
const kernel = new Kernel({
  debug: true,
  serverPort: 8000,
  serverHostname: "localhost",
});

// Boot the kernel (starts HTTP server and enters REPL)
await kernel.boot();
