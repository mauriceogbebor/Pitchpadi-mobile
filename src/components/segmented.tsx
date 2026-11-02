import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";
import { Body } from "@/components/ui";
import { motion, radius } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

/**
 * A few equal choices in one control (Any time / Morning / Afternoon /
 * Evening). The highlight slides to the chosen one.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const colors = useColors();
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const segment = width / options.length;
  const indicator = useAnimatedStyle(() => ({
    width: segment - 4,
    transform: [
      {
        translateX: reduce
          ? index * segment
          : withTiming(index * segment, { duration: motion.settle }),
      },
    ],
  }));
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: colors.muted }]}
    >
      {width > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            { backgroundColor: colors.card, borderColor: colors.border },
            indicator,
          ]}
        />
      )}
      {options.map((option) => {
        const chosen = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: chosen }}
            aria-checked={chosen}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={styles.segment}
          >
            <Body
              size={14}
              weight={chosen ? "semibold" : "medium"}
              tone={chosen ? "default" : "muted"}
              numberOfLines={1}
            >
              {option.label}
            </Body>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: radius.md,
    padding: 2,
    minHeight: 48,
  },
  indicator: {
    position: "absolute",
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: radius.md - 2,
    borderWidth: 1,
  },
  segment: { flex: 1, alignItems: "center", justifyContent: "center" },
});
