/*
 * Venue setup helpers for the app: weekly hours, and what an owner should do next.
 * Display and editing only; the API validates and decides. Free of React Native
 * so it can be unit tested.
 */

/** API weekdays: 0 is Sunday. Shown Monday first, as owners plan their week. */
export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const WEEKDAY_SET = [1, 2, 3, 4, 5] as const;

export type HoursRow = {
  weekday: number;
  enabled: boolean;
  startMinute: number;
  endMinute: number;
};

/** Steps of 30 minutes; 1440 is midnight at the end of the day. */
export function stepMinute(minute: number, by: number, min = 0, max = 1440) {
  return Math.min(max, Math.max(min, minute + by));
}

/**
 * Copies one day's hours to other days (Monday to the weekdays, say). The day
 * copied from is the first open day in Monday-first order, like the website.
 */
export function copyHours(
  hours: HoursRow[],
  targets: readonly number[],
): { hours: HoursRow[]; from: number | null } {
  const from =
    WEEK_ORDER.find(
      (weekday) => hours.find((row) => row.weekday === weekday)?.enabled,
    ) ?? null;
  if (from === null) return { hours, from };
  const source = hours.find((row) => row.weekday === from)!;
  return {
    from,
    hours: hours.map((row) =>
      targets.includes(row.weekday) && row.weekday !== from
        ? {
            ...row,
            enabled: true,
            startMinute: source.startMinute,
            endMinute: source.endMinute,
          }
        : row,
    ),
  };
}

/** The first problem with the hours, in words, or null. The API checks too. */
export function hoursProblem(hours: HoursRow[]): string | null {
  for (const weekday of WEEK_ORDER) {
    const row = hours.find((item) => item.weekday === weekday);
    if (row?.enabled && row.endMinute <= row.startMinute)
      return `${WEEKDAYS[weekday]} closes before it opens. Check the times.`;
  }
  if (!hours.some((row) => row.enabled))
    return "Open on at least one day, or players cannot book.";
  return null;
}

export type StepState = "done" | "now" | "waiting" | "later";

/** "Get ready for bookings", the same steps as the website's venue page. */
export function setupSteps(input: {
  status: "pending" | "approved" | "rejected";
  hasPitch: boolean;
  scheduled: boolean;
  published: boolean;
}): { key: string; title: string; state: StepState }[] {
  const { status, hasPitch, scheduled, published } = input;
  return [
    {
      key: "pitch",
      title: "Add your venue and first pitch",
      state: hasPitch ? "done" : "now",
    },
    {
      key: "hours",
      title: "Set opening hours and prices",
      state: scheduled ? "done" : hasPitch ? "now" : "later",
    },
    status === "approved"
      ? { key: "review", title: "PitchPadi approved your venue", state: "done" }
      : status === "rejected"
        ? {
            key: "review",
            title: "PitchPadi needs a few changes",
            state: "now",
          }
        : {
            key: "review",
            title: "PitchPadi is checking your venue",
            state: "waiting",
          },
    {
      key: "publish",
      title: "Publish so players can book",
      state: published
        ? "done"
        : status === "approved" && scheduled
          ? "now"
          : "later",
    },
  ];
}
