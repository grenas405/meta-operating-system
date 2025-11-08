import { Kernel } from "./kernel.ts";

const kernel = new Kernel({
  serverPort: 3000,
  serverHostname: "localhost",
  debug: true,
});

await kernel.boot();
