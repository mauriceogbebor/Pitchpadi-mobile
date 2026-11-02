import { StyleSheet, View } from "react-native";
import { Body } from "@/components/ui";
import type { EntryTone } from "@/lib/venue";
import { radius, space } from "@/theme/tokens";
import { useColors } from "@/theme/use-theme";

/** A booking's payment state, coloured by what the venue needs to do. */
export function StatusPill({
  tone,
  label,
}: {
  tone: EntryTone;
  label: string;
}) {
  const colors = useColors();
  const look = {
    paid: { bg: colors.primary, fg: colors.onPrimary },
    collect: { bg: colors.warningSoft, fg: colors.warningText },
    pending: { bg: colors.muted, fg: colors.textMuted },
    off: { bg: colors.muted, fg: colors.textMuted },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: look.bg }]}>
      <Body weight="semibold" size={14} style={{ color: look.fg }}>
        {label}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
});
