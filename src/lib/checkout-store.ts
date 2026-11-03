import * as SecureStore from "expo-secure-store";

// Checkouts started on this phone (R7): hold ids kept in the Keychain or
// Keystore, like the session token, because a hold id lets its holder
// continue that checkout. Never logged or put in URLs other than the app's own.
const KEY = "pitchpadi.checkouts";

export async function readSavedText(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function writeSavedText(text: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, text, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  } catch {
    // Storage unavailable: recovery is a convenience, checkout still works.
  }
}
