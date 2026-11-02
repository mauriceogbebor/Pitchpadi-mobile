// Web preview only (`npx expo start --web`): phones use the Keychain or Keystore
// (token-store.ts). The browser preview keeps the token for this tab only.
let cached: string | null | undefined;
const KEY = "pitchpadi.session";

export async function readToken(): Promise<string | null> {
  if (cached !== undefined) return cached;
  try {
    cached = sessionStorage.getItem(KEY);
  } catch {
    cached = null;
  }
  return cached;
}

export async function saveToken(token: string): Promise<void> {
  cached = token;
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    // Private mode: keep it in memory.
  }
}

export async function clearToken(): Promise<void> {
  cached = null;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
}
