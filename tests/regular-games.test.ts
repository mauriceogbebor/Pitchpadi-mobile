import assert from "node:assert/strict";
import { test } from "node:test";
import { regularGames } from "../src/lib/regular-games.ts";

const game = (
  reference: string,
  localDate: string,
  extra: Partial<{
    status: string;
    localStart: string;
    durationMinutes: number;
    pitchId: string;
    bookable: boolean;
  }> = {},
) => ({
  reference,
  status: extra.status ?? "completed",
  localDate,
  localStart: extra.localStart ?? "7:00 pm",
  durationMinutes: extra.durationMinutes ?? 60,
  pitch: { id: extra.pitchId ?? "glover", bookable: extra.bookable ?? true },
});

test("regular games keep one per pitch, weekday, time and length, newest first", () => {
  const games = regularGames([
    game("PP-3", "2026-10-27"), // Tuesday
    game("PP-2", "2026-10-20"), // Tuesday again: same game
    game("PP-1", "2026-10-22"), // Thursday
    game("PP-0", "2026-10-13", { localStart: "8:00 pm" }),
    game("PP-9", "2026-10-06", { durationMinutes: 90 }),
    game("PP-8", "2026-10-05", { pitchId: "addo" }),
  ]);
  assert.deepEqual(
    games.map((g) => g.reference),
    ["PP-3", "PP-1", "PP-0", "PP-9"],
  );
});

test("cancelled, refunded and no-longer-bookable games are not offered again", () => {
  const games = regularGames([
    game("PP-5", "2026-10-27", { status: "cancelled" }),
    game("PP-4", "2026-10-26", { status: "refunded" }),
    game("PP-6", "2026-10-25", { pitchId: "closed", bookable: false }),
    game("PP-3", "2026-10-20", { status: "no_show" }),
  ]);
  assert.deepEqual(
    games.map((g) => g.reference),
    ["PP-3"],
  );
});
