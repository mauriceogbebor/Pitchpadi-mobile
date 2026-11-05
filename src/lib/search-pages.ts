/*
 * Play search pages (R7 review, by venue since R9): the API groups open
 * pitches by venue and returns 10 venues per page; "Show more venues" fetches
 * the next page for the same choice. Each venue arrives with all its matching
 * pitches, so a card never grows after it is shown. Pure, so it is unit tested.
 */

type PageLike<V> = {
  venues: V[];
  hasMore: boolean;
  matchedVenues: number;
  openVenues: number;
  openPitches: number;
};

/**
 * All loaded pages as one list, in order. A venue can appear on two pages if
 * availability changed between requests (a time was booked and the order
 * shifted): it is shown once, where it first appeared.
 */
export function mergePages<V extends { venue: { id: string } }>(
  pages: PageLike<V>[],
): {
  venues: V[];
  hasMore: boolean;
  matchedVenues: number;
  openVenues: number;
  openPitches: number;
} {
  const seen = new Set<string>();
  const venues: V[] = [];
  for (const page of pages)
    for (const item of page.venues) {
      if (seen.has(item.venue.id)) continue;
      seen.add(item.venue.id);
      venues.push(item);
    }
  const last = pages.at(-1);
  return {
    venues,
    hasMore: last?.hasMore ?? false,
    // The newest page has the freshest totals.
    matchedVenues: last?.matchedVenues ?? 0,
    openVenues: last?.openVenues ?? 0,
    openPitches: last?.openPitches ?? 0,
  };
}

/** "Showing 10 of 36 venues" under a partial list; null when all are shown. */
export function shownLine(shown: number, matched: number): string | null {
  if (shown >= matched) return null;
  return `Showing ${shown} of ${matched} venues`;
}

/** "50 pitches open at 36 venues", "1 pitch open at 1 venue". */
export function openLine(openPitches: number, openVenues: number): string {
  const pitches = openPitches === 1 ? "1 pitch" : `${openPitches} pitches`;
  const venues = openVenues === 1 ? "1 venue" : `${openVenues} venues`;
  return `${pitches} open at ${venues}`;
}
