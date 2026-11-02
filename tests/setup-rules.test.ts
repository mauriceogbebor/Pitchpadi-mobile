import assert from "node:assert/strict";
import { test } from "node:test";
import { nairaInput, toKobo } from "../src/lib/money.ts";
import {
  copyHours,
  hoursProblem,
  setupSteps,
  stepMinute,
  WEEKDAY_SET,
  type HoursRow,
} from "../src/lib/setup-rules.ts";

const week = (open: Partial<Record<number, [number, number]>>): HoursRow[] =>
  [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    enabled: weekday in open,
    startMinute: open[weekday]?.[0] ?? 960,
    endMinute: open[weekday]?.[1] ?? 1320,
  }));

test("prices are typed in naira and stored in kobo", () => {
  assert.equal(toKobo("25,000"), 2500000);
  assert.equal(toKobo("₦ 25000.5"), 2500050);
  assert.equal(toKobo("25k"), null);
  assert.equal(toKobo(""), null);
  assert.equal(nairaInput(2500000), "25,000");
  assert.equal(nairaInput(2500050), "25,000.50");
});

test("Monday's hours copy to the weekdays and leave the weekend alone", () => {
  const { hours, from } = copyHours(
    week({ 1: [1020, 1380], 6: [600, 1320] }),
    WEEKDAY_SET,
  );
  assert.equal(from, 1);
  for (const weekday of [1, 2, 3, 4, 5])
    assert.deepEqual(hours[weekday], {
      weekday,
      enabled: true,
      startMinute: 1020,
      endMinute: 1380,
    });
  assert.deepEqual(hours[6], {
    weekday: 6,
    enabled: true,
    startMinute: 600,
    endMinute: 1320,
  });
  assert.equal(hours[0].enabled, false);
  assert.equal(copyHours(week({}), WEEKDAY_SET).from, null);
});

test("hours are checked in plain words, and stepping stays within the day", () => {
  assert.equal(hoursProblem(week({ 1: [1020, 1380] })), null);
  assert.equal(
    hoursProblem(week({ 2: [1200, 1080] })),
    "Tuesday closes before it opens. Check the times.",
  );
  assert.match(hoursProblem(week({}))!, /at least one day/);
  assert.equal(stepMinute(1410, 30), 1440);
  assert.equal(stepMinute(15, -30), 0);
});

test("next steps follow the venue's review and setup", () => {
  const states = (s: Parameters<typeof setupSteps>[0]) =>
    setupSteps(s).map((x) => x.state);
  assert.deepEqual(
    states({
      status: "pending",
      hasPitch: true,
      scheduled: false,
      published: false,
    }),
    ["done", "now", "waiting", "later"],
  );
  assert.deepEqual(
    states({
      status: "approved",
      hasPitch: true,
      scheduled: true,
      published: false,
    }),
    ["done", "done", "done", "now"],
  );
  assert.deepEqual(
    states({
      status: "rejected",
      hasPitch: true,
      scheduled: true,
      published: false,
    }),
    ["done", "done", "now", "later"],
  );
  assert.deepEqual(
    states({
      status: "approved",
      hasPitch: true,
      scheduled: true,
      published: true,
    }),
    ["done", "done", "done", "done"],
  );
});
