import * as SecureStore from "expo-secure-store";

/*
 * Small things this phone remembers for the player between visits (RP-01):
 * their usual Play choices, and, only if they ask, their checkout details.
 * Kept in the Keychain or Keystore with the app's other settings. Reads never
 * throw: anything unreadable is simply not remembered.
 */

export async function readPref(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function writePref(key: string, value: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    return true;
  } catch {
    return false;
  }
}

export async function removePref(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key).catch(() => undefined);
}
