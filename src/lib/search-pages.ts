/*
 * Play search pages (R7 review): the API returns 20 pitches per page; "Show
 * more pitches" fetches the next page for the same choice. Pure, so it is
 * unit tested.
 */

type PageLike<R> = {
  results: R[];
  hasMore: boolean;
  matched: number;
  openCount: number;
};

/**
 * All loaded pages as one list, in order. A pitch can appear on two pages if
 * availability changed between requests (a time was booked and the order
 * shifted): it is shown once, where it first appeared.
 */
export function mergePages<R extends { pitch: { id: string } }>(
  pages: PageLike<R>[],
): { results: R[]; hasMore: boolean; matched: number; openCount: number } {
  const seen = new Set<string>();
  const results: R[] = [];
  for (const page of pages)
    for (const result of page.results) {
      if (seen.has(result.pitch.id)) continue;
      seen.add(result.pitch.id);
      results.push(result);
    }
  const last = pages.at(-1);
  return {
    results,
    hasMore: last?.hasMore ?? false,
    // The newest page has the freshest totals.
    matched: last?.matched ?? 0,
    openCount: last?.openCount ?? 0,
  };
}

/** "Showing 20 of 48 pitches" under a partial list; null when all are shown. */
export function shownLine(shown: number, matched: number): string | null {
  if (shown >= matched) return null;
  return `Showing ${shown} of ${matched} pitches`;
}
