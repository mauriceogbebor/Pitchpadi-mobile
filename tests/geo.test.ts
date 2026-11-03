import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatDistance,
  nearParam,
  parsePoint,
  pinDirectionsUrl,
  roughPoint,
} from "../src/lib/geo.ts";

test("the player's position is rounded to about 1 km before it is sent", () => {
  assert.deepEqual(roughPoint({ latitude: 6.447412, longitude: 3.472388 }), {
    latitude: 6.45,
    longitude: 3.47,
  });
  assert.equal(nearParam({ latitude: 6.4351, longitude: 3.4219 }), "6.44,3.42");
});

test("venue pins are read from typed numbers and Google Maps links", () => {
  const lekki = { latitude: 6.4474, longitude: 3.4723 };
  for (const text of [
    "6.4474, 3.4723",
    "6.4474,3.4723",
    " 6.4474 ,  3.4723 ",
    "https://www.google.com/maps/@6.4474,3.4723,17z",
    "https://www.google.com/maps/place/Pitch/@6.4401,3.4601,15z/data=!3m1!4b1!3d6.4474!4d3.4723",
    "https://maps.google.com/?q=6.4474,3.4723",
    "https://www.google.com/maps/search/?api=1&query=6.4474%2C3.4723",
  ])
    assert.deepEqual(parsePoint(text), lekki, text);
  for (const text of [
    "",
    "Lekki Phase 1",
    "https://maps.app.goo.gl/AbCdEf123",
    "95.1, 3.4",
  ])
    assert.equal(parsePoint(text), null, text);
});

test("distances read naturally", () => {
  assert.equal(formatDistance(0.04), "100 m away");
  assert.equal(formatDistance(0.83), "800 m away");
  assert.equal(formatDistance(2.43), "2.4 km away");
  assert.equal(formatDistance(12.6), "13 km away");
});

test("directions go to the exact pin", () => {
  assert.equal(
    pinDirectionsUrl({ latitude: 6.4474, longitude: 3.4723 }),
    "https://www.google.com/maps/dir/?api=1&destination=6.4474,3.4723",
  );
});
