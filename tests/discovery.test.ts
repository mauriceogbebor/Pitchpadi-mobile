import assert from "node:assert/strict";
import { test } from "node:test";
import { matchingAreas } from "../src/lib/discovery.ts";

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
