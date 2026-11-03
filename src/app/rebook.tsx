import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { getWeeklyAvailability, type WeeklyOption } from "@/api/generated";
import { DateBlock } from "@/components/date-block";
import { PitchBand } from "@/components/pitch-band";
import {
  Body,
  Button,
  Card,
  Heading,
  Notice,
  Section,
  Skeleton,
} from "@/components/ui";
import {
  addDays,
  dateParts,
  formatDuration,
  formatNaira,
  lagosToday,
} from "@/lib/format";
import { useHoldSlot } from "@/lib/use-hold";
import { space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

const WEEKDAYS = [
  "Sundays",
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
];

/**
 * Book again (RB-01): the same pitch, weekday, kick-off and length over the
 * next weeks, each open or taken, with today's price. One tap holds a week
 * and opens checkout. For regular games, where most of PitchPadi's repeat
 * bookings come from.
 */
export default function RebookScreen() {
  const colors = useColors();
  const reduce = useReducedMotion();
  const params = useLocalSearchParams<{
    pitchId: string;
    startsAt: string;
    duration: string;
  }>();
  const duration = Number(params.duration);

  const weekly = useQuery({
    queryKey: ["weekly", params.pitchId, params.startsAt, duration],
    queryFn: async () => {
      const response = await getWeeklyAvailability(params.pitchId, {
        startsAt: params.startsAt,
        duration: duration as 60 | 90 | 120,
        weeks: 4,
      });
      if (response.status === 404)
        throw new Error("This pitch is not taking bookings right now.");
      if (response.status !== 200)
        throw new Error("We could not load the coming weeks.");
      return response.data;
    },
  });
  const slot = useHoldSlot(() => void weekly.refetch());
  const data = weekly.data;
  const open = data?.options.filter((option) => option.slot).length ?? 0;

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <Stack.Screen options={{ title: "Book again" }} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={weekly.isRefetching}
            onRefresh={() => void weekly.refetch()}
          />
        }
      >
        {weekly.isPending ? (
          <Skeleton height={140} count={3} />
        ) : weekly.isError ? (
          <Notice
            tone="danger"
            title={weekly.error.message}
            action={
              <Button
                variant="outline"
                label="Find another pitch"
                onPress={() => router.navigate("/")}
              />
            }
          >
            <Body>Check your connection, or look for another pitch.</Body>
          </Notice>
        ) : (
          data && (
            <>
              <PitchBand markings="centre">
                <Heading style={{ color: colors.onBand }}>
                  Same time again?
                </Heading>
                <Body tone="onBand" weight="semibold" size={17}>
                  {data.pitch.facilityName}, {data.pitch.name}
                </Body>
                <Body tone="onBandMuted" numeric>
                  {WEEKDAYS[data.weekday]} at {data.localStart},{" "}
                  {formatDuration(data.durationMinutes)}
                </Body>
              </PitchBand>

              <Section
                title={
                  open
                    ? `Open in the next ${data.options.length} weeks`
                    : "Taken for the next few weeks"
                }
              >
                <Animated.View
                  entering={reduce ? undefined : FadeIn.duration(180)}
                  style={{ gap: space.sm }}
                >
                  {data.options.map((option) => (
                    <WeekRow
                      key={option.date}
                      option={option}
                      busy={
                        !!option.slot &&
                        slot.isHolding({
                          pitchId: data.pitch.id,
                          startsAt: option.slot.startsAt,
                          durationMinutes: data.durationMinutes,
                        })
                      }
                      disabled={slot.holding}
                      onHold={() =>
                        option.slot &&
                        void slot.hold({
                          pitchId: data.pitch.id,
                          startsAt: option.slot.startsAt,
                          durationMinutes: data.durationMinutes,
                        })
                      }
                    />
                  ))}
                </Animated.View>
                {slot.error ? (
                  <Body tone="danger" accessibilityLiveRegion="assertive">
                    {slot.error}
                  </Body>
                ) : null}
              </Section>

              <Button
                variant="outline"
                icon="calendar-outline"
                label={open ? "Pick another time" : "See other times"}
                onPress={() =>
                  router.push({
                    pathname: "/pitch/[pitchId]",
                    params: {
                      pitchId: data.pitch.id,
                      date: data.options[0]?.date ?? lagosToday(),
                    },
                  })
                }
              />
            </>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function WeekRow({
  option,
  busy,
  disabled,
  onHold,
}: {
  option: WeeklyOption;
  busy: boolean;
  disabled: boolean;
  onHold: () => void;
}) {
  const colors = useColors();
  const today = lagosToday();
  const day = dateParts(option.date);
  const when =
    option.date === today
      ? "Today"
      : option.date === addDays(today, 1)
        ? "Tomorrow"
        : `${day.weekday} ${day.day} ${day.month}`;
  return (
    <Card style={[styles.row, !option.slot && { opacity: 0.75 }]}>
      <DateBlock
        date={option.date}
        strong={!!option.slot}
        faded={!option.slot}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Body weight="semibold" numeric>
          {when}
        </Body>
        {option.slot ? (
          <Body tone="muted" size={14} numeric>
            Open, {formatNaira(option.slot.amountDueMinor)}
          </Body>
        ) : (
          <View style={styles.taken}>
            <Ionicons
              name="close-circle-outline"
              size={15}
              color={colors.textMuted}
            />
            <Body tone="muted" size={14}>
              Taken or closed
            </Body>
          </View>
        )}
      </View>
      {option.slot ? (
        <Button
          label="Hold"
          icon="lock-closed-outline"
          accessibilityLabel={`Hold ${when} at ${option.slot.localStart}, ${formatNaira(option.slot.amountDueMinor)}`}
          onPress={onHold}
          busy={busy}
          disabled={disabled}
          style={styles.hold}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.xl },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  taken: { flexDirection: "row", alignItems: "center", gap: 4 },
  hold: { paddingHorizontal: space.lg },
});
