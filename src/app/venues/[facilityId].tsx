import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getPublicVenue, type PitchAvailability } from "@/api/generated";
import { TimeChip } from "@/components/chips";
import { DateStrip } from "@/components/date-strip";
import { PitchBand } from "@/components/pitch-band";
import {
  Body,
  Button,
  Card,
  Heading,
  Notice,
  Press,
  Section,
  Skeleton,
} from "@/components/ui";
import { venueAmenities } from "@/lib/amenities";
import { dateParts, formatNaira, lagosToday, nextDates } from "@/lib/format";
import {
  openDirections,
  placeLine,
  shareOnWhatsApp,
  venueShareText,
} from "@/lib/links";
import { radius, space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

const TIMES_PER_PITCH = 8;

/**
 * A venue's page (MK-01): where it is, what it has, and every pitch with its
 * open times on a day. Opened from a pitch page or a shared venue link
 * (…/venues/<id>), which is the same address on the website.
 */
export default function VenueProfileScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ facilityId: string; date?: string }>();
  const today = lagosToday();
  const days = useMemo(() => nextDates(today, 14), [today]);
  const [date, setDate] = useState(params.date ?? today);

  const venue = useQuery({
    queryKey: ["venueProfile", params.facilityId, date],
    queryFn: async () => {
      const response = await getPublicVenue(params.facilityId, { date });
      if (response.status === 404)
        throw new Error("This venue is not taking bookings right now.");
      if (response.status !== 200)
        throw new Error(
          (response.data as { error?: string }).error ??
            "We could not load this venue.",
        );
      return response.data;
    },
    placeholderData: (previous) => previous,
  });

  const info = venue.data?.venue;
  const pitches = venue.data?.pitches ?? [];
  const amenities = info ? venueAmenities(info.amenities) : [];
  const day = dateParts(date);
  const open = pitches.filter((p) => p.startTimes.length > 0).length;

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Stack.Screen options={{ title: info?.name ?? "Venue" }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={venue.isRefetching}
            onRefresh={() => void venue.refetch()}
          />
        }
      >
        {venue.isPending ? (
          <Skeleton height={200} count={2} />
        ) : venue.isError && !info ? (
          <Notice
            tone="danger"
            title={venue.error.message}
            action={
              <Button
                variant="outline"
                label="Find another pitch"
                onPress={() => router.navigate("/")}
              />
            }
          >
            <Body>Check your connection, or look for another venue.</Body>
          </Notice>
        ) : (
          info && (
            <>
              <PitchBand markings="centre">
                <Heading style={{ color: colors.onBand }}>{info.name}</Heading>
                <View style={styles.place}>
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={colors.accent}
                  />
                  <Body tone="onBand" style={{ flex: 1 }}>
                    {placeLine({ ...info, facilityName: info.name })}
                  </Body>
                </View>
                <Body tone="onBandMuted" size={14}>
                  {pitches.length === 1
                    ? "1 pitch"
                    : `${pitches.length} pitches`}{" "}
                  to book
                </Body>
                <View style={styles.bandActions}>
                  <Button
                    variant="outline"
                    icon="navigate-outline"
                    label="Directions"
                    onPress={() =>
                      openDirections({ ...info, facilityName: info.name })
                    }
                    accessibilityHint="Opens Google Maps"
                    textColor={colors.onBand}
                    style={[styles.onBandOutline, { flex: 1 }]}
                  />
                  <Button
                    variant="onBand"
                    icon="logo-whatsapp"
                    label="Share"
                    accessibilityLabel="Share this venue on WhatsApp"
                    onPress={() => void shareOnWhatsApp(venueShareText(info))}
                    style={{ flex: 1 }}
                  />
                </View>
              </PitchBand>

              {amenities.length > 0 && (
                <Section title="At the venue">
                  <View style={styles.wrap}>
                    {amenities.map((item) => (
                      <View
                        key={item.value}
                        style={[
                          styles.amenity,
                          { backgroundColor: colors.muted },
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={17}
                          color={colors.link}
                        />
                        <Body size={15}>{item.label}</Body>
                      </View>
                    ))}
                  </View>
                </Section>
              )}

              <Section title="Pick a day">
                <DateStrip
                  days={days}
                  value={date}
                  today={today}
                  onChange={setDate}
                />
                <Body tone="muted" accessibilityLiveRegion="polite">
                  <Body weight="semibold">
                    {open === 1 ? "1 pitch" : `${open} pitches`}
                  </Body>{" "}
                  open {date === today ? "today" : `on ${day.long}`}
                </Body>
              </Section>

              {pitches.map((result) => (
                <VenuePitch key={result.pitch.id} result={result} date={date} />
              ))}
            </>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function VenuePitch({
  result,
  date,
}: {
  result: PitchAvailability;
  date: string;
}) {
  const colors = useColors();
  const { pitch, startTimes } = result;
  const shown = startTimes.slice(0, TIMES_PER_PITCH);
  const more = startTimes.length - shown.length;
  const open = (start?: string) =>
    router.push({
      pathname: "/pitch/[pitchId]",
      params: { pitchId: pitch.id, date, ...(start ? { start } : {}) },
    });
  return (
    <Card style={{ gap: space.md }}>
      <Press
        accessibilityRole="button"
        accessibilityLabel={`${pitch.name}, ${pitch.type}. Open the pitch`}
        onPress={() => open()}
        style={styles.pitchTop}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Heading level={3}>{pitch.name}</Heading>
          <Body tone="muted">{pitch.type}</Body>
        </View>
        {pitch.fromPriceMinor !== null && (
          <View style={{ alignItems: "flex-end" }}>
            <Body tone="muted" size={13}>
              from
            </Body>
            <Body weight="bold" size={19} numeric>
              {formatNaira(pitch.fromPriceMinor)}
            </Body>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Press>
      {startTimes.length ? (
        <View style={styles.wrap}>
          {shown.map((start) => (
            <TimeChip
              key={start.startsAt}
              label={start.localStart}
              accessibilityLabel={`Kick off at ${start.localStart} on ${pitch.name}`}
              onPress={() => open(start.startsAt)}
            />
          ))}
          {more > 0 && (
            <Press
              accessibilityRole="button"
              accessibilityLabel={`${more} more times on ${pitch.name}`}
              onPress={() => open()}
              style={[styles.more, { borderColor: colors.border }]}
            >
              <Body tone="link" weight="semibold">
                +{more} more
              </Body>
            </Press>
          )}
        </View>
      ) : (
        <Body tone="muted">No open times on this day.</Body>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.xl },
  place: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  bandActions: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  onBandOutline: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.35)",
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  amenity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  pitchTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  more: {
    minHeight: 48,
    minWidth: 92,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.md,
  },
});
