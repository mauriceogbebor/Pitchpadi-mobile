import assert from "node:assert/strict";
import { test } from "node:test";
import { mergePages, openLine, shownLine } from "../src/lib/search-pages.ts";

const v = (id: string, pitches: string[] = [id]) => ({
  venue: { id },
  pitches: pitches.map((p) => ({ pitch: { id: p } })),
});
const page = (
  venues: ReturnType<typeof v>[],
  hasMore: boolean,
  matchedVenues = 36,
  openVenues = 30,
  openPitches = 50,
) => ({ venues, hasMore, matchedVenues, openVenues, openPitches });

test("venue pages join into one list in order, and the last page says whether there is more", () => {
  const merged = mergePages([
    page([v("a"), v("b")], true),
    page([v("c")], true),
  ]);
  assert.deepEqual(
    merged.venues.map((x) => x.venue.id),
    ["a", "b", "c"],
  );
  assert.equal(merged.hasMore, true);
  const all = mergePages([
    page([v("a")], true),
    page([v("b")], false, 2, 2, 3),
  ]);
  assert.equal(all.hasMore, false);
  assert.equal(all.matchedVenues, 2);
  assert.equal(all.openPitches, 3);
});

test("each venue keeps every pitch the API sent with it", () => {
  const merged = mergePages([page([v("a", ["a1", "a2", "a3"])], false)]);
  assert.deepEqual(
    merged.venues[0].pitches.map((p) => p.pitch.id),
    ["a1", "a2", "a3"],
  );
});

test("a venue that moved between pages is shown once, where it first appeared", () => {
  const merged = mergePages([
    page([v("a"), v("b")], true),
    page([v("b"), v("c")], false),
  ]);
  assert.deepEqual(
    merged.venues.map((x) => x.venue.id),
    ["a", "b", "c"],
  );
});

test("no pages is an empty, finished list", () => {
  assert.deepEqual(mergePages([]), {
    venues: [],
    hasMore: false,
    matchedVenues: 0,
    openVenues: 0,
    openPitches: 0,
  });
});

test("the counts read in venues and open pitches", () => {
  assert.equal(shownLine(10, 36), "Showing 10 of 36 venues");
  assert.equal(shownLine(36, 36), null);
  assert.equal(openLine(50, 36), "50 pitches open at 36 venues");
  assert.equal(openLine(1, 1), "1 pitch open at 1 venue");
});
