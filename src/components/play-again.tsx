import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { Body, Card, Press, Section } from "@/components/ui";
import { formatDuration } from "@/lib/format";
import { useMyBookings } from "@/lib/my-bookings";
import { regularGames } from "@/lib/regular-games";
import { radius, space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX = 4;

/**
 * Play again (RB-01): the player's regular games, one tap from "Book again".
 */
export function PlayAgain({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  const bookings = useMyBookings();
  const games = regularGames(bookings.data?.past ?? [], compact ? 1 : MAX);
  if (!games.length) return null;
  if (compact) {
    const game = games[0];
    const weekday =
      WEEKDAYS[new Date(`${game.localDate}T12:00:00Z`).getUTCDay()];
    return (
      <Press
        accessibilityRole="button"
        accessibilityLabel={`Book again at ${game.pitch.facilityName}, ${weekday} ${game.localStart}`}
        onPress={() =>
          router.push({
            pathname: "/rebook",
            params: {
              pitchId: game.pitch.id,
              startsAt: game.startsAt,
              duration: String(game.durationMinutes),
            },
          })
        }
      >
        <Card
          style={{ flexDirection: "row", alignItems: "center", gap: space.md }}
        >
          <Ionicons name="repeat" size={24} color={colors.link} />
          <View style={{ flex: 1 }}>
            <Body weight="semibold">Play again</Body>
            <Body tone="muted" size={14} numberOfLines={1}>
              {game.pitch.facilityName} · {weekday} {game.localStart}
            </Body>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Card>
      </Press>
    );
  }

  return (
    <Section title="Play again">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm }}
      >
        {games.map((game) => {
          const weekday =
            WEEKDAYS[new Date(`${game.localDate}T12:00:00Z`).getUTCDay()];
          return (
            <Press
              key={game.reference}
              accessibilityRole="button"
              accessibilityLabel={`Book again: ${game.pitch.facilityName}, ${weekday} at ${game.localStart}`}
              onPress={() =>
                router.push({
                  pathname: "/rebook",
                  params: {
                    pitchId: game.pitch.id,
                    startsAt: game.startsAt,
                    duration: String(game.durationMinutes),
                  },
                })
              }
            >
              <Card style={styles.card}>
                <View style={[styles.icon, { backgroundColor: colors.chosen }]}>
                  <Ionicons name="repeat" size={18} color={colors.onChosen} />
                </View>
                <Body weight="semibold" numberOfLines={1}>
                  {game.pitch.facilityName}
                </Body>
                <Body tone="muted" size={14} numeric numberOfLines={1}>
                  {weekday} {game.localStart},{" "}
                  {formatDuration(game.durationMinutes)}
                </Body>
                <Body tone="link" weight="semibold" size={14}>
                  Book again
                </Body>
              </Card>
            </Press>
          );
        })}
      </ScrollView>
    </Section>
  );
}

const styles = StyleSheet.create({
  card: { width: 200, gap: 4, borderRadius: radius.lg },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.xs,
  },
});
