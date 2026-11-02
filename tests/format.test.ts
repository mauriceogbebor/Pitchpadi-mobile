import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addDays,
  dateParts,
  formatDuration,
  formatInstantTime,
  formatNaira,
  formatPhone,
  inTimeOfDay,
  lagosToday,
} from "../src/lib/format.ts";

test("money is whole naira with separators, kobo only when needed", () => {
  assert.equal(formatNaira(2500000), "₦25,000");
  assert.equal(formatNaira(3250050), "₦32,500.50");
  assert.equal(formatNaira(0), "₦0");
  assert.equal(formatNaira(100_000_000_00), "₦100,000,000");
});

test("times are Lagos clock times without relying on phone time zone data", () => {
  assert.equal(formatInstantTime("2026-10-23T17:12:00Z"), "6:12 pm");
  assert.equal(formatInstantTime("2026-10-23T23:00:00Z"), "12:00 am");
  // 11:30 pm UTC is already the next day in Lagos.
  assert.equal(lagosToday(new Date("2026-10-23T23:30:00Z")), "2026-10-24");
  assert.equal(lagosToday(new Date("2026-10-23T22:59:00Z")), "2026-10-23");
});

test("dates and durations read naturally", () => {
  assert.deepEqual(dateParts("2026-10-21"), {
    weekday: "Wed",
    day: "21",
    month: "Oct",
    long: "Wednesday 21 October",
  });
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(formatDuration(60), "1 hour");
  assert.equal(formatDuration(90), "1½ hours");
  assert.equal(formatDuration(30), "30 minutes");
});

test("phones and time of day", () => {
  assert.equal(formatPhone("+2348123456789"), "0812 345 6789");
  assert.equal(inTimeOfDay("2026-11-02T16:00:00Z", "evening"), true);
  assert.equal(inTimeOfDay("2026-11-02T15:30:00Z", "afternoon"), true);
  assert.equal(inTimeOfDay("2026-11-02T23:00:00Z", "morning"), true);
});
