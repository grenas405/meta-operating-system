import { Kernel } from "./kernel.ts";

const kernel = new Kernel({
  serverPort: 9000,
  serverHostname: "localhost",
  debug: true,
});

await kernel.boot();
