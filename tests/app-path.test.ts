import assert from "node:assert/strict";
import { test } from "node:test";
import { openedFromLink, safeAppPath } from "../src/lib/app-path.ts";

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

test("a link to a screen counts as a link launch; the icon and dev addresses do not", () => {
  assert.equal(openedFromLink("pitchpadi://pitch/abc?date=2026-11-20"), true);
  assert.equal(openedFromLink("https://pitchpadi.ng/venues/xyz"), true);
  assert.equal(openedFromLink("exp://192.168.0.2:8081/--/b/PP-123"), true);
  assert.equal(openedFromLink("pitchpadi://"), false);
  assert.equal(openedFromLink("https://pitchpadi.ng/"), false);
  assert.equal(openedFromLink("exp://192.168.0.2:8081"), false);
  assert.equal(
    openedFromLink("pitchpadi://expo-development-client/?url=http%3A%2F%2Fx"),
    false,
  );
  assert.equal(openedFromLink(null), false);
  assert.equal(openedFromLink("not a url"), false);
});
