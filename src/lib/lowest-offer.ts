/*
 * The price a card shows (R6-F1, R7): the cheapest length among the times
 * the API returned for this search, with that length, so "₦25,000 for 1
 * hour" is always a price the player can actually book. The pitch's fallback
 * price is not shown, because it may apply to none of these times.
 * Display only: every price here comes from the API.
 */

type StartLike = {
  options: { durationMinutes: number; amountMinor: number }[];
};

export function lowestOffer(
  startTimes: StartLike[],
): { amountMinor: number; durationMinutes: number } | null {
  let best: { amountMinor: number; durationMinutes: number } | null = null;
  for (const start of startTimes)
    for (const option of start.options)
      if (
        !best ||
        option.amountMinor < best.amountMinor ||
        // Same price: the shorter game is the honest "from".
        (option.amountMinor === best.amountMinor &&
          option.durationMinutes < best.durationMinutes)
      )
        best = {
          amountMinor: option.amountMinor,
          durationMinutes: option.durationMinutes,
        };
  return best;
}
