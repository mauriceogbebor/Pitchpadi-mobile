/* A private retry key saved before sending a hold request. The key can find a
 * hold whose response was lost, even after the app restarts. */
export type PendingHold = {
  slot: string;
  key: string;
  savedAt: string;
};

export const PENDING_KEEP_MS = 30 * 60_000;

export function slotId(input: {
  pitchId: string;
  startsAt: string;
  durationMinutes: number;
}) {
  return `${input.pitchId}:${input.startsAt}:${input.durationMinutes}`;
}

export function parsePending(text: string | null): PendingHold[] {
  if (!text) return [];
  try {
    const value: unknown = JSON.parse(text);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is PendingHold =>
        !!item &&
        typeof item.slot === "string" &&
        typeof item.key === "string" &&
        /^[A-Za-z0-9_-]{16,100}$/.test(item.key) &&
        typeof item.savedAt === "string" &&
        Number.isFinite(Date.parse(item.savedAt)),
    );
  } catch {
    return [];
  }
}

export function livePending(list: PendingHold[], now: Date): PendingHold[] {
  return list.filter(
    (item) =>
      now.getTime() >= Date.parse(item.savedAt) &&
      now.getTime() - Date.parse(item.savedAt) < PENDING_KEEP_MS,
  );
}

export function putPending(list: PendingHold[], item: PendingHold) {
  return [item, ...list.filter((entry) => entry.slot !== item.slot)].slice(
    0,
    10,
  );
}
