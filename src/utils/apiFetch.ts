const ADMIN_TOKEN_STORAGE_KEY = "hhvc:adminToken";

function getConfiguredAdminToken(): string {
  const envToken = (import.meta as any)?.env?.VITE_ADMIN_TOKEN;
  if (typeof envToken === "string" && envToken.trim()) return envToken.trim();

  try {
    const stored = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    if (typeof stored === "string" && stored.trim()) return stored.trim();
  } catch {
    // ignore (SSR/test/non-browser)
  }

  return "";
}

function withAdminTokenHeader(headers: HeadersInit | undefined, token: string): HeadersInit | undefined {
  if (!token) return headers;

  if (!headers) return { "x-admin-token": token };

  if (headers instanceof Headers) {
    if (!headers.has("x-admin-token")) headers.set("x-admin-token", token);
    return headers;
  }

  if (Array.isArray(headers)) {
    if (!headers.some(([k]) => k.toLowerCase() === "x-admin-token")) {
      headers.push(["x-admin-token", token]);
    }
    return headers;
  }

  const record = { ...headers } as Record<string, string>;
  const hasToken = Object.keys(record).some((k) => k.toLowerCase() === "x-admin-token");
  if (!hasToken) record["x-admin-token"] = token;
  return record;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getConfiguredAdminToken();
  const headers = withAdminTokenHeader(init.headers, token);
  return fetch(input, { ...init, headers });
}

