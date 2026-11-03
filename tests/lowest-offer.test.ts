import assert from "node:assert/strict";
import { test } from "node:test";
import { lowestOffer } from "../src/lib/lowest-offer.ts";

const start = (...options: [number, number][]) => ({
  options: options.map(([durationMinutes, amountMinor]) => ({
    durationMinutes,
    amountMinor,
  })),
});

test("the card price is the cheapest open length, with that length", () => {
  // Off-peak 7 pm hour ₦25,000; a peak 8 pm hour ₦45,000; 90 min ₦37,500.
  assert.deepEqual(
    lowestOffer([
      start([60, 4_500_000]),
      start([60, 2_500_000], [90, 3_750_000]),
    ]),
    { amountMinor: 2_500_000, durationMinutes: 60 },
  );
});

test("a pitch with only peak times open shows the peak price, never a fallback", () => {
  assert.deepEqual(lowestOffer([start([60, 4_500_000], [90, 6_750_000])]), {
    amountMinor: 4_500_000,
    durationMinutes: 60,
  });
});

test("equal prices show the shorter game", () => {
  assert.deepEqual(
    lowestOffer([start([90, 3_000_000]), start([60, 3_000_000])]),
    {
      amountMinor: 3_000_000,
      durationMinutes: 60,
    },
  );
});

test("no open times means no price on the card", () => {
  assert.equal(lowestOffer([]), null);
  assert.equal(lowestOffer([start()]), null);
});
