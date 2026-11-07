import { Redirect, useLocalSearchParams } from "expo-router";
import type { ComponentType } from "react";

/**
 * Venue screens open from the Venue tab, which says which venue they are for.
 * Opened by address alone (a web reload, an old link), they would ask the API
 * about no venue at all; send them back to the Venue tab instead (R11-F4).
 */
export function needsVenue(Screen: ComponentType): ComponentType {
  return function VenueScreen() {
    const { organizationId } = useLocalSearchParams<{
      organizationId?: string;
    }>();
    if (!organizationId) return <Redirect href="/venue" />;
    return <Screen />;
  };
}
