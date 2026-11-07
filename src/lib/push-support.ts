/*
 * Whether push can work in this build, and what to say when it cannot (R11
 * finding 2). Pure, so it is unit tested; src/notifications/push.ts supplies
 * the facts.
 *
 * Linking the Expo project (DB-01) is not enough on its own: Android needs the
 * Firebase (FCM) credentials and iOS the Apple push key. Until those are added
 * to the Expo project, a build is not push-ready, and the app says so instead
 * of letting the switch fail with a misleading "check your connection".
 */

export const NOT_SET_UP = "Notifications are not set up for this build yet.";

export function pushProblem(build: {
  platform: string;
  /** Running inside Expo Go. */
  expoGo: boolean;
  projectId: string | undefined;
  /** EXPO_PUBLIC_PUSH_READY: set to "1" once FCM and APNs credentials exist. */
  pushReady: string | undefined;
}): string | null {
  if (build.platform === "web")
    return "Notifications work in the PitchPadi app on Android and iPhone.";
  if (build.expoGo)
    return "Expo Go cannot receive push notifications. They work in the PitchPadi app from the Play Store or App Store.";
  if (!build.projectId || build.pushReady !== "1") return NOT_SET_UP;
  return null;
}

/**
 * The message for a failed attempt to turn notifications on. Missing push
 * credentials surface as Firebase or entitlement errors; say that the build is
 * not set up rather than blaming the connection.
 */
export function pushErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  if (
    /firebase|fcm|google-services|aps-environment|entitlement|credential|projectid/i.test(
      text,
    )
  )
    return NOT_SET_UP;
  return "We could not turn on notifications. Check your connection and try again.";
}
