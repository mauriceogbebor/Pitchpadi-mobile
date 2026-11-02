import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  listAreas,
  searchPitches,
  type PitchAvailability,
} from "@/api/generated";
import { Chip, TimeChip } from "@/components/chips";
import { DateBlock } from "@/components/date-block";
import { DateStrip } from "@/components/date-strip";
import { PitchBand } from "@/components/pitch-band";
import { Segmented } from "@/components/segmented";
import {
  Body,
  Button,
  Card,
  Heading,
  Notice,
  Press,
  Skeleton,
} from "@/components/ui";
import {
  addDays,
  dateParts,
  formatInstantTime,
  formatNaira,
  inTimeOfDay,
  lagosToday,
  nextDates,
  TIMES_OF_DAY,
  type TimeOfDay,
} from "@/lib/format";
import { useMyBookings } from "@/lib/my-bookings";
import { radius, space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

const TIMES_PER_PITCH = 6;
const TIME_OPTIONS = TIMES_OF_DAY.map((item) => ({
  value: item.value,
  label: item.value === "any" ? "Any time" : item.label,
}));

/** Play: open pitches across Lagos for a day, narrowed by area and time of day. */
export default function PlayScreen() {
  const colors = useColors();
  const reduce = useReducedMotion();
  const today = lagosToday();
  const days = useMemo(() => nextDates(today, 14), [today]);
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
  const day = dateParts(date);

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
        <PitchBand>
          <Heading style={{ color: colors.onBand }}>Find a pitch</Heading>
          <Body tone="onBandMuted">
            Open 5-a-side and 7-a-side pitches across Lagos, with real prices.
          </Body>
          <View style={{ marginTop: space.md }}>
            <DateStrip
              days={days}
              value={date}
              today={today}
              onChange={setDate}
              onBand
            />
          </View>
        </PitchBand>

        <NextGame />

        <View style={{ gap: space.md }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.sm }}
            accessibilityLabel="Area"
          >
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
          </ScrollView>
          <Segmented
            label="Time of day"
            options={TIME_OPTIONS}
            value={time}
            onChange={setTime}
          />
        </View>

        {search.isPending ? (
          <Skeleton height={176} count={3} />
        ) : search.isError ? (
          <Notice
            tone="danger"
            title="We could not load pitches"
            action={
              <Button
                variant="outline"
                label="Try again"
                onPress={() => void search.refetch()}
              />
            }
          >
            <Body>{search.error.message} Check your connection.</Body>
          </Notice>
        ) : (
          <Animated.View
            key={`${date}:${area}:${time}`}
            entering={reduce ? undefined : FadeIn.duration(180)}
            style={{ gap: space.md }}
          >
            <Body tone="muted" accessibilityLiveRegion="polite">
              <Body weight="semibold">
                {open === 1 ? "1 pitch" : `${open} pitches`}
              </Body>{" "}
              open{" "}
              {date === today
                ? "today"
                : `on ${day.weekday} ${day.day} ${day.month}`}
              {areaName ? ` in ${areaName}` : " across Lagos"}
            </Body>
            {results.length === 0 ? (
              <Notice
                title={`No pitches listed${areaName ? ` in ${areaName}` : ""} yet`}
                action={
                  area ? (
                    <Button
                      variant="outline"
                      label="Show all of Lagos"
                      onPress={() => setArea(null)}
                    />
                  ) : undefined
                }
              >
                <Body tone="muted">Try another day or area.</Body>
              </Notice>
            ) : (
              <>
                {open === 0 ? (
                  <Card variant="flat" style={{ gap: space.md }}>
                    <Body>
                      {date === today
                        ? "Nothing is open for the rest of today"
                        : "Nothing is open on this day"}
                      {time !== "any" ? " at this time of day" : ""}. The next
                      day may have room.
                    </Body>
                    <Button
                      variant="outline"
                      icon="calendar-outline"
                      label={`See ${date === today ? "tomorrow" : "the next day"}`}
                      onPress={() => setDate(addDays(date, 1))}
                    />
                  </Card>
                ) : null}
                {results.map((result) => (
                  <PitchCard
                    key={result.pitch.id}
                    result={result}
                    date={date}
                  />
                ))}
              </>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** The player's next game, or a checkout they have not finished: one tap back. */
function NextGame() {
  const colors = useColors();
  const bookings = useMyBookings();
  const unfinished = bookings.data?.inProgress[0];
  const next = bookings.data?.upcoming[0];
  if (!unfinished && !next) return null;
  const today = lagosToday();
  const label = (date: string) =>
    date === today
      ? "Today"
      : date === addDays(today, 1)
        ? "Tomorrow"
        : `${dateParts(date).weekday} ${dateParts(date).day} ${dateParts(date).month}`;

  if (unfinished)
    return (
      <Press
        accessibilityRole="button"
        accessibilityLabel={`Finish paying for ${unfinished.pitch.facilityName}, ${label(unfinished.localDate)} at ${unfinished.localStart}`}
        onPress={() =>
          router.push({
            pathname: "/checkout/[holdId]",
            params: { holdId: unfinished.id },
          })
        }
      >
        <Card style={[styles.shortcut, { borderColor: colors.borderStrong }]}>
          <Ionicons name="time-outline" size={26} color={colors.link} />
          <View style={{ flex: 1 }}>
            <Body weight="semibold">Finish paying</Body>
            <Body tone="muted" numeric>
              {unfinished.pitch.facilityName}, {label(unfinished.localDate)} at{" "}
              {unfinished.localStart}
              {unfinished.expiresAt
                ? `. Held until ${formatInstantTime(unfinished.expiresAt)}`
                : ""}
            </Body>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Card>
      </Press>
    );

  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={`Your next game: ${next!.pitch.facilityName}, ${label(next!.localDate)} at ${next!.localStart}. Open booking`}
      onPress={() =>
        router.push({
          pathname: "/booking/[reference]",
          params: { reference: next!.reference },
        })
      }
    >
      <Card style={styles.shortcut}>
        <DateBlock date={next!.localDate} strong />
        <View style={{ flex: 1 }}>
          <Body tone="muted" size={14}>
            Your next game
          </Body>
          <Body weight="semibold" numeric>
            {["Today", "Tomorrow"].includes(label(next!.localDate))
              ? `${label(next!.localDate)}, ${next!.localStart}`
              : next!.localStart}
          </Body>
          <Body tone="muted" numberOfLines={1}>
            {next!.pitch.facilityName}
          </Body>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Card>
    </Press>
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
  const shown = startTimes.slice(0, TIMES_PER_PITCH);
  const more = startTimes.length - shown.length;
  const floodlit = pitch.amenities.includes("floodlights");
  const open = (start?: string) =>
    router.push({
      pathname: "/pitch/[pitchId]",
      params: { pitchId: pitch.id, date, ...(start ? { start } : {}) },
    });
  return (
    <Press
      onPress={() => open()}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${pitch.facilityName}, ${pitch.name}. Open the pitch`}
    >
      <Card style={{ gap: space.md }}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1, gap: 2 }}>
            <Heading level={3}>{pitch.facilityName}</Heading>
            <Body tone="muted">
              {pitch.name}, {pitch.type}
            </Body>
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
        </View>
        <View style={styles.meta}>
          <Ionicons name="location-outline" size={16} color={colors.link} />
          <Body size={15} style={{ flex: 1 }} numberOfLines={2}>
            {pitch.areaName}, {pitch.address}
            {pitch.landmark ? `, ${pitch.landmark}` : ""}
          </Body>
        </View>
        {floodlit && (
          <View style={[styles.badge, { backgroundColor: colors.muted }]}>
            <Ionicons name="bulb-outline" size={14} color={colors.link} />
            <Body size={13} weight="semibold">
              Floodlit
            </Body>
          </View>
        )}
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
              <Press
                accessibilityRole="button"
                accessibilityLabel={`${more} more times at ${pitch.facilityName}`}
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
          <Body tone="muted">No open times at this time of day.</Body>
        )}
      </Card>
    </Press>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.xl },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.md,
  },
  meta: { flexDirection: "row", gap: space.xs, alignItems: "flex-start" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 3,
    marginTop: -space.xs,
  },
  times: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
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
  shortcut: { flexDirection: "row", alignItems: "center", gap: space.md },
});
