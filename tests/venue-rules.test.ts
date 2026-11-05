import assert from "node:assert/strict";
import { test } from "node:test";
import type { CalendarEntry } from "../src/api/generated.ts";
import { entryActions, entryStatus } from "../src/lib/venue-rules.ts";

const NOW = new Date("2026-11-03T18:00:00Z").getTime();
function entry(overrides: Partial<CalendarEntry>): CalendarEntry {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    pitchId: "00000000-0000-4000-8000-000000000002",
    kind: "booking",
    source: "manual",
    paymentState: "unpaid",
    paymentMethod: null,
    channel: "phone",
    note: null,
    cancelReason: null,
    reference: "PP-ABC234",
    startsAt: "2026-11-03T19:00:00Z",
    endsAt: "2026-11-03T20:00:00Z",
    localStart: "8:00 pm",
    localEnd: "9:00 pm",
    durationMinutes: 60,
    amountMinor: 2500000,
    currency: "NGN",
    customer: { name: "Tunde", phoneE164: null, email: null },
    holdExpiresAt: null,
    confirmedAt: null,
    ...overrides,
  } as CalendarEntry;
}

test("an unpaid venue booking can be marked paid or cancelled until it ends", () => {
  assert.deepEqual(entryActions(entry({}), NOW), {
    markPaid: true,
    cancel: true,
  });
  assert.deepEqual(entryStatus(entry({})), {
    label: "Not paid, collect at the pitch",
    tone: "collect",
  });
  const over = entry({ endsAt: "2026-11-03T17:59:00Z" });
  assert.deepEqual(entryActions(over, NOW), { markPaid: true, cancel: false });
});

test("paid, cancelled and online bookings offer only what applies", () => {
  const paid = entry({ paymentState: "paid", paymentMethod: "pos" });
  assert.deepEqual(entryActions(paid, NOW), { markPaid: false, cancel: true });
  assert.equal(entryStatus(paid).label, "Paid by POS");
  const cancelled = entry({ kind: "cancelled", paymentState: "cancelled" });
  assert.deepEqual(entryActions(cancelled, NOW), {
    markPaid: false,
    cancel: false,
  });
  assert.equal(entryStatus(cancelled).tone, "off");
  const online = entry({
    source: "online",
    paymentState: "paid",
    paymentMethod: "card",
  });
  assert.deepEqual(entryActions(online, NOW), {
    markPaid: false,
    cancel: false,
  });
  assert.equal(entryStatus(online).label, "Paid by card");
});

test("a player's live hold is shown as not a booking yet, with no actions", () => {
  const hold = entry({
    kind: "hold",
    source: "online",
    paymentState: "held_unpaid",
    customer: null,
  });
  assert.deepEqual(entryActions(hold, NOW), { markPaid: false, cancel: false });
  assert.equal(entryStatus(hold).tone, "pending");
});
