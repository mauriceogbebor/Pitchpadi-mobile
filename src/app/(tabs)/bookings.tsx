import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { listMyBookings, type Hold, type PublicBooking } from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { Body, Button, Card, Heading, Notice, Skeleton } from "@/components/ui";
import {
  addDays,
  dateParts,
  formatInstantTime,
  formatNaira,
  lagosToday,
} from "@/lib/format";
import { space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

const STATUS_LABEL: Record<string, string> = {
  completed: "Played",
  no_show: "No-show",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** The player's games: upcoming first, then recent ones. */
export default function BookingsScreen() {
  const colors = useColors();
  const auth = useAuth();
  const signedIn = auth.status === "signedIn";

  const userId = signedIn ? auth.me.user.id : null;
  const bookings = useQuery({
    // Scoped to the account: another person signing in on this phone never
    // sees these, even from the cache (AuthProvider also clears it).
    queryKey: ["myBookings", userId],
    enabled: signedIn,
    queryFn: async () => {
      const response = await listMyBookings();
      if (response.status !== 200)
        throw new Error("We could not load your bookings.");
      return response.data;
    },
  });

  // Fresh on every visit: a payment may have landed while the player was away.
  const { refetch } = bookings;
  useFocusEffect(
    useCallback(() => {
      if (signedIn) void refetch();
    }, [signedIn, refetch]),
  );

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
          <Skeleton height={110} count={2} />
        ) : !signedIn ? (
          <>
            <Body tone="muted">
              Sign in with your phone number to see your games, including ones
              you booked on the website with the same number.
            </Body>
            <Button label="Sign in" onPress={() => router.push("/sign-in")} />
          </>
        ) : bookings.isPending ? (
          <Skeleton height={110} count={2} />
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
            <Body>Check your connection.</Body>
          </Notice>
        ) : bookings.data.inProgress.length +
            bookings.data.upcoming.length +
            bookings.data.past.length ===
          0 ? (
          <Notice
            title="No bookings yet"
            action={
              <Button
                label="Find a pitch"
                onPress={() => router.navigate("/")}
              />
            }
          >
            <Body tone="muted">
              Games you book while signed in, or with this phone number, show
              here.
            </Body>
          </Notice>
        ) : (
          <>
            {bookings.data.inProgress.length > 0 && (
              <>
                <Heading level={2}>Not finished</Heading>
                {bookings.data.inProgress.map((hold) => (
                  <UnfinishedRow key={hold.id} hold={hold} />
                ))}
              </>
            )}
            <Heading level={2}>Coming up</Heading>
            {bookings.data.upcoming.length === 0 ? (
              <Notice
                title="Nothing booked yet"
                action={
                  <Button
                    variant="outline"
                    label="Find a pitch"
                    onPress={() => router.navigate("/")}
                  />
                }
              />
            ) : (
              bookings.data.upcoming.map((booking) => (
                <BookingRow key={booking.reference} booking={booking} />
              ))
            )}
            {bookings.data.past.length > 0 && (
              <>
                <Heading level={2}>Earlier games</Heading>
                {bookings.data.past.map((booking) => (
                  <BookingRow key={booking.reference} booking={booking} past />
                ))}
              </>
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
  const parts = dateParts(date);
  return `${parts.weekday} ${parts.day} ${parts.month}`;
}

/** A time the player is holding or paying for: back to checkout in one tap. */
function UnfinishedRow({ hold }: { hold: Hold }) {
  const colors = useColors();
  const paying = hold.payment?.status === "checkout_open";
  const until = hold.expiresAt ? formatInstantTime(hold.expiresAt) : "";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${paying ? "Waiting for your payment" : "Held, not paid yet"}: ${hold.pitch.facilityName}, ${dayLabel(hold.localDate)} at ${hold.localStart}. Continue checkout`}
      onPress={() =>
        router.push({
          pathname: "/checkout/[holdId]",
          params: { holdId: hold.id },
        })
      }
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
    >
      <Card style={{ borderColor: colors.link, borderWidth: 2 }}>
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <Body weight="semibold" tone="link">
              {paying ? "Waiting for your payment" : "Held, not paid yet"}
            </Body>
            <Body weight="bold" size={18}>
              {dayLabel(hold.localDate)}, {hold.localStart}
            </Body>
            <Body>{hold.pitch.facilityName}</Body>
            <Body tone="muted">
              {formatNaira(hold.amountDueMinor)} · held until {until}
            </Body>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      </Card>
    </Pressable>
  );
}

function BookingRow({
  booking,
  past = false,
}: {
  booking: PublicBooking;
  past?: boolean;
}) {
  const colors = useColors();
  const status = STATUS_LABEL[booking.status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${booking.pitch.facilityName}, ${dayLabel(booking.localDate)} at ${booking.localStart}. Open booking ${booking.reference}`}
      onPress={() =>
        router.push({
          pathname: "/booking/[reference]",
          params: { reference: booking.reference },
        })
      }
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : past ? 0.85 : 1 })}
    >
      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <Body weight="bold" size={18}>
              {dayLabel(booking.localDate)}, {booking.localStart}
            </Body>
            <Body>{booking.pitch.facilityName}</Body>
            <Body tone="muted">
              {booking.pitch.name}, {booking.pitch.areaName} ·{" "}
              {formatNaira(booking.amountMinor)}
            </Body>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
        <Body tone="muted" size={14}>
          {booking.reference}
          {status ? ` · ${status}` : ""}
        </Body>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2, gap: space.lg },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
});
