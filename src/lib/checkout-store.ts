import * as SecureStore from "expo-secure-store";

// Checkouts started on this phone (R7): hold ids kept in the Keychain or
// Keystore, like the session token, because a hold id lets its holder
// continue that checkout. Never logged or put in URLs other than the app's own.
const KEY = "pitchpadi.checkouts";
const PENDING_KEY = "pitchpadi.pending-holds";

export async function readSavedText(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function writeSavedText(text: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(KEY, text, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    return true;
  } catch {
    // Storage unavailable: recovery is a convenience, checkout still works.
    return false;
  }
}

export async function readPendingText(): Promise<string | null> {
  return SecureStore.getItemAsync(PENDING_KEY);
}

export async function writePendingText(text: string): Promise<void> {
  await SecureStore.setItemAsync(PENDING_KEY, text, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}
