import assert from "node:assert/strict";
import { test } from "node:test";
import {
  endedMessage,
  failedPayment,
  retryChoices,
} from "../src/lib/recovery.ts";

const live = {
  status: "held",
  expiresAt: "2026-11-07T17:42:00.000Z",
  releaseReason: null,
  payment: { status: "failed", method: "ussd" as const },
};

test("a failed payment on a live hold says the time is still held", () => {
  const problem = failedPayment(live, "6:42 pm");
  assert.equal(problem?.title, "Your USSD payment did not go through");
  assert.match(problem!.detail, /still held until 6:42 pm/);
  assert.equal(
    failedPayment(
      { ...live, payment: { status: "checkout_open", method: "card" } },
      "6:42 pm",
    ),
    null,
  );
  assert.equal(failedPayment({ ...live, payment: null }, "6:42 pm"), null);
  // Once the hold has ended, the ended screen explains it instead.
  assert.equal(failedPayment({ ...live, status: "expired" }, "6:42 pm"), null);
});

test("an ended hold says why it ended", () => {
  const ended = { ...live, status: "expired", expiresAt: null };
  assert.match(endedMessage(ended), /did not go through and the clock ran out/);
  assert.match(
    endedMessage({ ...ended, payment: { status: "expired", method: "card" } }),
    /did not arrive in time/,
  );
  assert.match(
    endedMessage({ ...ended, payment: null }),
    /clock ran out before payment/,
  );
  assert.match(
    endedMessage({ ...ended, releaseReason: "abandoned" }),
    /chose another time/,
  );
  assert.match(
    endedMessage({ ...ended, status: "payment_failed" }),
    /could not be accepted/,
  );
});

const at = (hour: number) =>
  `2026-11-07T${String(hour - 1).padStart(2, "0")}:00:00.000Z`;
const start = (hour: number, lengths: number[]) => ({
  startsAt: at(hour),
  localStart: `${hour - 12}:00 pm`,
  options: lengths.map((durationMinutes) => ({
    durationMinutes,
    amountDueMinor: durationMinutes * 25_000,
  })),
});

test("the same time is offered again when it is still open for that length", () => {
  const choices = retryChoices(
    [start(17, [60]), start(18, [60, 90])],
    at(18),
    90,
  );
  assert.equal(choices.same?.localStart, "6:00 pm");
  assert.equal(choices.same?.offer.durationMinutes, 90);
  assert.deepEqual(choices.nearby, []);
});

test("otherwise the nearest open times of the same length, earlier first on a tie", () => {
  const times = [
    start(14, [60]),
    start(16, [60]),
    start(17, [90]),
    start(19, [60]),
    start(20, [60]),
    start(22, [60]),
  ];
  const choices = retryChoices(times, at(18), 60);
  assert.equal(choices.same, null);
  assert.deepEqual(
    choices.nearby.map((item) => item.localStart),
    ["7:00 pm", "4:00 pm", "8:00 pm"],
  );
  assert.deepEqual(retryChoices([], at(18), 60), { same: null, nearby: [] });
});
