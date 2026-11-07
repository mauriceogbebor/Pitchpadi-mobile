import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  addFacilityPhoto,
  listFacilityPhotos,
  removeFacilityPhoto,
  setCoverPhoto,
} from "@/api/generated";
import { useAuth } from "@/auth/auth-context";
import { needsVenue } from "@/components/needs-venue";
import {
  Body,
  Button,
  Card,
  Heading,
  Notice,
  Screen,
  Skeleton,
} from "@/components/ui";
import { StatusPill } from "@/components/status-pill";
import { VenuePhoto } from "@/components/venue-photo";
import { pickPhoto, preparePhoto } from "@/lib/photo-upload";
import { radius, space } from "@/theme/tokens";

const MAX_PHOTOS = 3;

/**
 * Venue photos (Prompt 5, MK-F2): up to three, the first is the cover on
 * search cards. Players see them on the venue page; shared links show the
 * cover. Photos are shrunk on the phone before they are sent.
 */
function PhotosScreen() {
  const { organizationId, facilityId, facilityName } = useLocalSearchParams<{
    organizationId: string;
    facilityId: string;
    facilityName?: string;
  }>();
  const auth = useAuth();
  const userId = auth.status === "signedIn" ? auth.me.user.id : null;
  const owner =
    auth.status === "signedIn" &&
    auth.me.organizations.find((item) => item.id === organizationId)?.role ===
      "owner";
  const queryClient = useQueryClient();
  const key = ["photos", userId, organizationId, facilityId];
  const photos = useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await listFacilityPhotos(organizationId, facilityId);
      if (response.status !== 200)
        throw new Error("We could not load the photos.");
      return response.data.photos;
    },
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: key });
    // Search cards and venue pages show the cover.
    void queryClient.invalidateQueries({ queryKey: ["search"] });
  };

  async function add() {
    setError(null);
    const picked = await pickPhoto();
    if (!picked) return;
    setBusy("add");
    try {
      const body = await preparePhoto(picked);
      const response = await addFacilityPhoto(organizationId, facilityId, body);
      if (response.status === 201) refresh();
      else
        setError(
          response.status === 413
            ? "That photo is too large. Choose a smaller one."
            : ((response.data as { error?: string }).error ??
                "We could not add this photo."),
        );
    } catch {
      setError(
        "We could not send the photo. Check your connection and try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function act(id: string, action: "cover" | "remove") {
    setError(null);
    setBusy(id);
    try {
      const response =
        action === "cover"
          ? await setCoverPhoto(organizationId, facilityId, id)
          : await removeFacilityPhoto(organizationId, facilityId, id);
      if (response.status === 200) refresh();
      else setError("That did not work. Try again.");
    } catch {
      setError("We could not reach PitchPadi. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const list = photos.data ?? [];
  return (
    <Screen edges={["bottom"]}>
      <View style={{ gap: space.xs }}>
        <Heading>Photos</Heading>
        <Body tone="muted">
          {facilityName ? `${facilityName}: ` : ""}up to {MAX_PHOTOS} photos.
          The first is the cover players see in search and on shared links. Show
          the pitch itself, in daylight or under the lights.
        </Body>
      </View>

      {photos.isPending ? (
        <Skeleton height={200} count={1} />
      ) : photos.isError ? (
        <Notice
          tone="danger"
          title={photos.error.message}
          action={
            <Button
              variant="outline"
              label="Try again"
              onPress={() => void photos.refetch()}
            />
          }
        />
      ) : list.length === 0 ? (
        <Card variant="flat">
          <Body weight="semibold">No photos yet</Body>
          <Body tone="muted">
            Venues with a photo get noticed first. A wide shot of the pitch
            works best.
          </Body>
        </Card>
      ) : (
        list.map((photo, index) => (
          <Card key={photo.id} style={styles.photoCard}>
            <VenuePhoto photo={photo} style={styles.photo} />
            <View style={styles.actions}>
              {index === 0 ? (
                <StatusPill tone="paid" label="Cover" />
              ) : owner ? (
                <Button
                  variant="outline"
                  label="Make cover"
                  accessibilityLabel={`Make photo ${index + 1} the cover`}
                  busy={busy === photo.id}
                  disabled={busy !== null}
                  onPress={() => void act(photo.id, "cover")}
                />
              ) : (
                <View />
              )}
              {owner ? (
                <Button
                  variant="ghost"
                  icon="trash-outline"
                  label="Remove"
                  accessibilityLabel={`Remove photo ${index + 1}`}
                  disabled={busy !== null}
                  onPress={() => void act(photo.id, "remove")}
                />
              ) : null}
            </View>
          </Card>
        ))
      )}

      {error ? (
        <Body tone="danger" accessibilityLiveRegion="assertive">
          {error}
        </Body>
      ) : null}
      {owner ? (
        <Button
          icon="image-outline"
          label={
            list.length >= MAX_PHOTOS
              ? `${MAX_PHOTOS} photos added. Remove one to add another`
              : "Add a photo"
          }
          onPress={() => void add()}
          busy={busy === "add"}
          disabled={busy !== null || list.length >= MAX_PHOTOS}
        />
      ) : (
        <Body tone="muted">Only the owner can change the photos.</Body>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoCard: { padding: 0, overflow: "hidden", gap: 0 },
  photo: { width: "100%", aspectRatio: 4 / 3 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: space.md,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
});

export default needsVenue(PhotosScreen);
