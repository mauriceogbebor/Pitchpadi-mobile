import { router } from "expo-router";
import { useRef, useState } from "react";
import { createHold } from "@/api/generated";
import { newIdempotencyKey } from "@/lib/ids";

type ErrorBody = { error?: string };

/**
 * Holding a time and opening checkout, shared by the pitch page and "Book
 * again". One idempotency key per time and length, so retrying after a
 * dropped connection returns the same hold instead of trying to book twice.
 * The API decides whether the time is still free and what it costs.
 */
export function useHoldSlot(onTaken?: () => void) {
  const keys = useRef(new Map<string, string>());
  const [holding, setHolding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function hold(input: {
    pitchId: string;
    startsAt: string;
    durationMinutes: number;
  }) {
    const id = `${input.pitchId}:${input.startsAt}:${input.durationMinutes}`;
    const key = keys.current.get(id) ?? newIdempotencyKey();
    keys.current.set(id, key);
    setHolding(id);
    setError(null);
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
        router.push({
          pathname: "/checkout/[holdId]",
          params: { holdId: response.data.hold.id },
        });
        return;
      }
      keys.current.delete(id);
      setError(
        (response.data as ErrorBody).error ??
          "We could not hold this time. Try again.",
      );
      if (response.status === 409) onTaken?.();
    } catch {
      // Keep the key: the hold may have been made before the connection dropped.
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
