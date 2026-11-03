import { addDays, dateParts } from "./format.ts";

/*
 * Stale results (review of 3 November). While new results load, a list may
 * keep showing the previous answer so the screen does not flash on a slow
 * connection, but only labelled with the selection it was fetched for, and
 * with booking actions disabled. Old slots are never shown as though they
 * match the new choice. Pure, so it is unit tested.
 */

/** A results answer tagged with the selection it was fetched for. */
export type Tagged = { selectionKey: string; selectionLabel: string };

export type ResultsView =
  /** Nothing to show yet: a skeleton. */
  | { kind: "loading" }
  /** Results for exactly the current selection: book away. */
  | { kind: "fresh" }
  /** Results for an earlier selection, kept while the new ones load. */
  | { kind: "stale"; label: string }
  /** The current selection failed to load: show the error, not old slots. */
  | { kind: "error" };

export function resultsView(input: {
  /** The key of what the player has chosen now. */
  wanted: string;
  /** The answer on screen, if any (possibly from an earlier selection). */
  shown: Tagged | undefined;
  isError: boolean;
}): ResultsView {
  const { wanted, shown, isError } = input;
  if (shown && shown.selectionKey === wanted) return { kind: "fresh" };
  if (isError) return { kind: "error" };
  if (!shown) return { kind: "loading" };
  return { kind: "stale", label: shown.selectionLabel };
}

export type PlaySelection = {
  date: string;
  area: string | null;
  time: string;
  type: string;
  maxPrice: number | null;
  sort: string;
  near: string | null;
};

/** A stable key for a Play selection: same choices, same key. */
export function playSelectionKey(selection: PlaySelection): string {
  return JSON.stringify([
    selection.date,
    selection.area,
    selection.time,
    selection.type,
    selection.maxPrice,
    selection.sort,
    selection.near,
  ]);
}

/** "today", "tomorrow" or "Wed 4 Nov". */
export function dayLabel(date: string, today: string): string {
  if (date === today) return "today";
  if (date === addDays(today, 1)) return "tomorrow";
  const day = dateParts(date);
  return `${day.weekday} ${day.day} ${day.month}`;
}

/**
 * What an earlier Play answer was for, in plain words, for the label on
 * results that are still showing while new ones load:
 * "Wed 4 Nov in Lekki, evening, with filters, near you".
 */
export function playSelectionLabel(
  selection: PlaySelection & { areaName?: string | null },
  today: string,
): string {
  const parts = [
    `${dayLabel(selection.date, today)}${
      selection.areaName ? ` in ${selection.areaName}` : " across Lagos"
    }`,
  ];
  if (selection.time !== "any") parts.push(selection.time);
  if (
    selection.type !== "any" ||
    selection.maxPrice !== null ||
    selection.sort !== "recommended"
  )
    parts.push("with filters");
  if (selection.near) parts.push("near you");
  return parts.join(", ");
}
