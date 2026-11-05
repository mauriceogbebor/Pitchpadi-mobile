import type { CalendarEntry } from "../api/generated";

/*
 * What the Venue screens show for a calendar entry. Display only: the API decides
 * what is allowed. Kept free of React Native so it can be unit tested.
 */

export const CHANNELS = [
  { value: "phone", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "walk_in", label: "Walk-in" },
  { value: "other", label: "Other" },
] as const;
export type Channel = (typeof CHANNELS)[number]["value"];

export const CHANNEL_NOTE: Record<string, string> = {
  phone: "Booked by phone",
  whatsapp: "Booked on WhatsApp",
  walk_in: "Walk-in",
  other: "Entered by the venue",
};

/** How the customer paid the venue directly. */
export const VENUE_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "pos", label: "POS" },
  { value: "bank_transfer", label: "Transfer" },
] as const;
export type VenueMethod = (typeof VENUE_METHODS)[number]["value"];

const METHOD_NAME: Record<string, string> = {
  cash: "cash",
  pos: "POS",
  bank_transfer: "transfer",
  card: "card",
  ussd: "USSD",
};

export type EntryTone = "paid" | "collect" | "pending" | "off";

/** The short status line and its tone for one calendar entry. */
export function entryStatus(entry: CalendarEntry): {
  label: string;
  tone: EntryTone;
} {
  if (entry.kind === "hold")
    return { label: "Not a booking yet, being paid online", tone: "pending" };
  if (entry.kind === "cancelled") return { label: "Cancelled", tone: "off" };
  if (entry.paymentState === "unpaid")
    return { label: "Not paid, collect at the pitch", tone: "collect" };
  return {
    label: entry.paymentMethod
      ? `Paid by ${METHOD_NAME[entry.paymentMethod] ?? entry.paymentMethod}`
      : "Paid",
    tone: "paid",
  };
}

/**
 * What the venue can do with a booking. Only bookings the venue entered itself
 * can be marked paid or cancelled here; online bookings are paid through
 * PitchPadi. The API enforces this too: these only decide what to show.
 */
export function entryActions(entry: CalendarEntry, now = Date.now()) {
  const manual = entry.source === "manual" && entry.kind === "booking";
  return {
    markPaid: manual && entry.paymentState === "unpaid",
    cancel: manual && new Date(entry.endsAt).getTime() > now,
  };
}
