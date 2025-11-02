/**
 * HTTP Server
 * Server abstraction that integrates router and middleware
 * No external dependencies - uses only Deno built-in APIs
 */

import type { Router } from "./router.ts";
import type { Middleware } from "./utils/context.ts";
import { createRouter } from "./router.ts";
import { errorHandler } from "./middleware/index.ts";
import { ConsoleStyler } from "./utils/console-styler/ConsoleStyler.ts";

export interface ServerConfig {
  port?: number;
  hostname?: string;
  signal?: AbortSignal;
  onListen?: (params: { hostname: string; port: number }) => void;
  onError?: (error: Error) => void;
}

export class Server {
  private router: Router;
  private config:
    & Required<Omit<ServerConfig, "signal" | "onListen" | "onError">>
    & Pick<ServerConfig, "signal" | "onListen" | "onError">;
  private server: Deno.HttpServer | null = null;

  constructor(config: ServerConfig = {}) {
    this.router = createRouter();
    this.config = {
      port: config.port ?? 8000,
      hostname: config.hostname ?? "0.0.0.0",
      signal: config.signal,
      onListen: config.onListen,
      onError: config.onError,
    };

    // Add default error handler
    this.router.use(errorHandler());
  }

  /**
   * Get the router instance
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Add middleware to the server
   */
  use(middleware: Middleware): this {
    this.router.use(middleware);
    return this;
  }

  /**
   * Register a GET route
   */
  get(
    path: string,
    ...args: [
      (ctx: any) => Response | Promise<Response>,
    ] | [...Middleware[], (ctx: any) => Response | Promise<Response>]
  ): this {
    // @ts-ignore - complex rest parameter forwarding
    this.router.get(path, ...args);
    return this;
  }

  /**
   * Register a POST route
   */
  post(
    path: string,
    ...args: [
      (ctx: any) => Response | Promise<Response>,
    ] | [...Middleware[], (ctx: any) => Response | Promise<Response>]
  ): this {
    // @ts-ignore - complex rest parameter forwarding
    this.router.post(path, ...args);
    return this;
  }

  /**
   * Register a PUT route
   */
  put(
    path: string,
    ...args: [
      (ctx: any) => Response | Promise<Response>,
    ] | [...Middleware[], (ctx: any) => Response | Promise<Response>]
  ): this {
    // @ts-ignore - complex rest parameter forwarding
    this.router.put(path, ...args);
    return this;
  }

  /**
   * Register a DELETE route
   */
  delete(
    path: string,
    ...args: [
      (ctx: any) => Response | Promise<Response>,
    ] | [...Middleware[], (ctx: any) => Response | Promise<Response>]
  ): this {
    // @ts-ignore - complex rest parameter forwarding
    this.router.delete(path, ...args);
    return this;
  }

  /**
   * Register a PATCH route
   */
  patch(
    path: string,
    ...args: [
      (ctx: any) => Response | Promise<Response>,
    ] | [...Middleware[], (ctx: any) => Response | Promise<Response>]
  ): this {
    // @ts-ignore - complex rest parameter forwarding
    this.router.patch(path, ...args);
    return this;
  }

  /**
   * Register a route for all methods
   */
  all(
    path: string,
    ...args: [
      (ctx: any) => Response | Promise<Response>,
    ] | [...Middleware[], (ctx: any) => Response | Promise<Response>]
  ): this {
    // @ts-ignore - complex rest parameter forwarding
    this.router.all(path, ...args);
    return this;
  }

  /**
   * Create a sub-router with a prefix
   */
  route(prefix: string): Router {
    return this.router.route(prefix);
  }

  /**
   * Start the HTTP server
   */
  async listen(): Promise<void> {
    try {
      this.server = Deno.serve(
        {
          port: this.config.port,
          hostname: this.config.hostname,
          signal: this.config.signal,
          onListen: this.config.onListen,
        },
        async (request) => {
          try {
            return await this.router.handle(request);
          } catch (error) {
            const errorMessage = error instanceof Error
              ? error.message
              : String(error);
            ConsoleStyler.logError(
              `Unhandled error in request handler: ${errorMessage}`,
              {
                url: request.url,
                method: request.method,
                error: errorMessage,
              },
            );

            if (this.config.onError) {
              this.config.onError(
                error instanceof Error ? error : new Error(String(error)),
              );
            }

            return new Response(
              JSON.stringify({ error: "Internal Server Error" }),
              {
                status: 500,
                headers: { "Content-Type": "application/json" },
              },
            );
          }
        },
      );

      await this.server.finished;
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      ConsoleStyler.logCritical(
        `Failed to start HTTP server: ${errorMessage}`,
        {
          port: this.config.port,
          hostname: this.config.hostname,
          error: errorMessage,
        },
      );

      if (this.config.onError) {
        this.config.onError(
          error instanceof Error ? error : new Error(String(error)),
        );
      }

      throw error;
    }
  }

  /**
   * Get server info
   */
  info(): { port: number; hostname: string } | null {
    if (!this.server) {
      return null;
    }

    return {
      port: this.config.port,
      hostname: this.config.hostname,
    };
  }
}

/**
 * Create a new server instance
 */
export function createServer(config?: ServerConfig): Server {
  return new Server(config);
}
