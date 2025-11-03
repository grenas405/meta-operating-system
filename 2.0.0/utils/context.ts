/**
 * HTTP context and middleware types.
 * Provides a small, framework-agnostic runtime contract that mirrors the
 * standard Request/Response objects while allowing middleware to stage
 * responses incrementally.
 */

export interface ResponseState {
  status: number;
  statusText?: string;
  headers: Headers;
  body: BodyInit | null;
  committed: boolean;
}

export interface Context {
  request: Request;
  url: URL;
  params: Record<string, string>;
  state: Record<string, unknown>;
  response: ResponseState;
}

export type Handler = (ctx: Context) => Response | Promise<Response>;

export type Middleware = (
  ctx: Context,
  next: () => Promise<Response>,
) => Promise<Response | undefined> | Response | undefined;

function createResponseState(): ResponseState {
  return {
    status: 200,
    headers: new Headers(),
    body: null,
    committed: false,
  };
}

/**
 * Create a new HTTP context for the given request.
 */
export function createContext(
  request: Request,
  params: Record<string, string> = {},
): Context {
  return {
    request,
    url: new URL(request.url),
    params,
    state: {},
    response: createResponseState(),
  };
}

/**
 * Create a Response from the staged response data inside the context.
 * If nothing has been staged yet, fall back to the provided Response or
 * return an empty 204 No Content response.
 */
export function finalizeResponse(
  ctx: Context,
  fallback?: Response,
): Response {
  const hasBody = ctx.response.body !== null && ctx.response.body !== undefined;
  let hasHeaders = false;
  for (const _key of ctx.response.headers.keys()) {
    hasHeaders = true;
    break;
  }
  const statusChanged = ctx.response.status !== 200 || ctx.response.statusText !== undefined;
  const shouldCommit = ctx.response.committed || hasBody || hasHeaders || statusChanged;

  if (shouldCommit) {
    return new Response(ctx.response.body, {
      status: ctx.response.status,
      statusText: ctx.response.statusText,
      headers: ctx.response.headers,
    });
  }

  if (fallback) {
    return fallback;
  }

  return new Response(null, { status: 204 });
}

/**
 * Mark the staged response as committed. Middleware that mutates the staged
 * response should call this helper to ensure finalizeResponse() emits it.
 */
export function commitResponse(
  ctx: Context,
  options: Partial<Pick<ResponseState, "status" | "statusText" | "body">> = {},
): void {
  if (options.status !== undefined) {
    ctx.response.status = options.status;
  }

  if (options.statusText !== undefined) {
    ctx.response.statusText = options.statusText;
  }

  if (options.body !== undefined) {
    ctx.response.body = options.body;
  }

  ctx.response.committed = true;
}
