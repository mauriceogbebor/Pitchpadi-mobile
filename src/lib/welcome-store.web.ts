// Web preview only: phones use welcome-store.ts.
const KEY = "pitchpadi.welcome-seen";

export async function welcomeSeen(): Promise<boolean> {
  try {
    return localStorage.getItem(KEY) === "yes";
  } catch {
    return false;
  }
}

export async function markWelcomeSeen(): Promise<void> {
  try {
    localStorage.setItem(KEY, "yes");
  } catch {
    // Private mode: the welcome may show again next time.
  }
}
