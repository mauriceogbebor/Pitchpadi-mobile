import { useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import {
  cancelManualBooking,
  markManualBookingPaid,
  type CalendarEntry,
} from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { StatusPill } from "@/components/status-pill";
import {
  Body,
  Button,
  Card,
  Field,
  Heading,
  Notice,
  Screen,
  Skeleton,
} from "@/components/ui";
import {
  dateParts,
  formatDuration,
  formatInstantTime,
  formatNaira,
  formatPhone,
} from "@/lib/format";
import {
  CHANNEL_NOTE,
  entryActions,
  entryStatus,
  useVenueCalendar,
  VENUE_METHODS,
  venueCalendarKey,
  type VenueMethod,
} from "@/lib/venue";
import { space } from "@/theme/tokens";

type ErrorBody = { error?: string; fieldErrors?: Record<string, string[]> };

/** One booking on the venue's day: who, when, and what the venue can do. */
export default function VenueBookingScreen() {
  const { reservationId, organizationId, date } = useLocalSearchParams<{
    reservationId: string;
    organizationId: string;
    date: string;
  }>();
  const calendar = useVenueCalendar(organizationId, date);
  const entry = calendar.data?.entries.find(
    (item) => item.id === reservationId,
  );
  const pitch = calendar.data?.pitches.find(
    (item) => item.id === entry?.pitchId,
  );

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: entry?.reference ?? "Booking" }} />
      {calendar.isPending ? (
        <Skeleton height={200} count={2} />
      ) : calendar.isError ? (
        <Notice
          tone="danger"
          title={calendar.error.message}
          action={
            <Button
              variant="outline"
              label="Try again"
              onPress={() => void calendar.refetch()}
            />
          }
        />
      ) : !entry ? (
        <Notice title="This booking is no longer on the day">
          <Body tone="muted">
            A player&apos;s hold may have ended. Go back to see the day.
          </Body>
        </Notice>
      ) : (
        <Details
          entry={entry}
          organizationId={organizationId}
          date={date}
          place={pitch ? `${pitch.facilityName}, ${pitch.name}` : ""}
        />
      )}
    </Screen>
  );
}

function Details({
  entry,
  organizationId,
  date,
  place,
}: {
  entry: CalendarEntry;
  organizationId: string;
  date: string;
  place: string;
}) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const status = entryStatus(entry);
  const actions = entryActions(entry);
  const phone = entry.customer?.phoneE164;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  async function refreshDay() {
    const userId = auth.status === "signedIn" ? auth.me.user.id : null;
    // Every day of this venue: a change can move the day's totals.
    await queryClient.invalidateQueries({
      queryKey: venueCalendarKey(userId, organizationId),
    });
  }

  async function markPaid(method: VenueMethod) {
    setBusy(method);
    setError(null);
    try {
      const response = await markManualBookingPaid(organizationId, entry.id, {
        paymentMethod: method,
      });
      if (response.status !== 200) {
        setError(
          (response.data as ErrorBody).error ?? "That did not work. Try again.",
        );
        await refreshDay();
        return;
      }
      setDone("Marked as paid.");
      await refreshDay();
    } catch {
      // Safe to repeat: marking paid twice changes nothing.
      setError(
        "We could not reach PitchPadi. Check your connection and try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (reason.trim().length < 3) {
      setReasonError("Say why, so the team knows (at least 3 letters)");
      return;
    }
    setBusy("cancel");
    setError(null);
    setReasonError(null);
    try {
      const response = await cancelManualBooking(organizationId, entry.id, {
        reason: reason.trim(),
      });
      if (response.status !== 200) {
        const body = response.data as ErrorBody;
        if (body.fieldErrors?.reason)
          setReasonError(body.fieldErrors.reason[0]);
        else setError(body.error ?? "That did not work. Try again.");
        await refreshDay();
        return;
      }
      setCancelling(false);
      setDone("Booking cancelled. The time is open for players again.");
      await refreshDay();
    } catch {
      // Safe to repeat: cancelling twice changes nothing.
      setError(
        "We could not reach PitchPadi. Check your connection and try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <View style={{ gap: space.xs }}>
        <Heading>
          {entry.localStart}
          <Heading level={2}> to {entry.localEnd}</Heading>
        </Heading>
        <Body tone="muted">
          {dateParts(date).long}, {formatDuration(entry.durationMinutes)}
        </Body>
        {place ? <Body tone="muted">{place}</Body> : null}
      </View>
      <StatusPill tone={status.tone} label={status.label} />
      {done ? <Notice tone="success" title={done} /> : null}

      {entry.kind === "hold" ? (
        <Card>
          <Body>
            A player is paying online for this time. It is not a booking yet.
          </Body>
          {entry.holdExpiresAt ? (
            <Body tone="muted">
              If the payment does not arrive by{" "}
              {formatInstantTime(entry.holdExpiresAt)}, the time opens again.
            </Body>
          ) : null}
        </Card>
      ) : (
        <Card>
          {entry.customer ? (
            <Heading level={3}>{entry.customer.name}</Heading>
          ) : null}
          <Body tone="muted">
            {entry.source === "manual"
              ? CHANNEL_NOTE[entry.channel ?? "other"]
              : "Booked and paid online"}
          </Body>
          {phone ? (
            <View style={styles.row}>
              <Button
                variant="outline"
                label={`Call ${formatPhone(phone)}`}
                onPress={() => void Linking.openURL(`tel:${phone}`)}
                style={{ flexGrow: 1 }}
              />
              <Button
                variant="outline"
                label="WhatsApp"
                onPress={() =>
                  void Linking.openURL(
                    `https://wa.me/${phone.replace(/\D/g, "")}`,
                  )
                }
                style={{ flexGrow: 1 }}
              />
            </View>
          ) : null}
          <Row label="Price">{formatNaira(entry.amountMinor)}</Row>
          <Row label="Reference">{entry.reference}</Row>
          {entry.note ? <Row label="Note">{entry.note}</Row> : null}
          {entry.cancelReason ? (
            <Row label="Why it was cancelled">{entry.cancelReason}</Row>
          ) : null}
        </Card>
      )}

      {error ? (
        <Body tone="danger" accessibilityLiveRegion="assertive">
          {error}
        </Body>
      ) : null}

      {actions.markPaid && (
        <View style={{ gap: space.sm }}>
          <Heading level={3}>Paid at the pitch? Mark it</Heading>
          <View style={styles.row}>
            {VENUE_METHODS.map((method) => (
              <Button
                key={method.value}
                label={method.label}
                onPress={() => void markPaid(method.value)}
                busy={busy === method.value}
                disabled={busy !== null}
                style={{ flexGrow: 1 }}
                accessibilityHint={`Marks ${formatNaira(entry.amountMinor)} as paid by ${method.label}`}
              />
            ))}
          </View>
        </View>
      )}

      {actions.cancel &&
        (cancelling ? (
          <Card>
            <Heading level={3}>Cancel this booking?</Heading>
            <Body tone="muted">
              The time opens for players again straight away.
            </Body>
            <Field
              label="Why is it cancelled?"
              placeholder="e.g. Team called to cancel"
              value={reason}
              onChangeText={(text) => {
                setReason(text);
                setReasonError(null);
              }}
              error={reasonError}
              maxLength={200}
            />
            <Button
              variant="danger"
              label="Cancel booking"
              onPress={() => void cancel()}
              busy={busy === "cancel"}
              disabled={busy !== null}
            />
            <Button
              variant="ghost"
              label="Keep the booking"
              onPress={() => setCancelling(false)}
            />
          </Card>
        ) : (
          <Button
            variant="outline"
            label="Cancel booking"
            onPress={() => setCancelling(true)}
          />
        ))}

      {entry.kind === "booking" && entry.source === "online" ? (
        <Body tone="muted">
          Online bookings were paid through PitchPadi, so they are changed or
          refunded through PitchPadi, not here.
        </Body>
      ) : null}
    </>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 2, marginTop: space.sm }}>
      <Body tone="muted" size={14}>
        {label}
      </Body>
      <Body weight="semibold">{children}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
