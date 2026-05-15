import { apiFetch } from "../utils/apiFetch";

const API_BASE = "/api";

/**
 * A minimalist API request wrapper that handles repetitive fetch logic,
 * error checking, and JSON parsing.
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  
  const res = await apiFetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    // Minimalist: just throw the status code
    throw new Error(`${res.status}`);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}
