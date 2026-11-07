import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { getFacility, updateFacility } from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { Body, Button, Notice, Screen, Skeleton } from "@/components/ui";
import {
  firstErrors,
  VenueFields,
  type VenueDraft,
} from "@/components/venue-fields";
import { needsVenue } from "@/components/needs-venue";

type ErrorBody = { error?: string; fieldErrors?: Record<string, string[]> };

/** Edit the venue's name, area, address, landmark and amenities. */
function VenueDetailsScreen() {
  const { organizationId, facilityId } = useLocalSearchParams<{
    organizationId: string;
    facilityId: string;
  }>();
  const auth = useAuth();
  const userId = auth.status === "signedIn" ? auth.me.user.id : null;
  const facility = useQuery({
    queryKey: ["facility", userId, organizationId, facilityId],
    queryFn: async () => {
      const response = await getFacility(organizationId, facilityId);
      if (response.status !== 200)
        throw new Error("We could not load this venue.");
      return response.data.facility;
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen edges={["bottom"]}>
        {facility.isPending ? (
          <Skeleton height={60} count={4} />
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
          <EditForm
            organizationId={organizationId}
            facilityId={facilityId}
            initial={{
              facilityName: facility.data.name,
              areaId: facility.data.area_id,
              address: facility.data.address,
              landmark: facility.data.landmark ?? "",
              amenities: facility.data.amenities,
            }}
          />
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function EditForm({
  organizationId,
  facilityId,
  initial,
}: {
  organizationId: string;
  facilityId: string;
  initial: VenueDraft;
}) {
  const queryClient = useQueryClient();
  const [venue, setVenue] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      // Saving the same details twice is harmless, so a retry is always safe.
      const response = await updateFacility(organizationId, facilityId, {
        facilityName: venue.facilityName.trim(),
        areaId: venue.areaId!,
        address: venue.address.trim(),
        landmark: venue.landmark.trim(),
        amenities: venue.amenities,
      });
      if (response.status !== 200) {
        const body = response.data as ErrorBody;
        setErrors(firstErrors(body.fieldErrors));
        setError(body.error ?? "We could not save the changes.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["facilities"] });
      await queryClient.invalidateQueries({ queryKey: ["facility"] });
      router.back();
    } catch {
      setError(
        "We could not reach PitchPadi. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <VenueFields value={venue} onChange={setVenue} errors={errors} />
      {error ? (
        <Body tone="danger" accessibilityLiveRegion="assertive">
          {error}
        </Body>
      ) : null}
      <Button label="Save changes" onPress={save} busy={busy} />
    </>
  );
}

export default needsVenue(VenueDetailsScreen);
