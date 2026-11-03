/*
 * Checkouts started on this phone (R7 review). A guest who leaves checkout,
 * for example during a bank transfer, can find it again under My bookings:
 * the phone keeps the hold ids it created. The API stays the source of truth
 * for each hold's state; this file only decides what to keep and show.
 * Pure, so it is unit tested.
 */

export type SavedCheckout = { holdId: string; savedAt: string };

/** Enough for any realistic session; the oldest drop off first. */
export const MAX_SAVED = 10;
/** Older entries are forgotten: holds last minutes, bank transfers hours. */
export const KEEP_MS = 3 * 24 * 60 * 60 * 1000;

export function addCheckout(
  list: SavedCheckout[],
  holdId: string,
  now: Date,
): SavedCheckout[] {
  const rest = list.filter((item) => item.holdId !== holdId);
  return [{ holdId, savedAt: now.toISOString() }, ...rest].slice(0, MAX_SAVED);
}

export function pruneCheckouts(
  list: SavedCheckout[],
  now: Date,
  drop: ReadonlySet<string> = new Set(),
): SavedCheckout[] {
  return list.filter(
    (item) =>
      !drop.has(item.holdId) &&
      now.getTime() - Date.parse(item.savedAt) < KEEP_MS,
  );
}

/** Reads what storage gave back; anything unexpected is ignored, never thrown. */
export function parseSaved(text: string | null): SavedCheckout[] {
  if (!text) return [];
  try {
    const value: unknown = JSON.parse(text);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is SavedCheckout =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as SavedCheckout).holdId === "string" &&
        typeof (item as SavedCheckout).savedAt === "string",
    );
  } catch {
    return [];
  }
}

type HoldLike = {
  status: string;
  expiresAt: string | null;
  endsAt: string;
  booking: { reference: string } | null;
};

export type CheckoutState =
  /** Still held or being paid: offer "Continue checkout". */
  | "resume"
  /** Paid and booked, game not over yet: offer the booking. */
  | "booked"
  /** Expired, released, cancelled or long over: forget it. */
  | "drop";

export function checkoutState(hold: HoldLike, now: Date): CheckoutState {
  const live =
    (hold.status === "held" || hold.status === "pending_payment") &&
    hold.expiresAt !== null &&
    Date.parse(hold.expiresAt) > now.getTime();
  if (live) return "resume";
  if (
    hold.booking &&
    hold.status === "confirmed" &&
    Date.parse(hold.endsAt) > now.getTime()
  )
    return "booked";
  return "drop";
}
