import assert from "node:assert/strict";
import { test } from "node:test";
import { mergePages, shownLine } from "../src/lib/search-pages.ts";

const r = (id: string) => ({ pitch: { id } });
const page = (
  ids: string[],
  hasMore: boolean,
  matched = 48,
  openCount = 45,
) => ({
  results: ids.map(r),
  hasMore,
  matched,
  openCount,
});

test("pages join into one list in order, and the last page says whether there is more", () => {
  const merged = mergePages([page(["a", "b"], true), page(["c", "d"], true)]);
  assert.deepEqual(
    merged.results.map((x) => x.pitch.id),
    ["a", "b", "c", "d"],
  );
  assert.equal(merged.hasMore, true);
  const all = mergePages([page(["a", "b"], true), page(["c"], false, 3, 3)]);
  assert.equal(all.hasMore, false);
  assert.equal(all.matched, 3);
});

test("a pitch that moved between pages is shown once, where it first appeared", () => {
  const merged = mergePages([page(["a", "b"], true), page(["b", "c"], false)]);
  assert.deepEqual(
    merged.results.map((x) => x.pitch.id),
    ["a", "b", "c"],
  );
});

test("no pages is an empty, finished list", () => {
  assert.deepEqual(mergePages([]), {
    results: [],
    hasMore: false,
    matched: 0,
    openCount: 0,
  });
});

test("the partial-list line appears only while some pitches are not shown", () => {
  assert.equal(shownLine(20, 48), "Showing 20 of 48 pitches");
  assert.equal(shownLine(48, 48), null);
});
