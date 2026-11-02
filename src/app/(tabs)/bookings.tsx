import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Hold, PublicBooking } from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { DateBlock } from "@/components/date-block";
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
import {
  addDays,
  dateParts,
  formatInstantTime,
  formatNaira,
  lagosToday,
} from "@/lib/format";
import { useMyBookings } from "@/lib/my-bookings";
import { radius, space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

const STATUS_LABEL: Record<string, string> = {
  completed: "Played",
  no_show: "No-show",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** The player's games as a fixtures list: not finished, coming up, earlier. */
export default function BookingsScreen() {
  const colors = useColors();
  const auth = useAuth();
  const signedIn = auth.status === "signedIn";
  // Scoped to the account: another person signing in on this phone never
  // sees these, even from the cache (AuthProvider also clears it).
  const bookings = useMyBookings();

  // Fresh on every visit: a payment may have landed while the player was away.
  const { refetch } = bookings;
  useFocusEffect(
    useCallback(() => {
      if (signedIn) void refetch();
    }, [signedIn, refetch]),
  );

  const data = bookings.data;
  const empty =
    !!data &&
    data.inProgress.length + data.upcoming.length + data.past.length === 0;

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          signedIn ? (
            <RefreshControl
              refreshing={bookings.isRefetching}
              onRefresh={() => void bookings.refetch()}
            />
          ) : undefined
        }
      >
        <Heading>My bookings</Heading>
        {auth.status === "loading" ? (
          <Skeleton height={84} count={3} />
        ) : !signedIn ? (
          <PitchBand markings="centre" contentStyle={styles.bandContent}>
            <Heading level={2} style={{ color: colors.onBand }}>
              Your games, in one place
            </Heading>
            <Body tone="onBandMuted">
              Sign in with your phone number to see your games, including ones
              you booked on the website with the same number.
            </Body>
            <Button
              variant="onBand"
              label="Sign in"
              onPress={() => router.push("/sign-in")}
            />
          </PitchBand>
        ) : bookings.isPending ? (
          <Skeleton height={84} count={3} />
        ) : bookings.isError ? (
          <Notice
            tone="danger"
            title={bookings.error.message}
            action={
              <Button
                variant="outline"
                label="Try again"
                onPress={() => void bookings.refetch()}
              />
            }
          >
            <Body>Check your connection, then try again.</Body>
          </Notice>
        ) : empty ? (
          <PitchBand markings="centre" contentStyle={styles.bandContent}>
            <Heading level={2} style={{ color: colors.onBand }}>
              No bookings yet
            </Heading>
            <Body tone="onBandMuted">
              Games you book while signed in, or with this phone number, show
              here.
            </Body>
            <Button
              variant="onBand"
              icon="football-outline"
              label="Find a pitch"
              onPress={() => router.navigate("/")}
            />
          </PitchBand>
        ) : (
          <>
            {data!.inProgress.length > 0 && (
              <Section title="Not finished">
                {data!.inProgress.map((hold) => (
                  <UnfinishedRow key={hold.id} hold={hold} />
                ))}
              </Section>
            )}
            <Section title="Coming up">
              {data!.upcoming.length === 0 ? (
                <Card variant="flat" style={styles.quiet}>
                  <Body tone="muted">Nothing coming up.</Body>
                  <Button
                    variant="outline"
                    label="Find a pitch"
                    onPress={() => router.navigate("/")}
                  />
                </Card>
              ) : (
                <Card style={styles.list}>
                  {data!.upcoming.map((booking, index) => (
                    <FixtureRow
                      key={booking.reference}
                      booking={booking}
                      next={index === 0}
                      first={index === 0}
                    />
                  ))}
                </Card>
              )}
            </Section>
            {data!.past.length > 0 && (
              <Section title="Earlier">
                <Card style={styles.list}>
                  {data!.past.map((booking, index) => (
                    <FixtureRow
                      key={booking.reference}
                      booking={booking}
                      past
                      first={index === 0}
                    />
                  ))}
                </Card>
              </Section>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function dayLabel(date: string) {
  const today = lagosToday();
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  return dateParts(date).long;
}

/** A time the player is holding or paying for: back to checkout in one tap. */
function UnfinishedRow({ hold }: { hold: Hold }) {
  const colors = useColors();
  const paying = hold.payment?.status === "checkout_open";
  const until = hold.expiresAt ? formatInstantTime(hold.expiresAt) : "";
  const title = paying ? "Waiting for your payment" : "Held, not paid yet";
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${hold.pitch.facilityName}, ${dayLabel(hold.localDate)} at ${hold.localStart}. Continue checkout`}
      onPress={() =>
        router.push({
          pathname: "/checkout/[holdId]",
          params: { holdId: hold.id },
        })
      }
    >
      <Card
        style={[
          styles.unfinished,
          { borderColor: colors.borderStrong, borderWidth: 2 },
        ]}
      >
        <DateBlock date={hold.localDate} strong />
        <View style={{ flex: 1, gap: 2 }}>
          <Body weight="semibold" tone="link" size={14}>
            {title}
          </Body>
          <Body weight="semibold" numeric>
            {hold.localStart}, {hold.pitch.facilityName}
          </Body>
          <Body tone="muted" size={14} numeric>
            {formatNaira(hold.amountDueMinor)}
            {until ? `, held until ${until}` : ""}
          </Body>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Card>
    </Press>
  );
}

/** One game in the fixtures list: date block, time and venue, reference. */
function FixtureRow({
  booking,
  past = false,
  next = false,
  first,
}: {
  booking: PublicBooking;
  past?: boolean;
  next?: boolean;
  first: boolean;
}) {
  const colors = useColors();
  const status = STATUS_LABEL[booking.status];
  const day = dayLabel(booking.localDate);
  const relative = day === "Today" || day === "Tomorrow";
  return (
    <Press
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${booking.pitch.facilityName}, ${day} at ${booking.localStart}${status ? `, ${status}` : ""}. Open booking ${booking.reference}`}
      onPress={() =>
        router.push({
          pathname: "/booking/[reference]",
          params: { reference: booking.reference },
        })
      }
      style={[
        styles.fixture,
        !first && { borderTopWidth: 1, borderTopColor: colors.border },
      ]}
    >
      <DateBlock date={booking.localDate} strong={next} faded={past} />
      <View style={{ flex: 1, gap: 2 }}>
        <Body weight="semibold" numeric tone={past ? "muted" : undefined}>
          {relative ? `${day}, ` : ""}
          {booking.localStart}
        </Body>
        <Body numberOfLines={1}>{booking.pitch.facilityName}</Body>
        <Body tone="muted" size={14} numeric numberOfLines={1}>
          {status ? `${status}, ` : ""}
          {booking.pitch.name}, {booking.pitch.areaName}
        </Body>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Press>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.xl },
  bandContent: { gap: space.md, padding: space.xl },
  list: { padding: 0, paddingHorizontal: space.md, gap: 0 },
  quiet: { gap: space.md },
  unfinished: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderRadius: radius.lg,
  },
  fixture: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
    minHeight: 92,
  },
});
