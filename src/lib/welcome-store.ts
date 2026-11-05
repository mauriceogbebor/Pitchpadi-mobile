import * as SecureStore from "expo-secure-store";

// Whether this phone has seen the first-launch welcome (SV-02). Not secret;
// kept with the app's other small settings.
const KEY = "pitchpadi.welcome-seen";

export async function welcomeSeen(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(KEY)) === "yes";
  } catch {
    // Unreadable storage: show the welcome; it is quick to leave.
    return false;
  }
}

export async function markWelcomeSeen(): Promise<void> {
  await SecureStore.setItemAsync(KEY, "yes").catch(() => undefined);
}
