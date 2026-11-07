import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getPublicPitch,
  type SlotOption,
  type StartTime,
} from "@/api/generated";
import { ActionBar } from "@/components/action-bar";
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
import { AmenitiesSummary } from "@/components/amenities-summary";
import { VenuePhoto } from "@/components/venue-photo";
import {
  addDays,
  dateParts,
  formatDuration,
  formatNaira,
  lagosToday,
  nextDates,
} from "@/lib/format";
import { useHoldSlot } from "@/lib/use-hold";
import { openDirections, placeLine } from "@/lib/links";
import { radius, space, TAP } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

type ErrorBody = { error?: string };

/** One pitch: what the venue has, where it is, and its open times for a day. */
export default function PitchScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{
    pitchId: string;
    date?: string;
    start?: string;
    duration?: string;
  }>();
  const today = lagosToday();
  const [date, setDate] = useState(params.date ?? today);
  const [start, setStart] = useState<string | null>(params.start ?? null);
  const [duration, setDuration] = useState<number | null>(
    ["60", "90", "120"].includes(params.duration ?? "")
      ? Number(params.duration)
      : null,
  );

  const pitch = useQuery({
    queryKey: ["pitch", params.pitchId, date],
    queryFn: async () => {
      const response = await getPublicPitch(params.pitchId, { date });
      if (response.status === 404)
        throw new Error("This pitch is not taking bookings right now.");
      if (response.status !== 200)
        throw new Error(
          (response.data as ErrorBody).error ?? "We could not load this pitch.",
        );
      return response.data;
    },
  });

  const chosen: StartTime | undefined = pitch.data?.startTimes.find(
    (item) => item.startsAt === start,
  );
  const option: SlotOption | undefined =
    duration === null
      ? chosen?.options[0]
      : chosen?.options.find((item) => item.durationMinutes === duration);
  const matchingTimes = (pitch.data?.startTimes ?? []).filter(
    (item) =>
      duration === null ||
      item.options.some((offer) => offer.durationMinutes === duration),
  );

  // A chosen time that is no longer open (just taken) simply drops out: `chosen`
  // is then undefined and the hold bar hides.

  const days = useMemo(() => nextDates(today, 14), [today]);
  const info = pitch.data?.pitch;
  const cover = pitch.data?.photos[0] ?? null;

  const slot = useHoldSlot(() => void pitch.refetch());
  const holding = slot.holding;
  const error = slot.error;
  const setError = slot.setError;
  function hold() {
    if (!chosen || !option || !info) return;
    void slot.hold({
      pitchId: info.id,
      startsAt: chosen.startsAt,
      durationMinutes: option.durationMinutes,
    });
  }

  const day = dateParts(date);
  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Stack.Screen options={{ title: info?.facilityName ?? "Pitch" }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={pitch.isRefetching}
            onRefresh={() => void pitch.refetch()}
          />
        }
      >
        {pitch.isPending ? (
          <>
            <Skeleton height={190} count={1} />
            <Skeleton height={76} count={2} />
          </>
        ) : pitch.isError ? (
          <Notice
            tone="danger"
            title="We could not load this pitch"
            action={
              <Button
                variant="outline"
                label="Try again"
                onPress={() => void pitch.refetch()}
              />
            }
          >
            <Body>{pitch.error.message}</Body>
          </Notice>
        ) : (
          info && (
            <>
              <PitchBand markings="box">
                <Heading style={{ color: colors.onBand }}>
                  {info.facilityName}
                </Heading>
                <Body tone="onBandMuted" size={17}>
                  {info.name}, {info.type}
                </Body>
                <View style={styles.place}>
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={colors.accent}
                  />
                  <Body tone="onBand" style={{ flex: 1 }}>
                    {placeLine(info)}
                  </Body>
                </View>
                <View style={styles.bandActions}>
                  <Button
                    variant="outline"
                    icon="navigate-outline"
                    label="Directions"
                    onPress={() => openDirections(info)}
                    accessibilityHint="Opens Google Maps"
                    textColor={colors.onBand}
                    style={[styles.onBandOutline, { flex: 1 }]}
                  />
                  <Button
                    variant="outline"
                    icon="business-outline"
                    label="Venue"
                    accessibilityLabel={`All pitches at ${info.facilityName}`}
                    onPress={() =>
                      router.push({
                        pathname: "/venues/[facilityId]",
                        params: { facilityId: info.facilityId, date },
                      })
                    }
                    textColor={colors.onBand}
                    style={[styles.onBandOutline, { flex: 1 }]}
                  />
                </View>
              </PitchBand>
              {cover ? (
                <VenuePhoto
                  photo={cover}
                  size="large"
                  style={{
                    width: "100%",
                    aspectRatio: 16 / 9,
                    borderRadius: radius.lg,
                  }}
                />
              ) : null}

              <Section title="Pick a time">
                <DateStrip
                  days={days}
                  value={date}
                  today={today}
                  onChange={(next) => {
                    setDate(next);
                    setStart(null);
                    setError(null);
                  }}
                />
                <Body tone="muted">
                  Kick-off on {day.long}
                  {duration !== null ? `, ${formatDuration(duration)}` : ""}
                </Body>
                {matchingTimes.length === 0 ? (
                  <Notice
                    title={
                      pitch.data.startTimes.length
                        ? "No open times for this game length"
                        : "No open times on this day"
                    }
                    action={
                      <Button
                        variant="outline"
                        label={
                          pitch.data.startTimes.length
                            ? "See all game lengths"
                            : "Try the next day"
                        }
                        onPress={() =>
                          pitch.data.startTimes.length
                            ? setDuration(null)
                            : setDate(addDays(date, 1))
                        }
                      />
                    }
                  />
                ) : (
                  <View style={styles.wrap}>
                    {matchingTimes.map((item) => (
                      <TimeChip
                        key={item.startsAt}
                        label={item.localStart}
                        selected={item.startsAt === start}
                        accessibilityLabel={`Kick off at ${item.localStart}`}
                        onPress={() => {
                          setStart(item.startsAt);
                          setError(null);
                        }}
                      />
                    ))}
                  </View>
                )}
              </Section>

              {chosen && (
                <Section title="How long?">
                  <View style={{ gap: space.sm }}>
                    {!option && (
                      <Body tone="muted">
                        Your selected length is not available at this time.
                        Choose another length or time.
                      </Body>
                    )}
                    {chosen.options.map((item) => {
                      const selected =
                        item.durationMinutes === option?.durationMinutes;
                      return (
                        <Press
                          key={item.durationMinutes}
                          scaleTo={0.985}
                          accessibilityRole="radio"
                          accessibilityLabel={`${formatDuration(item.durationMinutes)}, ${formatNaira(item.amountMinor)}, ${chosen.localStart} to ${item.localEnd}${item.endsNextDay ? " next day" : ""}`}
                          accessibilityState={{ checked: selected }}
                          aria-checked={selected}
                          onPress={() => setDuration(item.durationMinutes)}
                          style={[
                            styles.option,
                            {
                              borderColor: selected
                                ? colors.borderStrong
                                : colors.border,
                              backgroundColor: colors.card,
                              borderWidth: selected ? 2 : 1,
                              paddingHorizontal: selected
                                ? space.md - 1
                                : space.md,
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              selected ? "radio-button-on" : "radio-button-off"
                            }
                            size={22}
                            color={selected ? colors.link : colors.textMuted}
                          />
                          <View style={{ flex: 1 }}>
                            <Body weight="semibold">
                              {formatDuration(item.durationMinutes)}
                            </Body>
                            <Body tone="muted" numeric>
                              {chosen.localStart} to {item.localEnd}
                              {item.endsNextDay ? " (next day)" : ""}
                            </Body>
                          </View>
                          <Body weight="bold" size={17} numeric>
                            {formatNaira(item.amountMinor)}
                          </Body>
                        </Press>
                      );
                    })}
                  </View>
                </Section>
              )}

              <AmenitiesSummary amenities={info.amenities} />

              {info.cancellationPolicy && (
                <Card variant="flat">
                  <View style={styles.place}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={colors.link}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Body weight="semibold">
                        If plans change: {info.cancellationPolicy.label}
                      </Body>
                      <Body tone="muted">
                        {info.cancellationPolicy.summary}
                      </Body>
                    </View>
                  </View>
                </Card>
              )}
            </>
          )
        )}
      </ScrollView>

      {chosen && option && (
        <ActionBar>
          {error ? (
            <Body tone="danger" accessibilityLiveRegion="assertive">
              {error}
            </Body>
          ) : (
            <View style={styles.summary}>
              <Body weight="semibold" numeric style={{ flex: 1 }}>
                {day.weekday} {day.day} {day.month}, {chosen.localStart} to{" "}
                {option.localEnd}
              </Body>
              <Body weight="bold" numeric>
                {formatNaira(option.amountMinor)}
              </Body>
            </View>
          )}
          {!error && option.amountDueMinor !== option.amountMinor ? (
            <Body tone="muted" numeric>
              Pay {formatNaira(option.amountDueMinor)} now
            </Body>
          ) : null}
          <Button
            label={`Hold ${chosen.localStart}`}
            icon="lock-closed-outline"
            onPress={hold}
            busy={holding}
            accessibilityHint="Keeps this time for you while you pay"
          />
        </ActionBar>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.xl },
  place: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  onBandOutline: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.35)",
  },
  bandActions: { flexDirection: "row", gap: space.sm, marginTop: space.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: TAP + 16,
    borderRadius: radius.md,
    paddingVertical: space.sm,
  },
  summary: { flexDirection: "row", alignItems: "center", gap: space.md },
});
