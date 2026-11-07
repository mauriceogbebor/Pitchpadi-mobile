/*
 * Repeating a venue booking every week (Prompt 4, O-01-F2). Each week is a
 * separate booking the API checks on its own (clashes, closures, hours), so a
 * taken week never stops the others. Pure helpers, tested without a phone.
 */

/** How many weeks a booking can repeat for, counting the first. */
export const REPEAT_CHOICES = [1, 2, 4, 8, 12] as const;

/** Lagos is UTC+1 all year. */
export function lagosInstant(date: string, minute: number): string {
  const hh = String(Math.floor(minute / 60)).padStart(2, "0");
  const mm = String(minute % 60).padStart(2, "0");
  return `${date}T${hh}:${mm}:00+01:00`;
}

export function addWeeks(date: string, weeks: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + weeks * 7);
  return value.toISOString().slice(0, 10);
}

/** The same kick-off on the same weekday, `weeks` times from `date`. */
export function weeklyDates(
  date: string,
  minute: number,
  weeks: number,
): { date: string; startsAt: string }[] {
  return Array.from({ length: Math.max(1, weeks) }, (_, index) => {
    const day = addWeeks(date, index);
    return { date: day, startsAt: lagosInstant(day, minute) };
  });
}

export type WeekResult =
  | { date: string; state: "saved"; reference: string }
  | { date: string; state: "refused"; reason: string }
  | { date: string; state: "unsent" };

/** "Saved 3 of 4 weeks", or "Saved" when nothing was repeated. */
export function repeatSummary(results: WeekResult[]): string {
  const saved = results.filter((result) => result.state === "saved").length;
  if (results.length === 1) return saved ? "Booking saved" : "Not saved";
  return `Saved ${saved} of ${results.length} weeks`;
}
