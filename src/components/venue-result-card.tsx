import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { PitchAvailability } from "@/api/generated";
import { TimeChip } from "@/components/chips";
import { OfferPrice } from "@/components/offer-price";
import { Body, Button, Card, Heading, Press } from "@/components/ui";
import { formatDistance } from "@/lib/geo";
import { formatDuration } from "@/lib/format";
import { radius, space, TAP } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

/** One venue in the search order, with every matching pitch the API sent for it (R9). */
export function VenueResultCard({
  results,
  date,
  duration,
  disabled = false,
}: {
  results: PitchAvailability[];
  date: string;
  duration: number;
  disabled?: boolean;
}) {
  const colors = useColors();
  const [pitchId, setPitchId] = useState<string | null>(null);
  const result =
    results.find((item) => item.pitch.id === pitchId) ?? results[0];
  const { pitch, startTimes, distanceKm } = result;
  const shown = startTimes.slice(0, 3);
  const open = (start?: string) =>
    router.push({
      pathname: "/pitch/[pitchId]",
      params: {
        pitchId: pitch.id,
        date,
        duration: String(duration),
        ...(start ? { start } : {}),
      },
    });
  return (
    <Card style={{ gap: space.md }}>
      <Press
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`View venue ${pitch.facilityName}`}
        onPress={() =>
          router.push({
            pathname: "/venues/[facilityId]",
            params: { facilityId: pitch.facilityId, date },
          })
        }
        style={styles.heading}
      >
        <Heading level={3} style={{ flex: 1 }}>
          {pitch.facilityName}
        </Heading>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Press>
      <View style={styles.place}>
        <Ionicons name="location-outline" size={16} color={colors.link} />
        <Body tone="muted" size={14} style={{ flex: 1 }}>
          {pitch.areaName}
          {distanceKm !== null ? `, ${formatDistance(distanceKm)}` : ""}
          {pitch.amenities.includes("floodlights") ? ", Floodlit" : ""}
        </Body>
      </View>
      {results.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm }}
          accessibilityRole="radiogroup"
          accessibilityLabel={`Pitches at ${pitch.facilityName}`}
        >
          {results.map((item) => {
            const selected = item.pitch.id === pitch.id;
            return (
              <Press
                key={item.pitch.id}
                disabled={disabled}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected, disabled }}
                aria-checked={selected}
                aria-disabled={disabled}
                accessibilityLabel={`${item.pitch.name}, ${item.pitch.type} at ${pitch.facilityName}`}
                onPress={() => setPitchId(item.pitch.id)}
                style={[
                  styles.pitch,
                  {
                    borderColor: selected ? colors.borderStrong : colors.border,
                    backgroundColor: selected ? colors.muted : colors.card,
                  },
                ]}
              >
                <Body weight="semibold" size={15}>
                  {item.pitch.name}
                </Body>
                <Body tone="muted" size={13}>
                  {item.pitch.type}
                </Body>
              </Press>
            );
          })}
        </ScrollView>
      )}
      <View style={styles.offer}>
        <View style={{ flex: 1, gap: 2 }}>
          {results.length === 1 && <Body weight="semibold">{pitch.name}</Body>}
          <Body tone="muted" size={14}>
            {results.length === 1 ? `${pitch.type}, ` : ""}
            {formatDuration(duration)} game
          </Body>
        </View>
        <OfferPrice startTimes={startTimes} compact />
      </View>
      {shown.length ? (
        <View style={styles.times}>
          {shown.map((start) => (
            <TimeChip
              key={start.startsAt}
              label={start.localStart}
              disabled={disabled}
              accessibilityLabel={`${start.localStart}, ${formatDuration(duration)} on ${pitch.name} at ${pitch.facilityName}`}
              onPress={() => open(start.startsAt)}
            />
          ))}
        </View>
      ) : (
        <Body tone="muted">No matching times for this pitch.</Body>
      )}
      <Button
        variant="ghost"
        label={
          startTimes.length > shown.length
            ? `All ${startTimes.length} times on ${pitch.name}`
            : `View ${pitch.name}`
        }
        icon="arrow-forward"
        disabled={disabled}
        onPress={() => open()}
      />
    </Card>
  );
}
const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: TAP,
  },
  place: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginTop: -space.sm,
  },
  pitch: {
    minHeight: TAP,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    justifyContent: "center",
  },
  offer: { flexDirection: "row", alignItems: "center", gap: space.sm },
  times: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
