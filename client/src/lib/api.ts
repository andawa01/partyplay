/**
 * The single HTTP entry point for the client. Every feature calls `apiFetch` instead of
 * `fetch` so the envelope, error shape and credentials handling stay in one place.
 */

export interface ApiMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResult<T> {
  data: T;
  meta?: ApiMeta;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  if (text === "") {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const headers = new Headers(init?.headers);
  if (init?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = path.startsWith("http") ? path : path;

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: init?.credentials ?? "include",
  });

  const body = await parseBody(response);

  if (!response.ok) {
    let code = `HTTP_${response.status}`;
    let message = response.statusText || "Request failed";
    let details: unknown;
    if (isRecord(body)) {
      if (typeof body.code === "string") {
        code = body.code;
      }
      if (typeof body.error === "string") {
        message = body.error;
      }
      if ("details" in body) {
        details = body.details;
      }
    } else if (typeof body === "string" && body !== "") {
      message = body;
    }
    throw new ApiError(response.status, code, message, details);
  }

  if (body === null) {
    return { data: undefined as T };
  }

  if (isRecord(body) && "data" in body) {
    const meta = isRecord(body.meta)
      ? (body.meta as unknown as ApiMeta)
      : undefined;
    return { data: body.data as T, meta };
  }

  // Endpoints that return a bare value are passed through unchanged.
  return { data: body as T };
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
