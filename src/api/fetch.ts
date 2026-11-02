import { API_URL } from "./config";
import { clearToken, readToken } from "../auth/token-store";

/** Called when the API says the session is no longer valid. */
let onSignedOut: (() => void) | null = null;
export function setSignedOutHandler(handler: (() => void) | null) {
  onSignedOut = handler;
}

/**
 * Transport for the generated API client. Adds the bearer token when signed in.
 * Returns { data, status, headers } like the web client, so screens can show the
 * API's own error messages. Network failures throw, so callers can offer a retry.
 */
export async function appFetch<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await readToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  headers.set("accept", "application/json");
  const response = await fetch(`${API_URL}${url}`, { ...init, headers });
  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = { error: "The server sent an unexpected answer. Try again." };
  }
  if (response.status === 401 && token) {
    await clearToken();
    onSignedOut?.();
  }
  return { data, status: response.status, headers: response.headers } as T;
}
