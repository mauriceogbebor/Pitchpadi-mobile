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
