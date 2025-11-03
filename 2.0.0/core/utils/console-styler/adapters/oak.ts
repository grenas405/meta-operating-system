// adapters/oak.ts
import { Context, Next } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { Logger } from "../core/logger.ts";

export interface OakLoggerOptions {
  logger?: Logger;
  skipPaths?: string[];
  logBody?: boolean;
}

export function oakLogger(options: OakLoggerOptions = {}) {
  const logger = options.logger || new Logger();
  const skipPaths = options.skipPaths || [];
  const logBody = options.logBody || false;

  return async (ctx: Context, next: Next) => {
    const start = performance.now();
    const requestId = crypto.randomUUID();
    const path = ctx.request.url.pathname;

    // Skip if in skip list
    if (skipPaths.includes(path)) {
      await next();
      return;
    }

    // Log incoming request
    logger.info(`→ ${ctx.request.method} ${path}`, {
      requestId,
      ip: ctx.request.ip,
      userAgent: ctx.request.headers.get("user-agent"),
    });

    try {
      await next();

      const duration = performance.now() - start;
      const status = ctx.response.status;

      if (status >= 200 && status < 300) {
        logger.success(`← ${status} ${ctx.request.method} ${path}`, {
          requestId,
          duration: `${duration.toFixed(2)}ms`,
          status,
        });
      } else if (status >= 400) {
        logger.warning(`← ${status} ${ctx.request.method} ${path}`, {
          requestId,
          duration: `${duration.toFixed(2)}ms`,
          status,
        });
      } else {
        logger.info(`← ${status} ${ctx.request.method} ${path}`, {
          requestId,
          duration: `${duration.toFixed(2)}ms`,
          status,
        });
      }
    } catch (error) {
      const duration = performance.now() - start;
      logger.error(`← Error ${ctx.request.method} ${path}`, {
        requestId,
        duration: `${duration.toFixed(2)}ms`,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  };
}
