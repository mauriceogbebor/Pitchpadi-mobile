import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  FadeOutDown,
  SlideInDown,
  useReducedMotion,
} from "react-native-reanimated";
import { space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

/**
 * The next step, pinned within thumb reach. Slides up when it appears (a time
 * was chosen), so the eye follows it; just appears with reduced motion.
 */
export function ActionBar({ children }: { children: ReactNode }) {
  const colors = useColors();
  const reduce = useReducedMotion();
  return (
    <Animated.View
      entering={reduce ? undefined : SlideInDown.duration(220)}
      exiting={reduce ? undefined : FadeOutDown.duration(150)}
      style={[
        styles.bar,
        { backgroundColor: colors.card, borderTopColor: colors.border },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.md,
    gap: space.sm,
  },
});
