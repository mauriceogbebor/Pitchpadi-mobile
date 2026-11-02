import { randomUUID } from "expo-crypto";

/**
 * A fresh Idempotency-Key for a request that changes something (a hold, a
 * checkout). Sending the same key again makes a retry on a flaky network safe:
 * the API returns the first result instead of acting twice.
 */
export function newIdempotencyKey(): string {
  return randomUUID();
}
