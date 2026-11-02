/** Venue amenities, in the order players see them (same as the website). */
export const AMENITIES = [
  { value: "floodlights", label: "Floodlights", icon: "bulb-outline" },
  { value: "parking", label: "Parking", icon: "car-outline" },
  { value: "changing_rooms", label: "Changing rooms", icon: "shirt-outline" },
  { value: "toilets", label: "Toilets", icon: "man-outline" },
  { value: "showers", label: "Showers", icon: "water-outline" },
  { value: "drinking_water", label: "Drinking water", icon: "beaker-outline" },
  { value: "seating", label: "Seating for spectators", icon: "people-outline" },
  {
    value: "security",
    label: "Security on site",
    icon: "shield-checkmark-outline",
  },
] as const;

export type Amenity = (typeof AMENITIES)[number]["value"];

/** The venue's amenities in display order; unknown values are dropped. */
export function venueAmenities(values: readonly string[]) {
  return AMENITIES.filter((item) => values.includes(item.value));
}
