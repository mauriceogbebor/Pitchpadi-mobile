/**
 * A path inside the app (from a notification or a link), or null. Never a web
 * address or another app's scheme, so a message can never send someone away.
 */
export function safeAppPath(value: unknown): string | null {
  return typeof value === "string" &&
    /^\/(?!\/)[A-Za-z0-9/_?&=.%-]*$/.test(value) &&
    !value.includes("..")
    ? value
    : null;
}

/**
 * Whether the app was opened from a link to a particular screen (a shared
 * pitch, venue or booking), rather than from its icon. The opening video is
 * skipped then, so the player lands straight on what they tapped (R9).
 * Development-client and Expo Go addresses without a screen path count as an
 * ordinary launch.
 */
export function openedFromLink(url: string | null | undefined): boolean {
  if (!url) return false;
  let path: string;
  try {
    const parsed = new URL(url);
    // pitchpadi://pitch/abc puts "pitch" in the host; https and Expo
    // development (exp://host:port/--/pitch/abc) links do not.
    path =
      parsed.protocol === "pitchpadi:"
        ? `/${parsed.host}${parsed.pathname}`
        : parsed.pathname;
  } catch {
    return false;
  }
  path = path.replace(/^\/--\//, "/").replace(/\/+$/, "");
  return (
    path !== "" && path !== "/" && !path.startsWith("/expo-development-client")
  );
}
