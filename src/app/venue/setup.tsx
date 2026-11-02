import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { createOrganization } from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { Chip } from "@/components/chips";
import { Body, Button, Field, Heading, Notice, Screen } from "@/components/ui";
import {
  firstErrors,
  VenueFields,
  type VenueDraft,
} from "@/components/venue-fields";
import { space } from "@/theme/tokens";

type ErrorBody = { error?: string; fieldErrors?: Record<string, string[]> };

/**
 * Set up a venue: the venue, its Lagos address, what it has, and the first pitch.
 * It starts private and waits for PitchPadi's review before it can publish.
 */
export default function SetupVenueScreen() {
  const auth = useAuth();
  const [venue, setVenue] = useState<VenueDraft>({
    facilityName: "",
    areaId: null,
    address: "",
    landmark: "",
    amenities: [],
  });
  const [pitchName, setPitchName] = useState("Pitch A");
  const [pitchType, setPitchType] = useState<"5-a-side" | "7-a-side">(
    "5-a-side",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const waiting =
    auth.status === "signedIn"
      ? auth.me.organizations.find(
          (item) => item.role === "owner" && item.status !== "approved",
        )
      : undefined;

  const openVenue = (organizationId: string) =>
    router.replace({
      pathname: "/venue/manage",
      params: { organizationId },
    });

  async function save() {
    const next: Record<string, string> = {};
    if (venue.facilityName.trim().length < 2)
      next.facilityName = "Enter the venue's name";
    if (!venue.areaId) next.areaId = "Choose a Lagos area";
    if (venue.address.trim().length < 5)
      next.address = "Enter the street address";
    if (pitchName.trim().length < 2) next.pitchName = "Name the pitch";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    setError(null);
    try {
      const response = await createOrganization({
        organizationName: venue.facilityName.trim(),
        facilityName: venue.facilityName.trim(),
        areaId: venue.areaId!,
        address: venue.address.trim(),
        landmark: venue.landmark.trim(),
        amenities: venue.amenities,
        timeZone: "Africa/Lagos",
        pitchName: pitchName.trim(),
        pitchType,
        currency: "NGN",
      });
      if (response.status === 201) {
        await auth.refresh();
        openVenue(response.data.organizationId);
        return;
      }
      const body = response.data as ErrorBody;
      // A venue already waiting for review: often this same venue, saved by a
      // first try whose answer was lost. Refresh so the app can offer it.
      if (response.status === 409) await auth.refresh();
      setErrors(firstErrors(body.fieldErrors));
      setError(body.error ?? "We could not save your venue. Try again.");
    } catch {
      // The venue may have been saved before the connection dropped.
      await auth.refresh().catch(() => undefined);
      setError(
        "We could not reach PitchPadi. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (auth.status !== "signedIn")
    return (
      <Screen edges={["bottom"]}>
        <Heading>Set up your venue</Heading>
        <Body tone="muted">Sign in with your phone number first.</Body>
        <Button label="Sign in" onPress={() => router.push("/sign-in")} />
      </Screen>
    );

  if (waiting)
    return (
      <Screen edges={["bottom"]}>
        <Notice
          title={`${waiting.name} is set up`}
          action={
            <Button
              label="Open your venue"
              onPress={() => openVenue(waiting.id)}
            />
          }
        >
          <Body>
            {waiting.status === "rejected"
              ? "PitchPadi asked for a few changes. Open it to see the note."
              : "PitchPadi is checking it, usually within one working day. Meanwhile, set your hours and prices."}
          </Body>
        </Notice>
      </Screen>
    );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen edges={["bottom"]}>
        <Heading>Set up your venue</Heading>
        <Body tone="muted">
          It stays private until PitchPadi has checked it, usually within one
          working day. We may call you to confirm the address.
        </Body>
        <VenueFields value={venue} onChange={setVenue} errors={errors} />
        <Heading level={3}>First pitch</Heading>
        <Field
          label="Pitch name"
          placeholder="e.g. Pitch A"
          value={pitchName}
          onChangeText={setPitchName}
          maxLength={80}
          error={errors.pitchName}
        />
        <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
          <Body weight="semibold">Pitch type</Body>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            {(["5-a-side", "7-a-side"] as const).map((type) => (
              <Chip
                key={type}
                label={type}
                selected={type === pitchType}
                onPress={() => setPitchType(type)}
              />
            ))}
          </View>
        </View>
        {error ? (
          <Body tone="danger" accessibilityLiveRegion="assertive">
            {error}
          </Body>
        ) : null}
        <Button label="Save and send for review" onPress={save} busy={busy} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
