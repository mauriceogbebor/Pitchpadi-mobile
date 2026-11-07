import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NOT_SET_UP,
  pushErrorMessage,
  pushProblem,
} from "../src/lib/push-support.ts";

const build = {
  platform: "android",
  expoGo: false,
  projectId: "90a95703-36f4-4610-ad18-9b6a2c574992",
  pushReady: "1",
};

test("push is offered only in a native build that is marked ready", () => {
  assert.equal(pushProblem(build), null);
  assert.equal(pushProblem({ ...build, platform: "ios" }), null);
});

test("a linked project without push credentials says the build is not set up", () => {
  assert.equal(pushProblem({ ...build, pushReady: undefined }), NOT_SET_UP);
  assert.equal(pushProblem({ ...build, pushReady: "0" }), NOT_SET_UP);
  assert.equal(pushProblem({ ...build, projectId: undefined }), NOT_SET_UP);
});

test("the web preview and Expo Go explain where push works", () => {
  assert.match(
    pushProblem({ ...build, platform: "web" })!,
    /Android and iPhone/,
  );
  assert.match(pushProblem({ ...build, expoGo: true })!, /Expo Go cannot/);
});

test("credential failures are not blamed on the connection", () => {
  for (const message of [
    "Default FirebaseApp is not initialized in this process com.pitchpadi.app.",
    "Make sure to complete the guide at https://docs.expo.dev/push-notifications/fcm-credentials/",
    'no valid "aps-environment" entitlement string found for application',
  ])
    assert.equal(pushErrorMessage(new Error(message)), NOT_SET_UP);
  assert.match(
    pushErrorMessage(new Error("Network request failed")),
    /Check your connection/,
  );
  assert.match(pushErrorMessage("timeout"), /Check your connection/);
});
