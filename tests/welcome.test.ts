import assert from "node:assert/strict";
import { test } from "node:test";
import { onStartPlay, startPlay, welcomeMode } from "../src/lib/welcome.ts";

test("the welcome shows once, never over a shared link, and as a still with reduced motion", () => {
  const base = { seen: false, openedFromLink: false, reducedMotion: false };
  assert.equal(welcomeMode(base), "video");
  assert.equal(welcomeMode({ ...base, reducedMotion: true }), "still");
  assert.equal(welcomeMode({ ...base, seen: true }), "hidden");
  assert.equal(welcomeMode({ ...base, openedFromLink: true }), "hidden");
});

test("a welcome choice reaches Play while it listens, and browsing changes nothing", () => {
  const heard: unknown[] = [];
  const stop = onStartPlay((choice) => heard.push(choice));
  startPlay({ kind: "area", slug: "lekki" });
  startPlay({ kind: "nearMe" });
  startPlay({ kind: "browse" });
  stop();
  startPlay({ kind: "area", slug: "yaba" });
  assert.deepEqual(heard, [
    { kind: "area", slug: "lekki" },
    { kind: "nearMe" },
  ]);
});
