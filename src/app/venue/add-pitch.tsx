import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { addPitch } from "@/api/generated";
import { Chip } from "@/components/chips";
import { needsVenue } from "@/components/needs-venue";
import { Body, Button, Field, Heading, Screen } from "@/components/ui";
import { space } from "@/theme/tokens";

type ErrorBody = { error?: string; fieldErrors?: Record<string, string[]> };

/**
 * Add a pitch to a venue (Prompt 4, M3-F1). It starts private; the owner sets
 * its hours and prices next, then publishes it. The API refuses a second pitch
 * with the same name, so a retried tap never makes two.
 */
function AddPitchScreen() {
  const { organizationId, facilityId, facilityName } = useLocalSearchParams<{
    organizationId: string;
    facilityId: string;
    facilityName?: string;
  }>();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<"5-a-side" | "7-a-side">("5-a-side");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (name.trim().length < 2) {
      setErrors({ pitchName: "Name the pitch, e.g. Pitch B" });
      return;
    }
    setBusy(true);
    setErrors({});
    setError(null);
    try {
      const response = await addPitch(organizationId, facilityId, {
        pitchName: name.trim(),
        pitchType: type,
        currency: "NGN",
      });
      if (response.status === 201) {
        void queryClient.invalidateQueries({ queryKey: ["facilities"] });
        // Straight on to what makes it bookable: hours and prices.
        router.replace({
          pathname: "/venue/hours",
          params: { organizationId, pitchId: response.data.pitchId },
        });
        return;
      }
      const body = response.data as ErrorBody;
      if (body.fieldErrors)
        setErrors(
          Object.fromEntries(
            Object.entries(body.fieldErrors).map(([field, list]) => [
              field,
              list[0],
            ]),
          ),
        );
      else setError(body.error ?? "We could not add this pitch.");
    } catch {
      setError(
        "We could not reach PitchPadi. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen edges={["bottom"]}>
        <Heading>Add a pitch</Heading>
        <Body tone="muted">
          {facilityName ? `At ${facilityName}. ` : ""}It stays private until you
          set its hours and prices and publish it.
        </Body>
        <Field
          label="Pitch name"
          placeholder="e.g. Pitch B"
          value={name}
          onChangeText={setName}
          maxLength={80}
          error={errors.pitchName}
        />
        <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
          <Body weight="semibold">Pitch type</Body>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            {(["5-a-side", "7-a-side"] as const).map((item) => (
              <Chip
                key={item}
                label={item}
                selected={item === type}
                onPress={() => setType(item)}
              />
            ))}
          </View>
        </View>
        {error ? (
          <Body tone="danger" accessibilityLiveRegion="assertive">
            {error}
          </Body>
        ) : null}
        <Button
          label="Add pitch, then set hours"
          onPress={() => void save()}
          busy={busy}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

export default needsVenue(AddPitchScreen);
