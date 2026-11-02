/**
 * Display helpers, matching the website. Business rules (slots, prices) live in
 * the API. These avoid Intl time-zone and locale features, which vary across
 * phones' JavaScript engines: Lagos is UTC+1 all year, with no daylight saving.
 */

const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Minutes after local midnight → "6:00 pm" (1440 shows as "12:00 am"). */
export function formatLocalTime(minute: number): string {
  const normalized = ((minute % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(normalized % 60).padStart(2, "0")} ${hour < 12 ? "am" : "pm"}`;
}

/** Kobo → "₦25,000" (kobo shown only when not zero). */
export function formatNaira(minor: number): string {
  const negative = minor < 0;
  const abs = Math.abs(Math.round(minor));
  const naira = Math.floor(abs / 100);
  const kobo = abs % 100;
  const grouped = String(naira).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}₦${grouped}${kobo ? `.${String(kobo).padStart(2, "0")}` : ""}`;
}

/** Minutes after midnight in Lagos for an instant. */
export function lagosMinute(iso: string | Date): number {
  const date = new Date(new Date(iso).getTime() + LAGOS_OFFSET_MS);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

/** Clock time of an instant in Lagos, e.g. "6:12 pm". */
export function formatInstantTime(iso: string | Date): string {
  return formatLocalTime(lagosMinute(iso));
}

/** Today's date in Lagos as YYYY-MM-DD. */
export function lagosToday(now = new Date()): string {
  return new Date(now.getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

/** A calendar date moved by whole days (YYYY-MM-DD in and out). */
export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** The next `count` dates starting from `start`. */
export function nextDates(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}

/** "2026-10-21" → { weekday: "Wed", day: "21", month: "Oct", long: "Wednesday 21 October" } */
export function dateParts(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  const weekday = WEEKDAYS[value.getUTCDay()];
  const month = MONTHS[value.getUTCMonth()];
  const day = String(value.getUTCDate());
  return {
    weekday: weekday.slice(0, 3),
    day,
    month: month.slice(0, 3),
    long: `${weekday} ${day} ${month}`,
  };
}

/** "30" → "30 minutes", "60" → "1 hour", "90" → "1½ hours". */
export function formatDuration(minutes: number): string {
  if (minutes < 60 || minutes % 30 !== 0) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const half = minutes % 60 === 30 ? "½" : "";
  return hours === 1 && !half ? "1 hour" : `${hours}${half} hours`;
}

/** +2348123456789 → 0812 345 6789. */
export function formatPhone(e164: string): string {
  const match = /^\+234(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return match ? `0${match[1]} ${match[2]} ${match[3]}` : e164;
}

export const TIMES_OF_DAY = [
  { value: "any", label: "Any time", from: 0, to: 1440 },
  { value: "morning", label: "Morning", from: 0, to: 12 * 60 },
  { value: "afternoon", label: "Afternoon", from: 12 * 60, to: 17 * 60 },
  { value: "evening", label: "Evening", from: 17 * 60, to: 1440 },
] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number]["value"];

export function inTimeOfDay(iso: string, time: TimeOfDay): boolean {
  const window = TIMES_OF_DAY.find((item) => item.value === time)!;
  const minute = lagosMinute(iso);
  return minute >= window.from && minute < window.to;
}
