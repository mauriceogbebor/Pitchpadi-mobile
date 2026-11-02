import { StyleSheet, View } from "react-native";
import { Body } from "@/components/ui";
import type { EntryTone } from "@/lib/venue";
import { radius, space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

/** A booking's state, coloured by what the venue needs to do, with a dot. */
export function StatusPill({
  tone,
  label,
}: {
  tone: EntryTone;
  label: string;
}) {
  const colors = useColors();
  const look = {
    paid: { bg: colors.successSoft, fg: colors.success, dot: colors.success },
    collect: {
      bg: colors.warningSoft,
      fg: colors.warningText,
      dot: "#E2683C",
    },
    pending: { bg: colors.muted, fg: colors.textMuted, dot: colors.textMuted },
    off: { bg: colors.muted, fg: colors.textMuted, dot: "transparent" },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: look.bg }]}>
      <View style={[styles.dot, { backgroundColor: look.dot }]} />
      <Body weight="semibold" size={14} style={{ color: look.fg }}>
        {label}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
