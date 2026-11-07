import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addWeeks,
  lagosInstant,
  repeatSummary,
  weeklyDates,
} from "../src/lib/repeat.ts";

test("weekly dates keep the weekday and Lagos kick-off across months", () => {
  assert.equal(
    lagosInstant("2026-11-26", 19 * 60 + 30),
    "2026-11-26T19:30:00+01:00",
  );
  assert.equal(addWeeks("2026-11-26", 1), "2026-12-03");
  assert.deepEqual(
    weeklyDates("2026-12-24", 18 * 60, 3).map((week) => week.startsAt),
    [
      "2026-12-24T18:00:00+01:00",
      "2026-12-31T18:00:00+01:00",
      "2027-01-07T18:00:00+01:00",
    ],
  );
  assert.equal(weeklyDates("2026-11-26", 60, 0).length, 1);
});

test("the summary counts saved weeks", () => {
  assert.equal(
    repeatSummary([{ date: "2026-11-26", state: "saved", reference: "PP-A" }]),
    "Booking saved",
  );
  assert.equal(
    repeatSummary([
      { date: "2026-11-26", state: "saved", reference: "PP-A" },
      { date: "2026-12-03", state: "refused", reason: "Taken" },
      { date: "2026-12-10", state: "unsent" },
      { date: "2026-12-17", state: "saved", reference: "PP-B" },
    ]),
    "Saved 2 of 4 weeks",
  );
});
