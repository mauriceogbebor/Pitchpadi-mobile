import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { CalendarEntry } from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { Chip, ChipRow } from "@/components/chips";
import { PitchBand } from "@/components/pitch-band";
import {
  Body,
  Button,
  Card,
  Heading,
  Notice,
  Press,
  Screen,
  Section,
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
import { PushCard } from "@/components/push-card";
import { StatusPill } from "@/components/status-pill";
import { CHANNEL_NOTE, entryStatus, useVenueCalendar } from "@/lib/venue";
import { palette, radius, space, TAP } from "@/theme/tokens";
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
        <Notice
          title="No venue on this account"
          action={
            <Button
              label="Set up your venue"
              onPress={() => router.push("/venue/setup")}
            />
          }
        >
          <Body tone="muted">
            Run a pitch? Set it up here. Work at one? Ask the owner to add your
            phone number.
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

  const tone = (entry: CalendarEntry) => entryStatus(entry).tone;
  const barColor = {
    paid: colors.success,
    collect: palette.clay,
    pending: colors.textMuted,
    off: colors.border,
  };

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
        <PitchBand markings="none" contentStyle={styles.bandContent}>
          <View style={styles.roleRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Heading level={2} style={{ color: colors.onBand }}>
                {venue.name}
              </Heading>
              <Body tone="onBandMuted" size={14}>
                {venue.role === "owner" ? "Owner" : "Staff"}
                {venue.status !== "approved"
                  ? venue.status === "rejected"
                    ? ", needs changes"
                    : ", in review"
                  : ""}
              </Body>
            </View>
            <Press
              accessibilityRole="button"
              accessibilityLabel={
                venue.role === "owner" ? "Manage venue" : "Venue setup"
              }
              onPress={() =>
                router.push({
                  pathname: "/venue/manage",
                  params: { organizationId: venue.id },
                })
              }
              hitSlop={6}
              style={styles.manage}
            >
              <Ionicons
                name="settings-outline"
                size={18}
                color={colors.onBand}
              />
              <Body weight="semibold" size={14} tone="onBand">
                {venue.role === "owner" ? "Manage" : "Setup"}
              </Body>
            </Press>
          </View>

          <View style={styles.dayRow}>
            <DayButton
              icon="chevron-back"
              label="Previous day"
              onPress={() => setDate(addDays(date, -1))}
            />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Body
                weight="bold"
                size={19}
                tone="onBand"
                accessibilityLiveRegion="polite"
              >
                {date === today
                  ? "Today"
                  : `${day.weekday} ${day.day} ${day.month}`}
              </Body>
              {date !== today ? (
                <Press
                  onPress={() => setDate(today)}
                  accessibilityRole="button"
                  hitSlop={10}
                >
                  <Body
                    weight="semibold"
                    size={14}
                    style={{ color: palette.volt }}
                  >
                    Back to today
                  </Body>
                </Press>
              ) : (
                <Body tone="onBandMuted" size={14}>
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

          {summary ? (
            <View
              style={styles.totals}
              accessible
              accessibilityLabel={`${summary.bookings} ${summary.bookings === 1 ? "booking" : "bookings"}, ${formatNaira(summary.paidMinor)} paid, ${formatNaira(summary.unpaidMinor)} to collect`}
            >
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
          ) : null}
        </PitchBand>

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

        <Button
          icon="add"
          label="Add booking"
          onPress={() =>
            router.push({
              pathname: "/venue/new",
              params: { organizationId: venue.id, date },
            })
          }
          accessibilityHint="Record a phone, WhatsApp or walk-in booking"
        />
        <PushCard
          variant="prompt"
          title="Know when a player books"
          detail="Get a notification on this phone for every new online booking."
        />

        {calendar.isPending ? (
          <Skeleton height={84} count={3} />
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
          (data.entries.length === 0 ? (
            <Card variant="flat" style={{ gap: space.xs }}>
              <Body weight="semibold">No bookings on this day yet</Body>
              <Body tone="muted">
                Online bookings appear here with the player&apos;s phone number.
                Add phone and walk-in bookings with &quot;Add booking&quot;.
              </Body>
            </Card>
          ) : (
            data.pitches
              .filter((pitch) =>
                data.entries.some((entry) => entry.pitchId === pitch.id),
              )
              .map((pitch) => (
                <Section key={pitch.id} title={`${pitch.name}`}>
                  {data.pitches.some(
                    (other) => other.facilityName !== pitch.facilityName,
                  ) ? (
                    <Body
                      tone="muted"
                      size={14}
                      style={{ marginTop: -space.sm }}
                    >
                      {pitch.facilityName}
                    </Body>
                  ) : null}
                  <PitchDay
                    entries={data.entries.filter(
                      (entry) => entry.pitchId === pitch.id,
                    )}
                    bar={(entry) => barColor[tone(entry)]}
                    onOpen={openDetails}
                  />
                </Section>
              ))
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * One pitch's day: live games in time order, and cancelled ones folded into
 * a single line below them, so they never push today's games down (R11-F7).
 */
function PitchDay({
  entries,
  bar,
  onOpen,
}: {
  entries: CalendarEntry[];
  bar: (entry: CalendarEntry) => string;
  onOpen: (entry: CalendarEntry) => void;
}) {
  const [showCancelled, setShowCancelled] = useState(false);
  const live = entries.filter((entry) => entry.kind !== "cancelled");
  const cancelled = entries.filter((entry) => entry.kind === "cancelled");
  const shown = showCancelled ? [...live, ...cancelled] : live;
  return (
    <View>
      {shown.map((entry, index) => (
        <EntryRow
          key={entry.id}
          entry={entry}
          bar={bar(entry)}
          last={index === shown.length - 1}
          onPress={() => onOpen(entry)}
        />
      ))}
      {cancelled.length > 0 ? (
        <Button
          variant="ghost"
          icon={showCancelled ? "chevron-up" : "chevron-down"}
          label={
            showCancelled ? "Hide cancelled" : `${cancelled.length} cancelled`
          }
          accessibilityLabel={
            showCancelled
              ? "Hide cancelled bookings"
              : `Show ${cancelled.length} cancelled ${cancelled.length === 1 ? "booking" : "bookings"}`
          }
          onPress={() => setShowCancelled(!showCancelled)}
          style={{ alignSelf: "flex-start" }}
        />
      ) : null}
    </View>
  );
}

/** Previous and next day, on the band. */
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
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.dayButton}
    >
      <Ionicons name={icon} size={22} color={colors.onBand} />
    </Press>
  );
}

/** One number on the day's scoreboard. */
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
  return (
    <View style={[styles.total, { flex: narrow ? 0.6 : 1 }]}>
      <Body
        weight="bold"
        size={19}
        numeric
        tone="onBand"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Body>
      <View style={styles.totalLabel}>
        {attention ? <View style={styles.collectDot} /> : null}
        <Body tone="onBandMuted" size={13}>
          {label}
        </Body>
      </View>
    </View>
  );
}

/**
 * One booking on the day's timeline: the time in the gutter, then a block
 * whose edge is coloured by what the venue must do (paid, to collect, being
 * paid online, cancelled).
 */
function EntryRow({
  entry,
  bar,
  last,
  onPress,
}: {
  entry: CalendarEntry;
  bar: string;
  last: boolean;
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
  const off = entry.kind === "cancelled";
  return (
    <View style={styles.slot}>
      <View style={styles.gutter}>
        <Body weight="bold" numeric tone={off ? "muted" : undefined}>
          {entry.localStart}
        </Body>
        <Body tone="muted" size={13} numeric>
          {entry.localEnd}
        </Body>
        {!last ? (
          <View style={[styles.rail, { backgroundColor: colors.border }]} />
        ) : null}
      </View>
      <Press
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityLabel={`${entry.localStart} to ${entry.localEnd}, ${who}, ${status.label}. Open booking`}
        onPress={onPress}
        style={{ flex: 1, paddingBottom: last ? 0 : space.md }}
      >
        <View
          style={[
            styles.block,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderLeftColor: bar,
              borderStyle: entry.kind === "hold" ? "dashed" : "solid",
              opacity: off ? 0.7 : 1,
            },
          ]}
        >
          <View style={styles.entryTop}>
            <Body
              weight="semibold"
              size={17}
              numberOfLines={1}
              style={{
                flex: 1,
                textDecorationLine: off ? "line-through" : "none",
              }}
            >
              {who}
            </Body>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </View>
          <StatusPill tone={status.tone} label={status.label} />
          {entry.kind !== "hold" && (
            <Body tone="muted" size={14} numeric>
              {entry.source === "manual"
                ? CHANNEL_NOTE[entry.channel ?? "other"]
                : "Booked online"}
              , {formatNaira(entry.amountMinor)},{" "}
              {formatDuration(entry.durationMinutes)}
            </Body>
          )}
        </View>
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.lg },
  bandContent: { padding: space.lg, gap: space.lg },
  roleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
  },
  manage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dayRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  dayButton: {
    width: TAP,
    height: TAP,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  totals: {
    flexDirection: "row",
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
    paddingTop: space.md,
  },
  total: { gap: 2 },
  totalLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  collectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.clay,
  },
  slot: { flexDirection: "row", gap: space.md },
  gutter: { width: 78, paddingTop: space.md, alignItems: "flex-start" },
  rail: {
    position: "absolute",
    left: 2,
    top: 62,
    bottom: 4,
    width: 2,
    borderRadius: 1,
  },
  block: {
    borderWidth: 1,
    borderLeftWidth: 5,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
  entryTop: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
