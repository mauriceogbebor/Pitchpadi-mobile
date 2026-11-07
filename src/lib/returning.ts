/*
 * Returning players (RP-01, Prompt 3): what the phone remembers between
 * visits, and how Book again recognises the player's own weeks. Pure
 * functions, so they are tested without a phone. Nothing here decides what
 * is open or what it costs; the API does.
 */

/** Checkout details, saved only when the player ticks "Remember". */
export const DETAILS_KEY = "pitchpadi.player-details";
/** The player's usual Play choices. */
export const PLAY_KEY = "pitchpadi.play-choices";

export type SavedDetails = { name: string; phone: string; email: string };

const text = (value: unknown, max: number) =>
  typeof value === "string" && value.length <= max ? value : null;

/** Saved checkout details, or null if there are none or they are damaged. */
export function parseDetails(raw: string | null): SavedDetails | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const name = text(value?.name, 80);
    const phone = text(value?.phone, 30);
    const email = text(value?.email, 200);
    if (name === null || phone === null || email === null) return null;
    if (!name.trim() && !phone.trim() && !email.trim()) return null;
    return { name, phone, email };
  } catch {
    return null;
  }
}

export type PlayChoices = {
  area: string | null;
  duration: 60 | 90 | 120;
  type: "any" | "5-a-side" | "7-a-side";
  maxPrice: number | null;
};

export const DEFAULT_PLAY: PlayChoices = {
  area: null,
  duration: 60,
  type: "any",
  maxPrice: null,
};

/**
 * The usual Play choices. Each field falls back to the default on its own, so
 * one damaged value never loses the rest.
 */
export function parsePlayChoices(raw: string | null): PlayChoices {
  if (!raw) return DEFAULT_PLAY;
  let value: Record<string, unknown>;
  try {
    value = JSON.parse(raw) ?? {};
    if (typeof value !== "object") return DEFAULT_PLAY;
  } catch {
    return DEFAULT_PLAY;
  }
  const area =
    typeof value.area === "string" && /^[a-z0-9-]{1,60}$/.test(value.area)
      ? value.area
      : null;
  const duration = [60, 90, 120].includes(value.duration as number)
    ? (value.duration as 60 | 90 | 120)
    : DEFAULT_PLAY.duration;
  const type = ["any", "5-a-side", "7-a-side"].includes(value.type as string)
    ? (value.type as PlayChoices["type"])
    : DEFAULT_PLAY.type;
  const maxPrice =
    Number.isSafeInteger(value.maxPrice) && (value.maxPrice as number) > 0
      ? (value.maxPrice as number)
      : null;
  return { area, duration, type, maxPrice };
}

type Game = {
  pitchId: string;
  localStart: string;
  durationMinutes: number;
};
type HoldLike = {
  id: string;
  status: string;
  expiresAt: string | null;
  localDate: string;
  localStart: string;
  durationMinutes: number;
  pitch: { id: string };
};
type BookingLike = {
  reference: string;
  status: string;
  localDate: string;
  localStart: string;
  durationMinutes: number;
  pitch: { id: string };
};

export type MyWeek =
  | { kind: "holding"; holdId: string }
  | { kind: "booked"; reference: string }
  | null;

/**
 * Whether the player already has this week of a regular game: a live hold
 * they can continue, or a booking. Book again showed these as "Taken or
 * closed" before (RB-F2). A booking wins over a hold for the same week.
 */
export function myWeek(
  date: string,
  game: Game,
  holds: HoldLike[],
  bookings: BookingLike[],
  now: Date,
): MyWeek {
  const same = (item: {
    localDate: string;
    localStart: string;
    durationMinutes: number;
    pitch: { id: string };
  }) =>
    item.localDate === date &&
    item.localStart === game.localStart &&
    item.durationMinutes === game.durationMinutes &&
    item.pitch.id === game.pitchId;
  const booking = bookings.find(
    (item) =>
      same(item) &&
      item.status !== "cancelled" &&
      item.status !== "refunded" &&
      item.status !== "no_show",
  );
  if (booking) return { kind: "booked", reference: booking.reference };
  const hold = holds.find(
    (item) =>
      same(item) &&
      (item.status === "held" || item.status === "pending_payment") &&
      item.expiresAt !== null &&
      Date.parse(item.expiresAt) > now.getTime(),
  );
  return hold ? { kind: "holding", holdId: hold.id } : null;
}
