import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, View } from "react-native";
import { getFacility, setFacilityLocation } from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import {
  Body,
  Button,
  Card,
  Divider,
  Field,
  Heading,
  Notice,
  Screen,
  Skeleton,
} from "@/components/ui";
import { type Point, parsePoint, pinDirectionsUrl } from "@/lib/geo";
import { space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";
import { needsVenue } from "@/components/needs-venue";

type ErrorBody = { error?: string; fieldErrors?: Record<string, string[]> };

/**
 * The venue's map pin (MK-01). With it, players see how far away the venue
 * is and directions go to the gate instead of a search for the address.
 * The quickest way is to stand at the venue and use this phone's location;
 * pasting coordinates or a Google Maps link also works.
 */
function VenuePinScreen() {
  const { organizationId, facilityId } = useLocalSearchParams<{
    organizationId: string;
    facilityId: string;
  }>();
  const auth = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const userId = auth.status === "signedIn" ? auth.me.user.id : null;
  const [text, setText] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"here" | "paste" | "clear" | null>(null);
  const [saved, setSaved] = useState(false);

  const facility = useQuery({
    queryKey: ["facility", userId, organizationId, facilityId],
    queryFn: async () => {
      const response = await getFacility(organizationId, facilityId);
      if (response.status !== 200)
        throw new Error("We could not load this venue.");
      return response.data.facility;
    },
  });
  const pin: Point | null =
    facility.data?.latitude != null && facility.data?.longitude != null
      ? {
          latitude: facility.data.latitude,
          longitude: facility.data.longitude,
        }
      : null;

  async function save(
    location: Point | null,
    from: "here" | "paste" | "clear",
  ) {
    setBusy(from);
    setError(null);
    setFieldError(null);
    setSaved(false);
    try {
      // Setting the same pin twice is harmless, so a retry is always safe.
      const response = await setFacilityLocation(organizationId, facilityId, {
        location,
      });
      if (response.status !== 200) {
        const body = response.data as ErrorBody;
        const message =
          body.fieldErrors?.["location"]?.[0] ??
          Object.values(body.fieldErrors ?? {})[0]?.[0] ??
          body.error ??
          "We could not save the pin.";
        if (from === "paste") setFieldError(message);
        else setError(message);
        return;
      }
      setText("");
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["facility"] });
      await queryClient.invalidateQueries({ queryKey: ["search"] });
    } catch {
      setError(
        "We could not reach PitchPadi. Check your connection and try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function pinHere() {
    setBusy("here");
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError(
          "Location is off for PitchPadi. Turn it on in your phone's settings, or paste the coordinates below.",
        );
        setBusy(null);
        return;
      }
      // At the venue the owner wants the exact gate, so ask for a fresh, precise fix.
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      await save(
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        "here",
      );
    } catch {
      setError(
        "We could not find this phone's location. Try again outside, or paste the coordinates below.",
      );
      setBusy(null);
    }
  }

  function savePasted() {
    const point = parsePoint(text);
    if (!point) {
      setFieldError(
        "Paste coordinates like 6.4474, 3.4723, or a full Google Maps link. Short maps.app.goo.gl links do not include the point: open the link and copy the numbers.",
      );
      return;
    }
    void save(point, "paste");
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ title: "Map pin" }} />
      <Screen edges={["bottom"]}>
        {facility.isPending ? (
          <Skeleton height={80} count={3} />
        ) : facility.isError ? (
          <Notice
            tone="danger"
            title={facility.error.message}
            action={
              <Button
                variant="outline"
                label="Try again"
                onPress={() => void facility.refetch()}
              />
            }
          />
        ) : (
          <>
            <View style={{ gap: space.xs }}>
              <Heading level={2}>{facility.data.name}</Heading>
              <Body tone="muted">
                Players see how far away you are, and directions take them
                straight to your gate.
              </Body>
            </View>

            <Card style={{ gap: space.md }}>
              <View style={{ flexDirection: "row", gap: space.md }}>
                <Ionicons
                  name={pin ? "pin" : "pin-outline"}
                  size={24}
                  color={pin ? colors.success : colors.textMuted}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Body weight="semibold" accessibilityLiveRegion="polite">
                    {saved ? "Pin saved" : pin ? "Pinned" : "Not pinned yet"}
                  </Body>
                  <Body tone="muted" size={14} numeric selectable>
                    {pin
                      ? `${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)}`
                      : "Players get directions from your address until you add a pin."}
                  </Body>
                </View>
              </View>
              {pin ? (
                <Button
                  variant="outline"
                  icon="map-outline"
                  label="Check it in Google Maps"
                  onPress={() => void Linking.openURL(pinDirectionsUrl(pin))}
                />
              ) : null}
            </Card>

            <View style={{ gap: space.sm }}>
              <Body weight="semibold">At the venue now?</Body>
              <Button
                icon="locate-outline"
                label={pin ? "Move the pin to where I am" : "Pin where I am"}
                onPress={() => void pinHere()}
                busy={busy === "here"}
                disabled={busy !== null}
                accessibilityHint="Uses this phone's location"
              />
              {error ? (
                <Body tone="danger" accessibilityLiveRegion="assertive">
                  {error}
                </Body>
              ) : null}
            </View>

            <Divider />

            <View style={{ gap: space.sm }}>
              <Field
                label="Or paste coordinates or a Google Maps link"
                value={text}
                onChangeText={(value) => {
                  setText(value);
                  setFieldError(null);
                }}
                placeholder="6.4474, 3.4723"
                autoCapitalize="none"
                autoCorrect={false}
                error={fieldError}
              />
              <Button
                variant="outline"
                label="Save this pin"
                onPress={savePasted}
                busy={busy === "paste"}
                disabled={busy !== null || text.trim().length < 5}
              />
            </View>

            {pin ? (
              <Button
                variant="ghost"
                label="Remove the pin"
                onPress={() => void save(null, "clear")}
                busy={busy === "clear"}
                disabled={busy !== null}
              />
            ) : null}
          </>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

export default needsVenue(VenuePinScreen);
