import { compose, errorHandler, logger } from "./index.ts";

import type { Context } from "../utils/context.ts";

const handler = (ctx: Context): Response => {
  return new Response("Hello World");
};
