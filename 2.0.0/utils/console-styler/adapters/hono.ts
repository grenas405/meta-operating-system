// adapters/hono.ts
import { Context, Next } from "https://deno.land/x/hono@v3.11.7/mod.ts";
import { Logger } from "../core/logger.ts";

export interface HonoLoggerOptions {
  logger?: Logger;
  skipPaths?: string[];
}

export function honoLogger(options: HonoLoggerOptions = {}) {
  const logger = options.logger || new Logger();
  const skipPaths = options.skipPaths || [];

  return async (c: Context, next: Next) => {
    const start = performance.now();
    const requestId = crypto.randomUUID();
    const path = new URL(c.req.url).pathname;

    // Skip if in skip list
    if (skipPaths.includes(path)) {
      await next();
      return;
    }

    // Log incoming request
    logger.info(`→ ${c.req.method} ${path}`, {
      requestId,
      userAgent: c.req.header("user-agent"),
    });

    try {
      await next();

      const duration = performance.now() - start;
      const status = c.res.status;

      if (status >= 200 && status < 300) {
        logger.success(`← ${status} ${c.req.method} ${path}`, {
          requestId,
          duration: `${duration.toFixed(2)}ms`,
          status,
        });
      } else if (status >= 400) {
        logger.warning(`← ${status} ${c.req.method} ${path}`, {
          requestId,
          duration: `${duration.toFixed(2)}ms`,
          status,
        });
      } else {
        logger.info(`← ${status} ${c.req.method} ${path}`, {
          requestId,
          duration: `${duration.toFixed(2)}ms`,
          status,
        });
      }
    } catch (error) {
      const duration = performance.now() - start;
      logger.error(`← Error ${c.req.method} ${path}`, {
        requestId,
        duration: `${duration.toFixed(2)}ms`,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  };
}
