import { StyleSheet, View } from "react-native";
import { Body } from "@/components/ui";
import { dateParts } from "@/lib/format";
import { radius } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

/**
 * A fixtures-list date: weekday over a large day number. `strong` is the
 * pitch-green version for the next game; `faded` for games already played.
 */
export function DateBlock({
  date,
  strong = false,
  faded = false,
}: {
  date: string;
  strong?: boolean;
  faded?: boolean;
}) {
  const colors = useColors();
  const parts = dateParts(date);
  const fg = strong ? colors.onChosen : faded ? colors.textMuted : colors.text;
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[
        styles.block,
        { backgroundColor: strong ? colors.chosen : colors.muted },
      ]}
    >
      <Body size={12} weight="semibold" style={{ color: fg }}>
        {parts.weekday}
      </Body>
      <Body
        size={22}
        weight="bold"
        numeric
        style={{ color: fg, lineHeight: 26 }}
      >
        {parts.day}
      </Body>
      <Body size={11} style={{ color: fg }}>
        {parts.month}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    width: 56,
    minHeight: 68,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
});
