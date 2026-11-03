import assert from "node:assert/strict";
import { test } from "node:test";
import { groupVenues, matchingAreas } from "../src/lib/discovery.ts";
import { mergePages } from "../src/lib/search-pages.ts";

test("venue grouping preserves API rank, distinct venues with the same name and every pitch across pages", () => {
  const result = (id: string, facilityId: string) => ({
    pitch: { id, facilityId, facilityName: "Same name" },
  });
  const a = result("a", "venue-1");
  const b = result("b", "venue-2");
  const c = result("c", "venue-1");
  const page = (results: (typeof a)[], hasMore: boolean) => ({
    results,
    hasMore,
    matched: 3,
    openCount: 3,
  });
  const merged = mergePages([page([a, b], true), page([a, c], false)]);
  const groups = groupVenues(merged.results);
  assert.deepEqual(
    groups.map((group) => group.id),
    ["venue-1", "venue-2"],
  );
  assert.deepEqual(
    groups[0].pitches.map((r) => r.pitch.id),
    ["a", "c"],
  );
  assert.equal(groups.flatMap((group) => group.pitches).length, 3);
  assert.deepEqual(groupVenues([a, a])[0].pitches, [a]);
  assert.deepEqual(groupVenues([]), []);
});

test("area search handles names, slugs, casing, spaces, accents and no matches", () => {
  const areas = [
    { name: "Lekki Phase 1", slug: "lekki-phase-1" },
    { name: "Surulere", slug: "surulere" },
  ];
  assert.deepEqual(matchingAreas(areas, " LEKKI-phase 1 "), [areas[0]]);
  assert.deepEqual(matchingAreas(areas, "súrúléré"), [areas[1]]);
  assert.deepEqual(matchingAreas(areas, ""), areas);
  assert.deepEqual(matchingAreas(areas, "unknown"), []);
});
