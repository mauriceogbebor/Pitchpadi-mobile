/** The few fields "Play again" needs from a booking. */
export type GameLike = {
  reference: string;
  status: string;
  localDate: string;
  localStart: string;
  durationMinutes: number;
  pitch: { id: string; bookable: boolean };
};

/**
 * A player's regular games (RB-01): one per pitch, weekday, kick-off and
 * length, most recent first (bookings arrive newest first), leaving out
 * cancelled and refunded ones and pitches that no longer take bookings.
 * Display only: the API decides what is open.
 */
export function regularGames<T extends GameLike>(bookings: T[], max = 4): T[] {
  const seen = new Set<string>();
  const games: T[] = [];
  for (const booking of bookings) {
    if (
      booking.status === "cancelled" ||
      booking.status === "refunded" ||
      !booking.pitch.bookable
    )
      continue;
    const weekday = new Date(`${booking.localDate}T12:00:00Z`).getUTCDay();
    const key = `${booking.pitch.id}:${weekday}:${booking.localStart}:${booking.durationMinutes}`;
    if (seen.has(key)) continue;
    seen.add(key);
    games.push(booking);
    if (games.length === max) break;
  }
  return games;
}
