// adapters/express.ts
// Note: This would need Node.js compatibility layer
import { Logger } from "../core/logger.ts";

export interface ExpressLoggerOptions {
  logger?: Logger;
  skipPaths?: string[];
}

export function expressLogger(options: ExpressLoggerOptions = {}) {
  const logger = options.logger || new Logger();
  const skipPaths = options.skipPaths || [];

  return (req: any, res: any, next: any) => {
    const start = performance.now();
    const requestId = crypto.randomUUID();
    const path = req.path;

    // Skip if in skip list
    if (skipPaths.includes(path)) {
      next();
      return;
    }

    // Log incoming request
    logger.info(`→ ${req.method} ${path}`, {
      requestId,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Capture response
    const originalSend = res.send;
    res.send = function (data: any) {
      const duration = performance.now() - start;
      const status = res.statusCode;

      if (status >= 200 && status < 300) {
        logger.success(`← ${status} ${req.method} ${path}`, {
          requestId,
          duration: `${duration.toFixed(2)}ms`,
          status,
        });
      } else if (status >= 400) {
        logger.warning(`← ${status} ${req.method} ${path}`, {
          requestId,
          duration: `${duration.toFixed(2)}ms`,
          status,
        });
      } else {
        logger.info(`← ${status} ${req.method} ${path}`, {
          requestId,
          duration: `${duration.toFixed(2)}ms`,
          status,
        });
      }

      originalSend.call(this, data);
    };

    next();
  };
}
