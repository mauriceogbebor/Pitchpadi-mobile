import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  listFacilities,
  requestVenueReview,
  type FacilityPitchRow,
} from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { StatusPill } from "@/components/status-pill";
import {
  Body,
  Button,
  Card,
  Heading,
  Notice,
  Press,
  Screen,
  Skeleton,
} from "@/components/ui";
import { setupSteps, type StepState } from "@/lib/setup-rules";
import { space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

/** The venue's setup: review, facilities and pitches, and what to do next. */
export default function ManageVenueScreen() {
  const { organizationId } = useLocalSearchParams<{ organizationId: string }>();
  const auth = useAuth();
  const userId = auth.status === "signedIn" ? auth.me.user.id : null;
  const organization =
    auth.status === "signedIn"
      ? auth.me.organizations.find((item) => item.id === organizationId)
      : undefined;
  const owner = organization?.role === "owner";

  const facilities = useQuery({
    queryKey: ["facilities", userId, organizationId],
    enabled: !!organization,
    queryFn: async () => {
      const response = await listFacilities(organizationId);
      if (response.status !== 200)
        throw new Error("We could not load your venue.");
      return response.data.facilities;
    },
  });
  const { refetch } = facilities;
  const { refresh } = auth;
  useFocusEffect(
    useCallback(() => {
      void refetch();
      void refresh();
    }, [refetch, refresh]),
  );

  if (!organization)
    return (
      <Screen edges={["bottom"]}>
        <Notice title="This venue is not on your account" />
      </Screen>
    );

  const rows = facilities.data ?? [];
  const byFacility = groupByFacility(rows);
  const steps = setupSteps({
    status: organization.status,
    hasPitch: rows.length > 0,
    scheduled: rows.some((row) => row.has_schedule),
    published: rows.some((row) => row.public_status === "published"),
  });
  const allDone = steps.every((step) => step.state === "done");

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: organization.name }} />
      <View style={{ gap: space.xs }}>
        <Heading>{organization.name}</Heading>
        <StatusPill
          tone={
            organization.status === "approved"
              ? "paid"
              : organization.status === "rejected"
                ? "collect"
                : "pending"
          }
          label={
            organization.status === "approved"
              ? "Approved by PitchPadi"
              : organization.status === "rejected"
                ? "Changes needed"
                : "In review"
          }
        />
      </View>

      {!owner && (
        <Notice title="Only the owner can change the venue">
          <Body tone="muted">
            You can see the setup here and run bookings from the Venue tab.
          </Body>
        </Notice>
      )}

      {facilities.isPending ? (
        <Skeleton height={140} count={2} />
      ) : facilities.isError ? (
        <Notice
          tone="danger"
          title={facilities.error.message}
          action={
            <Button
              variant="outline"
              label="Try again"
              onPress={() => void facilities.refetch()}
            />
          }
        >
          <Body>Check your connection.</Body>
        </Notice>
      ) : (
        <>
          {!allDone && (
            <Card>
              <Heading level={2}>Get ready for bookings</Heading>
              {steps.map((step) => (
                <StepRow key={step.key} title={step.title} state={step.state}>
                  {step.key === "review" &&
                  organization.status === "rejected" ? (
                    <ReviewAgain
                      organizationId={organization.id}
                      note={organization.reviewNote}
                      owner={owner}
                    />
                  ) : step.key === "review" &&
                    organization.status === "pending" ? (
                    <Body tone="muted">
                      Usually within one working day. We may call you to confirm
                      the address.
                    </Body>
                  ) : step.key === "publish" && step.state === "later" ? (
                    <Body tone="muted">
                      {organization.status === "approved"
                        ? "Available once hours and prices are saved."
                        : "Available once your venue is approved and has hours and prices."}
                    </Body>
                  ) : null}
                </StepRow>
              ))}
            </Card>
          )}

          {byFacility.map(({ facility, pitches }) => (
            <Card key={facility.facility_id}>
              <Heading level={3}>{facility.facility_name}</Heading>
              <Body tone="muted">
                {facility.area_name}: {facility.address}
                {facility.landmark ? `, ${facility.landmark}` : ""}
              </Body>
              {owner && (
                <View style={{ flexDirection: "row", gap: space.sm }}>
                  <Button
                    variant="outline"
                    icon="create-outline"
                    label="Details"
                    accessibilityLabel={`Edit details for ${facility.facility_name}`}
                    onPress={() =>
                      router.push({
                        pathname: "/venue/details",
                        params: {
                          organizationId,
                          facilityId: facility.facility_id,
                        },
                      })
                    }
                    style={{ flex: 1 }}
                  />
                  <Button
                    variant="outline"
                    icon="pin-outline"
                    label="Map pin"
                    accessibilityLabel={`Map pin for ${facility.facility_name}`}
                    onPress={() =>
                      router.push({
                        pathname: "/venue/pin",
                        params: {
                          organizationId,
                          facilityId: facility.facility_id,
                        },
                      })
                    }
                    style={{ flex: 1 }}
                  />
                </View>
              )}
              {pitches.map((pitch) => (
                <PitchRow
                  key={pitch.pitch_id}
                  pitch={pitch}
                  disabled={!owner}
                  onPress={() =>
                    router.push({
                      pathname: "/venue/hours",
                      params: { organizationId, pitchId: pitch.pitch_id },
                    })
                  }
                />
              ))}
            </Card>
          ))}
          <Body tone="muted" size={14}>
            Adding another facility or pitch is on the website for now.
          </Body>
        </>
      )}
    </Screen>
  );
}

function groupByFacility(rows: FacilityPitchRow[]) {
  const groups: { facility: FacilityPitchRow; pitches: FacilityPitchRow[] }[] =
    [];
  for (const row of rows) {
    const group = groups.find(
      (item) => item.facility.facility_id === row.facility_id,
    );
    if (group) group.pitches.push(row);
    else groups.push({ facility: row, pitches: [row] });
  }
  return groups;
}

function StepRow({
  title,
  state,
  children,
}: {
  title: string;
  state: StepState;
  children?: React.ReactNode;
}) {
  const colors = useColors();
  const icon = {
    done: "checkmark-circle",
    now: "ellipse-outline",
    waiting: "time-outline",
    later: "ellipse-outline",
  } as const;
  return (
    <View style={styles.step}>
      <Ionicons
        name={icon[state]}
        size={24}
        color={
          state === "done"
            ? colors.link
            : state === "now"
              ? colors.text
              : colors.textMuted
        }
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Body
          weight={state === "now" ? "bold" : "semibold"}
          tone={state === "later" ? "muted" : "default"}
        >
          {title}
        </Body>
        <Body tone="muted" size={14}>
          {state === "done"
            ? "Done"
            : state === "waiting"
              ? "Waiting"
              : state === "now"
                ? "To do now"
                : "Later"}
        </Body>
        {children}
      </View>
    </View>
  );
}

function ReviewAgain({
  organizationId,
  note,
  owner,
}: {
  organizationId: string;
  note: string | null;
  owner: boolean;
}) {
  const auth = useAuth();
  const colors = useColors();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function ask() {
    setBusy(true);
    setError(null);
    try {
      const response = await requestVenueReview(organizationId);
      if (response.status !== 200)
        setError(
          (response.data as { error?: string }).error ??
            "That did not work. Try again.",
        );
      await auth.refresh();
    } catch {
      setError("We could not reach PitchPadi. Check your connection.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: space.sm, marginTop: space.xs }}>
      {note ? (
        <View style={[styles.note, { backgroundColor: colors.dangerSoft }]}>
          <Body>{note}</Body>
        </View>
      ) : null}
      {owner && (
        <>
          <Body tone="muted">
            Make the changes, then ask PitchPadi to look again.
          </Body>
          <Button label="Ask for another review" onPress={ask} busy={busy} />
        </>
      )}
      {error ? <Body tone="danger">{error}</Body> : null}
    </View>
  );
}

function PitchRow({
  pitch,
  onPress,
  disabled,
}: {
  pitch: FacilityPitchRow;
  onPress: () => void;
  disabled: boolean;
}) {
  const colors = useColors();
  const live = pitch.public_status === "published";
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={`${pitch.pitch_name}, ${pitch.pitch_type}. ${live ? "Live" : pitch.has_schedule ? "Private" : "No hours yet"}. Hours and prices`}
      onPress={onPress}
      disabled={disabled}
      style={[styles.pitch, { borderColor: colors.border }]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Body weight="semibold" size={17}>
          {pitch.pitch_name} · {pitch.pitch_type}
        </Body>
        <StatusPill
          tone={live ? "paid" : pitch.has_schedule ? "pending" : "collect"}
          label={
            live
              ? "Live for players"
              : pitch.has_schedule
                ? "Private"
                : "No hours or prices yet"
          }
        />
      </View>
      {!disabled && (
        <View style={{ alignItems: "flex-end" }}>
          <Body tone="link" weight="semibold">
            Hours and prices
          </Body>
          <Ionicons name="chevron-forward" size={18} color={colors.link} />
        </View>
      )}
    </Press>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: "row", gap: space.md, paddingVertical: space.sm },
  note: { borderRadius: 12, padding: space.md },
  pitch: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderTopWidth: 1,
    paddingTop: space.md,
    marginTop: space.xs,
  },
});
