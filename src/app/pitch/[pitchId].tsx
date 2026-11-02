import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createHold,
  getPublicPitch,
  type SlotOption,
  type StartTime,
} from "@/api/generated";
import { Chip, ChipRow, TimeChip } from "@/components/chips";
import { Body, Button, Card, Heading, Notice, Skeleton } from "@/components/ui";
import { venueAmenities } from "@/lib/amenities";
import {
  dateParts,
  formatDuration,
  formatNaira,
  lagosToday,
  nextDates,
} from "@/lib/format";
import { newIdempotencyKey } from "@/lib/ids";
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
  }>();
  const today = lagosToday();
  const [date, setDate] = useState(params.date ?? today);
  const [start, setStart] = useState<string | null>(params.start ?? null);
  const [duration, setDuration] = useState<number | null>(null);
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One key per chosen time and length, so retrying after a dropped connection
  // returns the same hold instead of trying to book twice.
  const keys = useRef(new Map<string, string>());

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
    chosen?.options.find((item) => item.durationMinutes === duration) ??
    chosen?.options[0];

  // A chosen time that is no longer open (just taken) simply drops out: `chosen`
  // is then undefined and the hold bar hides.

  const days = useMemo(() => nextDates(today, 14), [today]);
  const info = pitch.data?.pitch;
  const amenities = info ? venueAmenities(info.amenities) : [];

  async function hold() {
    if (!chosen || !option || !info) return;
    const id = `${chosen.startsAt}:${option.durationMinutes}`;
    const key = keys.current.get(id) ?? newIdempotencyKey();
    keys.current.set(id, key);
    setHolding(true);
    setError(null);
    try {
      const response = await createHold(
        {
          pitchId: info.id,
          startsAt: chosen.startsAt,
          durationMinutes: option.durationMinutes as 60 | 90 | 120,
        },
        { headers: { "idempotency-key": key } },
      );
      if (response.status === 200 || response.status === 201) {
        router.push({
          pathname: "/checkout/[holdId]",
          params: { holdId: response.data.hold.id },
        });
        return;
      }
      keys.current.delete(id);
      setError(
        (response.data as ErrorBody).error ??
          "We could not hold this time. Try again.",
      );
      if (response.status === 409) void pitch.refetch();
    } catch {
      // Keep the key: the hold may have been made before the connection dropped.
      setError(
        "We could not reach PitchPadi. Check your connection and try again.",
      );
    } finally {
      setHolding(false);
    }
  }

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
          <Skeleton height={140} />
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
              <View style={{ gap: space.xs }}>
                <Heading>{info.facilityName}</Heading>
                <Body tone="muted" size={17}>
                  {info.name}, {info.type}
                </Body>
              </View>

              <Card>
                <View style={styles.row}>
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={colors.link}
                  />
                  <Body style={{ flex: 1 }}>{placeLine(info)}</Body>
                </View>
                <Button
                  variant="outline"
                  label="Get directions"
                  onPress={() => openDirections(info)}
                  accessibilityHint="Opens Google Maps"
                />
              </Card>

              {amenities.length > 0 && (
                <View style={{ gap: space.sm }}>
                  <Heading level={2}>At the venue</Heading>
                  <View style={styles.amenities}>
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
                          size={18}
                          color={colors.link}
                        />
                        <Body>{item.label}</Body>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <Heading level={2}>Pick a time</Heading>
              <ChipRow label="Day">
                {days.map((day) => {
                  const parts = dateParts(day);
                  return (
                    <Chip
                      key={day}
                      selected={day === date}
                      onPress={() => {
                        setDate(day);
                        setStart(null);
                        setError(null);
                      }}
                      label={
                        day === today
                          ? "Today"
                          : `${parts.weekday} ${parts.day}`
                      }
                      accessibilityLabel={parts.long}
                    />
                  );
                })}
              </ChipRow>

              <View style={{ gap: space.sm }}>
                <Body weight="semibold">
                  Kick-off on {dateParts(date).long}
                </Body>
                {pitch.data.startTimes.length === 0 ? (
                  <Notice title="No open times on this day">
                    <Body tone="muted">Try another day.</Body>
                  </Notice>
                ) : (
                  <View style={styles.times}>
                    {pitch.data.startTimes.map((item) => (
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
              </View>

              {chosen && (
                <View style={{ gap: space.sm }}>
                  <Body weight="semibold">How long?</Body>
                  {chosen.options.map((item) => {
                    const selected =
                      item.durationMinutes === option?.durationMinutes;
                    return (
                      <Pressable
                        key={item.durationMinutes}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        onPress={() => setDuration(item.durationMinutes)}
                        style={[
                          styles.option,
                          {
                            borderColor: selected
                              ? colors.primary
                              : colors.border,
                            backgroundColor: colors.card,
                            borderWidth: selected ? 2 : 1,
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
                          <Body tone="muted">
                            {chosen.localStart} to {item.localEnd}
                            {item.endsNextDay ? " (next day)" : ""}
                          </Body>
                        </View>
                        <Body weight="bold" size={17}>
                          {formatNaira(item.amountMinor)}
                        </Body>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {info.cancellationPolicy && (
                <View style={{ gap: space.xs }}>
                  <Body weight="semibold">If plans change</Body>
                  <Body tone="muted">
                    {info.cancellationPolicy.label}.{" "}
                    {info.cancellationPolicy.summary}
                  </Body>
                </View>
              )}
            </>
          )
        )}
      </ScrollView>

      {chosen && option && (
        <View
          style={[
            styles.bar,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          {error ? (
            <Body tone="danger" accessibilityLiveRegion="assertive">
              {error}
            </Body>
          ) : (
            <Body tone="muted">
              {dateParts(date).long}, {chosen.localStart} to {option.localEnd}
              {option.amountDueMinor !== option.amountMinor
                ? `. Pay ${formatNaira(option.amountDueMinor)} now`
                : ""}
            </Body>
          )}
          <Button
            label={`Hold ${chosen.localStart} for ${formatNaira(option.amountMinor)}`}
            onPress={hold}
            busy={holding}
            accessibilityHint="Keeps this time for you while you pay"
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.lg },
  row: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  amenities: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  amenity: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
  },
  times: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: TAP + 16,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  bar: {
    borderTopWidth: 1,
    padding: space.lg,
    gap: space.sm,
  },
});
