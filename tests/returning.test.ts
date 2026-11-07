import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_PLAY,
  myWeek,
  parseDetails,
  parsePlayChoices,
} from "../src/lib/returning.ts";

test("saved details come back only when they are sound", () => {
  const saved = { name: "Ada Obi", phone: "0803 123 4567", email: "" };
  assert.deepEqual(parseDetails(JSON.stringify(saved)), saved);
  assert.equal(parseDetails(null), null);
  assert.equal(parseDetails("not json"), null);
  assert.equal(parseDetails(JSON.stringify({ name: "Ada" })), null);
  assert.equal(
    parseDetails(JSON.stringify({ name: "", phone: " ", email: "" })),
    null,
  );
  assert.equal(
    parseDetails(JSON.stringify({ ...saved, name: "x".repeat(81) })),
    null,
  );
});

test("usual Play choices fall back field by field", () => {
  assert.deepEqual(parsePlayChoices(null), DEFAULT_PLAY);
  assert.deepEqual(parsePlayChoices("{"), DEFAULT_PLAY);
  assert.deepEqual(
    parsePlayChoices(
      JSON.stringify({
        area: "lekki",
        duration: 90,
        type: "7-a-side",
        maxPrice: 3_000_000,
      }),
    ),
    { area: "lekki", duration: 90, type: "7-a-side", maxPrice: 3_000_000 },
  );
  assert.deepEqual(
    parsePlayChoices(
      JSON.stringify({
        area: "Lekki; drop",
        duration: 45,
        type: "11-a-side",
        maxPrice: -1,
      }),
    ),
    DEFAULT_PLAY,
  );
  assert.deepEqual(parsePlayChoices(JSON.stringify({ duration: 120 })), {
    ...DEFAULT_PLAY,
    duration: 120,
  });
});

const game = { pitchId: "p1", localStart: "7:00 pm", durationMinutes: 60 };
const now = new Date("2026-11-07T12:00:00Z");
const base = {
  localDate: "2026-11-11",
  localStart: "7:00 pm",
  durationMinutes: 60,
  pitch: { id: "p1" },
};

test("Book again recognises the player's own weeks", () => {
  const hold = {
    ...base,
    id: "h1",
    status: "pending_payment",
    expiresAt: "2026-11-07T12:10:00Z",
  };
  const booking = { ...base, reference: "PP-ABC123", status: "confirmed" };
  assert.deepEqual(myWeek("2026-11-11", game, [hold], [], now), {
    kind: "holding",
    holdId: "h1",
  });
  assert.deepEqual(myWeek("2026-11-11", game, [hold], [booking], now), {
    kind: "booked",
    reference: "PP-ABC123",
  });
  // Another week, another kick-off, another length or pitch: not theirs.
  assert.equal(myWeek("2026-11-18", game, [hold], [booking], now), null);
  assert.equal(
    myWeek("2026-11-11", { ...game, localStart: "8:00 pm" }, [hold], [], now),
    null,
  );
  assert.equal(
    myWeek("2026-11-11", { ...game, durationMinutes: 90 }, [hold], [], now),
    null,
  );
  assert.equal(
    myWeek("2026-11-11", { ...game, pitchId: "p2" }, [hold], [], now),
    null,
  );
});

test("ended holds and cancelled bookings are not the player's week", () => {
  const ended = {
    ...base,
    id: "h1",
    status: "held",
    expiresAt: "2026-11-07T11:59:00Z",
  };
  const expired = { ...base, id: "h2", status: "expired", expiresAt: null };
  const cancelled = { ...base, reference: "PP-X", status: "cancelled" };
  assert.equal(
    myWeek("2026-11-11", game, [ended, expired], [cancelled], now),
    null,
  );
});
