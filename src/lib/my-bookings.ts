import { useQuery } from "@tanstack/react-query";
import { listMyBookings } from "@/api/generated";
import { useAuth } from "@/auth/auth-context";

/**
 * The signed-in player's games (not finished, coming up, earlier). One cached
 * answer for the Bookings tab and Play's "Your next game", keyed by account
 * (AuthProvider also clears the cache when the account changes).
 */
export function useMyBookings() {
  const auth = useAuth();
  const userId = auth.status === "signedIn" ? auth.me.user.id : null;
  return useQuery({
    queryKey: ["myBookings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const response = await listMyBookings();
      if (response.status !== 200)
        throw new Error("We could not load your bookings.");
      return response.data;
    },
  });
}
