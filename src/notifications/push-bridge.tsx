import { router } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "@/auth/auth-context";
import { listenForTaps, syncPush } from "./push";

/**
 * Keeps this phone registered for the signed-in account (tokens belong to a
 * session, so each sign-in registers again) and opens the right screen when a
 * notification is tapped. Renders nothing.
 */
export function PushBridge() {
  const auth = useAuth();
  const userId = auth.status === "signedIn" ? auth.me.user.id : null;

  useEffect(() => {
    if (userId) void syncPush().catch(() => undefined);
  }, [userId]);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    void listenForTaps((path) => router.push(path as never)).then((remove) => {
      if (cancelled) remove();
      else stop = remove;
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return null;
}
