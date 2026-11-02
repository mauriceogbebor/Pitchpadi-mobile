import assert from "node:assert/strict";
import { test } from "node:test";
import { safeAppPath } from "../src/lib/app-path.ts";

test("notification and link targets stay inside the app", () => {
  assert.equal(safeAppPath("/booking/PP-ABC234"), "/booking/PP-ABC234");
  assert.equal(
    safeAppPath("/venue/booking/1f0c?organizationId=9a&date=2026-11-06"),
    "/venue/booking/1f0c?organizationId=9a&date=2026-11-06",
  );
  for (const bad of [
    "https://evil.example/login",
    "//evil.example",
    "javascript:alert(1)",
    "pitchpadi://booking/x",
    "/booking/../../x",
    "/<script>",
    "",
    42,
    null,
    undefined,
  ])
    assert.equal(safeAppPath(bad), null, String(bad));
});
