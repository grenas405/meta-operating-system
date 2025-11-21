/**
 * Request Body Parsers
 * Parse and validate request bodies with zero dependencies
 * Uses only Deno built-in APIs
 */

import type { Context, Middleware } from "../utils/context.ts";
import { ConsoleStyler } from "@pedromdominguez/genesis-trace";

/**
 * JSON body parser middleware
 * Parses request body as JSON and stores in ctx.state.body
 *
 * @param options - Parser options
 * @param options.limit - Maximum body size in bytes (default: 1MB)
 * @param options.strict - Strict JSON parsing (default: true)
 */
export function json(options: {
  limit?: number;
  strict?: boolean;
} = {}): Middleware {
  const limit = options.limit ?? 1024 * 1024; // 1MB default
  const strict = options.strict ?? true;

  return async (ctx: Context, next: () => Promise<Response>) => {
    const contentType = ctx.request.headers.get("content-type");

    // Only parse if content-type is JSON
    if (contentType?.includes("application/json")) {
      try {
        // Check content length
        const contentLength = ctx.request.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > limit) {
          return new Response(
            JSON.stringify({
              error: "Payload Too Large",
              message: `Request body exceeds limit of ${limit} bytes`,
            }),
            {
              status: 413,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        // Parse JSON body
        const text = await ctx.request.text();

        // Check actual size
        if (text.length > limit) {
          return new Response(
            JSON.stringify({
              error: "Payload Too Large",
              message: `Request body exceeds limit of ${limit} bytes`,
            }),
            {
              status: 413,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        // Parse with optional strict mode
        const body = strict
          ? JSON.parse(text)
          : JSON.parse(text, (key, value) => value);

        ctx.state.body = body;

        ConsoleStyler.logDebug("Parsed JSON body", {
          size: text.length,
          keys: typeof body === "object" && body !== null
            ? Object.keys(body).length
            : 0,
        });
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);

        ConsoleStyler.logError("JSON parse error", {
          error: errorMessage,
          contentType,
        });

        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Invalid JSON body",
            details: errorMessage,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    return await next();
  };
}

/**
 * URL-encoded form data parser middleware
 * Parses application/x-www-form-urlencoded bodies
 *
 * @param options - Parser options
 * @param options.limit - Maximum body size in bytes (default: 1MB)
 */
export function urlencoded(options: {
  limit?: number;
} = {}): Middleware {
  const limit = options.limit ?? 1024 * 1024; // 1MB default

  return async (ctx: Context, next: () => Promise<Response>) => {
    const contentType = ctx.request.headers.get("content-type");

    if (contentType?.includes("application/x-www-form-urlencoded")) {
      try {
        const contentLength = ctx.request.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > limit) {
          return new Response(
            JSON.stringify({
              error: "Payload Too Large",
              message: `Request body exceeds limit of ${limit} bytes`,
            }),
            {
              status: 413,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const text = await ctx.request.text();

        if (text.length > limit) {
          return new Response(
            JSON.stringify({
              error: "Payload Too Large",
              message: `Request body exceeds limit of ${limit} bytes`,
            }),
            {
              status: 413,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        // Parse URLSearchParams into plain object
        const params = new URLSearchParams(text);
        const body: Record<string, string | string[]> = {};

        for (const [key, value] of params.entries()) {
          // Handle multiple values for same key
          const existing = body[key];
          if (existing) {
            body[key] = Array.isArray(existing)
              ? [...existing, value]
              : [existing, value];
          } else {
            body[key] = value;
          }
        }

        ctx.state.body = body;

        ConsoleStyler.logDebug("Parsed URL-encoded body", {
          size: text.length,
          fields: Object.keys(body).length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);

        ConsoleStyler.logError("URL-encoded parse error", {
          error: errorMessage,
        });

        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Invalid URL-encoded body",
            details: errorMessage,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    return await next();
  };
}

/**
 * Multipart form data parser middleware
 * Parses multipart/form-data bodies (file uploads)
 *
 * @param options - Parser options
 * @param options.limit - Maximum total body size in bytes (default: 10MB)
 * @param options.maxFileSize - Maximum individual file size (default: 5MB)
 */
export function multipart(options: {
  limit?: number;
  maxFileSize?: number;
} = {}): Middleware {
  const limit = options.limit ?? 10 * 1024 * 1024; // 10MB default
  const maxFileSize = options.maxFileSize ?? 5 * 1024 * 1024; // 5MB default

  return async (ctx: Context, next: () => Promise<Response>) => {
    const contentType = ctx.request.headers.get("content-type");

    if (contentType?.includes("multipart/form-data")) {
      try {
        const contentLength = ctx.request.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > limit) {
          return new Response(
            JSON.stringify({
              error: "Payload Too Large",
              message: `Request body exceeds limit of ${limit} bytes`,
            }),
            {
              status: 413,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const formData = await ctx.request.formData();
        const fields: Record<string, unknown> = {};
        const files: Array<{
          name: string;
          filename: string;
          type: string;
          size: number;
          data: Uint8Array;
        }> = [];

        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            // Handle file upload
            const arrayBuffer = await value.arrayBuffer();
            const size = arrayBuffer.byteLength;

            if (size > maxFileSize) {
              return new Response(
                JSON.stringify({
                  error: "Payload Too Large",
                  message:
                    `File "${value.name}" exceeds maximum size of ${maxFileSize} bytes`,
                }),
                {
                  status: 413,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }

            files.push({
              name: key,
              filename: value.name,
              type: value.type,
              size,
              data: new Uint8Array(arrayBuffer),
            });
          } else {
            // Handle regular field
            const existing = fields[key];
            if (existing) {
              fields[key] = Array.isArray(existing)
                ? [...existing, value]
                : [existing, value];
            } else {
              fields[key] = value;
            }
          }
        }

        ctx.state.body = fields;
        ctx.state.files = files;

        ConsoleStyler.logDebug("Parsed multipart body", {
          fields: Object.keys(fields).length,
          files: files.length,
          totalSize: files.reduce((sum, f) => sum + f.size, 0),
        });
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);

        ConsoleStyler.logError("Multipart parse error", {
          error: errorMessage,
        });

        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Invalid multipart body",
            details: errorMessage,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    return await next();
  };
}

/**
 * Text body parser middleware
 * Parses plain text bodies
 *
 * @param options - Parser options
 * @param options.limit - Maximum body size in bytes (default: 1MB)
 */
export function text(options: {
  limit?: number;
} = {}): Middleware {
  const limit = options.limit ?? 1024 * 1024; // 1MB default

  return async (ctx: Context, next: () => Promise<Response>) => {
    const contentType = ctx.request.headers.get("content-type");

    if (contentType?.includes("text/plain")) {
      try {
        const contentLength = ctx.request.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > limit) {
          return new Response(
            JSON.stringify({
              error: "Payload Too Large",
              message: `Request body exceeds limit of ${limit} bytes`,
            }),
            {
              status: 413,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const bodyText = await ctx.request.text();

        if (bodyText.length > limit) {
          return new Response(
            JSON.stringify({
              error: "Payload Too Large",
              message: `Request body exceeds limit of ${limit} bytes`,
            }),
            {
              status: 413,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        ctx.state.body = bodyText;

        ConsoleStyler.logDebug("Parsed text body", {
          size: bodyText.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : String(error);

        ConsoleStyler.logError("Text parse error", {
          error: errorMessage,
        });

        return new Response(
          JSON.stringify({
            error: "Bad Request",
            message: "Invalid text body",
            details: errorMessage,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    return await next();
  };
}

/**
 * Automatic body parser - detects content type and parses accordingly
 * Combines json, urlencoded, multipart, and text parsers
 *
 * @param options - Combined parser options
 */
export function bodyParser(options: {
  jsonLimit?: number;
  urlencodedLimit?: number;
  multipartLimit?: number;
  maxFileSize?: number;
  textLimit?: number;
} = {}): Middleware {
  const jsonParser = json({ limit: options.jsonLimit });
  const urlencodedParser = urlencoded({ limit: options.urlencodedLimit });
  const multipartParser = multipart({
    limit: options.multipartLimit,
    maxFileSize: options.maxFileSize,
  });
  const textParser = text({ limit: options.textLimit });

  const middleware = async (ctx: Context, next: () => Promise<Response>) => {
    const contentType = ctx.request.headers.get("content-type");

    if (!contentType) {
      return await next();
    }

    // Route to appropriate parser based on content type
    if (contentType.includes("application/json")) {
      return await jsonParser(ctx, next);
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      return await urlencodedParser(ctx, next);
    } else if (contentType.includes("multipart/form-data")) {
      return await multipartParser(ctx, next);
    } else if (contentType.includes("text/plain")) {
      return await textParser(ctx, next);
    }

    return await next();
  };

  Object.defineProperty(middleware, "name", { value: "bodyParser" });
  return middleware;
}
