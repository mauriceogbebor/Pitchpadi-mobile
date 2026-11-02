import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { CalendarEntry } from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { Chip, ChipRow } from "@/components/chips";
import {
  Body,
  Button,
  Card,
  Heading,
  Notice,
  Screen,
  Skeleton,
} from "@/components/ui";
import {
  addDays,
  dateParts,
  formatDuration,
  formatInstantTime,
  formatNaira,
  lagosToday,
} from "@/lib/format";
import { StatusPill } from "@/components/status-pill";
import { CHANNEL_NOTE, entryStatus, useVenueCalendar } from "@/lib/venue";
import { radius, space, TAP } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

/** Venue mode: one day of bookings for the venue you run, and adding bookings. */
export default function VenueScreen() {
  const auth = useAuth();
  const colors = useColors();
  const today = lagosToday();
  const [date, setDate] = useState(today);
  const venues = auth.status === "signedIn" ? auth.me.organizations : [];
  const [venueId, setVenueId] = useState<string | null>(null);
  const venue = venues.find((item) => item.id === venueId) ?? venues[0];
  const calendar = useVenueCalendar(venue?.id, date);

  // Fresh whenever the tab is opened (for example after adding a booking).
  const { refetch } = calendar;
  useFocusEffect(
    useCallback(() => {
      if (venue) void refetch();
    }, [venue, refetch]),
  );

  if (auth.status === "loading")
    return (
      <Screen>
        <Skeleton height={120} />
      </Screen>
    );
  if (auth.status === "signedOut")
    return (
      <Screen>
        <Heading>Your venue</Heading>
        <Body tone="muted">Sign in to see your venue&apos;s bookings.</Body>
        <Button label="Sign in" onPress={() => router.push("/sign-in")} />
      </Screen>
    );
  if (auth.status === "offline")
    return (
      <Screen>
        <Heading>Your venue</Heading>
        <Notice
          tone="danger"
          title="We could not reach PitchPadi"
          action={
            <Button
              variant="outline"
              label="Try again"
              onPress={() => void auth.refresh()}
            />
          }
        >
          <Body>Check your connection.</Body>
        </Notice>
      </Screen>
    );
  if (!venue)
    return (
      <Screen>
        <Heading>Your venue</Heading>
        <Notice title="No venue on this account">
          <Body tone="muted">
            Ask your venue&apos;s owner to add your phone number.
          </Body>
        </Notice>
      </Screen>
    );

  const day = dateParts(date);
  const summary = calendar.data?.summary;
  const data = calendar.data;
  const openDetails = (entry: CalendarEntry) =>
    router.push({
      pathname: "/venue/booking/[reservationId]",
      params: { reservationId: entry.id, organizationId: venue.id, date },
    });

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={calendar.isRefetching}
            onRefresh={() => void calendar.refetch()}
          />
        }
      >
        <View style={{ gap: space.xs }}>
          <Heading>{venue.name}</Heading>
          <Body tone="muted">{venue.role === "owner" ? "Owner" : "Staff"}</Body>
        </View>
        {venues.length > 1 && (
          <ChipRow label="Venue">
            {venues.map((item) => (
              <Chip
                key={item.id}
                label={item.name}
                selected={item.id === venue.id}
                onPress={() => setVenueId(item.id)}
              />
            ))}
          </ChipRow>
        )}

        <View style={styles.dayRow}>
          <DayButton
            icon="chevron-back"
            label="Previous day"
            onPress={() => setDate(addDays(date, -1))}
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Heading level={3} accessibilityLiveRegion="polite">
              {date === today
                ? "Today"
                : `${day.weekday} ${day.day} ${day.month}`}
            </Heading>
            {date !== today ? (
              <Pressable
                onPress={() => setDate(today)}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Body tone="link" weight="semibold" size={14}>
                  Back to today
                </Body>
              </Pressable>
            ) : (
              <Body tone="muted" size={14}>
                {day.long}
              </Body>
            )}
          </View>
          <DayButton
            icon="chevron-forward"
            label="Next day"
            onPress={() => setDate(addDays(date, 1))}
          />
        </View>

        <Button
          label="Add booking"
          onPress={() =>
            router.push({
              pathname: "/venue/new",
              params: { organizationId: venue.id, date },
            })
          }
          accessibilityHint="Record a phone, WhatsApp or walk-in booking"
        />

        {calendar.isPending ? (
          <Skeleton height={110} />
        ) : calendar.isError ? (
          <Notice
            tone="danger"
            title="We could not load this day's bookings"
            action={
              <Button
                variant="outline"
                label="Try again"
                onPress={() => void calendar.refetch()}
              />
            }
          >
            <Body>Your bookings are safe. Check your connection.</Body>
          </Notice>
        ) : (
          data &&
          summary && (
            <>
              <View style={styles.totals}>
                <Total
                  label={summary.bookings === 1 ? "booking" : "bookings"}
                  value={String(summary.bookings)}
                  narrow
                />
                <Total label="paid" value={formatNaira(summary.paidMinor)} />
                <Total
                  label="to collect"
                  value={formatNaira(summary.unpaidMinor)}
                  attention={summary.unpaidMinor > 0}
                />
              </View>
              {data.entries.length === 0 ? (
                <Notice title="No bookings on this day yet">
                  <Body tone="muted">
                    Online bookings appear here with the player&apos;s phone
                    number. Add phone and walk-in bookings with &quot;Add
                    booking&quot;.
                  </Body>
                </Notice>
              ) : (
                data.pitches
                  .filter((pitch) =>
                    data.entries.some((entry) => entry.pitchId === pitch.id),
                  )
                  .map((pitch) => (
                    <View key={pitch.id} style={{ gap: space.sm }}>
                      <Body weight="semibold" tone="muted">
                        {pitch.facilityName} · {pitch.name}
                      </Body>
                      {data.entries
                        .filter((entry) => entry.pitchId === pitch.id)
                        .map((entry) => (
                          <EntryRow
                            key={entry.id}
                            entry={entry}
                            onPress={() => openDetails(entry)}
                          />
                        ))}
                    </View>
                  ))
              )}
            </>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DayButton({
  icon,
  label,
  onPress,
}: {
  icon: "chevron-back" | "chevron-forward";
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.dayButton,
        {
          borderColor: colors.border,
          backgroundColor: colors.card,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

function Total({
  label,
  value,
  attention = false,
  narrow = false,
}: {
  label: string;
  value: string;
  attention?: boolean;
  /** For the booking count, so the money boxes get the room. */
  narrow?: boolean;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.total,
        { flex: narrow ? 0.7 : 1 },
        {
          backgroundColor: attention ? colors.warningSoft : colors.card,
          borderColor: attention ? colors.warningSoft : colors.border,
        },
      ]}
    >
      <Body
        weight="bold"
        size={17}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={attention ? { color: colors.warningText } : undefined}
      >
        {value}
      </Body>
      <Body
        tone="muted"
        size={13}
        style={attention ? { color: colors.warningText } : undefined}
      >
        {label}
      </Body>
    </View>
  );
}

function EntryRow({
  entry,
  onPress,
}: {
  entry: CalendarEntry;
  onPress: () => void;
}) {
  const colors = useColors();
  const status = entryStatus(entry);
  const who =
    entry.kind === "hold"
      ? entry.holdExpiresAt
        ? `Held until ${formatInstantTime(entry.holdExpiresAt)}`
        : "Being paid online"
      : (entry.customer?.name ?? "");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.localStart} to ${entry.localEnd}, ${who}, ${status.label}. Open booking`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
    >
      <Card
        style={{
          ...(entry.kind === "hold" ? { borderStyle: "dashed" as const } : {}),
          ...(entry.kind === "cancelled" ? { opacity: 0.7 } : {}),
        }}
      >
        <View style={styles.entryTop}>
          <Body weight="bold" size={20} style={{ flex: 1 }}>
            {entry.localStart}
            <Body tone="muted"> to {entry.localEnd}</Body>
          </Body>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
        <StatusPill tone={status.tone} label={status.label} />
        <Body weight="semibold" size={17}>
          {who}
        </Body>
        {entry.kind !== "hold" && (
          <Body tone="muted">
            {entry.source === "manual"
              ? CHANNEL_NOTE[entry.channel ?? "other"]
              : "Booked online"}{" "}
            · {formatNaira(entry.amountMinor)} ·{" "}
            {formatDuration(entry.durationMinutes)}
          </Body>
        )}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.lg },
  dayRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  dayButton: {
    width: TAP,
    height: TAP,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  totals: { flexDirection: "row", gap: space.sm },
  total: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  entryTop: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
