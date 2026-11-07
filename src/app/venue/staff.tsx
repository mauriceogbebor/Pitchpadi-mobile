import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { addStaff, listMembers, removeStaff } from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { needsVenue } from "@/components/needs-venue";
import {
  Body,
  Button,
  Card,
  Field,
  Heading,
  Notice,
  Screen,
  Section,
  Skeleton,
} from "@/components/ui";
import { formatPhone } from "@/lib/format";
import { space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

type ErrorBody = { error?: string; fieldErrors?: Record<string, string[]> };

/**
 * The venue's team (Prompt 4, R7-F5). The owner adds staff by phone number;
 * they see the venue the next time they sign in with that number. Staff run
 * the day: bookings, payments and closures. Only the owner changes the venue,
 * prices and team.
 */
function StaffScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const colors = useColors();
  const auth = useAuth();
  const userId = auth.status === "signedIn" ? auth.me.user.id : null;
  const queryClient = useQueryClient();
  const key = ["members", userId, organizationId];
  const members = useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await listMembers(organizationId);
      if (response.status !== 200)
        throw new Error("We could not load your team.");
      return response.data.members;
    },
  });
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    setAdded(null);
    try {
      const response = await addStaff(organizationId, { phone });
      if (response.status === 201) {
        setAdded(formatPhone(response.data.member.phone));
        setPhone("");
        void queryClient.invalidateQueries({ queryKey: key });
        return;
      }
      const body = response.data as ErrorBody;
      setError(
        body.fieldErrors?.phone?.[0] ??
          body.error ??
          "We could not add this person.",
      );
    } catch {
      setError(
        "We could not reach PitchPadi. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(memberId: string) {
    setRemoving(memberId);
    try {
      await removeStaff(organizationId, memberId);
      void queryClient.invalidateQueries({ queryKey: key });
    } finally {
      setRemoving(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen edges={["bottom"]}>
        <View style={{ gap: space.xs }}>
          <Heading>Your team</Heading>
          <Body tone="muted">
            Staff see the day&apos;s bookings, add phone and walk-in bookings,
            mark payments and close a pitch. Only you change the venue, prices
            and team.
          </Body>
        </View>

        <Section title="Add staff">
          <Field
            label="Their phone number"
            hint="They sign in to PitchPadi with this number to see the venue."
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            error={error}
          />
          {added ? (
            <Notice tone="success" title={`${added} is on your team`}>
              <Body accessibilityLiveRegion="polite">
                Tell them to open PitchPadi and sign in with that number. We
                don&apos;t send them a message yet.
              </Body>
            </Notice>
          ) : null}
          <Button
            icon="person-add-outline"
            label="Add to team"
            onPress={() => void add()}
            busy={busy}
            disabled={phone.trim().length < 7}
          />
        </Section>

        <Section title="Team">
          {members.isPending ? (
            <Skeleton height={56} count={2} />
          ) : members.isError ? (
            <Notice
              tone="danger"
              title={members.error.message}
              action={
                <Button
                  variant="outline"
                  label="Try again"
                  onPress={() => void members.refetch()}
                />
              }
            />
          ) : (
            members.data.map((member) => (
              <Card
                key={member.userId}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.md,
                }}
              >
                <Ionicons
                  name={
                    member.role === "owner" ? "key-outline" : "person-outline"
                  }
                  size={20}
                  color={colors.textMuted}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Body weight="semibold" numeric>
                    {formatPhone(member.phone)}
                  </Body>
                  <Body tone="muted" size={14}>
                    {member.role === "owner"
                      ? member.userId === userId
                        ? "Owner (you)"
                        : "Owner"
                      : "Staff"}
                  </Body>
                </View>
                {member.role === "staff" ? (
                  <Button
                    variant="outline"
                    label="Remove"
                    accessibilityLabel={`Remove ${formatPhone(member.phone)} from the team`}
                    busy={removing === member.userId}
                    disabled={removing !== null}
                    onPress={() => void remove(member.userId)}
                  />
                ) : null}
              </Card>
            ))
          )}
        </Section>
      </Screen>
    </KeyboardAvoidingView>
  );
}

export default needsVenue(StaffScreen);
