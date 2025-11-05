/**
 * HTTP Router
 * Method-based routing with path pattern matching
 * No external dependencies - uses only Deno built-in APIs
 */

import { compose } from "./middleware/index.ts";
import type { PerformanceMonitor } from "./middleware/performanceMonitor.ts";
import type { Context, Middleware } from "./utils/context.ts";
import { createContext } from "./utils/context.ts";
import { badRequest, json, notFound } from "./utils/response.ts";
import type { ILogger } from "./interfaces/ILogger.ts";
import {
  optionalString,
  requiredEmail,
  requiredNumber,
  requiredString,
  validator,
} from "./utils/validator.ts";

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
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

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

    // Log route registration
    this.logger.logDebug(`Route registered: ${method} ${path}`);

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
      this.logger.logWarning(
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
    const subRouter = new Router(this.logger);

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

export interface RouteRegistrationContext {
  systemInfo: {
    startTime: number;
    version: string;
    pid: number;
    platform: string;
  };
  getUptime: () => number;
  performanceMonitor: PerformanceMonitor;
  config: {
    port: number;
    hostname: string;
  };
  logger: ILogger;
}

export function registerCoreRoutes(
  router: Router,
  context: RouteRegistrationContext,
): void {
  router.get("/", () =>
    json({
      message: "Deno-Genesis Kernel",
      version: context.systemInfo.version,
      uptime: context.getUptime(),
    }));

  router.get("/health", () =>
    json({
      status: "healthy",
      uptime: context.getUptime(),
      timestamp: Date.now(),
    }));

  router.get("/info", () =>
    json({
      ...context.systemInfo,
      uptime: context.getUptime(),
      memory: Deno.memoryUsage(),
      config: {
        port: context.config.port,
        hostname: context.config.hostname,
      },
    }));

  router.get("/metrics", () => json(context.performanceMonitor.getMetrics()));

  router.get(
    "/metrics/detailed",
    () => json(context.performanceMonitor.getDetailedMetrics()),
  );

  router.get(
    "/metrics/insights",
    () => json(context.performanceMonitor.getPerformanceInsights()),
  );

  router.post("/echo", (ctx: Context) => {
    const body = ctx.state.body;

    if (!body) {
      return badRequest("No body provided");
    }

    return json({
      message: "Echo response",
      received: body,
      timestamp: Date.now(),
    });
  });

  router.post(
    "/users",
    validator({
      name: requiredString({ minLength: 2, maxLength: 50 }),
      email: requiredEmail(),
      age: requiredNumber({ min: 18, max: 120, integer: true }),
      bio: optionalString({ maxLength: 500 }),
    }),
    (ctx: Context) => {
      const user = ctx.state.body as Record<string, unknown>;

      const createdUser = {
        id: crypto.randomUUID(),
        ...user,
        createdAt: new Date().toISOString(),
      };

      context.logger.logSuccess("User created", createdUser);

      return json(createdUser, { status: 201 });
    },
  );

  router.post("/contact", (ctx: Context) => {
    const body = ctx.state.body as Record<string, unknown>;

    if (!body) {
      return badRequest("No form data provided");
    }

    context.logger.logInfo("Contact form submitted", body);

    return json({
      message: "Contact form received",
      data: body,
    });
  });

  router.post("/upload", (ctx: Context) => {
    const files = ctx.state.files as Array<{
      name: string;
      filename: string;
      type: string;
      size: number;
      data: Uint8Array;
    }>;

    if (!files || files.length === 0) {
      return badRequest("No files uploaded");
    }

    const fileInfo = files.map((file) => ({
      fieldName: file.name,
      filename: file.filename,
      mimeType: file.type,
      size: file.size,
    }));

    context.logger.logSuccess(`Received ${files.length} file(s)`, { files: fileInfo });

    return json({
      message: "Files uploaded successfully",
      files: fileInfo,
    });
  });
}

/**
 * Create a new router instance
 */
export function createRouter(logger: ILogger): Router {
  return new Router(logger);
}
