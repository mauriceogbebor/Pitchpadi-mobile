import Constants, { ExecutionEnvironment } from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { registerPushToken, removePushToken } from "@/api/generated";
import { safeAppPath } from "@/lib/app-path";

/*
 * Push notifications on this phone (M4): venue members hear about new online
 * bookings; players get their confirmation and a reminder before kick-off.
 *
 * expo-notifications is loaded only where push can work. It does nothing in
 * Expo Go on Android (SDK 53+) and on the web preview, so those show a short
 * explanation instead. Push also needs the app's Expo project (EAS_PROJECT_ID),
 * which comes with the store accounts (M5).
 */

const STORED = "pitchpadi.pushToken";
const HANDLED = "pitchpadi.pushHandled";

export type PushState =
  | { kind: "unsupported"; reason: string }
  | { kind: "off" }
  | { kind: "blocked" }
  | { kind: "on" };

function projectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)
      ?.projectId ?? Constants.easConfig?.projectId
  );
}

/** Why push cannot work here, or null when it can. */
export function unsupportedReason(): string | null {
  if (Platform.OS === "web")
    return "Notifications work in the PitchPadi app on Android and iPhone.";
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient)
    return "Expo Go cannot receive push notifications. They work in the PitchPadi app from the Play Store or App Store.";
  if (!projectId()) return "Notifications are not set up for this build yet.";
  return null;
}

async function load() {
  return import("expo-notifications");
}

async function readStored(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(STORED);
  } catch {
    return null;
  }
}

/** On, off, blocked in the phone's settings, or not possible here. */
export async function pushState(): Promise<PushState> {
  const reason = unsupportedReason();
  if (reason) return { kind: "unsupported", reason };
  const Notifications = await load();
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted)
    return permission.canAskAgain ? { kind: "off" } : { kind: "blocked" };
  return (await readStored()) ? { kind: "on" } : { kind: "off" };
}

/** Gets this phone's token and tells PitchPadi to send here. Safe to repeat. */
async function registerHere(): Promise<void> {
  const Notifications = await load();
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("default", {
      name: "Bookings",
      importance: Notifications.AndroidImportance.HIGH,
    });
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: projectId(),
  });
  const response = await registerPushToken({
    token,
    platform: Platform.OS === "ios" ? "ios" : "android",
  });
  if (response.status !== 200)
    throw new Error("PitchPadi could not turn on notifications. Try again.");
  await SecureStore.setItemAsync(STORED, token);
}

/** Asks the phone for permission (once), then registers. */
export async function turnOnPush(): Promise<PushState> {
  const reason = unsupportedReason();
  if (reason) return { kind: "unsupported", reason };
  const Notifications = await load();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return { kind: "blocked" };
  await registerHere();
  return { kind: "on" };
}

/** Stops notifications on this phone. Best effort when offline. */
export async function turnOffPush(): Promise<PushState> {
  const token = await readStored();
  if (token) {
    try {
      await removePushToken({ token });
    } catch {
      // Offline: the server forgets the phone when this session ends.
    }
    await SecureStore.deleteItemAsync(STORED).catch(() => undefined);
  }
  return { kind: "off" };
}

/**
 * After sign-in or on start: if this phone already allows notifications, make
 * sure the current session is registered (tokens belong to a session).
 */
export async function syncPush(): Promise<void> {
  if (unsupportedReason()) return;
  const Notifications = await load();
  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted) await registerHere();
}

/** Before signing out, so the phone stops getting this account's messages. */
export async function forgetPushOnThisPhone(): Promise<void> {
  if (unsupportedReason()) return;
  await turnOffPush();
}

/** Sets how notifications show while the app is open, and handles taps. */
export async function listenForTaps(
  open: (path: string) => void,
): Promise<() => void> {
  if (unsupportedReason()) return () => undefined;
  const Notifications = await load();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  type Response = Awaited<
    ReturnType<typeof Notifications.getLastNotificationResponseAsync>
  >;
  const go = async (response: NonNullable<Response>) => {
    // The last tap is remembered across launches: open it once, not every start.
    const id = `${response.notification.request.identifier}:${response.actionIdentifier}`;
    if ((await SecureStore.getItemAsync(HANDLED).catch(() => null)) === id)
      return;
    await SecureStore.setItemAsync(HANDLED, id).catch(() => undefined);
    const path = safeAppPath(response.notification.request.content.data?.url);
    if (path) open(path);
  };
  // Opened from a notification while the app was closed.
  const last = await Notifications.getLastNotificationResponseAsync();
  if (last) await go(last);
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => void go(response),
  );
  return () => subscription.remove();
}
