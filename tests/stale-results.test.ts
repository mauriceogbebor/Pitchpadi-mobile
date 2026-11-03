import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type PlaySelection,
  playSelectionKey,
  playSelectionLabel,
  resultsView,
} from "../src/lib/stale-results.ts";

const base: PlaySelection = {
  date: "2026-11-04",
  duration: 60,
  area: null,
  time: "any",
  type: "any",
  maxPrice: null,
  sort: "recommended",
  near: null,
};
const tagged = (selection: PlaySelection, label = "Wed 4 Nov") => ({
  selectionKey: playSelectionKey(selection),
  selectionLabel: label,
});

test("results for exactly the current selection are fresh", () => {
  const view = resultsView({
    wanted: playSelectionKey(base),
    shown: tagged({ ...base }),
    isError: false,
  });
  assert.deepEqual(view, { kind: "fresh" });
});

test("any change of date, area, time, location or filters makes shown results stale", () => {
  const changes: Partial<PlaySelection>[] = [
    { date: "2026-11-05" },
    { area: "lekki" },
    { duration: 90 },
    { time: "evening" },
    { near: "6.45,3.47" },
    { type: "7-a-side" },
    { maxPrice: 2_000_000 },
    { sort: "cheapest" },
  ];
  for (const change of changes) {
    const view = resultsView({
      wanted: playSelectionKey({ ...base, ...change }),
      shown: tagged(base, "Wed 4 Nov across Lagos"),
      isError: false,
    });
    assert.deepEqual(
      view,
      { kind: "stale", label: "Wed 4 Nov across Lagos" },
      JSON.stringify(change),
    );
  }
});

test("rapid changes: only an answer for the latest choice counts as fresh", () => {
  // Tue, then Wed, then Thu tapped quickly; Wed's answer arrives last.
  const thu = playSelectionKey({ ...base, date: "2026-11-05" });
  const wedAnswer = tagged({ ...base, date: "2026-11-04" });
  assert.equal(
    resultsView({ wanted: thu, shown: wedAnswer, isError: false }).kind,
    "stale",
  );
  const thuAnswer = tagged({ ...base, date: "2026-11-05" });
  assert.equal(
    resultsView({ wanted: thu, shown: thuAnswer, isError: false }).kind,
    "fresh",
  );
});

test("nothing loaded yet is a loading state, and a failed load never falls back to old slots", () => {
  const wanted = playSelectionKey({ ...base, date: "2026-11-06" });
  assert.deepEqual(resultsView({ wanted, shown: undefined, isError: false }), {
    kind: "loading",
  });
  assert.deepEqual(
    resultsView({ wanted, shown: tagged(base), isError: true }),
    { kind: "error" },
  );
  assert.deepEqual(resultsView({ wanted, shown: undefined, isError: true }), {
    kind: "error",
  });
  // A refresh of the same selection that fails keeps its own results.
  assert.deepEqual(
    resultsView({
      wanted: playSelectionKey(base),
      shown: tagged(base),
      isError: true,
    }),
    { kind: "fresh" },
  );
});

test("the same choices always give the same key", () => {
  assert.equal(playSelectionKey({ ...base }), playSelectionKey({ ...base }));
  assert.notEqual(
    playSelectionKey({ ...base, area: null }),
    playSelectionKey({ ...base, area: "null" }),
  );
});

test("stale results are labelled with what they were for", () => {
  const today = "2026-11-03";
  assert.equal(
    playSelectionLabel({ ...base, date: today }, today),
    "today across Lagos, 1 hour",
  );
  assert.equal(
    playSelectionLabel({ ...base, date: "2026-11-04" }, today),
    "tomorrow across Lagos, 1 hour",
  );
  assert.equal(
    playSelectionLabel(
      {
        ...base,
        date: "2026-11-06",
        area: "lekki",
        areaName: "Lekki",
        time: "evening",
        maxPrice: 2_000_000,
        near: "6.45,3.47",
      },
      today,
    ),
    "Fri 6 Nov in Lekki, 1 hour, evening, with filters, near you",
  );
});
