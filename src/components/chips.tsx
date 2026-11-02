import { useEffect, type ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Body, Press } from "@/components/ui";
import { radius, space, TAP } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

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

/** One choice in a row of filters. */
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
    <Press
      accessibilityRole="button"
      accessibilityState={{ selected }}
      aria-selected={selected}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={2}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Body
        weight="semibold"
        size={15}
        tone={selected ? "onPrimary" : "default"}
      >
        {label}
      </Body>
    </Press>
  );
}

/**
 * A kick-off time, like a ticket: outlined at rest, so a list of times stays
 * light. The chosen time fills in and gives a small pop (not with reduced motion).
 */
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
  const reduce = useReducedMotion();
  const pop = useSharedValue(1);
  useEffect(() => {
    if (selected && !reduce)
      pop.set(
        withSequence(
          withTiming(1.06, { duration: 110 }),
          withTiming(1, { duration: 140 }),
        ),
      );
  }, [selected, reduce, pop]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
  }));
  return (
    <Animated.View style={animated}>
      <Press
        accessibilityRole="button"
        accessibilityState={{ selected }}
        aria-selected={selected}
        accessibilityLabel={accessibilityLabel ?? label}
        onPress={onPress}
        style={[
          styles.time,
          {
            backgroundColor: selected ? colors.chosen : colors.card,
            borderColor: selected ? colors.chosen : colors.border,
          },
        ]}
      >
        <Body
          weight="semibold"
          numeric
          style={{ color: selected ? colors.onChosen : colors.text }}
        >
          {label}
        </Body>
      </Press>
    </Animated.View>
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
    minHeight: TAP,
    minWidth: 92,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
