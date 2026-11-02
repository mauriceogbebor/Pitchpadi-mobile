import { useQuery } from "@tanstack/react-query";
import { getOwnerCalendar } from "@/api/generated";
import { useAuth } from "@/auth/auth-context";

/**
 * One local day of a venue's bookings and live holds. Every Venue screen uses
 * this one query, so the day list, a booking's details and "Add booking" share
 * the same cached answer and refresh together. Keyed by account as well as venue
 * (AuthProvider also clears the cache when the account changes).
 */
export function useVenueCalendar(
  organizationId: string | undefined,
  date: string,
) {
  const auth = useAuth();
  const userId = auth.status === "signedIn" ? auth.me.user.id : null;
  return useQuery({
    queryKey: venueCalendarKey(userId, organizationId, date),
    enabled: !!organizationId && !!userId,
    // Bookings arrive from players at any time: keep the day fresh while open.
    refetchInterval: 60_000,
    queryFn: async () => {
      const response = await getOwnerCalendar(organizationId!, { date });
      if (response.status !== 200)
        throw new Error(
          (response.data as { error?: string }).error ??
            "We could not load this day's bookings.",
        );
      return response.data.calendar;
    },
  });
}

export function venueCalendarKey(
  userId: string | null,
  organizationId: string | undefined,
  date?: string,
) {
  return date
    ? ["calendar", userId, organizationId, date]
    : ["calendar", userId, organizationId];
}

export * from "./venue-rules";
