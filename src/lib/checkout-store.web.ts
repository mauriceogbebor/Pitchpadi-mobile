// Web preview only: phones use the Keychain or Keystore (checkout-store.ts).
// The browser keeps this list across tabs so an interrupted checkout can be
// found again, as on a phone.
const KEY = "pitchpadi.checkouts";

export async function readSavedText(): Promise<string | null> {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function writeSavedText(text: string): Promise<void> {
  try {
    localStorage.setItem(KEY, text);
  } catch {
    // Private mode: recovery is a convenience, checkout still works.
  }
}
