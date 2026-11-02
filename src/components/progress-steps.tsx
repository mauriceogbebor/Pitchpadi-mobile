import { StyleSheet, View } from "react-native";
import { Body } from "@/components/ui";
import { space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

export const CHECKOUT_STEPS = [
  "Time held",
  "Your details",
  "Payment",
  "Booked",
] as const;

/** Where you are in paying for a game: four real steps, in order. */
export function ProgressSteps({ current }: { current: number }) {
  const colors = useColors();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${CHECKOUT_STEPS.length}: ${CHECKOUT_STEPS[current]}`}
      style={styles.row}
    >
      {CHECKOUT_STEPS.map((step, index) => {
        const done = index < current;
        const now = index === current;
        return (
          <View key={step} style={styles.step}>
            <View
              style={[
                styles.bar,
                {
                  backgroundColor: done || now ? colors.primary : colors.border,
                  opacity: now ? 1 : done ? 0.55 : 1,
                },
              ]}
            />
            <Body
              size={12}
              weight={now ? "semibold" : "medium"}
              tone={now ? "default" : "muted"}
              numberOfLines={1}
            >
              {step}
            </Body>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm },
  step: { flex: 1, gap: 6 },
  bar: { height: 4, borderRadius: 2 },
});
