import { View } from "react-native";
import type { StartTime } from "@/api/generated";
import { Body } from "@/components/ui";
import { formatDuration, formatNaira } from "@/lib/format";
import { lowestOffer } from "@/lib/lowest-offer";

/**
 * A card's price: the cheapest length among the times shown, and how long
 * that game is ("from ₦25,000, 1 hour"). Nothing when no time is open, so a
 * card never advertises a price the player cannot book (R6-F1, R7).
 */
export function OfferPrice({ startTimes }: { startTimes: StartTime[] }) {
  const offer = lowestOffer(startTimes);
  if (!offer) return null;
  return (
    <View
      style={{ alignItems: "flex-end" }}
      accessible
      accessibilityLabel={`From ${formatNaira(offer.amountMinor)} for ${formatDuration(offer.durationMinutes)}`}
    >
      <Body tone="muted" size={13}>
        from
      </Body>
      <Body weight="bold" size={19} numeric>
        {formatNaira(offer.amountMinor)}
      </Body>
      <Body tone="muted" size={13}>
        {formatDuration(offer.durationMinutes)}
      </Body>
    </View>
  );
}
