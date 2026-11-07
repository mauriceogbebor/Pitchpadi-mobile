/*
 * Words and choices for when a booking does not go to plan (Prompt 2). Pure
 * functions over what the API sent, so they can be tested without a phone. The
 * API decides what happened; these only say it plainly and offer the next step.
 */

type Method = "card" | "bank_transfer" | "ussd";

const METHOD_WORD: Record<Method, string> = {
  card: "card",
  bank_transfer: "bank transfer",
  ussd: "USSD",
};

/** Under this many seconds left, the hold screen says so out loud. */
export const LOW_TIME_SECONDS = 120;

type HoldLike = {
  status: string;
  expiresAt: string | null;
  releaseReason: string | null;
  payment: { status: string; method: Method } | null;
};

/**
 * When the last payment on a still-live hold failed (D-054): what to tell the
 * player. Null when there is nothing to recover from.
 */
export function failedPayment(
  hold: HoldLike,
  until: string,
): { title: string; detail: string } | null {
  const live =
    (hold.status === "held" || hold.status === "pending_payment") &&
    hold.expiresAt !== null;
  if (!live || hold.payment?.status !== "failed") return null;
  return {
    title: `Your ${METHOD_WORD[hold.payment.method]} payment did not go through`,
    detail: `Your time is still held until ${until}. Try again, or pay another way. If any money left your account, it will be refunded.`,
  };
}

/** Why a hold ended, in one sentence. */
export function endedMessage(hold: HoldLike): string {
  if (hold.status === "payment_failed")
    return "The payment could not be accepted, so we released the time. If any money left your account, it will be refunded.";
  if (hold.releaseReason === "abandoned")
    return "You chose another time, so we released this one.";
  if (hold.payment?.status === "failed")
    return "The payment did not go through and the clock ran out, so we released the time. If any money left your account, it will be refunded.";
  if (hold.payment)
    return "The payment did not arrive in time, so we released the time. If money left your account, it will be refunded.";
  return "The clock ran out before payment, so we released the time.";
}

type Offer = { durationMinutes: number; amountDueMinor: number };
type Start = { startsAt: string; localStart: string; options: Offer[] };

export type Retry = { startsAt: string; localStart: string; offer: Offer };

/**
 * After a hold ends: is the same time still open for the same length, and if
 * not, which open times of that length are closest to it? Up to `limit`
 * alternatives, nearest first, earlier first on a tie.
 */
export function retryChoices(
  startTimes: Start[],
  startsAt: string,
  durationMinutes: number,
  limit = 3,
): { same: Retry | null; nearby: Retry[] } {
  const wanted = Date.parse(startsAt);
  const open: Retry[] = [];
  for (const start of startTimes) {
    const offer = start.options.find(
      (item) => item.durationMinutes === durationMinutes,
    );
    if (offer)
      open.push({
        startsAt: start.startsAt,
        localStart: start.localStart,
        offer,
      });
  }
  const same = open.find((item) => Date.parse(item.startsAt) === wanted);
  const nearby = open
    .filter((item) => item !== same)
    .sort((a, b) => {
      const gap =
        Math.abs(Date.parse(a.startsAt) - wanted) -
        Math.abs(Date.parse(b.startsAt) - wanted);
      return gap || Date.parse(a.startsAt) - Date.parse(b.startsAt);
    })
    .slice(0, limit);
  return { same: same ?? null, nearby };
}
