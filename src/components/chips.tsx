import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Body } from "@/components/ui";
import { palette, radius, space, TAP } from "@/theme/tokens";
import { useColors, useIsDark } from "@/theme/use-theme";

/** A labelled, sideways-scrolling row of choices. */
export function ChipRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: space.sm }}>
      <Body weight="semibold">{label}</Body>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.sm }}
        accessibilityLabel={label}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** One choice in a ChipRow. */
export function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Body weight="semibold" tone={selected ? "onPrimary" : "default"}>
        {label}
      </Body>
    </Pressable>
  );
}

/** A kick-off time: solid when open to pick, outlined when chosen elsewhere. */
export function TimeChip({
  label,
  selected = false,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const colors = useColors();
  const dark = useIsDark();
  // Chosen: lime on light, white on dark (where open times are already lime).
  const chosenBackground = dark ? palette.white : palette.volt;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.time,
        {
          backgroundColor: selected ? chosenBackground : colors.primary,
          borderColor: selected ? colors.text : colors.primary,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Body
        weight="semibold"
        tone={selected ? "default" : "onPrimary"}
        style={selected ? { color: palette.night } : undefined}
      >
        {label}
      </Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: TAP - 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.lg,
    justifyContent: "center",
  },
  time: {
    borderRadius: radius.sm,
    borderWidth: 2,
    paddingHorizontal: space.md,
    minHeight: 44,
    justifyContent: "center",
  },
});
