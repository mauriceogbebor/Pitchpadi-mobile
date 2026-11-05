// Web preview only: phones use the Keychain or Keystore (checkout-store.ts).
// The browser keeps this list across tabs so an interrupted checkout can be
// found again, as on a phone.
const KEY = "pitchpadi.checkouts";
const PENDING_KEY = "pitchpadi.pending-holds";

export async function readSavedText(): Promise<string | null> {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function writeSavedText(text: string): Promise<boolean> {
  try {
    localStorage.setItem(KEY, text);
    return true;
  } catch {
    // Private mode: recovery is a convenience, checkout still works.
    return false;
  }
}

export async function readPendingText(): Promise<string | null> {
  return localStorage.getItem(PENDING_KEY);
}

export async function writePendingText(text: string): Promise<void> {
  localStorage.setItem(PENDING_KEY, text);
}
