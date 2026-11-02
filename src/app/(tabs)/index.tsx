import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  listAreas,
  searchPitches,
  type PitchAvailability,
} from "@/api/generated";
import { Chip, ChipRow, TimeChip } from "@/components/chips";
import { Body, Button, Card, Heading, Notice, Skeleton } from "@/components/ui";
import {
  dateParts,
  formatNaira,
  inTimeOfDay,
  lagosToday,
  nextDates,
  TIMES_OF_DAY,
  type TimeOfDay,
} from "@/lib/format";
import { space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

const CHIPS_PER_PITCH = 6;

/** Play: open pitches across Lagos for a day, narrowed by area and time of day. */
export default function PlayScreen() {
  const colors = useColors();
  const today = lagosToday();
  const [date, setDate] = useState(today);
  const [area, setArea] = useState<string | null>(null);
  const [time, setTime] = useState<TimeOfDay>("any");

  const areas = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const response = await listAreas();
      return response.status === 200 ? response.data.areas : [];
    },
    staleTime: 60 * 60 * 1000,
  });
  const search = useQuery({
    queryKey: ["search", date, area],
    queryFn: async () => {
      const response = await searchPitches({ date, area: area ?? undefined });
      if (response.status !== 200)
        throw new Error(
          (response.data as { error?: string }).error ??
            "We could not load pitches.",
        );
      return response.data;
    },
  });

  const results = useMemo(() => {
    const list = (search.data?.results ?? []).map((result) => ({
      ...result,
      startTimes: result.startTimes.filter((start) =>
        inTimeOfDay(start.startsAt, time),
      ),
    }));
    return list.sort(
      (a, b) =>
        Number(b.startTimes.length > 0) - Number(a.startTimes.length > 0),
    );
  }, [search.data, time]);
  const open = results.filter((result) => result.startTimes.length > 0).length;
  const areaName = areas.data?.find((item) => item.slug === area)?.name;

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={search.isRefetching}
            onRefresh={() => void search.refetch()}
          />
        }
      >
        <Heading>Find a pitch</Heading>
        <Body tone="muted">
          Open 5-a-side and 7-a-side pitches across Lagos, with real prices.
        </Body>

        <ChipRow label="Day">
          {nextDates(today, 14).map((day) => {
            const parts = dateParts(day);
            const selected = day === date;
            return (
              <Chip
                key={day}
                selected={selected}
                onPress={() => setDate(day)}
                label={
                  day === today ? "Today" : `${parts.weekday} ${parts.day}`
                }
                accessibilityLabel={parts.long}
              />
            );
          })}
        </ChipRow>
        <ChipRow label="Area">
          <Chip
            label="All of Lagos"
            selected={!area}
            onPress={() => setArea(null)}
          />
          {(areas.data ?? []).map((item) => (
            <Chip
              key={item.slug}
              label={item.name}
              selected={area === item.slug}
              onPress={() => setArea(item.slug)}
            />
          ))}
        </ChipRow>
        <ChipRow label="Time">
          {TIMES_OF_DAY.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={time === item.value}
              onPress={() => setTime(item.value)}
            />
          ))}
        </ChipRow>

        {search.isPending ? (
          <Skeleton height={150} />
        ) : search.isError ? (
          <Notice
            tone="danger"
            title="We could not load pitches"
            action={
              <Button
                variant="outline"
                label="Try again"
                onPress={() => search.refetch()}
              />
            }
          >
            <Body>{search.error.message} Check your connection.</Body>
          </Notice>
        ) : (
          <>
            <Body tone="muted" accessibilityLiveRegion="polite">
              <Body weight="semibold">
                {open === 1 ? "1 pitch" : `${open} pitches`}
              </Body>{" "}
              with open times on {dateParts(date).long}
              {areaName ? ` in ${areaName}` : " across Lagos"}
            </Body>
            {results.length === 0 ? (
              <Notice
                title={`No pitches listed${areaName ? ` in ${areaName}` : ""} yet`}
              >
                <Body tone="muted">Try all of Lagos or another day.</Body>
              </Notice>
            ) : (
              results.map((result) => (
                <PitchCard key={result.pitch.id} result={result} date={date} />
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PitchCard({
  result,
  date,
}: {
  result: PitchAvailability;
  date: string;
}) {
  const colors = useColors();
  const { pitch, startTimes } = result;
  const shown = startTimes.slice(0, CHIPS_PER_PITCH);
  const more = startTimes.length - shown.length;
  const open = (start?: string) =>
    router.push({
      pathname: "/pitch/[pitchId]",
      params: { pitchId: pitch.id, date, ...(start ? { start } : {}) },
    });
  return (
    <Pressable
      onPress={() => open()}
      accessibilityRole="button"
      accessibilityLabel={`${pitch.facilityName}, ${pitch.name}. Open the pitch`}
      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
    >
      <Card>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: space.md,
          }}
        >
          <View style={{ flex: 1 }}>
            <Heading level={3}>{pitch.facilityName}</Heading>
            <Body tone="muted">
              {pitch.name}, {pitch.type}
              {pitch.amenities.includes("floodlights") ? "  ·  Floodlit" : ""}
            </Body>
          </View>
          {pitch.fromPriceMinor !== null && (
            <View style={{ alignItems: "flex-end" }}>
              <Body tone="muted" size={13}>
                from
              </Body>
              <Body weight="bold" size={18}>
                {formatNaira(pitch.fromPriceMinor)}
              </Body>
            </View>
          )}
        </View>
        <View
          style={{
            flexDirection: "row",
            gap: space.xs,
            alignItems: "flex-start",
          }}
        >
          <Ionicons
            name="location-outline"
            size={16}
            color={colors.link}
            style={{ marginTop: 3 }}
          />
          <Body style={{ flex: 1 }}>
            {pitch.areaName}: {pitch.address}
            {pitch.landmark ? `, ${pitch.landmark}` : ""}
          </Body>
        </View>
        {startTimes.length ? (
          <View style={styles.times}>
            {shown.map((start) => (
              <TimeChip
                key={start.startsAt}
                label={start.localStart}
                accessibilityLabel={`Kick off at ${start.localStart} at ${pitch.facilityName}`}
                onPress={() => open(start.startsAt)}
              />
            ))}
            {more > 0 && (
              <Body
                tone="link"
                weight="semibold"
                style={{ alignSelf: "center" }}
              >
                +{more} more
              </Body>
            )}
          </View>
        ) : (
          <Body tone="muted">No open times at this time of day.</Body>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.lg },
  times: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginTop: space.xs,
  },
});
