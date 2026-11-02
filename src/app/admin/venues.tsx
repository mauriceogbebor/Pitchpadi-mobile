import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import {
  listVenuesForReview,
  reviewVenue,
  type VenueForReview,
  type VenueStatus,
} from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { Chip } from "@/components/chips";
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
import { formatPhone } from "@/lib/format";
import { space } from "@/theme/tokens";

const TABS: { value: VenueStatus; label: string }[] = [
  { value: "pending", label: "Waiting" },
  { value: "rejected", label: "Sent back" },
  { value: "approved", label: "Approved" },
];

/**
 * PitchPadi team only: check new venues. Approve, or send back with a note the
 * owner sees. The API refuses everyone who is not a platform admin.
 */
export default function ReviewVenuesScreen() {
  const auth = useAuth();
  const admin = auth.status === "signedIn" && auth.me.user.isPlatformAdmin;
  const userId = auth.status === "signedIn" ? auth.me.user.id : null;
  const [status, setStatus] = useState<VenueStatus>("pending");
  const venues = useQuery({
    queryKey: ["reviewVenues", userId, status],
    enabled: admin,
    queryFn: async () => {
      const response = await listVenuesForReview({ status });
      if (response.status !== 200)
        throw new Error("We could not load venues to review.");
      return response.data.venues;
    },
  });

  const { refetch } = venues;
  useFocusEffect(
    useCallback(() => {
      if (admin) void refetch();
    }, [admin, refetch]),
  );

  if (!admin)
    return (
      <Screen edges={["bottom"]}>
        <Notice title="Not found" />
      </Screen>
    );

  return (
    <Screen edges={["bottom"]}>
      <Heading>Review venues</Heading>
      <Body tone="muted">
        Call the owner to confirm the venue is real and the address is right,
        then approve it or send it back with a note.
      </Body>
      <View style={styles.wrap}>
        {TABS.map((tab) => (
          <Chip
            key={tab.value}
            label={tab.label}
            selected={tab.value === status}
            onPress={() => setStatus(tab.value)}
          />
        ))}
      </View>
      {venues.isPending ? (
        <Skeleton height={160} count={2} />
      ) : venues.isError ? (
        <Notice
          tone="danger"
          title={venues.error.message}
          action={
            <Button
              variant="outline"
              label="Try again"
              onPress={() => void venues.refetch()}
            />
          }
        />
      ) : venues.data.length === 0 ? (
        <Notice
          title={
            status === "pending"
              ? "No venues waiting"
              : status === "rejected"
                ? "No venues sent back"
                : "No approved venues yet"
          }
        />
      ) : (
        venues.data.map((venue) => (
          <VenueCard
            key={venue.id}
            venue={venue}
            onError={() => void venues.refetch()}
          />
        ))
      )}
    </Screen>
  );
}

/**
 * One venue to review. After a decision the card stays where it is and says what
 * happened, so the list does not jump; it leaves the list on the next refresh.
 */
function VenueCard({
  venue,
  onError,
}: {
  venue: VenueForReview;
  /** Something changed under us (someone else reviewed it): reload the list. */
  onError: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function decide(decision: "approve" | "reject") {
    if (decision === "reject" && note.trim().length < 10) {
      setNoteError("Tell the owner what to change (at least 10 letters)");
      return;
    }
    setBusy(decision);
    setError(null);
    try {
      const response = await reviewVenue(
        venue.id,
        decision === "approve" ? { decision } : { decision, note: note.trim() },
      );
      if (response.status !== 200) {
        setError(
          (response.data as { error?: string }).error ??
            "That did not work. Try again.",
        );
        onError();
        return;
      }
      setDone(
        decision === "approve"
          ? "Approved. The owner can publish now."
          : "Sent back. The owner sees your note.",
      );
    } catch {
      setError("We could not reach PitchPadi. Check your connection.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <Heading level={3}>{venue.name}</Heading>
      <Body tone="muted">
        Set up {new Date(venue.createdAt).toISOString().slice(0, 10)}
      </Body>
      {venue.facilities.map((facility) => (
        <View key={facility.id} style={{ gap: 2 }}>
          <Body weight="semibold">
            {facility.name} · {facility.pitchCount}{" "}
            {facility.pitchCount === 1 ? "pitch" : "pitches"}
          </Body>
          <Body tone="muted">
            {facility.areaName}: {facility.address}
            {facility.landmark ? `, ${facility.landmark}` : ""}
          </Body>
        </View>
      ))}
      {venue.ownerPhones.map((phone) => (
        <Button
          key={phone}
          variant="outline"
          label={`Call the owner, ${formatPhone(phone)}`}
          onPress={() => void Linking.openURL(`tel:${phone}`)}
        />
      ))}
      {venue.reviewNote ? (
        <Body tone="muted">Last note: {venue.reviewNote}</Body>
      ) : null}
      {done ? <Notice tone="success" title={done} /> : null}
      {error ? <Body tone="danger">{error}</Body> : null}
      {venue.status === "pending" && !done && (
        <>
          {sending ? (
            <>
              <Field
                label="What should the owner change?"
                placeholder="e.g. The address is incomplete. Add the street number."
                value={note}
                onChangeText={(text) => {
                  setNote(text);
                  setNoteError(null);
                }}
                multiline
                maxLength={500}
                error={noteError}
              />
              <Button
                variant="danger"
                label="Send back to the owner"
                onPress={() => void decide("reject")}
                busy={busy === "reject"}
                disabled={busy !== null}
              />
              <Button
                variant="ghost"
                label="Keep it waiting"
                onPress={() => setSending(false)}
              />
            </>
          ) : (
            <View style={styles.wrap}>
              <Button
                label="Approve"
                accessibilityLabel={`Approve ${venue.name}`}
                onPress={() => void decide("approve")}
                busy={busy === "approve"}
                disabled={busy !== null}
                style={{ flexGrow: 1 }}
              />
              <Button
                variant="outline"
                label="Send back"
                accessibilityLabel={`Send ${venue.name} back`}
                onPress={() => setSending(true)}
                style={{ flexGrow: 1 }}
              />
            </View>
          )}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
