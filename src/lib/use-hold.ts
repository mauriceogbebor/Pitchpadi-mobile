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
 * Holding a time and opening checkout, shared by the pitch page and "Book
 * again". One idempotency key per time and length, so retrying after a
 * dropped connection returns the same hold instead of trying to book twice.
 * The API decides whether the time is still free and what it costs.
 */
export function useHoldSlot(onTaken?: () => void) {
  const auth = useAuth();
  const [holding, setHolding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function hold(input: {
    pitchId: string;
    startsAt: string;
    durationMinutes: number;
  }) {
    const id = slotId(input);
    setHolding(id);
    setError(null);
    let key: string;
    try {
      key =
        (await pendingHolds()).find((item) => item.slot === id)?.key ??
        newIdempotencyKey();
      // Save before the request. If storage fails, do not create a hold that
      // the guest cannot recover after a dropped response and app restart.
      await savePending(id, key);
    } catch {
      setError("We could not save this checkout on your phone. Try again.");
      setHolding(null);
      return;
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
          setError("That hold has ended. Choose an open time and try again.");
          onTaken?.();
          return;
        }
        // A guest's checkout is only findable again from this phone (R7);
        // signed-in players get theirs back from their account.
        const saved =
          auth.status === "signedIn" ||
          (await rememberCheckout(response.data.hold.id));
        if (saved) await clearPending(key).catch(() => undefined);
        router.push({
          pathname: "/checkout/[holdId]",
          params: { holdId: response.data.hold.id },
        });
        return;
      }
      if (response.status < 500) await clearPending(key).catch(() => undefined);
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
