// Web preview only: phones use prefs-store.ts.

export async function readPref(key: string): Promise<string | null> {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function writePref(key: string, value: string): Promise<boolean> {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export async function removePref(key: string): Promise<void> {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to remove.
  }
}
