/**
 * HTTP Response Helpers
 * Utilities for creating typed HTTP responses
 * No external dependencies - uses only Deno built-in APIs
 */

import { ConsoleStyler } from "../utils/console-styler/mod.ts";

export interface ResponseOptions {
  status?: number;
  headers?: HeadersInit;
}

/**
 * Create a JSON response
 */
export function json(data: unknown, options: ResponseOptions = {}): Response {
  return new Response(JSON.stringify(data), {
    status: options.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

/**
 * Create a text response
 */
export function text(content: string, options: ResponseOptions = {}): Response {
  return new Response(content, {
    status: options.status ?? 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...options.headers,
    },
  });
}

/**
 * Create an HTML response
 */
export function html(content: string, options: ResponseOptions = {}): Response {
  return new Response(content, {
    status: options.status ?? 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...options.headers,
    },
  });
}

/**
 * Create a redirect response
 */
export function redirect(url: string, status = 302): Response {
  return new Response(null, {
    status,
    headers: {
      Location: url,
    },
  });
}

/**
 * Create a 404 Not Found response
 */
export function notFound(message = "Not Found"): Response {
  ConsoleStyler.logDebug(`404 Not Found: ${message}`);
  return json({ error: message }, { status: 404 });
}

/**
 * Create a 400 Bad Request response
 */
export function badRequest(message = "Bad Request"): Response {
  ConsoleStyler.logWarning(`400 Bad Request: ${message}`);
  return json({ error: message }, { status: 400 });
}

/**
 * Create a 500 Internal Server Error response
 */
export function internalError(message = "Internal Server Error"): Response {
  ConsoleStyler.logError(`500 Internal Server Error: ${message}`);
  return json({ error: message }, { status: 500 });
}

/**
 * Create a 403 Forbidden response
 */
export function forbidden(message = "Forbidden"): Response {
  ConsoleStyler.logWarning(`403 Forbidden: ${message}`);
  return json({ error: message }, { status: 403 });
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorized(message = "Unauthorized"): Response {
  ConsoleStyler.logWarning(`401 Unauthorized: ${message}`);
  return json({ error: message }, { status: 401 });
}

/**
 * Create a no content response
 */
export function noContent(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Create a response with custom status
 */
export function status(statusCode: number, data?: unknown): Response {
  if (data === undefined) {
    return new Response(null, { status: statusCode });
  }
  return json(data, { status: statusCode });
}
