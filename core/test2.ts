import { HTTPServer } from "./server.ts";

const server = new HTTPServer({
  debug: true,
  port: 3000,
  hostname: "localhost",
});

await server.start();
