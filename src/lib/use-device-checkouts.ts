import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getHold, type Hold } from "@/api/generated";
import { readSavedText, writeSavedText } from "@/lib/checkout-store";
import {
  addCheckout,
  checkoutState,
  parseSaved,
  pruneCheckouts,
} from "@/lib/device-checkouts";

const KEY = ["deviceCheckouts"] as const;

/** Saves a checkout started on this phone, so it can be found again (R7). */
export async function rememberCheckout(holdId: string) {
  const list = parseSaved(await readSavedText());
  await writeSavedText(JSON.stringify(addCheckout(list, holdId, new Date())));
}

/**
 * Checkouts started on this phone without an account, as the API sees them
 * now: ones to continue ("resume") and ones that were paid while the player
 * was away ("booked"). Expired and finished ones are forgotten.
 */
export function useDeviceCheckouts() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const now = new Date();
      const saved = pruneCheckouts(parseSaved(await readSavedText()), now);
      const checked = await Promise.all(
        saved.map(async (item) => {
          try {
            const response = await getHold(item.holdId);
            if (response.status === 404)
              return { id: item.holdId, gone: true as const };
            if (response.status !== 200) return { id: item.holdId };
            return { id: item.holdId, hold: response.data.hold };
          } catch {
            // Offline: keep it and check again next time.
            return { id: item.holdId };
          }
        }),
      );
      const drop = new Set<string>();
      const resume: Hold[] = [];
      const booked: Hold[] = [];
      for (const item of checked) {
        if ("gone" in item) drop.add(item.id);
        else if (item.hold) {
          const state = checkoutState(item.hold, now);
          if (state === "resume") resume.push(item.hold);
          else if (state === "booked") booked.push(item.hold);
          else drop.add(item.id);
        }
      }
      await writeSavedText(JSON.stringify(pruneCheckouts(saved, now, drop)));
      return { resume, booked };
    },
  });
  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: KEY }),
    [queryClient],
  );
  return { ...query, refresh };
}
