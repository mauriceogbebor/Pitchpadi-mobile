import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { View } from "react-native";
import { Body, Card, Press } from "@/components/ui";
import { venueAmenities } from "@/lib/amenities";
import { space, TAP } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

/** Secondary facts stay reachable without pushing the booking choices down. */
export function AmenitiesSummary({ amenities }: { amenities: string[] }) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const items = venueAmenities(amenities);
  if (!items.length) return null;
  return (
    <Card variant="flat">
      <Press
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        aria-expanded={expanded}
        accessibilityLabel={
          expanded ? "Hide venue amenities" : "Show venue amenities"
        }
        onPress={() => setExpanded(!expanded)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.md,
          minHeight: TAP,
        }}
      >
        <View style={{ flex: 1, gap: space.xs }}>
          <Body weight="semibold">At the venue</Body>
          {!expanded && (
            <Body tone="muted" size={14}>
              {items
                .slice(0, 2)
                .map((item) => item.label)
                .join(" · ")}
              {items.length > 2 ? ` · +${items.length - 2} more` : ""}
            </Body>
          )}
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.textMuted}
        />
      </Press>
      {expanded && (
        <View style={{ gap: space.md }}>
          {items.map((item) => (
            <View
              key={item.value}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.sm,
              }}
            >
              <Ionicons name={item.icon} size={18} color={colors.link} />
              <Body>{item.label}</Body>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}
