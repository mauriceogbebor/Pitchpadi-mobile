import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { getOwnerCalendar, type CalendarEntry } from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
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
  formatPhone,
  lagosToday,
} from "@/lib/format";
import { radius, space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

const CHANNEL: Record<string, string> = {
  phone: "Booked by phone",
  whatsapp: "Booked on WhatsApp",
  walk_in: "Walk-in",
  other: "Entered by the venue",
};

/** Venue mode: one day of bookings for the venue you run. Read-only in M0. */
export default function VenueScreen() {
  const auth = useAuth();
  const colors = useColors();
  const today = lagosToday();
  const [date, setDate] = useState(today);
  const venues = auth.status === "signedIn" ? auth.me.organizations : [];
  const [venueId, setVenueId] = useState<string | null>(null);
  const venue = venues.find((item) => item.id === venueId) ?? venues[0];

  const calendar = useQuery({
    queryKey: ["calendar", venue?.id, date],
    enabled: !!venue,
    queryFn: async () => {
      const response = await getOwnerCalendar(venue!.id, { date });
      if (response.status !== 200)
        throw new Error(
          (response.data as { error?: string }).error ??
            "Could not load bookings.",
        );
      return response.data.calendar;
    },
  });

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
  return (
    <Screen>
      <Heading>{venue.name}</Heading>
      {venues.length > 1 && (
        <View style={styles.row}>
          {venues.map((item) => (
            <Button
              key={item.id}
              label={item.name}
              variant={item.id === venue.id ? "primary" : "outline"}
              onPress={() => setVenueId(item.id)}
            />
          ))}
        </View>
      )}
      <View style={[styles.row, { alignItems: "center" }]}>
        <Button
          variant="outline"
          label="‹ Previous"
          onPress={() => setDate(addDays(date, -1))}
        />
        {date !== today && (
          <Button
            variant="outline"
            label="Today"
            onPress={() => setDate(today)}
          />
        )}
        <Button
          variant="outline"
          label="Next ›"
          onPress={() => setDate(addDays(date, 1))}
        />
      </View>
      <Heading level={2}>
        {date === today ? "Today, " : ""}
        {day.long}
      </Heading>

      {calendar.isPending ? (
        <Skeleton height={120} />
      ) : calendar.isError ? (
        <Notice
          tone="danger"
          title="We could not load this day's bookings"
          action={
            <Button
              variant="outline"
              label="Try again"
              onPress={() => calendar.refetch()}
            />
          }
        >
          <Body>Your bookings are safe. Check your connection.</Body>
        </Notice>
      ) : (
        <>
          <Body accessibilityLiveRegion="polite">
            <Body weight="bold">
              {summary!.bookings}{" "}
              {summary!.bookings === 1 ? "booking" : "bookings"}
            </Body>
            {summary!.paidMinor > 0
              ? `, ${formatNaira(summary!.paidMinor)} paid`
              : ""}
            {summary!.unpaidMinor > 0
              ? `, ${formatNaira(summary!.unpaidMinor)} to collect`
              : ""}
          </Body>
          {calendar.data!.entries.length === 0 ? (
            <Notice title="No bookings on this day yet">
              <Body tone="muted">
                Online bookings appear here with the player&apos;s phone number.
              </Body>
            </Notice>
          ) : (
            calendar
              .data!.pitches.filter((pitch) =>
                calendar.data!.entries.some(
                  (entry) => entry.pitchId === pitch.id,
                ),
              )
              .map((pitch) => (
                <View key={pitch.id} style={{ gap: space.sm }}>
                  <Heading level={3}>
                    {pitch.facilityName}
                    <Body tone="muted"> · {pitch.name}</Body>
                  </Heading>
                  {calendar
                    .data!.entries.filter((entry) => entry.pitchId === pitch.id)
                    .map((entry) => (
                      <Entry key={entry.id} entry={entry} />
                    ))}
                </View>
              ))
          )}
        </>
      )}
      <Body tone="muted" size={14} style={{ color: colors.textMuted }}>
        Adding bookings, marking them paid and cancelling come to the app next.
      </Body>
    </Screen>
  );
}

function Entry({ entry }: { entry: CalendarEntry }) {
  const colors = useColors();
  const phone = entry.customer?.phoneE164;
  const status =
    entry.kind === "hold"
      ? {
          label: "Not paid · being paid online",
          bg: colors.muted,
          fg: colors.textMuted,
        }
      : entry.kind === "cancelled"
        ? { label: "Cancelled", bg: colors.muted, fg: colors.textMuted }
        : entry.paymentState === "unpaid"
          ? {
              label: "Not paid · collect at the pitch",
              bg: colors.warningSoft,
              fg: colors.warningText,
            }
          : { label: "Paid", bg: colors.primary, fg: colors.onPrimary };
  return (
    <Card style={entry.kind === "hold" ? { borderStyle: "dashed" } : undefined}>
      <Body weight="bold" size={20}>
        {entry.localStart}
        <Body tone="muted"> to {entry.localEnd}</Body>
      </Body>
      <View style={[styles.pill, { backgroundColor: status.bg }]}>
        <Body weight="semibold" size={14} style={{ color: status.fg }}>
          {status.label}
        </Body>
      </View>
      {entry.kind === "hold" ? (
        <Body tone="muted">
          Not a booking yet.{" "}
          {entry.holdExpiresAt
            ? `Held until ${formatInstantTime(entry.holdExpiresAt)}; if payment does not arrive, this time opens up again.`
            : ""}
        </Body>
      ) : (
        <>
          <Body tone="muted">
            {entry.source === "manual"
              ? CHANNEL[entry.channel ?? "other"]
              : "Booked and paid online"}
          </Body>
          {entry.customer && (
            <Body weight="semibold" size={17}>
              {entry.customer.name}
            </Body>
          )}
          {phone && (
            <Pressable
              accessibilityRole="link"
              onPress={() => Linking.openURL(`tel:${phone}`)}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Body tone="link" weight="semibold">
                Call {formatPhone(phone)}
              </Body>
            </Pressable>
          )}
          <Body tone="muted">
            {entry.reference} · {formatNaira(entry.amountMinor)} ·{" "}
            {formatDuration(entry.durationMinutes)}
          </Body>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  pill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
});
