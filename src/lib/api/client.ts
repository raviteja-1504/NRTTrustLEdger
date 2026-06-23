// Minimal typed fetch wrapper. Replace the base URL when the Go backend is live.
// Auth: backend sets an httpOnly cookie; we send `credentials: 'include'`.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path.startsWith("http") ? path : `${BASE_URL}${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, query, headers, ...rest } = opts;
  const res = await fetch(buildUrl(path, query), {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "message" in data && String((data as { message: unknown }).message)) ||
      `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

function safeJson(t: string): unknown {
  try { return JSON.parse(t); } catch { return t; }
}

// Convenience wrappers
export const api = {
  get:   <T>(p: string, q?: RequestOptions["query"]) => request<T>(p, { method: "GET",    query: q }),
  post:  <T>(p: string, b?: unknown)                 => request<T>(p, { method: "POST",   body: b }),
  put:   <T>(p: string, b?: unknown)                 => request<T>(p, { method: "PUT",    body: b }),
  patch: <T>(p: string, b?: unknown)                 => request<T>(p, { method: "PATCH",  body: b }),
  del:   <T>(p: string)                              => request<T>(p, { method: "DELETE" }),
};
