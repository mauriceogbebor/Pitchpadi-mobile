import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addCheckout,
  checkoutState,
  KEEP_MS,
  MAX_SAVED,
  parseSaved,
  pruneCheckouts,
} from "../src/lib/device-checkouts.ts";

const now = new Date("2026-11-03T12:00:00.000Z");
const later = (ms: number) => new Date(now.getTime() + ms).toISOString();

test("a new checkout goes first, once, and the list stays short", () => {
  let list = addCheckout([], "a", now);
  list = addCheckout(list, "b", now);
  list = addCheckout(list, "a", now);
  assert.deepEqual(
    list.map((x) => x.holdId),
    ["a", "b"],
  );
  for (let i = 0; i < 20; i++) list = addCheckout(list, `h${i}`, now);
  assert.equal(list.length, MAX_SAVED);
  assert.equal(list[0].holdId, "h19");
});

test("old and finished checkouts are forgotten", () => {
  const list = [
    { holdId: "fresh", savedAt: now.toISOString() },
    {
      holdId: "old",
      savedAt: new Date(now.getTime() - KEEP_MS - 1).toISOString(),
    },
    { holdId: "done", savedAt: now.toISOString() },
  ];
  assert.deepEqual(
    pruneCheckouts(list, now, new Set(["done"])).map((x) => x.holdId),
    ["fresh"],
  );
});

test("whatever storage returns is read safely", () => {
  for (const bad of [null, "", "not json", "{}", '[1, null, {"holdId": 3}]'])
    assert.deepEqual(parseSaved(bad), [], String(bad));
  assert.deepEqual(
    parseSaved('[{"holdId":"a","savedAt":"2026-11-03T12:00:00.000Z"}]'),
    [{ holdId: "a", savedAt: "2026-11-03T12:00:00.000Z" }],
  );
});

test("a held or pending payment can be resumed until it expires", () => {
  const hold = {
    status: "pending_payment",
    expiresAt: later(5 * 60_000),
    endsAt: later(86_400_000),
    booking: null,
  };
  assert.equal(checkoutState(hold, now), "resume");
  assert.equal(checkoutState({ ...hold, status: "held" }, now), "resume");
  assert.equal(
    checkoutState({ ...hold, expiresAt: later(-1000) }, now),
    "drop",
  );
  assert.equal(checkoutState({ ...hold, status: "expired" }, now), "drop");
});

test("a payment that landed while away shows as booked until the game is over", () => {
  const booked = {
    status: "confirmed",
    expiresAt: null,
    endsAt: later(86_400_000),
    booking: { reference: "PP-ABC234" },
  };
  assert.equal(checkoutState(booked, now), "booked");
  assert.equal(checkoutState({ ...booked, endsAt: later(-1) }, now), "drop");
  assert.equal(checkoutState({ ...booked, status: "cancelled" }, now), "drop");
});
