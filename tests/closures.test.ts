import assert from "node:assert/strict";
import { test } from "node:test";
import { closureLabel, closureTimes, shortDate } from "../src/lib/closures.ts";

const base = {
  localDate: "2026-11-21",
  localEndDate: "2026-11-21",
  localStart: "12:00 am",
  localEnd: "midnight",
  allDay: true,
};

test("closures read as plain dates and times", () => {
  assert.equal(shortDate("2026-11-21"), "Sat 21 Nov");
  assert.equal(closureLabel(base), "Sat 21 Nov, all day");
  assert.equal(
    closureLabel({ ...base, localEndDate: "2026-11-23" }),
    "Sat 21 Nov to Mon 23 Nov, all day",
  );
  assert.equal(
    closureLabel({
      ...base,
      allDay: false,
      localStart: "6:00 pm",
      localEnd: "8:00 pm",
    }),
    "Sat 21 Nov, 6:00 pm to 8:00 pm",
  );
});

test("closure times run from 6 am to midnight in half hours", () => {
  const times = closureTimes();
  assert.deepEqual(times[0], { value: "06:00", label: "6:00 am" });
  assert.deepEqual(times.at(-1), { value: "24:00", label: "midnight" });
  assert.equal(times.find((t) => t.value === "12:30")?.label, "12:30 pm");
  assert.equal(times.length, 37);
});
