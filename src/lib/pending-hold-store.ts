import { readPendingText, writePendingText } from "@/lib/checkout-store";
import {
  livePending,
  parsePending,
  putPending,
  type PendingHold,
} from "@/lib/pending-holds";

let queue: Promise<unknown> = Promise.resolve();

function serial<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work, work);
  queue = result.catch(() => undefined);
  return result;
}

export function pendingHolds(): Promise<PendingHold[]> {
  return serial(async () =>
    livePending(parsePending(await readPendingText()), new Date()),
  );
}

export function savePending(slot: string, key: string): Promise<void> {
  return serial(async () => {
    const list = livePending(parsePending(await readPendingText()), new Date());
    await writePendingText(
      JSON.stringify(
        putPending(list, { slot, key, savedAt: new Date().toISOString() }),
      ),
    );
  });
}

export function clearPending(key: string): Promise<void> {
  return serial(async () => {
    const list = parsePending(await readPendingText()).filter(
      (item) => item.key !== key,
    );
    await writePendingText(JSON.stringify(list));
  });
}
