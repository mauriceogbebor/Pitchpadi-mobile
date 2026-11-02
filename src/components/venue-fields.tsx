import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { listAreas } from "@/api/generated";
import { AmenityPicker } from "@/components/amenity-picker";
import { Chip } from "@/components/chips";
import { Body, Field, Skeleton } from "@/components/ui";
import type { Amenity } from "@/lib/amenities";
import { space } from "@/theme/tokens";

export type VenueDraft = {
  facilityName: string;
  areaId: string | null;
  address: string;
  landmark: string;
  amenities: Amenity[];
};

/** Name, Lagos area, address, landmark and amenities: setup and edit share these. */
export function VenueFields({
  value,
  onChange,
  errors,
}: {
  value: VenueDraft;
  onChange: (next: VenueDraft) => void;
  errors: Record<string, string | undefined>;
}) {
  const areas = useQuery({
    queryKey: ["areas"],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const response = await listAreas();
      if (response.status !== 200) throw new Error("We could not load areas.");
      return response.data.areas;
    },
  });
  const set = (patch: Partial<VenueDraft>) => onChange({ ...value, ...patch });
  return (
    <>
      <Field
        label="Venue name"
        placeholder="e.g. Lekki Sports Arena"
        value={value.facilityName}
        onChangeText={(facilityName) => set({ facilityName })}
        autoCapitalize="words"
        maxLength={80}
        error={errors.facilityName}
      />
      <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
        <Body weight="semibold">Lagos area</Body>
        {areas.isPending ? (
          <Skeleton height={44} count={1} />
        ) : areas.isError ? (
          <Body tone="danger">
            {areas.error.message} Check your connection.
          </Body>
        ) : (
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}
          >
            {areas.data.map((area) => (
              <Chip
                key={area.id}
                label={area.name}
                selected={area.id === value.areaId}
                onPress={() => set({ areaId: area.id })}
              />
            ))}
          </View>
        )}
        {errors.areaId ? <Body tone="danger">{errors.areaId}</Body> : null}
      </View>
      <Field
        label="Street address"
        placeholder="e.g. 12 Admiralty Way, Lekki Phase 1"
        value={value.address}
        onChangeText={(address) => set({ address })}
        maxLength={200}
        error={errors.address}
      />
      <Field
        label="Landmark or directions (optional)"
        hint="Helps players find you: a junction, a bus stop, a big shop nearby."
        placeholder="e.g. opposite Shoprite"
        value={value.landmark}
        onChangeText={(landmark) => set({ landmark })}
        maxLength={300}
        error={errors.landmark}
      />
      <AmenityPicker
        value={value.amenities}
        onChange={(amenities) => set({ amenities })}
      />
    </>
  );
}

/** The API's field errors ({ field: [message] }) as one message per field. */
export function firstErrors(
  fieldErrors: Record<string, string[] | undefined> | undefined,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fieldErrors ?? {})
      .filter(([, list]) => list?.length)
      .map(([field, list]) => [field, list![0]]),
  );
}
