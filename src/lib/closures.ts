/*
 * Words for a pitch closure (Prompt 4). The API works out the Lagos dates and
 * times; these only put them in a sentence.
 */

type ClosureLike = {
  localDate: string;
  localEndDate: string;
  localStart: string;
  localEnd: string;
  allDay: boolean;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "Sat 21 Nov" */
export function shortDate(date: string): string {
  const value = new Date(`${date}T12:00:00Z`);
  return `${WEEKDAYS[value.getUTCDay()]} ${value.getUTCDate()} ${MONTHS[value.getUTCMonth()]}`;
}

/** "Sat 21 Nov, all day", "Sat 21 Nov to Mon 23 Nov", "Sat 21 Nov, 6:00 pm to 8:00 pm" */
export function closureLabel(closure: ClosureLike): string {
  if (closure.allDay)
    return closure.localEndDate === closure.localDate
      ? `${shortDate(closure.localDate)}, all day`
      : `${shortDate(closure.localDate)} to ${shortDate(closure.localEndDate)}, all day`;
  if (closure.localEndDate !== closure.localDate)
    return `${shortDate(closure.localDate)} ${closure.localStart} to ${shortDate(closure.localEndDate)} ${closure.localEnd}`;
  return `${shortDate(closure.localDate)}, ${closure.localStart} to ${closure.localEnd}`;
}

/** Half-hour times for a closure: "06:00" … "24:00", with labels. */
export function closureTimes(): { value: string; label: string }[] {
  const times: { value: string; label: string }[] = [];
  for (let minute = 6 * 60; minute <= 24 * 60; minute += 30) {
    const hour = Math.floor(minute / 60);
    const value = `${String(hour).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    const shown = hour % 12 || 12;
    const label =
      minute === 24 * 60
        ? "midnight"
        : `${shown}:${String(minute % 60).padStart(2, "0")} ${hour < 12 ? "am" : "pm"}`;
    times.push({ value, label });
  }
  return times;
}
