import assert from "node:assert/strict";
import { test } from "node:test";
import {
  livePending,
  parsePending,
  putPending,
  slotId,
  PENDING_KEEP_MS,
} from "../src/lib/pending-holds.ts";

test("a saved retry key survives serialization and stays tied to one slot", () => {
  const now = new Date("2026-11-05T12:00:00Z");
  const slot = slotId({
    pitchId: "pitch",
    startsAt: "2026-11-06T12:00:00Z",
    durationMinutes: 60,
  });
  const pending = putPending([], {
    slot,
    key: "12345678-1234-4234-8234-123456789abc",
    savedAt: now.toISOString(),
  });
  assert.deepEqual(
    livePending(parsePending(JSON.stringify(pending)), now),
    pending,
  );
  assert.equal(
    putPending(pending, { ...pending[0], savedAt: now.toISOString() }).length,
    1,
  );
  assert.deepEqual(
    livePending(pending, new Date(now.getTime() + PENDING_KEEP_MS)),
    [],
  );
});
