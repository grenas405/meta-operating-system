import { HTTPServer } from "./utils/mod.ts";

const server = new HTTPServer({
  port: 3000,
  hostname: "127.0.0.1",
  debug: true,
});

await server.start();
