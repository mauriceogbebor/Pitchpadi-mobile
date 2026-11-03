import assert from "node:assert/strict";
import { test } from "node:test";
import { supportUrl, supportWhatsApp } from "../src/lib/support.ts";

test("a support number is used only when it is a real phone number", () => {
  assert.equal(supportWhatsApp("+234 803 000 0000"), "2348030000000");
  assert.equal(supportWhatsApp("2348030000000"), "2348030000000");
  for (const bad of [
    undefined,
    "",
    "support",
    "123",
    "+234 803 000 0000 ext 2",
  ])
    assert.equal(supportWhatsApp(bad), null, String(bad));
});

test("the support message carries the reference and nothing personal", () => {
  assert.equal(
    supportUrl("2348030000000", "PP-ABC234"),
    "https://wa.me/2348030000000?text=Hello%20PitchPadi%2C%20I%20need%20help%20with%20booking%20PP-ABC234.",
  );
});
