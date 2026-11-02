import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";
import { Body, Press } from "@/components/ui";
import { AMENITIES, type Amenity } from "@/lib/amenities";
import { radius, space, TAP } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

/** Tick what the venue has; players see these on the pitch page. */
export function AmenityPicker({
  value,
  onChange,
}: {
  value: Amenity[];
  onChange: (next: Amenity[]) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: space.sm }}>
      <Body weight="semibold">What does the venue have?</Body>
      <Body tone="muted">Players see these before they book.</Body>
      <View style={styles.grid}>
        {AMENITIES.map((item) => {
          const checked = value.includes(item.value);
          return (
            <Press
              key={item.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              aria-checked={checked}
              accessibilityLabel={item.label}
              onPress={() =>
                onChange(
                  checked
                    ? value.filter((v) => v !== item.value)
                    : AMENITIES.map((a) => a.value).filter(
                        (v) => v === item.value || value.includes(v),
                      ),
                )
              }
              style={[
                styles.item,
                {
                  backgroundColor: colors.card,
                  borderColor: checked ? colors.primary : colors.border,
                  borderWidth: checked ? 2 : 1,
                },
              ]}
            >
              <Ionicons
                name={checked ? "checkbox" : "square-outline"}
                size={22}
                color={checked ? colors.link : colors.textMuted}
              />
              <Ionicons name={item.icon} size={18} color={colors.textMuted} />
              <Body style={{ flex: 1 }}>{item.label}</Body>
            </Press>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space.sm },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: TAP,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
  },
});
