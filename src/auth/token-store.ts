import * as SecureStore from "expo-secure-store";

// The session token lives in the phone's Keychain (iOS) or Keystore (Android),
// never in plain storage. Kept in memory too so each request does not hit storage.
const KEY = "pitchpadi.session";
let cached: string | null | undefined;

export async function readToken(): Promise<string | null> {
  if (cached !== undefined) return cached;
  cached = await SecureStore.getItemAsync(KEY);
  return cached;
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, token, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
  cached = token;
}

export async function clearToken(): Promise<void> {
  cached = null;
  await SecureStore.deleteItemAsync(KEY);
}
