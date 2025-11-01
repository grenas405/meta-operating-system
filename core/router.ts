/**
 * HTTP Router
 * Method-based routing with path pattern matching
 * No external dependencies - uses only Deno built-in APIs
 */

import { compose } from "./middleware/index.ts";
import type { Context, Handler, Middleware } from "./utils/context.ts";
import { createContext } from "./utils/context.ts";
import { notFound } from "./utils/response.ts";
import { ConsoleStyler } from "./utils/console-styler/ConsoleStyler.ts";

export type RouteHandler = (ctx: Context) => Response | Promise<Response>;

interface Route {
  method: string;
  pattern: URLPattern;
  handler: RouteHandler;
  middleware?: Middleware[];
}

export class Router {
  private routes: Route[] = [];
  private middleware: Middleware[] = [];

  /**
   * Add middleware to the router
   */
  use(middleware: Middleware): this {
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Register a route
   */
  private addRoute(
    method: string,
    path: string,
    handler: RouteHandler,
    middleware?: Middleware[],
  ): this {
    // Convert path to URLPattern
    // Support :param syntax by converting to URLPattern groups
    const patternPath = path.replace(/:(\w+)/g, ":$1");

    const pattern = new URLPattern({ pathname: patternPath });
    this.routes.push({ method, pattern, handler, middleware });

    // Log route registration with colors
    ConsoleStyler.logRoute(method, path, "Registered route");

    return this;
  }

  /**
   * Register a GET route
   */
  get(
    path: string,
    ...args: [RouteHandler] | [...Middleware[], RouteHandler]
  ): this {
    const handler = args[args.length - 1] as RouteHandler;
    const middleware = args.length > 1
      ? args.slice(0, -1) as Middleware[]
      : undefined;
    return this.addRoute("GET", path, handler, middleware);
  }

  /**
   * Register a POST route
   */
  post(
    path: string,
    ...args: [RouteHandler] | [...Middleware[], RouteHandler]
  ): this {
    const handler = args[args.length - 1] as RouteHandler;
    const middleware = args.length > 1
      ? args.slice(0, -1) as Middleware[]
      : undefined;
    return this.addRoute("POST", path, handler, middleware);
  }

  /**
   * Register a PUT route
   */
  put(
    path: string,
    ...args: [RouteHandler] | [...Middleware[], RouteHandler]
  ): this {
    const handler = args[args.length - 1] as RouteHandler;
    const middleware = args.length > 1
      ? args.slice(0, -1) as Middleware[]
      : undefined;
    return this.addRoute("PUT", path, handler, middleware);
  }

  /**
   * Register a DELETE route
   */
  delete(
    path: string,
    ...args: [RouteHandler] | [...Middleware[], RouteHandler]
  ): this {
    const handler = args[args.length - 1] as RouteHandler;
    const middleware = args.length > 1
      ? args.slice(0, -1) as Middleware[]
      : undefined;
    return this.addRoute("DELETE", path, handler, middleware);
  }

  /**
   * Register a PATCH route
   */
  patch(
    path: string,
    ...args: [RouteHandler] | [...Middleware[], RouteHandler]
  ): this {
    const handler = args[args.length - 1] as RouteHandler;
    const middleware = args.length > 1
      ? args.slice(0, -1) as Middleware[]
      : undefined;
    return this.addRoute("PATCH", path, handler, middleware);
  }

  /**
   * Register a route for all methods
   */
  all(
    path: string,
    ...args: [RouteHandler] | [...Middleware[], RouteHandler]
  ): this {
    const handler = args[args.length - 1] as RouteHandler;
    const middleware = args.length > 1
      ? args.slice(0, -1) as Middleware[]
      : undefined;
    return this.addRoute("*", path, handler, middleware);
  }

  /**
   * Find matching route for request
   */
  private findRoute(method: string, url: URL): {
    route: Route;
    params: Record<string, string>;
  } | null {
    for (const route of this.routes) {
      if (route.method !== "*" && route.method !== method) {
        continue;
      }

      const match = route.pattern.exec(url);
      if (match) {
        const params: Record<string, string> = {};

        // Extract path parameters from pathname groups
        if (match.pathname.groups) {
          Object.assign(params, match.pathname.groups);
        }

        return { route, params };
      }
    }

    return null;
  }

  /**
   * Handle incoming request
   */
  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const match = this.findRoute(request.method, url);

    if (!match) {
      ConsoleStyler.logWarning(
        `Route not found: ${request.method} ${url.pathname}`,
        {
          method: request.method,
          pathname: url.pathname,
          availableRoutes: this.routes.length,
        },
      );
      return notFound(`Route not found: ${request.method} ${url.pathname}`);
    }

    const ctx = createContext(request, match.params);

    // Compose global middleware, route-specific middleware, and route handler
    const allMiddleware = [
      ...this.middleware,
      ...(match.route.middleware ?? []),
    ];

    const handler = allMiddleware.length > 0
      ? compose(allMiddleware, match.route.handler)
      : match.route.handler;

    return await handler(ctx);
  }

  /**
   * Create a sub-router with a prefix
   */
  route(prefix: string): Router {
    const subRouter = new Router();

    // Wrap sub-router to handle prefixed paths
    this.all(`${prefix}/*`, async (ctx: Context) => {
      // Create a modified request with the prefix removed
      const newUrl = new URL(ctx.request.url);
      newUrl.pathname = ctx.url.pathname.slice(prefix.length) || "/";

      const newRequest = new Request(newUrl, ctx.request);
      return await subRouter.handle(newRequest);
    });

    return subRouter;
  }
}

/**
 * Create a new router instance
 */
export function createRouter(): Router {
  return new Router();
}
