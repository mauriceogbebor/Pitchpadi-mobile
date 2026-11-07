import { router } from "expo-router";
import { useState } from "react";
import { createHold } from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { newIdempotencyKey } from "@/lib/ids";
import {
  clearPending,
  pendingHolds,
  savePending,
} from "@/lib/pending-hold-store";
import { slotId } from "@/lib/pending-holds";
import { rememberCheckout } from "@/lib/use-device-checkouts";

type ErrorBody = { error?: string };

/**
 * Retry keys for this app session, by time and length. They back up the saved
 * keys, so a signed-in player whose phone storage fails still retries safely.
 */
const memoryKeys = new Map<string, string>();

/**
 * Holding a time and opening checkout, shared by the pitch page and "Book
 * again". One idempotency key per time and length, so retrying after a
 * dropped connection returns the same hold instead of trying to book twice.
 * The API decides whether the time is still free and what it costs.
 */
export function useHoldSlot(onTaken?: () => void) {
  const auth = useAuth();
  const [holding, setHolding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function hold(
    input: {
      pitchId: string;
      startsAt: string;
      durationMinutes: number;
    },
    options: {
      /**
       * Ask for a new hold even if a retry key for this time is saved: used
       * after a hold has visibly ended, where the old key would only return
       * that ended hold.
       */
      fresh?: boolean;
      /** Replace the current screen with checkout instead of adding one. */
      replace?: boolean;
    } = {},
  ) {
    const id = slotId(input);
    setHolding(id);
    setError(null);
    const guest = auth.status !== "signedIn";
    let saved: string | undefined;
    if (options.fresh) memoryKeys.delete(id);
    else
      try {
        saved = (await pendingHolds()).find((item) => item.slot === id)?.key;
      } catch {
        // Unreadable storage: a guest is stopped below when saving fails too.
      }
    if (!options.fresh) saved ??= memoryKeys.get(id);
    const reused = saved !== undefined;
    const key = saved ?? newIdempotencyKey();
    memoryKeys.set(id, key);
    try {
      // Save before the request, so a dropped response can be recovered after
      // an app restart (R8F).
      await savePending(id, key);
    } catch {
      // A guest's hold can only be found again from this phone, so do not
      // make one the guest could lose. Signed-in players get it back from
      // their account: carry on with the key kept in memory (R9 finding 1).
      if (guest) {
        setError("We could not save this checkout on your phone. Try again.");
        setHolding(null);
        return;
      }
    }
    try {
      const response = await createHold(
        {
          pitchId: input.pitchId,
          startsAt: input.startsAt,
          durationMinutes: input.durationMinutes as 60 | 90 | 120,
        },
        { headers: { "idempotency-key": key } },
      );
      if (response.status === 200 || response.status === 201) {
        if (
          response.data.hold.status !== "held" &&
          response.data.hold.status !== "pending_payment"
        ) {
          await clearPending(key).catch(() => undefined);
          memoryKeys.delete(id);
          // A retry can return an earlier hold that has since run out; the
          // key is cleared, so the next tap asks afresh (R9 finding 4).
          setError(
            reused
              ? "Your earlier hold ran out. Tap again to hold this time."
              : "That hold has ended. Choose an open time and try again.",
          );
          onTaken?.();
          return;
        }
        // A guest's checkout is only findable again from this phone (R7);
        // signed-in players get theirs back from their account.
        const kept = !guest || (await rememberCheckout(response.data.hold.id));
        if (kept) {
          await clearPending(key).catch(() => undefined);
          memoryKeys.delete(id);
        }
        const target = {
          pathname: "/checkout/[holdId]",
          params: { holdId: response.data.hold.id },
        } as const;
        if (options.replace) router.replace(target);
        else router.push(target);
        return;
      }
      if (response.status < 500) {
        await clearPending(key).catch(() => undefined);
        memoryKeys.delete(id);
      }
      setError(
        (response.data as ErrorBody).error ??
          "We could not hold this time. Try again.",
      );
      if (response.status === 409) onTaken?.();
    } catch {
      // Keep the saved key: the hold may have been made before the connection dropped.
      setError(
        "We could not reach PitchPadi. Check your connection and try again.",
      );
    } finally {
      setHolding(null);
    }
  }

  /** Whether this exact time and length is being held right now. */
  const isHolding = (input: {
    pitchId: string;
    startsAt: string;
    durationMinutes: number;
  }) =>
    holding === `${input.pitchId}:${input.startsAt}:${input.durationMinutes}`;

  return { hold, holding: holding !== null, isHolding, error, setError };
}
